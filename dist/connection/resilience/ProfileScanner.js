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
exports.ProfileScanner = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || 'C:\\Users\\Default', 'AppData', 'Local');
const browserConfigs = [
    {
        name: 'Google Chrome',
        exePaths: [
            'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
            path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe')
        ],
        userDataDir: path.join(localAppData, 'Google', 'Chrome', 'User Data')
    },
    {
        name: 'Chromium',
        exePaths: [
            'C:\\Program Files\\Chromium\\Application\\chrome.exe',
            'C:\\Program Files (x86)\\Chromium\\Application\\chrome.exe',
            path.join(localAppData, 'Chromium\\Application\\chrome.exe')
        ],
        userDataDir: path.join(localAppData, 'Chromium', 'User Data')
    },
    {
        name: 'Microsoft Edge',
        exePaths: [
            'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
            'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
        ],
        userDataDir: path.join(localAppData, 'Microsoft', 'Edge', 'User Data')
    },
    {
        name: 'Brave Browser',
        exePaths: [
            'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
            path.join(localAppData, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
        ],
        userDataDir: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data')
    }
];
class ProfileScanner {
    static scanAllProfiles() {
        const discovered = [];
        for (const b of browserConfigs) {
            const validExe = b.exePaths.find(p => fs.existsSync(p));
            if (!validExe)
                continue;
            if (!fs.existsSync(b.userDataDir))
                continue;
            const stateFile = path.join(b.userDataDir, 'Local State');
            if (!fs.existsSync(stateFile))
                continue;
            try {
                const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
                const cache = state?.profile?.info_cache || {};
                for (const [dirName, rawInfo] of Object.entries(cache)) {
                    const info = rawInfo;
                    discovered.push({
                        browser: b.name,
                        exe: validExe,
                        userDataDir: b.userDataDir,
                        profileDir: dirName,
                        name: info.name || dirName,
                        userName: info.user_name || '',
                        activeTime: info.active_time || 0,
                        isDefault: dirName === 'Default'
                    });
                }
            }
            catch (e) { }
        }
        return discovered;
    }
}
exports.ProfileScanner = ProfileScanner;
//# sourceMappingURL=ProfileScanner.js.map