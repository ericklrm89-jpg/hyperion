import subprocess
import json
import urllib.request
import socket

print("=== SCANNING CDP PORTS ===")
for port in range(9000, 9300):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.05)
    res = s.connect_ex(('127.0.0.1', port))
    s.close()
    if res == 0:
        try:
            req = urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=0.5)
            tabs = json.loads(req.read().decode('utf-8'))
            print(f"✅ FOUND CDP ON PORT {port}: {len(tabs)} tabs open")
            for t in tabs:
                print(f"   - [{t.get('type')}] {t.get('title')} ({t.get('url')})")
        except Exception as e:
            print(f"⚠️ Port {port} open but not CDP: {e}")

print("\n=== SCANNING CHROME PROCESSES ===")
try:
    out = subprocess.check_output('wmic process where "name=\'chrome.exe\'" get ProcessId,CommandLine /format:list', shell=True, text=True)
    lines = out.splitlines()
    for l in lines:
        if '--remote-debugging-port' in l:
            print(f"🚀 CHROME CMD: {l[:200]}")
except Exception as e:
    print(f"Error checking wmic: {e}")
