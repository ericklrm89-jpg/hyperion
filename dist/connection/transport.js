"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Transport = void 0;
const events_1 = require("events");
const config_1 = require("../config");
const errors_1 = require("../cdp/errors");
class Transport extends events_1.EventEmitter {
    constructor() {
        super(...arguments);
        this.pending = new Map();
        this.msgId = 0;
        this.buffer = [];
    }
    getNextId() {
        return ++this.msgId;
    }
    registerPending(id, method) {
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id);
                reject(new config_1.TimeoutError(method, 30000));
            }, 30000);
            this.pending.set(id, { resolve, reject, method, timeout });
        });
    }
    resolvePending(id, result) {
        const pending = this.pending.get(id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pending.delete(id);
            pending.resolve(result);
        }
    }
    rejectPending(id, error) {
        const pending = this.pending.get(id);
        if (pending) {
            clearTimeout(pending.timeout);
            this.pending.delete(id);
            pending.reject(error);
        }
    }
    rejectAll(error) {
        for (const [, pending] of this.pending) {
            clearTimeout(pending.timeout);
            this.pending.delete(pending.method);
            pending.reject(error);
        }
    }
    async call(method, params, retries = 0) {
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const id = this.getNextId();
                const payload = JSON.stringify({ id, method, params: params || {} });
                const resultPromise = this.registerPending(id, method);
                await this.sendRaw(payload);
                const response = await resultPromise;
                if (response.error)
                    throw response.error;
                return response.result;
            }
            catch (err) {
                if (attempt < retries && (0, errors_1.isRetryableError)(err)) {
                    await new Promise(r => setTimeout(r, 100));
                    continue;
                }
                throw err;
            }
        }
        throw new Error('Unreachable');
    }
}
exports.Transport = Transport;
//# sourceMappingURL=transport.js.map