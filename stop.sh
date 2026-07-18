#!/bin/bash
# 停止 vlm_exp 静态站点
# 用法：./stop.sh [端口]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-${PORT:-3000}}"

PID_FILE="$SCRIPT_DIR/logs/server.pid"
if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  if kill "$PID" 2>/dev/null; then
    echo "✅ 已停止 PID $PID"
  fi
  rm -f "$PID_FILE"
fi

# 兜底：按命令行特征清理残留
pkill -f "python3 -m http.server $PORT" 2>/dev/null && \
  echo "✅ 兜底清理端口 $PORT 上的 http.server"

echo "✅ vlm_exp 已停止"
