#!/bin/bash
# 重启 RL 实验看板静态服务。
# 用法：
#   bash restart.sh          # 默认端口 3000
#   PORT=9000 bash restart.sh
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-3000}"

pids="$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
if [[ -n "${pids}" ]]; then
  echo "Stopping process(es) on port ${PORT}: ${pids}"
  # shellcheck disable=SC2086
  kill ${pids} 2>/dev/null || true
  sleep 0.3
  # force if still listening
  left="$(lsof -t -iTCP:"${PORT}" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${left}" ]]; then
    # shellcheck disable=SC2086
    kill -9 ${left} 2>/dev/null || true
  fi
else
  echo "No listener on port ${PORT}"
fi

echo "Starting dashboard on port ${PORT} ..."
exec bash ./serve.sh
