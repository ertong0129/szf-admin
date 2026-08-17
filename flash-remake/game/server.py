#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Static local server. No third-party deps."""
from __future__ import print_function

import os
import sys
import threading
import webbrowser

try:
    from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
except ImportError:
    from SimpleHTTPServer import SimpleHTTPRequestHandler
    from SocketServer import ThreadingTCPServer as ThreadingHTTPServer

ROOT = os.path.abspath(os.path.dirname(__file__))
PORT = int(os.environ.get("PORT") or "8088")
VERSION = "20260817d"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        try:
            SimpleHTTPRequestHandler.__init__(self, *args, directory=ROOT, **kwargs)
        except TypeError:
            os.chdir(ROOT)
            SimpleHTTPRequestHandler.__init__(self, *args, **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s\n" % (fmt % args))


def main():
    os.chdir(ROOT)
    httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = "http://127.0.0.1:%s/" % PORT
    print("DaMing Legend v%s" % VERSION)
    print(url)
    if os.environ.get("OPEN_BROWSER") != "0":
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
