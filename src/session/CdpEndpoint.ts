/**
 * HYPERION CDP ENDPOINT CLIENT
 * Fast, resilient HTTP/WebSocket client for Chrome DevTools Protocol inspection and tab manipulation.
 */

import * as http from 'http';
import * as net from 'net';
import { CdpTabInfo, HealthState } from './types';

export class CdpEndpoint {
  /**
   * Fast TCP socket ping to check if the port is actively listening
   */
  static isPortInUse(port: number, host = '127.0.0.1', timeoutMs = 250): Promise<boolean> {
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
  static async measurePing(port: number, host = '127.0.0.1'): Promise<{ alive: boolean; latencyMs: number }> {
    const start = Date.now();
    try {
      const isAlive = await this.isPortInUse(port, host, 300);
      const latencyMs = Date.now() - start;
      return { alive: isAlive, latencyMs: isAlive ? latencyMs : 0 };
    } catch {
      return { alive: false, latencyMs: 0 };
    }
  }

  /**
   * Queries the list of open page targets from http://host:port/json/list
   */
  static getTabs(port: number, host = '127.0.0.1', timeoutMs = 1200): Promise<{ status: HealthState; tabs: CdpTabInfo[] }> {
    return new Promise((resolve) => {
      const req = http.get(`http://${host}:${port}/json/list`, { timeout: timeoutMs }, (res) => {
        let d = '';
        res.on('data', chunk => (d += chunk));
        res.on('end', () => {
          try {
            const rawList: any[] = JSON.parse(d);
            const pages = rawList
              .filter(item => item.type === 'page')
              .map(item => ({
                id: item.id,
                title: item.title || item.url || 'Sin título',
                url: item.url || '',
                type: item.type,
                webSocketDebuggerUrl: item.webSocketDebuggerUrl,
              }));
            resolve({ status: HealthState.ONLINE, tabs: pages });
          } catch {
            resolve({ status: HealthState.ONLINE, tabs: [] });
          }
        });
      });

      req.on('error', () => resolve({ status: HealthState.OFFLINE, tabs: [] }));
      req.on('timeout', () => {
        req.destroy();
        resolve({ status: HealthState.OFFLINE, tabs: [] });
      });
    });
  }

  /**
   * Opens a new tab with the specified URL via /json/new
   */
  static openTab(port: number, url: string, host = '127.0.0.1'): Promise<boolean> {
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
  static activateTab(port: number, targetId: string, host = '127.0.0.1'): Promise<boolean> {
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
  static closeTab(port: number, targetId: string, host = '127.0.0.1'): Promise<boolean> {
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
