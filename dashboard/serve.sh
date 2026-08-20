#!/bin/bash
# 启动一个纯静态 HTTP 服务器，托管 RL 实验看板（落地页 + 算法介绍 / 2B / 4B / 多模态）。
# 用法：
#   bash serve.sh          # 默认端口 3000
#   PORT=9000 bash serve.sh
#
# 对 html/js/css 关闭浏览器缓存，避免 sync 后评测曲线仍显示旧的 null。
set -euo pipefail
cd "$(dirname "$0")"
PORT="${PORT:-3000}"

echo "=================================================================="
echo " RL 实验看板 — 算法介绍(算法/多模态) / 2B / 4B / 多模态训练"
echo " 落地页：        http://localhost:${PORT}/"
echo " 算法介绍·基座： http://localhost:${PORT}/algo/base.html"
echo " 算法介绍·RL：   http://localhost:${PORT}/algo/index.html"
echo " 算法介绍·多模态：http://localhost:${PORT}/algo/mm.html"
echo " 综合结论：    http://localhost:${PORT}/conclusion/index.html"
echo " 项目问题：    http://localhost:${PORT}/issues/index.html"
echo " 实验日志：    http://localhost:${PORT}/chronicle/index.html"
echo " 2B 训练：       http://localhost:${PORT}/2b/index.html"
echo " 4B 训练：       http://localhost:${PORT}/4b/index.html"
echo " 多模态训练：    http://localhost:${PORT}/mm/index.html"
echo " 同网段其他机器： http://$(hostname -I 2>/dev/null | awk '{print $1}'):${PORT}/"
echo " 如果是远程机器（比如这台 notebook pod），本地浏览器打不开上面的地址时，"
echo " 用 SSH 端口转发：ssh -L ${PORT}:localhost:${PORT} <user>@<this-host>"
echo " 然后在你自己电脑的浏览器访问 http://localhost:${PORT}/"
echo "=================================================================="

exec python3 - "$PORT" <<'PY'
import functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys

PORT = int(sys.argv[1])

class NoCacheHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **getattr(SimpleHTTPRequestHandler, "extensions_map", {}),
        ".js": "application/javascript",
        ".mjs": "application/javascript",
        ".css": "text/css",
        ".html": "text/html",
        ".json": "application/json",
    }

    def end_headers(self):
        path = self.path.split("?", 1)[0].lower()
        if path.endswith((".html", ".js", ".mjs", ".css", ".json")):
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # keep default logging
        super().log_message(fmt, *args)

httpd = ThreadingHTTPServer(("0.0.0.0", PORT), NoCacheHandler)
print(f"Serving with no-cache for html/js/css on port {PORT}", flush=True)
httpd.serve_forever()
PY
