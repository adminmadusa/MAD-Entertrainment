import { DiscoveredRegistry } from './registry-discovery';

export interface HealthCheckResult {
  healthy: boolean;
  issues: string[];
}

export class HealthEngine {
  verifyHealth(discovered: DiscoveredRegistry[]): HealthCheckResult {
    const issues: string[] = [];

    for (const d of discovered) {
      if (!d.isValid) {
        issues.push(`Registry not found or invalid: "${d.category}"`);
      }
    }

    return {
      healthy: issues.length === 0,
      issues
    };
  }
}
export const healthEngine = new HealthEngine();
