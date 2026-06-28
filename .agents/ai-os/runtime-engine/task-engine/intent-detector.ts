import { IntentResult } from './types';
import { IntentDetectionError } from './errors';

export class IntentDetector {
  detectIntent(request: string): IntentResult {
    const reqLower = request.toLowerCase();

    let intent: IntentResult['intent'] = 'audit';
    let target = 'repository';

    if (reqLower.includes('fix') || reqLower.includes('resolve') || reqLower.includes('patch')) {
      intent = 'bugfix';
    } else if (reqLower.includes('implement') || reqLower.includes('create') || reqLower.includes('add')) {
      intent = 'implementation';
    } else if (reqLower.includes('plan') || reqLower.includes('design')) {
      intent = 'planning';
    } else if (reqLower.includes('document') || reqLower.includes('write')) {
      intent = 'documentation';
    } else if (reqLower.includes('review') || reqLower.includes('check')) {
      intent = 'review';
    }

    if (reqLower.includes('auth') || reqLower.includes('login')) {
      target = 'authentication';
    } else if (reqLower.includes('booking')) {
      target = 'bookings';
    } else if (reqLower.includes('payment') || reqLower.includes('stripe')) {
      target = 'payments';
    } else if (reqLower.includes('ticket')) {
      target = 'tickets';
    }

    return {
      intent,
      target,
      confidence: 0.95
    };
  }
}
export const intentDetector = new IntentDetector();
