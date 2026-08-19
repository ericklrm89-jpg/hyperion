import { PortSessionManager } from '../../src/connection/resilience/PortSessionManager';

describe('PortSessionManager - Multi-Instance Isolation Tests', () => {
  it('should find next available port starting from 9222', async () => {
    const port = await PortSessionManager.findNextAvailablePort(9222, 9250);
    expect(port).toBeGreaterThanOrEqual(9222);
    expect(port).toBeLessThanOrEqual(9250);
  });

  it('should probe active ports accurately', async () => {
    // Port 65530 is unlikely to be listening
    const inUse = await PortSessionManager.isPortInUse(65530);
    expect(inUse).toBe(false);
  });

  it('should manage active session registration and release', async () => {
    const testSession = {
      port: 9999,
      browser: 'Google Chrome',
      profileDir: 'Profile 99',
      profileName: 'Test Profile',
      userDataDir: 'C:\\Fake\\User Data',
      startedAt: new Date().toISOString(),
    };

    await PortSessionManager.registerSession(testSession);
    await PortSessionManager.releaseSession(9999);
  });
});
