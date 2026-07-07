import { test } from '@playwright/test';
import { runner } from '../runtime/runner';
import { RuntimeRegistry } from '../runtime/registry';

// Import validator to trigger self-registration
import '../validators/horizontal-overflow';

test.describe('UI Governance Runtime Validation', () => {
  test('VAL-UI-023 Horizontal Overflow Detection', async ({ page }) => {
    const validator = RuntimeRegistry.getValidator('VAL-UI-023');
    if (!validator) {
      throw new Error('Validator for VAL-UI-023 is not registered');
    }
    await runner.execute(page, validator);
  });
});
