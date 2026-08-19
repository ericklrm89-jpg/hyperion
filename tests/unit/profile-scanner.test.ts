import { ProfileScanner, DiscoveredProfile } from '../../src/connection/resilience/ProfileScanner';

describe('Universal Profile Scanner - Unit Tests', () => {
  it('should scan and discover available browser profiles', () => {
    const profiles: DiscoveredProfile[] = ProfileScanner.scanAllProfiles();
    expect(Array.isArray(profiles)).toBe(true);

    if (profiles.length > 0) {
      const first = profiles[0];
      expect(first).toHaveProperty('browser');
      expect(first).toHaveProperty('exe');
      expect(first).toHaveProperty('userDataDir');
      expect(first).toHaveProperty('profileDir');
      expect(first).toHaveProperty('name');
    }
  });

  it('should include Google Chrome profiles when Chrome is installed', () => {
    const profiles: DiscoveredProfile[] = ProfileScanner.scanAllProfiles();
    const chromeProfiles = profiles.filter((p: DiscoveredProfile) => p.browser === 'Google Chrome');
    expect(chromeProfiles.length).toBeGreaterThan(0);
    const defaultProfile = chromeProfiles.find((p: DiscoveredProfile) => p.profileDir === 'Default');
    expect(defaultProfile).toBeDefined();
  });
});
