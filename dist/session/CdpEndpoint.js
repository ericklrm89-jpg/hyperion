"use strict";
/**
 * HYPERION CDP ENDPOINT CLIENT
 * Fast, resilient HTTP/WebSocket client for Chrome DevTools Protocol inspection and tab manipulation.
 */
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
exports.CdpEndpoint = void 0;
const http = __importStar(require("http"));
const net = __importStar(require("net"));
const types_1 = require("./types");
class CdpEndpoint {
    /**
     * Fast TCP socket ping to check if the port is actively listening
     */
    static isPortInUse(port, host = '127.0.0.1', timeoutMs = 250) {
        return new Promise((resolve) => {
            const socket = net.createConnection({ host, port }, () => {
                socket.destroy();
                resolve(true);
            });
            socket.on('error', () => {
                resolve(false);
            });
            socket.setTimeout(timeoutMs, () => {
                socket.destroy();
                resolve(false);
            });
        });
    }
    /**
     * Measures roundtrip latency (ping in milliseconds) to the CDP endpoint
     */
    static async measurePing(port, host = '127.0.0.1') {
        const start = Date.now();
        try {
            const isAlive = await this.isPortInUse(port, host, 300);
            const latencyMs = Date.now() - start;
            return { alive: isAlive, latencyMs: isAlive ? latencyMs : 0 };
        }
        catch {
            return { alive: false, latencyMs: 0 };
        }
    }
    /**
     * Queries the list of open page targets from http://host:port/json/list
     */
    static getTabs(port, host = '127.0.0.1', timeoutMs = 1200) {
        return new Promise((resolve) => {
            const req = http.get(`http://${host}:${port}/json/list`, { timeout: timeoutMs }, (res) => {
                let d = '';
                res.on('data', chunk => (d += chunk));
                res.on('end', () => {
                    try {
                        const rawList = JSON.parse(d);
                        const pages = rawList
                            .filter(item => item.type === 'page')
                            .map(item => ({
                            id: item.id,
                            title: item.title || item.url || 'Sin título',
                            url: item.url || '',
                            type: item.type,
                            webSocketDebuggerUrl: item.webSocketDebuggerUrl,
                        }));
                        resolve({ status: types_1.HealthState.ONLINE, tabs: pages });
                    }
                    catch {
                        resolve({ status: types_1.HealthState.ONLINE, tabs: [] });
                    }
                });
            });
            req.on('error', () => resolve({ status: types_1.HealthState.OFFLINE, tabs: [] }));
            req.on('timeout', () => {
                req.destroy();
                resolve({ status: types_1.HealthState.OFFLINE, tabs: [] });
            });
        });
    }
    /**
     * Opens a new tab with the specified URL via /json/new
     */
    static openTab(port, url, host = '127.0.0.1') {
        return new Promise((resolve) => {
            let formattedUrl = url;
            if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://') && !formattedUrl.startsWith('chrome://')) {
                formattedUrl = `https://${formattedUrl}`;
            }
            const req = http.get(`http://${host}:${port}/json/new?${encodeURIComponent(formattedUrl)}`, { timeout: 2500 }, (res) => {
                let d = '';
                res.on('data', c => (d += c));
                res.on('end', () => resolve(true));
            });
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }
    /**
     * Activates/focuses a specific tab via /json/activate/{targetId}
     */
    static activateTab(port, targetId, host = '127.0.0.1') {
        return new Promise((resolve) => {
            const req = http.get(`http://${host}:${port}/json/activate/${targetId}`, { timeout: 1500 }, () => resolve(true));
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }
    /**
     * Closes a specific tab via /json/close/{targetId}
     */
    static closeTab(port, targetId, host = '127.0.0.1') {
        return new Promise((resolve) => {
            const req = http.get(`http://${host}:${port}/json/close/${targetId}`, { timeout: 1500 }, () => resolve(true));
            req.on('error', () => resolve(false));
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
        });
    }
}
exports.CdpEndpoint = CdpEndpoint;
//# sourceMappingURL=CdpEndpoint.js.map