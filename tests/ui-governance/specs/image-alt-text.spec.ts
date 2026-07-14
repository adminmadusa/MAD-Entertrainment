import { test } from '@playwright/test';
import { runner } from '../runtime/runner';
import { RuntimeRegistry } from '../runtime/registry';

// Import validator to trigger self-registration
import '../validators/image-alt-text';

test.describe('UI Governance Runtime Validation', () => {
  test('VAL-UI-020 Accessible Image Alternative Text', async ({ page }) => {
    const validator = RuntimeRegistry.getValidator('VAL-UI-020');
    if (!validator) {
      throw new Error('Validator for VAL-UI-020 is not registered');
    }
    await runner.execute(page, validator);
  });
});
