import socket
import urllib.request
import json
import base64
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ASSETS_DIR = r"C:\Users\erick\.gemini\antigravity-ide\scratch\cashflow_engine\public\assets"

print("🔍 Buscando todos los puertos CDP activos...")

active_ports = []
for port in range(9000, 9300):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(0.05)
    res = s.connect_ex(('127.0.0.1', port))
    s.close()
    if res == 0:
        active_ports.append(port)

print(f"Puertos abiertos detectados: {active_ports}")

for port in active_ports:
    try:
        req = urllib.request.urlopen(f"http://127.0.0.1:{port}/json", timeout=1.0)
        tabs = json.loads(req.read().decode('utf-8'))
        print(f"\n==================== PUERTO {port} ({len(tabs)} tabs) ====================")
        for i, t in enumerate(tabs):
            if t.get('type') == 'page':
                print(f"  [{i}] ID: {t.get('id')} | Titulo: {t.get('title')} | URL: {t.get('url')}")
    except Exception as e:
        print(f"Error consultando puerto {port}: {e}")
