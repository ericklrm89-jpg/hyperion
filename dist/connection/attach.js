"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AttachTransport = void 0;
const transport_1 = require("./transport");
const WebSocket = require("ws");
class AttachTransport extends transport_1.Transport {
    constructor(wsUrl) {
        super();
        this.wsUrl = wsUrl;
        this.ws = null;
    }
    async connect() {
        this.ws = new WebSocket(this.wsUrl);
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
exports.AttachTransport = AttachTransport;
//# sourceMappingURL=attach.js.map