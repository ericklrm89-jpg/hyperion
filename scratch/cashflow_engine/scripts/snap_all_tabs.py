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

async def check_all_tabs():
    req = urllib.request.urlopen("http://127.0.0.1:9001/json")
    tabs = json.loads(req.read().decode('utf-8'))
    print(f"Total tabs on port 9001: {len(tabs)}")
    
    for idx, t in enumerate(tabs):
        if t.get('type') != 'page':
            continue
        ws_url = t.get('webSocketDebuggerUrl')
        if not ws_url:
            continue
        title = t.get('title', 'No Title')
        url = t.get('url', '')
        print(f"[{idx}] {title} -> {url}")
        
        try:
            async with websockets.connect(ws_url, max_size=50*1024*1024) as ws:
                await ws.send(json.dumps({'id': 1, 'method': 'Page.captureScreenshot', 'params': {'format': 'jpeg', 'quality': 80}}))
                res = json.loads(await ws.recv())
                data = res.get('result', {}).get('data')
                if data:
                    out = os.path.join(ASSETS_DIR, f"tab_{idx}_snap.jpg")
                    with open(out, 'wb') as f:
                        f.write(base64.b64decode(data))
                    print(f"   Saved: tab_{idx}_snap.jpg")
        except Exception as e:
            print(f"   Error snapping tab {idx}: {e}")

if __name__ == '__main__':
    asyncio.run(check_all_tabs())
