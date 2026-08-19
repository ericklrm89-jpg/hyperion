import * as fs from 'fs';
import * as path from 'path';

export interface DiscoveredProfile {
  browser: string;
  exe: string;
  userDataDir: string;
  profileDir: string;
  name: string;
  userName: string;
  activeTime: number;
  isDefault: boolean;
}

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

export class ProfileScanner {
  static scanAllProfiles(): DiscoveredProfile[] {
    const discovered: DiscoveredProfile[] = [];

    for (const b of browserConfigs) {
      const validExe = b.exePaths.find(p => fs.existsSync(p));
      if (!validExe) continue;
      if (!fs.existsSync(b.userDataDir)) continue;

      const stateFile = path.join(b.userDataDir, 'Local State');
      if (!fs.existsSync(stateFile)) continue;

      try {
        const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
        const cache = state?.profile?.info_cache || {};

        for (const [dirName, rawInfo] of Object.entries(cache)) {
          const info = rawInfo as any;
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
      } catch (e) {}
    }

    return discovered;
  }
}
