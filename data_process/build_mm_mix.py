#!/usr/bin/env python3
"""构建"文本 vs 图文混合比例"消融实验用的数据切片。

不做跨模态的 schema 合并——verl 的 RLHFDataset 在 `_read_files_and_tokenize` 里对
`data.train_files` 列表逐个文件调用 `datasets.load_dataset` 再 `concatenate_datasets`，
天然支持"部分文件有 images 列、部分没有"（见 rl_dataset.py 的注释："When concatenating
multimodal datasets, get will return None for samples without a modality column"）。
因此这里只需要按比例切出等大小的纯文本/纯图文子集文件，训练脚本里用
`data.train_files=[geo3k.parquet, text_subset.parquet]` 的列表方式拼接即可，不用手工合并。

用法：
    python build_mm_mix.py
"""

import os

import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

POLARIS = "/data/lijunyi/polaris"          # 主仓库：共享的纯文本数据源
VLM_EXP = "/data/lijunyi/vlm_exp"             # 本实验独立仓库：Geo3K 数据与切片产出
SEED = 1

TEXT_SRC = f"{POLARIS}/parquet/stage1/polaris_easy_boxed.parquet"
GEO3K_TRAIN = f"{VLM_EXP}/parquet/mm/geo3k_raw/train.parquet"
GEO3K_TEST = f"{VLM_EXP}/parquet/mm/geo3k_raw/test.parquet"
OUT_DIR = f"{VLM_EXP}/parquet/mm"

os.makedirs(OUT_DIR, exist_ok=True)


def _downcast_large_types(dtype: pa.DataType) -> pa.DataType:
    """Recursively replace `large_string`/`large_list` with `string`/`list`.

    pandas' `to_parquet` (via `pa.Table.from_pandas`) promotes object/string
    columns to Arrow `large_string`, while files written directly through the
    `datasets` library (e.g. `geo3k_raw/*.parquet`, `aime24.parquet`) use plain
    `string`. `datasets.concatenate_datasets` (used by verl's RLHFDataset to
    join `data.train_files`/`data.val_files`) refuses to align `large_string`
    with `string`, so every parquet file that may get concatenated with those
    must be written with the plain type.
    """
    if pa.types.is_large_string(dtype):
        return pa.string()
    if pa.types.is_struct(dtype):
        return pa.struct([pa.field(f.name, _downcast_large_types(f.type)) for f in dtype])
    if pa.types.is_large_list(dtype) or pa.types.is_list(dtype):
        return pa.list_(_downcast_large_types(dtype.value_type))
    return dtype


def to_parquet_str_safe(df: pd.DataFrame, path: str) -> None:
    table = pa.Table.from_pandas(df, preserve_index=False)
    new_schema = pa.schema([pa.field(f.name, _downcast_large_types(f.type)) for f in table.schema])
    table = table.cast(new_schema)
    pq.write_table(table, path)


def main():
    text_df = pd.read_parquet(TEXT_SRC)
    geo_df = pd.read_parquet(GEO3K_TRAIN)
    geo_test_df = pd.read_parquet(GEO3K_TEST)
    n_geo = len(geo_df)
    print(f"text pool: {len(text_df)} rows | geo3k train: {n_geo} rows | geo3k test: {len(geo_test_df)} rows")

    rng_text = text_df.sample(frac=1.0, random_state=SEED).reset_index(drop=True)

    # M2: 50% image / 50% text -> text 子集大小 = n_geo
    text_n_geo = rng_text.iloc[:n_geo].reset_index(drop=True)
    to_parquet_str_safe(text_n_geo, f"{OUT_DIR}/text_subset_m2_{n_geo}.parquet")
    print(f"[M2] text subset: {len(text_n_geo)} rows -> text_subset_m2_{n_geo}.parquet")

    # M3: 20% image / 80% text -> text 子集大小 = n_geo * 4 (使 geo3k 占比恰好 20%)
    n_text_m3 = n_geo * 4
    assert n_text_m3 <= len(rng_text), "polaris_easy_boxed 行数不够 M3 的 80% 文本占比"
    text_n_m3 = rng_text.iloc[:n_text_m3].reset_index(drop=True)
    to_parquet_str_safe(text_n_m3, f"{OUT_DIR}/text_subset_m3_{n_text_m3}.parquet")
    print(f"[M3] text subset: {len(text_n_m3)} rows -> text_subset_m3_{n_text_m3}.parquet")

    # 训练中高频验证用的 geo3k 视觉探针（与 aime24 的 30 题量级对齐，避免拖慢 test_freq 验证）
    geo_val_probe = geo_test_df.sample(n=min(100, len(geo_test_df)), random_state=SEED).reset_index(drop=True)
    to_parquet_str_safe(geo_val_probe, f"{OUT_DIR}/geo3k_val_probe_100.parquet")
    print(f"[val] geo3k 训练中验证探针: {len(geo_val_probe)} rows -> geo3k_val_probe_100.parquet")

    print("\n各组 train_files 组合（用于训练脚本 data.train_files=[...]）：")
    print(f"  M0 (0% image):   [{TEXT_SRC}]                          （复用 E1 GRPO 结果，无需重跑）")
    print(f"  M1 (100% image): [{GEO3K_TRAIN}]")
    print(f"  M2 (50% image):  [{GEO3K_TRAIN}, {OUT_DIR}/text_subset_m2_{n_geo}.parquet]")
    print(f"  M3 (20% image):  [{GEO3K_TRAIN}, {OUT_DIR}/text_subset_m3_{n_text_m3}.parquet]")


if __name__ == "__main__":
    main()
