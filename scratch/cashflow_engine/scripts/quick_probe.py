import urllib.request
import json
import socket
import sys

ports = [9001, 9002, 9222, 9223, 9224, 9225]
for port in ports:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.1)
    res = s.connect_ex(('127.0.0.1', port))
    s.close()
    if res == 0:
        try:
            req = urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1.0)
            tabs = json.loads(req.read().decode('utf-8'))
            print(f"[ONLINE] PORT {port} has {len(tabs)} tabs")
            for t in tabs:
                if t.get('type') == 'page':
                    print(f"   * [{t.get('title')}] -> {t.get('url')}")
        except Exception as e:
            print(f"[TCP OPEN BUT HTTP ERR] PORT {port}: {e}")
    else:
        print(f"[OFFLINE] PORT {port}")
