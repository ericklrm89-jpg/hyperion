/**
 * HYPERION PRESET MANAGER
 * Saves, loads, and executes master multi-session presets (e.g. Work 9001 + Social 9002).
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { MasterPreset } from './types';

const PRESETS_FILE = path.join(os.homedir(), '.hyperion', 'presets.json');

export class PresetManager {
  private static defaultPresets: MasterPreset[] = [
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

  /**
   * Retrieves all available presets (default + user saved)
   */
  static getPresets(): MasterPreset[] {
    let customPresets: MasterPreset[] = [];
    if (fs.existsSync(PRESETS_FILE)) {
      try {
        customPresets = JSON.parse(fs.readFileSync(PRESETS_FILE, 'utf8'));
      } catch {
        customPresets = [];
      }
    }
    return [...this.defaultPresets, ...customPresets];
  }

  /**
   * Saves a custom user preset
   */
  static savePreset(preset: MasterPreset): void {
    const existing = this.getPresets().filter(p => !this.defaultPresets.some(d => d.id === p.id));
    existing.push(preset);
    try {
      const dir = path.dirname(PRESETS_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(PRESETS_FILE, JSON.stringify(existing, null, 2));
    } catch {}
  }
}
