"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LaunchTransport = void 0;
const transport_1 = require("./transport");
const WebSocket = require("ws");
const http = __importStar(require("http"));
const child_process_1 = require("child_process");
class LaunchTransport extends transport_1.Transport {
    ws = null;
    chromeProcess = null;
    chromePath;
    userDataDir;
    port;
    resolvedWsUrl = null;
    constructor(options) {
        super();
        this.port = options.port || 0;
        this.chromePath = options.chromePath || this.getDefaultChromePath();
        this.userDataDir = options.userDataDir || '';
    }
    getDefaultChromePath() {
        if (process.platform === 'win32') {
            return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
        }
        if (process.platform === 'darwin') {
            return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
        }
        return '/usr/bin/google-chrome';
    }
    async connect() {
        const args = [
            `--remote-debugging-port=${this.port || 0}`,
            '--no-first-run',
            '--no-default-browser-check',
            '--disable-features=TranslateUI',
            '--disable-blink-features=AutomationControlled',
        ];
        if (this.userDataDir) {
            args.push(`--user-data-dir=${this.userDataDir}`);
        }
        else {
            args.push('--incognito');
        }
        this.chromeProcess = (0, child_process_1.spawn)(this.chromePath, args, {
            stdio: ['ignore', 'pipe', 'pipe']
        });
        this.chromeProcess.stderr?.on('data', (data) => {
            this.emit('stderr', data.toString());
        });
        this.chromeProcess.on('close', (code) => {
            this.emit('disconnected', { code });
        });
        await this.discoverWsUrl();
        await this.connectWebSocket();
    }
    async discoverWsUrl() {
        const maxAttempts = 30;
        const port = this.port || 0;
        for (let i = 0; i < maxAttempts; i++) {
            try {
                const response = await new Promise((resolve, reject) => {
                    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
                        let data = '';
                        res.on('data', (chunk) => data += chunk);
                        res.on('end', () => resolve(data));
                    });
                    req.on('error', reject);
                    req.setTimeout(2000, () => { req.destroy(); reject(new Error('Timeout')); });
                });
                const info = JSON.parse(response);
                this.resolvedWsUrl = info.webSocketDebuggerUrl;
                return;
            }
            catch {
                await new Promise(r => setTimeout(r, 500));
            }
        }
        throw new Error('Failed to discover Chrome WebSocket URL');
    }
    async connectWebSocket() {
        if (!this.resolvedWsUrl)
            throw new Error('No WebSocket URL');
        this.ws = new WebSocket(this.resolvedWsUrl);
        await new Promise((resolve, reject) => {
            if (!this.ws) {
                reject(new Error('WebSocket not created'));
                return;
            }
            this.ws.on('open', () => {
                this.emit('connected');
                resolve();
            });
            this.ws.on('error', reject);
            this.ws.on('message', (data) => this.onMessage(data.toString()));
            this.ws.on('close', () => {
                this.rejectAll({ code: -32001, message: 'WebSocket closed' });
                this.emit('disconnected');
            });
            setTimeout(() => reject(new Error('WebSocket connection timeout')), 10000);
        });
    }
    isConnected() {
        return this.ws?.readyState === WebSocket.OPEN;
    }
    async disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        if (this.chromeProcess) {
            this.chromeProcess.kill();
            this.chromeProcess = null;
        }
    }
    async sendRaw(payload) {
        if (!this.ws)
            throw new Error('Not connected');
        this.ws.send(payload);
    }
    onMessage(data) {
        try {
            const msg = JSON.parse(data);
            if (msg.id != null) {
                if (msg.error) {
                    this.rejectPending(msg.id, msg.error);
                }
                else {
                    this.resolvePending(msg.id, msg);
                }
            }
            else if (msg.method) {
                this.emit(msg.method, msg.params);
            }
        }
        catch {
            this.buffer.push(data);
        }
    }
}
exports.LaunchTransport = LaunchTransport;
//# sourceMappingURL=launch.js.map