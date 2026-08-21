import urllib.request
import json
import sys
import socket

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

for p in [1001, 1002, 9001, 9002, 9222]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.2)
    res = s.connect_ex(('127.0.0.1', p))
    s.close()
    if res == 0:
        try:
            req = urllib.request.urlopen(f"http://127.0.0.1:{p}/json", timeout=1.5)
            tabs = json.loads(req.read().decode('utf-8'))
            print(f"🟢 PUERTO {p} ONLINE ({len(tabs)} tabs)")
            for t in tabs:
                if t.get('type') == 'page':
                    print(f"   📄 [{t.get('title')}] -> {t.get('url')}")
        except Exception as e:
            print(f"⚠️ Puerto {p} abierto pero error HTTP: {e}")
    else:
        print(f"🔴 PUERTO {p} CERRADO")
