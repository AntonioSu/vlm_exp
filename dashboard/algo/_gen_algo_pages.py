#!/usr/bin/env python3
"""Generate per-algorithm pages + rewrite RL summary index. Run from anywhere."""
from pathlib import Path

OUT = Path(__file__).resolve().parent

ALGOS = [
    ("ppo", "PPO", "ppo.html", "Family A · Actor-Critic", "本轮未跑"),
    ("grpo", "GRPO", "grpo.html", "Family B · Group-Relative", "本轮有训"),
    ("dapo", "DAPO", "dapo.html", "Family B · Group-Relative", "本轮有训"),
    ("dr", "Dr.GRPO", "drgrpo.html", "Family B · Group-Relative", "本轮有训"),
    ("rloo", "RLOO", "rloo.html", "Family C · Other Critic-Free", "本轮有训"),
    ("rpp", "REINFORCE++", "reinforce_pp.html", "Family C · Other Critic-Free", "本轮有训"),
]

HEADER = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<link rel="stylesheet" href="../common/base.css">
<link rel="stylesheet" href="algo.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
</head>
<body class="algo-body">

<div class="site-header">
  <div class="site-header-inner">
    <a class="site-brand" href="../index.html"><span class="dot">●</span> RL 实验看板</a>
    <div class="site-nav">
      <a href="../index.html">总览</a>
      <a href="../algo/index.html" class="active">算法介绍</a>
      <a href="../benchmark/index.html">Benchmark 介绍</a>
      <a href="../2b/index.html">2B 训练</a>
      <a href="../4b/index.html">4B 训练</a>
      <a href="../mm/index.html">多模态训练</a>
      <a href="../conclusion/index.html">综合结论</a>
      <a href="../log/index.html">实验日志</a>
    </div>
  </div>
</div>
"""

SUBNAV = """
<div class="algo-page algo-page-with-toc">
  <div class="algo-subnav">
    <a href="base.html">基座</a>
    <a href="index.html" class="active">RL 算法</a>
    <a href="mm.html">多模态</a>
  </div>
"""

KATEX = r"""
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js"></script>
<script>
document.addEventListener("DOMContentLoaded", function() {
  renderMathInElement(document.body, {
    delimiters: [
      {left: "$$", right: "$$", display: true},
      {left: "\\[", right: "\\]", display: true},
      {left: "$", right: "$", display: false},
      {left: "\\(", right: "\\)", display: false}
    ],
    throwOnError: false
  });
});
</script>
"""

TOC_SCRIPT = """
<script>
(function () {
  const links = Array.from(document.querySelectorAll(".algo-toc a[href^='#']"));
  if (!links.length) return;
  const sections = links
    .map((a) => document.querySelector(a.getAttribute("href")))
    .filter(Boolean);
  function setActive(id) {
    links.forEach((a) => {
      a.classList.toggle("is-active", a.getAttribute("href") === "#" + id);
    });
  }
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible[0]) setActive(visible[0].target.id);
    },
    { rootMargin: "-20% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] }
  );
  sections.forEach((s) => observer.observe(s));
  const hash = location.hash.slice(1);
  if (hash && document.getElementById(hash)) setActive(hash);
  else if (sections[0]) setActive(sections[0].id);
})();
</script>
"""


def algo_switcher(active_key):
    chips = []
    for key, label, href, *_ in ALGOS:
        active = " is-active" if key == active_key else ""
        chips.append(f'<a class="chip-{key}{active}" href="{href}">{label}</a>')
    return (
        '  <nav class="algo-switcher" aria-label="RL 算法">\n'
        '    <a class="switcher-home" href="index.html">总览</a>\n'
        '    <span class="switcher-sep" aria-hidden="true"></span>\n'
        f'    {"".join(chips)}\n'
        "  </nav>\n"
    )


def pager(idx):
    if idx > 0:
        _pk, pl, ph = ALGOS[idx - 1][0], ALGOS[idx - 1][1], ALGOS[idx - 1][2]
        prev_html = (
            f'<a class="pager-link prev" href="{ph}">'
            f'<span class="pager-dir">上一篇</span><span class="pager-name">{pl}</span></a>'
        )
    else:
        prev_html = '<span class="pager-link prev is-empty"></span>'
    if idx < len(ALGOS) - 1:
        _nk, nl, nh = ALGOS[idx + 1][0], ALGOS[idx + 1][1], ALGOS[idx + 1][2]
        next_html = (
            f'<a class="pager-link next" href="{nh}">'
            f'<span class="pager-dir">下一篇</span><span class="pager-name">{nl}</span></a>'
        )
    else:
        next_html = '<span class="pager-link next is-empty"></span>'
    return (
        '  <nav class="algo-pager">\n'
        f"    {prev_html}\n"
        '    <a class="pager-home" href="index.html">返回算法总览</a>\n'
        f"    {next_html}\n"
        "  </nav>\n"
    )


CONTENTS = {}

CONTENTS["ppo"] = r"""
  <section class="algo-section module-sec" id="mod-ppo" data-a="ppo">
    <p class="module-tag">Family A · Actor-Critic · 本轮未跑</p>
    <h2>PPO</h2>
    <p class="sec-sub">Proximal Policy Optimization</p>
    <div class="module-intro">
      <p>强化学习里最常用的 actor-critic 算法。策略（actor）与价值（critic）一起训：critic 估 $V(s)$，再用 GAE 得 $\hat{A}$；actor 用重要性比率做对称 clip，防止一步走太远。本轮因 critic 成本<strong>未纳入对比</strong>。</p>
      <p class="how"><strong>核心：</strong>learned $V(s)$ + clip · <span class="mono">adv_estimator=gae</span></p>
      <ul class="ref-list">
        <li>
          <span class="ref-label">Paper</span>
          <a href="https://arxiv.org/abs/1707.06347" target="_blank" rel="noopener">Proximal Policy Optimization Algorithms</a>
          <span class="ref-meta">arXiv:1707.06347</span>
        </li>
        <li>
          <span class="ref-label">Repo</span>
          <a href="https://github.com/openai/baselines" target="_blank" rel="noopener">openai/baselines</a>
          <span class="ref-meta">经典实现</span>
        </li>
      </ul>
    </div>
    <div class="kit-grid">
      <article class="kit-item" id="sym">
        <p class="kit-num">S</p>
        <h3>符号</h3>
        <p class="kit-desc">阅读后面公式前先扫一眼这些符号。</p>
        <div class="formula-block">
          <div class="table-wrap kit-table kit-table-wide">
            <table class="sym-table">
              <thead><tr><th>符号</th><th>含义</th></tr></thead>
              <tbody>
                <tr><td>$s_t,a_t$</td><td>时刻 $t$ 的状态与动作</td></tr>
                <tr><td>$r_t(\theta)$</td><td>重要性比率 $\pi_\theta(a_t|s_t)\,/\,\pi_{\text{old}}(a_t|s_t)$</td></tr>
                <tr><td>$V(s)$</td><td>critic 估计的状态价值</td></tr>
                <tr><td>$\hat{A}_t$</td><td>GAE 得到的 advantage</td></tr>
                <tr><td>$\epsilon$</td><td>对称 clip 半径（常见 $0.2$）</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
      <article class="kit-item" id="kit-obj">
        <p class="kit-num">1</p>
        <h3>Clipped Surrogate</h3>
        <p class="kit-desc">用 clip 限制策略一步更新幅度。</p>
        <div class="formula-block">
          <p class="formula-label">策略目标</p>
          <div class="formula">$$\mathcal{L}^{\text{CLIP}}(\theta) = \mathbb{E}_t\!\left[\min\!\Big(r_t(\theta)\,\hat{A}_t,\;\text{clip}\big(r_t(\theta),\,1{-}\epsilon,\,1{+}\epsilon\big)\,\hat{A}_t\Big)\right]$$</div>
          <p class="formula-label">重要性比率</p>
          <div class="formula">$$r_t(\theta) = \frac{\pi_\theta(a_t \mid s_t)}{\pi_{\theta_{\text{old}}}(a_t \mid s_t)}$$</div>
        </div>
      </article>
      <article class="kit-item" id="kit-gae">
        <p class="kit-num">2</p>
        <h3>GAE Advantage</h3>
        <p class="kit-desc">用 value 网络做时序差分，再指数加权成 advantage。</p>
        <div class="formula-block">
          <div class="formula">$$\hat{A}_t = \sum_{l=0}^{\infty}(\gamma\lambda)^l\,\delta_{t+l},\quad \delta_t = R_t + \gamma\,V(s_{t+1}) - V(s_t)$$</div>
        </div>
      </article>
    </div>
    <div class="module-pros" id="pros">
      <div class="pros-col"><h4>优点</h4><p>经典稳；GAE + clip 成熟；单条样本也能估 advantage。</p></div>
      <div class="pros-col"><h4>缺点</h4><p>要训 critic；显存与时间更高；LLM 长序列下 critic 更难稳。</p></div>
    </div>
  </section>
"""

CONTENTS["grpo"] = r"""
  <section class="algo-section module-sec" id="mod-grpo" data-a="grpo">
    <p class="module-tag">Family B · 基座 · 本轮有训</p>
    <h2>GRPO</h2>
    <p class="sec-sub">Group Relative Policy Optimization</p>
    <div class="module-intro">
      <p>DeepSeek-R1 等后训练常用的 critic-free 方法。对同一题采样 $G$ 条，用组内 reward 均值（再除以 std）当 $\hat{A}$，只更新策略。本轮对照实验的共同基线。</p>
      <p class="how"><strong>核心：</strong>组内相对打分 · 常配 KL · <span class="mono">adv_estimator=grpo</span></p>
      <ul class="ref-list">
        <li>
          <span class="ref-label">Paper</span>
          <a href="https://arxiv.org/abs/2402.03300" target="_blank" rel="noopener">DeepSeekMath: Pushing the Limits of Mathematical Reasoning</a>
          <span class="ref-meta">arXiv:2402.03300</span>
        </li>
        <li>
          <span class="ref-label">Repo</span>
          <a href="https://github.com/deepseek-ai/DeepSeek-Math" target="_blank" rel="noopener">deepseek-ai/DeepSeek-Math</a>
          <span class="ref-meta">项目主仓</span>
        </li>
      </ul>
    </div>
    <div class="kit-grid">
      <article class="kit-item" id="sym">
        <p class="kit-num">S</p>
        <h3>符号</h3>
        <p class="kit-desc">阅读后面公式前先扫一眼这些符号。</p>
        <div class="formula-block">
          <div class="table-wrap kit-table kit-table-wide">
            <table class="sym-table">
              <thead><tr><th>符号</th><th>含义</th></tr></thead>
              <tbody>
                <tr><td>$q$</td><td>一道题 / 一个 prompt</td></tr>
                <tr><td>$G$</td><td>同题采样条数（本轮通常 $G{=}8$）</td></tr>
                <tr><td>$o_i$</td><td>第 $i$ 条回复；$|o_i|$=长度，$o_{i,t}$=第 $t$ 个 token</td></tr>
                <tr><td>$R_i$</td><td>第 $i$ 条的标量 reward</td></tr>
                <tr><td>$r_{i,t}(\theta)$</td><td>重要性比率 $\pi_\theta(o_{i,t}\mid q,o_{i,&lt;t})\,/\,\pi_{\text{old}}(\cdots)$</td></tr>
                <tr><td>$\hat{A}_i$</td><td>组内相对 advantage（含除以 std）</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
      <article class="kit-item" id="kit-adv">
        <p class="kit-num">1</p>
        <h3>组内 Advantage</h3>
        <p class="kit-desc">同题 $G$ 条相对打分，再除以组内 std。</p>
        <div class="formula-block">
          <div class="formula">$$\hat{A}_i = \frac{R_i - \text{mean}(R_1,\dots,R_G)}{\text{std}(R_1,\dots,R_G)}$$</div>
        </div>
      </article>
      <article class="kit-item" id="kit-obj">
        <p class="kit-num">2</p>
        <h3>样本级目标</h3>
        <p class="kit-desc">论文写法：先对每条做 $1/|o_i|$，再对 $G$ 条平均——对长输出不如 token 级友好。</p>
        <div class="formula-block">
          <div class="formula">$$\mathcal{J}_{\text{GRPO}}(\theta) = \mathbb{E}_{q}\!\left[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}\min\!\Big(r_{i,t}(\theta)\,\hat{A}_i,\;\text{clip}(r_{i,t}(\theta),\,1{-}\epsilon,\,1{+}\epsilon)\,\hat{A}_i\Big)\right] - \beta\,\mathcal{D}_{\text{KL}}\!\left[\pi_\theta \| \pi_{\text{ref}}\right]$$</div>
        </div>
      </article>
    </div>
    <div class="module-pros" id="pros">
      <div class="pros-col"><h4>优点</h4><p>无需 value；组内 baseline 稳；其余变体的共同基座。</p></div>
      <div class="pros-col"><h4>缺点</h4><p>长度/难度隐藏偏置；开 KL 更慢；无超长与全对/全错组的专门处理。</p></div>
    </div>
  </section>
"""

CONTENTS["dapo"] = (OUT / "_frag_dapo.html").read_text(encoding="utf-8")

CONTENTS["dr"] = r"""
  <section class="algo-section module-sec" id="mod-dr" data-a="dr">
    <p class="module-tag">Family B · 偏置修正 · 本轮有训</p>
    <h2>Dr.GRPO</h2>
    <p class="sec-sub">Done-right GRPO</p>
    <div class="module-intro">
      <p>针对 GRPO 两个隐性问题的最小修正：不除组内 std（难度偏置）；loss 用固定分母 $C$（长度偏置）。通常关 KL。</p>
      <p class="how"><strong>核心：</strong><span class="mono">norm_adv_by_std=False</span> + <span class="mono">seq-mean-token-sum-norm</span></p>
      <ul class="ref-list">
        <li>
          <span class="ref-label">Paper</span>
          <a href="https://arxiv.org/abs/2503.20783" target="_blank" rel="noopener">Understanding R1-Zero-Like Training: A Critical Perspective</a>
          <span class="ref-meta">arXiv:2503.20783</span>
        </li>
        <li>
          <span class="ref-label">Repo</span>
          <a href="https://github.com/sail-sg/understand-r1-zero" target="_blank" rel="noopener">sail-sg/understand-r1-zero</a>
          <span class="ref-meta">项目主仓</span>
        </li>
      </ul>
    </div>
    <div class="kit-grid">
      <article class="kit-item" id="sym">
        <p class="kit-num">S</p>
        <h3>符号</h3>
        <p class="kit-desc">阅读后面公式前先扫一眼这些符号。</p>
        <div class="formula-block">
          <div class="table-wrap kit-table kit-table-wide">
            <table class="sym-table">
              <thead><tr><th>符号</th><th>含义</th></tr></thead>
              <tbody>
                <tr><td>$G$</td><td>同题采样条数</td></tr>
                <tr><td>$o_i$</td><td>第 $i$ 条回复；$|o_i|$=长度</td></tr>
                <tr><td>$R_i$</td><td>第 $i$ 条标量 reward</td></tr>
                <tr><td>$\hat{A}_i$</td><td>组内相对 advantage（<strong>不</strong>除以 std）</td></tr>
                <tr><td>$C$</td><td>固定分母（常数，如平均响应长度）</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
      <article class="kit-item" id="kit-adv">
        <p class="kit-num">1</p>
        <h3>Advantage（去难度偏置）</h3>
        <p class="kit-desc">只减组内均值，不再除以 std。</p>
        <div class="formula-block">
          <div class="formula">$$\hat{A}_i = R_i - \text{mean}(R_1,\dots,R_G)$$</div>
        </div>
      </article>
      <article class="kit-item" id="kit-obj">
        <p class="kit-num">2</p>
        <h3>固定分母聚合（去长度偏置）</h3>
        <p class="kit-desc">用常数 $C$ 归一，而不是每条自身的 $|o_j|$。</p>
        <div class="formula-block">
          <div class="formula">$$\mathcal{L}(\theta) = \frac{1}{|\mathcal{B}|}\sum_{j \in \mathcal{B}} \frac{1}{C}\sum_{t=1}^{|o_j|}\min\!\Big(r_{j,t}(\theta)\,\hat{A}_j,\;\text{clip}(r_{j,t}(\theta),\,1{-}\epsilon,\,1{+}\epsilon)\,\hat{A}_j\Big)$$</div>
        </div>
      </article>
    </div>
    <div class="module-pros" id="pros">
      <div class="pros-col"><h4>优点</h4><p>最小改动修掉长度+难度偏置；理论更干净。</p></div>
      <div class="pros-col"><h4>缺点</h4><p>早期信号可能偏弱；无长度抑制时回答可能变长。</p></div>
    </div>
  </section>
"""

CONTENTS["rloo"] = r"""
  <section class="algo-section module-sec" id="mod-rloo" data-a="rloo">
    <p class="module-tag">Family C · Other Critic-Free · 本轮有训</p>
    <h2>RLOO</h2>
    <p class="sec-sub">REINFORCE Leave-One-Out</p>
    <div class="module-intro">
      <p>同题采 $G$ 条，但每条 baseline 是「去掉自己」后其余 $G{-}1$ 条均值。相对组均值<strong>偏差更小</strong>、<strong>方差更大</strong>。常配 KL。</p>
      <p class="how"><strong>核心：</strong>LOO · <span class="mono">adv_estimator=rloo</span></p>
      <ul class="ref-list">
        <li>
          <span class="ref-label">Paper</span>
          <a href="https://arxiv.org/abs/2402.14740" target="_blank" rel="noopener">Back to Basics: Revisiting REINFORCE-Style Optimization</a>
          <span class="ref-meta">arXiv:2402.14740</span>
        </li>
        <li>
          <span class="ref-label">Repo</span>
          <a href="https://github.com/huggingface/trl" target="_blank" rel="noopener">huggingface/trl</a>
          <span class="ref-meta">常见实现</span>
        </li>
      </ul>
    </div>
    <div class="kit-grid">
      <article class="kit-item" id="sym">
        <p class="kit-num">S</p>
        <h3>符号</h3>
        <p class="kit-desc">阅读后面公式前先扫一眼这些符号。</p>
        <div class="formula-block">
          <div class="table-wrap kit-table kit-table-wide">
            <table class="sym-table">
              <thead><tr><th>符号</th><th>含义</th></tr></thead>
              <tbody>
                <tr><td>$G$</td><td>同题采样条数（须 $G&gt;1$）</td></tr>
                <tr><td>$o_i$</td><td>第 $i$ 条回复；$|o_i|$=长度</td></tr>
                <tr><td>$R_i$</td><td>第 $i$ 条标量 reward</td></tr>
                <tr><td>$\hat{A}_i$</td><td>leave-one-out advantage</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
      <article class="kit-item" id="kit-adv">
        <p class="kit-num">1</p>
        <h3>Leave-One-Out Baseline</h3>
        <p class="kit-desc">baseline 不含当前样本自身。</p>
        <div class="formula-block">
          <div class="formula">$$\hat{A}_i = R_i - \frac{1}{G-1}\sum_{j \neq i} R_j$$</div>
        </div>
      </article>
      <article class="kit-item" id="kit-obj">
        <p class="kit-num">2</p>
        <h3>策略目标</h3>
        <p class="kit-desc">与 GRPO 相同的 clip 结构，差别只在 $\hat{A}_i$。</p>
        <div class="formula-block">
          <div class="formula">$$\mathcal{L}(\theta) = \mathbb{E}_{q}\!\left[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}\min\!\Big(r_{i,t}(\theta)\,\hat{A}_i,\;\text{clip}(r_{i,t}(\theta),\,1{-}\epsilon,\,1{+}\epsilon)\,\hat{A}_i\Big)\right] - \beta\,\mathcal{D}_{\text{KL}}\!\left[\pi_\theta \| \pi_{\text{ref}}\right]$$</div>
        </div>
      </article>
    </div>
    <div class="module-pros" id="pros">
      <div class="pros-col"><h4>优点</h4><p>LOO 与当前样本解耦，偏差更小。</p></div>
      <div class="pros-col"><h4>缺点</h4><p>方差更大；依赖 $G&gt;1$；对异常 reward 更敏感。</p></div>
    </div>
  </section>
"""

CONTENTS["rpp"] = r"""
  <section class="algo-section module-sec" id="mod-rpp" data-a="rpp">
    <p class="module-tag">Family C · Other Critic-Free · 本轮有训</p>
    <h2>REINFORCE++</h2>
    <p class="sec-sub">REINFORCE with batch whitening</p>
    <div class="module-intro">
      <p>不做同题组内相对：对折扣 return 在整个 batch 上白化，再当 $\hat{A}$。不依赖 $G&gt;1$；KL 常用 mse。</p>
      <p class="how"><strong>核心：</strong>全 batch 白化 · <span class="mono">adv_estimator=reinforce_plus_plus</span></p>
      <ul class="ref-list">
        <li>
          <span class="ref-label">Paper</span>
          <a href="https://arxiv.org/abs/2501.03262" target="_blank" rel="noopener">REINFORCE++: An Efficient RLHF Algorithm</a>
          <span class="ref-meta">arXiv:2501.03262</span>
        </li>
        <li>
          <span class="ref-label">Repo</span>
          <a href="https://github.com/OpenRLHF/OpenRLHF" target="_blank" rel="noopener">OpenRLHF/OpenRLHF</a>
          <span class="ref-meta">常见实现</span>
        </li>
      </ul>
    </div>
    <div class="kit-grid">
      <article class="kit-item" id="sym">
        <p class="kit-num">S</p>
        <h3>符号</h3>
        <p class="kit-desc">阅读后面公式前先扫一眼这些符号。</p>
        <div class="formula-block">
          <div class="table-wrap kit-table kit-table-wide">
            <table class="sym-table">
              <thead><tr><th>符号</th><th>含义</th></tr></thead>
              <tbody>
                <tr><td>$\mathcal{B}$</td><td>整个 mini-batch</td></tr>
                <tr><td>$o_i$</td><td>第 $i$ 条回复；$|o_i|$=长度</td></tr>
                <tr><td>$R_i$</td><td>折扣累计 return</td></tr>
                <tr><td>$\hat{A}_i$</td><td>对 $\{R_j\}_{j\in\mathcal{B}}$ 白化后的 advantage</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </article>
      <article class="kit-item" id="kit-adv">
        <p class="kit-num">1</p>
        <h3>Batch 白化 Advantage</h3>
        <p class="kit-desc">改的是 $\hat{A}$ 怎么估，不是组内怎么平均 $\ell$。</p>
        <div class="formula-block">
          <div class="formula">$$\hat{A}_i = \frac{R_i - \text{mean}(\{R_j\}_{j \in \mathcal{B}})}{\text{std}(\{R_j\}_{j \in \mathcal{B}})}$$</div>
        </div>
      </article>
      <article class="kit-item" id="kit-obj">
        <p class="kit-num">2</p>
        <h3>策略目标</h3>
        <p class="kit-desc">clip + mse 形式 KL。</p>
        <div class="formula-block">
          <div class="formula">$$\mathcal{L}(\theta) = \mathbb{E}\!\left[\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}\min\!\Big(r_{i,t}(\theta)\,\hat{A}_i,\;\text{clip}(r_{i,t}(\theta),\,1{-}\epsilon,\,1{+}\epsilon)\,\hat{A}_i\Big)\right] - \beta\,\mathcal{D}_{\text{MSE}}\!\left[\pi_\theta,\, \pi_{\text{ref}}\right]$$</div>
        </div>
      </article>
    </div>
    <div class="module-pros" id="pros">
      <div class="pros-col"><h4>优点</h4><p>不依赖同题分组；全 batch 白化尺度稳。</p></div>
      <div class="pros-col"><h4>缺点</h4><p>不同难度题被耦合归一；无组内 baseline 时方差可能更高。</p></div>
    </div>
  </section>
"""

TOCS = {
    "ppo": [
        ("mod-ppo", "总览"),
        ("sym", "符号"),
        ("kit-obj", "Clipped Surrogate"),
        ("kit-gae", "GAE"),
        ("pros", "优缺点"),
    ],
    "grpo": [
        ("mod-grpo", "总览"),
        ("sym", "符号"),
        ("kit-adv", "组内 Advantage"),
        ("kit-obj", "样本级目标"),
        ("pros", "优缺点"),
    ],
    "dapo": [
        ("mod-dapo", "总览"),
        ("sym", "符号"),
        ("kit-clip", "Clip-Higher"),
        ("kit-ds", "Dynamic Sampling"),
        ("kit-token", "Token-level Loss"),
        ("kit-overlong", "Overlong"),
        ("pros", "优缺点"),
    ],
    "dr": [
        ("mod-dr", "总览"),
        ("sym", "符号"),
        ("kit-adv", "Advantage"),
        ("kit-obj", "固定分母"),
        ("pros", "优缺点"),
    ],
    "rloo": [
        ("mod-rloo", "总览"),
        ("sym", "符号"),
        ("kit-adv", "LOO Baseline"),
        ("kit-obj", "策略目标"),
        ("pros", "优缺点"),
    ],
    "rpp": [
        ("mod-rpp", "总览"),
        ("sym", "符号"),
        ("kit-adv", "Batch 白化"),
        ("kit-obj", "策略目标"),
        ("pros", "优缺点"),
    ],
}


def make_toc(key):
    items = []
    for i, (hid, title) in enumerate(TOCS[key], 1):
        items.append(
            f'<li data-a="{key}"><a href="#{hid}">'
            f'<span class="toc-num">{i}</span><span class="toc-title">{title}</span></a></li>'
        )
    return (
        '  <div class="algo-layout">\n'
        '  <nav class="algo-toc" aria-label="目录">\n'
        '    <p class="toc-heading">本页</p>\n'
        '    <ol class="toc-list">\n'
        f'      {"".join(items)}\n'
        "    </ol>\n"
        "  </nav>\n"
        '  <div class="algo-main">\n'
    )


def write_algo_pages():
    for idx, (key, label, fname, family, run) in enumerate(ALGOS):
        title = f"{label} — 算法介绍"
        hero = (
            '  <header class="algo-hero algo-hero-compact">\n'
            '    <div class="algo-hero-text">\n'
            f'      <p class="algo-kicker"><a href="index.html">RL 算法</a> · {family}</p>\n'
            f"      <h1>{label}</h1>\n"
            f'      <p class="lede">{run} · 曲线见 <a href="../2b/index.html">2B</a> / '
            f'<a href="../4b/index.html">4B</a> · 返回 <a href="index.html">算法总览</a></p>\n'
            "    </div>\n"
            "  </header>\n"
        )
        html = (
            HEADER.format(title=title)
            + SUBNAV
            + algo_switcher(key)
            + hero
            + make_toc(key)
            + CONTENTS[key]
            + pager(idx)
            + "\n  </div><!-- /.algo-main -->\n  </div><!-- /.algo-layout -->\n</div>\n"
            + KATEX
            + TOC_SCRIPT
            + "\n</body>\n</html>\n"
        )
        (OUT / fname).write_text(html, encoding="utf-8")
        print("wrote", fname)


INDEX = r'''<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>算法介绍 — RL 算法总览</title>
<link rel="stylesheet" href="../common/base.css">
<link rel="stylesheet" href="algo.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css">
</head>
<body class="algo-body">

<div class="site-header">
  <div class="site-header-inner">
    <a class="site-brand" href="../index.html"><span class="dot">●</span> RL 实验看板</a>
    <div class="site-nav">
      <a href="../index.html">总览</a>
      <a href="../algo/index.html" class="active">算法介绍</a>
      <a href="../benchmark/index.html">Benchmark 介绍</a>
      <a href="../2b/index.html">2B 训练</a>
      <a href="../4b/index.html">4B 训练</a>
      <a href="../mm/index.html">多模态训练</a>
      <a href="../conclusion/index.html">综合结论</a>
      <a href="../log/index.html">实验日志</a>
    </div>
  </div>
</div>

<div class="algo-page algo-page-with-toc">
  <div class="algo-subnav">
    <a href="base.html">基座</a>
    <a href="index.html" class="active">RL 算法</a>
    <a href="mm.html">多模态</a>
  </div>

  <header class="algo-hero">
    <div class="algo-hero-text">
      <p class="algo-kicker">Text RL · Algorithm Primer</p>
      <h1>RL 算法总览</h1>
      <p class="lede">
        先按「要不要 value 网络」分成两大家族，再在 critic-free 里按 baseline 怎么估继续细分。
        本轮 2B/4B 只跑了五种 critic-free；PPO 因 critic 成本未纳入。
        下方是摘要与对照；点进各算法页看完整公式与细节。
      </p>
    </div>
    <div class="algo-chips">
      <a class="chip-ppo" href="ppo.html">PPO</a>
      <a class="chip-grpo" href="grpo.html">GRPO</a>
      <a class="chip-dapo" href="dapo.html">DAPO</a>
      <a class="chip-dr" href="drgrpo.html">Dr.GRPO</a>
      <a class="chip-rloo" href="rloo.html">RLOO</a>
      <a class="chip-rpp" href="reinforce_pp.html">REINFORCE++</a>
    </div>
  </header>

  <div class="algo-layout">
  <nav class="algo-toc" aria-label="目录">
    <p class="toc-heading">目录</p>
    <ol class="toc-list">
      <li><a href="#sec-family"><span class="toc-num">0</span><span class="toc-title">算法怎么分</span></a></li>
      <li><a href="#sec-cards"><span class="toc-num">1</span><span class="toc-title">各算法摘要</span></a></li>
      <li><a href="#sec-diff"><span class="toc-num">2</span><span class="toc-title">主要区别点</span></a></li>
      <li><a href="#sec-config"><span class="toc-num">3</span><span class="toc-title">核心配置差异</span></a></li>
    </ol>
  </nav>

  <div class="algo-main">

  <section class="algo-section" id="sec-family">
    <h2>算法怎么分</h2>
    <p class="sec-sub">三条谱系：actor-critic → 组相对 → 其它无 critic 基线</p>
    <div class="family-grid">
      <div class="family-card" data-f="actor">
        <p class="family-label">Family A · Actor-Critic</p>
        <h3>有 Value 网络</h3>
        <p class="family-desc">用 learned critic（常配 GAE）估 advantage；策略更新仍可套 PPO clip。</p>
        <div class="family-members">
          <a class="chip-ppo" href="ppo.html">PPO</a>
        </div>
        <p class="family-note">本轮未跑（critic 成本过高）</p>
      </div>
      <div class="family-card" data-f="group">
        <p class="family-label">Family B · Group-Relative</p>
        <h3>同题 G 条相对打分</h3>
        <p class="family-desc">同一 prompt 采样多条，用组内统计当 baseline。GRPO 是基座；DAPO / Dr.GRPO 是其上工程与偏置修正。</p>
        <div class="family-members">
          <a class="chip-grpo" href="grpo.html">GRPO</a>
          <a class="chip-dapo" href="dapo.html">DAPO</a>
          <a class="chip-dr" href="drgrpo.html">Dr.GRPO</a>
        </div>
        <p class="family-note">共享 <span class="mono">adv_estimator=grpo</span></p>
      </div>
      <div class="family-card" data-f="other">
        <p class="family-label">Family C · Other Critic-Free</p>
        <h3>换一套 baseline</h3>
        <p class="family-desc">不训 value，但不走「组内均值 ± std」：留一法，或全 batch 白化。</p>
        <div class="family-members">
          <a class="chip-rloo" href="rloo.html">RLOO</a>
          <a class="chip-rpp" href="reinforce_pp.html">REINFORCE++</a>
        </div>
        <p class="family-note">RLOO 仍用组内采样；REINFORCE++ 不依赖同题分组</p>
      </div>
    </div>
  </section>

  <section class="algo-section" id="sec-cards">
    <h2>各算法摘要</h2>
    <p class="sec-sub">一卡一句 + 入口 · 点标题进详情页</p>
    <div class="summary-grid">
      <a class="summary-card" data-a="ppo" href="ppo.html">
        <p class="summary-tag">Family A · 未训</p>
        <h3>PPO</h3>
        <p class="summary-one">Actor-Critic + GAE + 对称 clip；要另训 value。</p>
        <p class="summary-how"><span class="mono">adv_estimator=gae</span></p>
        <span class="summary-go">查看详情 →</span>
      </a>
      <a class="summary-card" data-a="grpo" href="grpo.html">
        <p class="summary-tag">Family B · E1</p>
        <h3>GRPO</h3>
        <p class="summary-one">同题 $G$ 条组内均值/std 当 $\hat{A}$；论文用样本级 loss；常开 KL。</p>
        <p class="summary-how"><span class="mono">adv_estimator=grpo</span></p>
        <span class="summary-go">查看详情 →</span>
      </a>
      <a class="summary-card" data-a="dapo" href="dapo.html">
        <p class="summary-tag">Family B · E2</p>
        <h3>DAPO</h3>
        <p class="summary-one">GRPO 骨架 + Clip-Higher / 动态采样 / 组内 token 级 loss / Overlong；关 KL。</p>
        <p class="summary-how"><span class="mono">reward_manager=dapo</span></p>
        <span class="summary-go">查看详情 →</span>
      </a>
      <a class="summary-card" data-a="dr" href="drgrpo.html">
        <p class="summary-tag">Family B · E3</p>
        <h3>Dr.GRPO</h3>
        <p class="summary-one">不除组内 std + 固定分母 $C$，修难度/长度偏置；关 KL。</p>
        <p class="summary-how"><span class="mono">norm_adv_by_std=False</span></p>
        <span class="summary-go">查看详情 →</span>
      </a>
      <a class="summary-card" data-a="rloo" href="rloo.html">
        <p class="summary-tag">Family C · E4</p>
        <h3>RLOO</h3>
        <p class="summary-one">Leave-one-out baseline：减偏差、增方差；常开 KL。</p>
        <p class="summary-how"><span class="mono">adv_estimator=rloo</span></p>
        <span class="summary-go">查看详情 →</span>
      </a>
      <a class="summary-card" data-a="rpp" href="reinforce_pp.html">
        <p class="summary-tag">Family C · E5</p>
        <h3>REINFORCE++</h3>
        <p class="summary-one">折扣 return 全 batch 白化当 $\hat{A}$；不依赖同题分组；mse KL。</p>
        <p class="summary-how"><span class="mono">reinforce_plus_plus</span></p>
        <span class="summary-go">查看详情 →</span>
      </a>
    </div>
  </section>

  <section class="algo-section" id="sec-diff">
    <h2>主要区别点</h2>
    <p class="sec-sub">五条轴线</p>
    <ol class="diff-list">
      <li class="diff-item">
        <div class="diff-num">1</div>
        <h3>有没有 Critic —— PPO vs 其余全部</h3>
        <p><strong>PPO</strong>：另训 value + GAE。<strong>其余五种</strong>：不训 critic，用采样统计当 baseline。</p>
      </li>
      <li class="diff-item">
        <div class="diff-num">2</div>
        <h3>Advantage 的 baseline 怎么估</h3>
        <p><strong>PPO</strong>：V(s)。<strong>GRPO / DAPO / Dr.GRPO</strong>：组内平均 reward。<strong>RLOO</strong>：留一法。<strong>REINFORCE++</strong>：全 batch 白化 return。</p>
      </li>
      <li class="diff-item">
        <div class="diff-num">3</div>
        <h3>Loss 怎么对 $G$ 条聚合</h3>
        <p>
          <strong>论文 GRPO</strong>：样本级 $\frac{1}{G}\sum_i\frac{1}{|o_i|}\sum_t$。
          <strong>DAPO</strong>：Token 级 $\frac{1}{\sum_i|o_i|}\sum_i\sum_t$（同组；≠ REINFORCE++）。
          <strong>Dr.GRPO</strong>：固定分母 $C$。本轮 E1/E2 都配了 <span class="mono">token-mean</span>。
        </p>
      </li>
      <li class="diff-item">
        <div class="diff-num">4</div>
        <h3>要不要 KL 约束</h3>
        <p><strong>开</strong>：GRPO / RLOO / REINFORCE++（及概念上的 PPO）。<strong>关</strong>：DAPO / Dr.GRPO。</p>
      </li>
      <li class="diff-item">
        <div class="diff-num">5</div>
        <h3>DAPO 工程四件套</h3>
        <p>Clip-Higher · Dynamic Sampling · Token-level Loss（分母 $\sum|o_i|$）· Overlong。详情见 <a href="dapo.html">DAPO 页</a>。</p>
      </li>
    </ol>
  </section>

  <section class="algo-section" id="sec-config">
    <h2>核心配置差异</h2>
    <p class="sec-sub">对照表 · 点表头算法名进详情</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th></th>
            <th><a href="ppo.html">PPO</a></th>
            <th><a href="grpo.html">GRPO</a></th>
            <th><a href="dapo.html">DAPO</a></th>
            <th><a href="drgrpo.html">Dr.GRPO</a></th>
            <th><a href="rloo.html">RLOO</a></th>
            <th><a href="reinforce_pp.html">REINFORCE++</a></th>
          </tr>
        </thead>
        <tbody>
          <tr><td>族</td><td>Actor-Critic</td><td colspan="3">Group-Relative</td><td colspan="2">Other Critic-Free</td></tr>
          <tr><td>adv_estimator</td><td class="mono">gae</td><td class="mono">grpo</td><td class="mono">grpo</td><td class="mono">grpo</td><td class="mono">rloo</td><td class="mono">reinforce_plus_plus</td></tr>
          <tr><td>Critic / Value</td><td>要训</td><td>否</td><td>否</td><td>否</td><td>否</td><td>否</td></tr>
          <tr><td>baseline</td><td>V(s) + GAE</td><td>组内均值</td><td>组内均值</td><td>组内均值</td><td>LOO</td><td>全 batch 白化</td></tr>
          <tr><td>除以组内 std</td><td class="na">—</td><td>是</td><td>是</td><td>否</td><td>是</td><td class="na">—</td></tr>
          <tr><td>论文 loss 聚合</td><td class="na">—</td><td>样本级</td><td>Token 级（同组）</td><td>固定分母 $C$</td><td class="na">—</td><td class="na">—</td></tr>
          <tr><td>本轮 loss_agg_mode</td><td class="mono">token-mean</td><td class="mono">token-mean</td><td class="mono">token-mean</td><td class="mono">seq-mean-token-sum-norm</td><td class="mono">token-mean</td><td class="mono">token-mean</td></tr>
          <tr><td>KL loss</td><td>常开</td><td>开 low_var_kl</td><td>关</td><td>关</td><td>开 low_var_kl</td><td>开 mse</td></tr>
          <tr><td>clip</td><td>对称</td><td>对称</td><td>非对称 0.2/0.28</td><td>对称</td><td>对称</td><td>对称</td></tr>
          <tr><td>Dynamic Sampling</td><td class="na">—</td><td class="na">—</td><td>有（本轮未生效）</td><td class="na">—</td><td class="na">—</td><td class="na">—</td></tr>
          <tr><td>Overlong 惩罚</td><td class="na">—</td><td class="na">—</td><td>软罚</td><td class="na">—</td><td class="na">—</td><td class="na">—</td></tr>
          <tr><td>reward manager</td><td class="mono">naive</td><td class="mono">naive</td><td class="mono">dapo</td><td class="mono">naive</td><td class="mono">naive</td><td class="mono">naive</td></tr>
          <tr><td>本轮是否训练</td><td>否</td><td>是</td><td>是</td><td>是</td><td>是</td><td>是</td></tr>
        </tbody>
      </table>
    </div>
  </section>

  </div><!-- /.algo-main -->
  </div><!-- /.algo-layout -->
</div>
''' + KATEX + TOC_SCRIPT + "\n</body>\n</html>\n"


def main():
    write_algo_pages()
    (OUT / "index.html").write_text(INDEX, encoding="utf-8")
    print("wrote index.html")


if __name__ == "__main__":
    main()
