#!/bin/bash
# 启动一个纯静态 HTTP 服务器，托管 RL 实验看板（落地页 + 算法介绍 / 2B / 4B / 多模态）。
# 用法：
#   bash serve.sh          # 默认端口 8080
#   PORT=9000 bash serve.sh
#
# 页面本身零外部依赖（无 CDN、无 JS 框架），随便什么静态服务器都能托管，
# 这里用 Python 自带的 http.server 图个方便，不需要额外装依赖。
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-8080}"

echo "=================================================================="
echo " RL 实验看板 — 算法介绍(算法/多模态) / 2B / 4B / 多模态训练"
echo " 落地页：        http://localhost:${PORT}/"
echo " 算法介绍·算法： http://localhost:${PORT}/algo/index.html"
echo " 算法介绍·多模态：http://localhost:${PORT}/algo/mm.html"
echo " 2B 训练：       http://localhost:${PORT}/2b/index.html"
echo " 4B 训练：       http://localhost:${PORT}/4b/index.html"
echo " 多模态训练：    http://localhost:${PORT}/mm/index.html"
echo " 同网段其他机器： http://$(hostname -I 2>/dev/null | awk '{print $1}'):${PORT}/"
echo " 如果是远程机器（比如这台 notebook pod），本地浏览器打不开上面的地址时，"
echo " 用 SSH 端口转发：ssh -L ${PORT}:localhost:${PORT} <user>@<this-host>"
echo " 然后在你自己电脑的浏览器访问 http://localhost:${PORT}/"
echo "=================================================================="

python3 -m http.server "$PORT"
