"use strict";
/**
 * HYPERION PROFILE MANAGER
 * Discovers browser profiles, sanitizes locks, and clones isolated profiles for multi-session support.
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
exports.ProfileManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const LAST_PROFILE_FILE = path.join(os.homedir(), '.hyperion', 'last_profile.json');
class ProfileManager {
    /**
     * Scans all installed browsers (Chrome, Edge, Brave) and their profiles
     */
    static scanProfiles() {
        const profiles = [];
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files';
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
        const browserDefs = [
            {
                browser: 'Google Chrome',
                userDataDir: path.join(localAppData, 'Google', 'Chrome', 'User Data'),
                possibleExes: [
                    path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                    path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                    path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
                ],
            },
            {
                browser: 'Microsoft Edge',
                userDataDir: path.join(localAppData, 'Microsoft', 'Edge', 'User Data'),
                possibleExes: [
                    path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
                    path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
                ],
            },
            {
                browser: 'Brave',
                userDataDir: path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'User Data'),
                possibleExes: [
                    path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
                    path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
                ],
            },
        ];
        for (const def of browserDefs) {
            const validExe = def.possibleExes.find(exe => fs.existsSync(exe));
            if (!validExe || !fs.existsSync(def.userDataDir))
                continue;
            const localStatePath = path.join(def.userDataDir, 'Local State');
            let profileInfoMap = {};
            if (fs.existsSync(localStatePath)) {
                try {
                    const raw = fs.readFileSync(localStatePath, 'utf8');
                    const parsed = JSON.parse(raw);
                    profileInfoMap = parsed.profile?.info_cache || {};
                }
                catch { }
            }
            // Check Default profile
            if (fs.existsSync(path.join(def.userDataDir, 'Default'))) {
                const info = profileInfoMap['Default'] || {};
                profiles.push({
                    browser: def.browser,
                    exe: validExe,
                    userDataDir: def.userDataDir,
                    profileDir: 'Default',
                    name: info.name || 'Perfil Predeterminado',
                    userName: info.user_name || '',
                    activeTime: info.active_time || 0,
                    isDefault: true,
                });
            }
            // Check Profile 1..Profile 50
            for (let i = 1; i <= 50; i++) {
                const dirName = `Profile ${i}`;
                if (fs.existsSync(path.join(def.userDataDir, dirName))) {
                    const info = profileInfoMap[dirName] || {};
                    profiles.push({
                        browser: def.browser,
                        exe: validExe,
                        userDataDir: def.userDataDir,
                        profileDir: dirName,
                        name: info.name || `Perfil ${i}`,
                        userName: info.user_name || '',
                        activeTime: info.active_time || 0,
                        isDefault: false,
                    });
                }
            }
        }
        // Sort by activeTime descending (most recent first)
        return profiles.sort((a, b) => (b.activeTime || 0) - (a.activeTime || 0));
    }
    /**
     * Sanitizes Chrome/Edge lockfiles to prevent ECONNREFUSED or crashed launch
     */
    static cleanLocks(userDataDir) {
        if (!fs.existsSync(userDataDir))
            return;
        const lockFiles = ['SingletonLock', 'SingletonCookie', 'SingletonSocket', 'lockfile'];
        for (const lock of lockFiles) {
            const fullPath = path.join(userDataDir, lock);
            try {
                if (fs.existsSync(fullPath)) {
                    fs.unlinkSync(fullPath);
                }
            }
            catch { }
        }
    }
    /**
     * Safely clones cookies, preferences, and session tokens to an isolated directory for parallel instances
     */
    static seedProfileIfNew(sourceUserDataDir, profileDir, targetUserDataDir) {
        try {
            const targetDir = path.join(targetUserDataDir, profileDir);
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
                const sourceDir = path.join(sourceUserDataDir, profileDir);
                if (fs.existsSync(sourceDir)) {
                    const criticalItems = [
                        'Preferences',
                        'Secure Preferences',
                        'Cookies',
                        'Login Data',
                        'Web Data',
                        'Network',
                        'Local Storage'
                    ];
                    for (const item of criticalItems) {
                        const srcItem = path.join(sourceDir, item);
                        const dstItem = path.join(targetDir, item);
                        if (fs.existsSync(srcItem)) {
                            try {
                                fs.cpSync(srcItem, dstItem, { recursive: true, errorOnExist: false });
                            }
                            catch { }
                        }
                    }
                }
            }
        }
        catch { }
    }
    /**
     * Saves the last selected profile for smart recommendations
     */
    static saveLastProfile(profile) {
        try {
            const dir = path.dirname(LAST_PROFILE_FILE);
            if (!fs.existsSync(dir))
                fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(LAST_PROFILE_FILE, JSON.stringify(profile, null, 2));
        }
        catch { }
    }
    /**
     * Loads the last selected profile
     */
    static loadLastProfile() {
        try {
            if (fs.existsSync(LAST_PROFILE_FILE)) {
                return JSON.parse(fs.readFileSync(LAST_PROFILE_FILE, 'utf8'));
            }
        }
        catch { }
        return null;
    }
}
exports.ProfileManager = ProfileManager;
//# sourceMappingURL=ProfileManager.js.map