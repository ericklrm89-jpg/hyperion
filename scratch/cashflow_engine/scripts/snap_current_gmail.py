import asyncio
import websockets
import json
import base64
import urllib.request
import os
import sys

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

ASSETS_DIR = r"C:\Users\erick\.gemini\antigravity-ide\scratch\cashflow_engine\public\assets"

async def snap():
    req = urllib.request.urlopen("http://127.0.0.1:9001/json")
    tabs = json.loads(req.read().decode('utf-8'))
    gm_tab = next(t for t in tabs if 'mail.google.com' in t.get('url', ''))
    print("Conectando a Gmail Tab:", gm_tab.get('title'))
    
    async with websockets.connect(gm_tab['webSocketDebuggerUrl'], max_size=50*1024*1024) as ws:
        await ws.send(json.dumps({'id': 1, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 85}}))
        res = json.loads(await ws.recv())
        data = res.get('result', {}).get('data')
        if data:
            out = os.path.join(ASSETS_DIR, "live_gm_real_inbox.jpg")
            with open(out, 'wb') as f:
                f.write(base64.b64decode(data))
            print("Guardado:", out)

if __name__ == '__main__':
    asyncio.run(snap())
