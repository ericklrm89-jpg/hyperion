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
exports.ExtensionTransport = void 0;
const transport_1 = require("./transport");
class ExtensionTransport extends transport_1.Transport {
    hostPath;
    process = null;
    connected = false;
    constructor(hostPath) {
        super();
        this.hostPath = hostPath;
    }
    async connect() {
        const { spawn } = await Promise.resolve().then(() => __importStar(require('child_process')));
        this.process = spawn(this.hostPath, [], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        this.process.stdout.on('data', (data) => {
            this.onMessage(data.toString());
        });
        this.process.stderr.on('data', (data) => {
            this.emit('stderr', data.toString());
        });
        this.process.on('close', (code) => {
            this.connected = false;
            this.emit('disconnected', { code });
        });
        this.process.on('error', (err) => {
            this.emit('error', err);
        });
        this.connected = true;
        this.emit('connected');
    }
    async disconnect() {
        if (this.process) {
            this.process.kill();
            this.process = null;
        }
        this.connected = false;
    }
    isConnected() {
        return this.connected && this.process !== null;
    }
    async sendRaw(payload) {
        if (!this.process?.stdin)
            throw new Error('Not connected');
        const msg = Buffer.from(payload, 'utf-8');
        const header = Buffer.alloc(4);
        header.writeUInt32LE(msg.length, 0);
        this.process.stdin.write(Buffer.concat([header, msg]));
    }
    onMessage(data) {
        try {
            const msg = JSON.parse(data);
            if (msg.id) {
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
exports.ExtensionTransport = ExtensionTransport;
//# sourceMappingURL=extension.js.map