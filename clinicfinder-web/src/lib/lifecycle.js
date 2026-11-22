import { tx } from './i18n';
// Appointment lifecycle (documentation §5.3).
import { diffDays, todayISO } from './dates';

export const STATUS = {
  PENDING: 'pending', CONFIRMED: 'confirmed', DECLINED: 'declined', CANCELLED: 'cancelled',
  COMPLETED: 'completed', NO_SHOW: 'no-show',
};

export const TRANSITIONS = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['completed', 'cancelled', 'no-show'],
  completed: [], cancelled: [], declined: [], 'no-show': [],
};

export const STATUS_LABEL = {
  pending: 'Pending', confirmed: 'Confirmed', declined: 'Declined', cancelled: 'Cancelled',
  completed: 'Completed', 'no-show': 'No-show',
};

export const STATUS_TONE = {
  pending: 'amber', confirmed: 'teal', declined: 'rose', cancelled: 'slate', completed: 'blue', 'no-show': 'rose',
};

export const isFinal = (s) => (TRANSITIONS[s] || []).length === 0;
export const isActive = (s) => s === 'pending' || s === 'confirmed';

/**
 * Can an appointment move from its current status to `to`?
 * Returns '' if allowed, otherwise the reason.
 */
export function transitionError(appt, to) {
  if (!TRANSITIONS[appt.status]) return tx('Unknown status.');
  if (!TRANSITIONS[appt.status].includes(to)) {
    return isFinal(appt.status)
      ? tx('This appointment is {0} and can no longer change.', {
      0: tx(STATUS_LABEL[appt.status]).toLowerCase()
    })
      : tx('A {0} appointment cannot become {1}.', {
      0: tx(STATUS_LABEL[appt.status]).toLowerCase(),
      1: (STATUS_LABEL[to] ? tx(STATUS_LABEL[to]).toLowerCase() : to)
    });
  }
  if ((to === 'completed' || to === 'no-show') && diffDays(appt.date, todayISO()) > 0) {
    return tx('An appointment cannot be marked completed or no-show before its date.');
  }
  return '';
}

export const canTransition = (appt, to) => transitionError(appt, to) === '';
