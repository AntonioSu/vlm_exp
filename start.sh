#!/bin/bash
# 启动 vlm_exp 静态站点（python3 http.server）
# 端口：3000（可通过环境变量 PORT 覆盖）
# 用法：./start.sh [端口]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR" || exit 1

PORT="${1:-${PORT:-3000}}"
mkdir -p "$SCRIPT_DIR/logs"

if ss -tlnp 2>/dev/null | grep -q ":$PORT "; then
  echo "⚠️  端口 $PORT 已被占用，请先停止或换端口"
  ss -tlnp 2>/dev/null | grep ":$PORT "
  exit 1
fi

nohup python3 -m http.server "$PORT" --bind 0.0.0.0 \
  > "$SCRIPT_DIR/logs/server.log" 2>&1 &

PID=$!
echo "$PID" > "$SCRIPT_DIR/logs/server.pid"
sleep 1

echo "✅ vlm_exp 已启动"
echo "   PID:   $PID"
echo "   URL:   http://localhost:$PORT/"
echo "   Log:   $SCRIPT_DIR/logs/server.log"
echo "   Stop:  ./stop.sh"
