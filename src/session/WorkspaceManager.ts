/**
 * HYPERION WORKSPACE MANAGER
 * Curated workspace suites (Work, Social, AI, CRM) with batch tab injection over CDP.
 */

import { WorkspacePreset } from './types';
import { CdpEndpoint } from './CdpEndpoint';

export class WorkspaceManager {
  private static predefinedWorkspaces: WorkspacePreset[] = [
    {
      id: 'work',
      name: 'Work & Lead Generation Suite',
      description: 'WhatsApp Web + Gmail + CRM',
      icon: '💼',
      urls: [
        'https://web.whatsapp.com',
        'https://mail.google.com',
        'https://crm.sanantonio.com',
      ],
    },
    {
      id: 'social',
      name: 'Social Media Marketing Suite',
      description: 'Instagram + Facebook Business + TikTok',
      icon: '📸',
      urls: [
        'https://www.instagram.com',
        'https://business.facebook.com',
        'https://www.tiktok.com',
      ],
    },
    {
      id: 'ai',
      name: 'AI Agent & LLM Hub',
      description: 'Google Gemini Workspace + Claude + ChatGPT',
      icon: '🤖',
      urls: [
        'https://gemini.google.com/app',
        'https://claude.ai',
        'https://chatgpt.com',
      ],
    },
    {
      id: 'fairdraw',
      name: 'FairDraw Production Suite',
      description: 'FairDraw Web App + Instagram + Facebook',
      icon: '💎',
      urls: [
        'https://fairdrawapp.com',
        'https://www.instagram.com',
        'https://www.facebook.com',
      ],
    },
  ];

  /**
   * Retrieves all available workspace presets
   */
  static getWorkspaces(): WorkspacePreset[] {
    return [...this.predefinedWorkspaces];
  }

  /**
   * Injects all URLs of a workspace suite into the given CDP port
   */
  static async injectWorkspace(port: number, workspaceId: string): Promise<{ success: boolean; openedCount: number }> {
    const ws = this.predefinedWorkspaces.find(w => w.id === workspaceId);
    if (!ws) return { success: false, openedCount: 0 };

    let opened = 0;
    for (const url of ws.urls) {
      const ok = await CdpEndpoint.openTab(port, url);
      if (ok) opened++;
      // Small pause between opening tabs to let browser breathe
      await new Promise(r => setTimeout(r, 400));
    }

    return { success: opened > 0, openedCount: opened };
  }
}
