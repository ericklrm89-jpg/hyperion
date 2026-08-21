import subprocess
import json
import urllib.request
import re
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

# Run netstat -ano
out = subprocess.check_output('netstat -ano', shell=True, text=True)

# Find all LISTENING ports
listening_ports = []
for line in out.splitlines():
    if 'LISTENING' in line:
        parts = line.split()
        if len(parts) >= 5:
            local_addr = parts[1]
            pid = parts[4]
            # Extract port
            if ':' in local_addr:
                port_str = local_addr.split(':')[-1]
                try:
                    p = int(port_str)
                    listening_ports.append((p, pid, local_addr))
                except:
                    pass

print("=== PUERTOS EN ESCUCHA DETECTADOS ===")
for p, pid, addr in listening_ports:
    if p in [1001, 1002, 9001, 9002, 9222, 9223, 9224, 9225] or (9000 <= p <= 9300):
        print(f"Puerto {p} (PID {pid}, {addr})")
        try:
            r = urllib.request.urlopen(f"http://127.0.0.1:{p}/json", timeout=0.8)
            tabs = json.loads(r.read().decode('utf-8'))
            print(f"   🟢 CDP ACTIVO: {len(tabs)} pestañas")
            for t in tabs:
                if t.get('type') == 'page':
                    print(f"      - [{t.get('title')}] -> {t.get('url')}")
        except Exception as e:
            print(f"   ⚠️ No es endpoint CDP HTTP: {e}")
