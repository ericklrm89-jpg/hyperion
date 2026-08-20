"use strict";
/**
 * HYPERION PRESET MANAGER
 * Saves, loads, and executes master multi-session presets (e.g. Work 9001 + Social 9002).
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
exports.PresetManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const PRESETS_FILE = path.join(os.homedir(), '.hyperion', 'presets.json');
class PresetManager {
    /**
     * Retrieves all available presets (default + user saved)
     */
    static getPresets() {
        let customPresets = [];
        if (fs.existsSync(PRESETS_FILE)) {
            try {
                customPresets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
            }
            catch {
                customPresets = [];
            }
        }
        return [...this.defaultPresets, ...customPresets];
    }
    /**
     * Saves a custom user preset
     */
    static savePreset(preset) {
        const existing = this.getPresets().filter(p => !this.defaultPresets.some(d => d.id === p.id));
        existing.push(preset);
        try {
            const dir = path.dirname(PRESETS_FILE);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(PRESETS_FILE, JSON.stringify(existing, null, 2));
        }
        catch { }
    }
}
exports.PresetManager = PresetManager;
PresetManager.defaultPresets = [
    {
        id: 'dual_master',
        name: 'Dual Master (Trabajo 9001 + Personal 9002)',
        description: 'Lanza instantáneamente tus 2 perfiles principales en paralelo.',
        sessions: [
            {
                profileDir: 'Profile 18',
                port: 9001,
                workspaceId: 'work',
            },
            {
                profileDir: 'Profile 19',
                port: 9002,
                workspaceId: 'social',
            },
        ],
    },
    {
        id: 'fairdraw_ops',
        name: 'FairDraw Growth Operations (9001)',
        description: 'Sesión dedicada de FairDraw y redes sociales en puerto 9001.',
        sessions: [
            {
                profileDir: 'Profile 18',
                port: 9001,
                workspaceId: 'fairdraw',
            },
        ],
    },
];
//# sourceMappingURL=PresetManager.js.map