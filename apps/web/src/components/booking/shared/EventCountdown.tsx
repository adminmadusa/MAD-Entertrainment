import { useCountdown } from '@/hooks/use-countdown.hook';
import { getEventEndDate, type BaseEventForLifecycle } from '@mad/shared';

interface EventCountdownProps {
  event: BaseEventForLifecycle;
}

export function EventCountdown({ event }: EventCountdownProps) {
  const startTarget = new Date(event.startDate);
  const endTarget = getEventEndDate(event);

  const startCountdown = useCountdown(startTarget);
  const endCountdown = useCountdown(endTarget);

  const now = new Date();

  if (now < startTarget) {
    if (startCountdown.days > 0) {
      return (
        <span className="text-text-muted text-xs font-semibold">
          Starts in {startCountdown.days} {startCountdown.days === 1 ? 'day' : 'days'}
        </span>
      );
    }
    if (startCountdown.hours > 0) {
      return (
        <span className="text-text-muted text-xs font-semibold">
          Starts in {startCountdown.hours} {startCountdown.hours === 1 ? 'hour' : 'hours'}
        </span>
      );
    }
    return (
      <span className="text-text-muted text-xs font-semibold">
        Starts in {startCountdown.minutes} {startCountdown.minutes === 1 ? 'minute' : 'minutes'}
      </span>
    );
  }

  if (now >= startTarget && now <= endTarget) {
    return (
      <span className="text-green-400 text-xs font-black flex items-center gap-1.5">
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500"></span>
        </span>
        Live Now {endCountdown.hours > 0 || endCountdown.minutes > 0 ? `(ends in ${endCountdown.hours}h ${endCountdown.minutes}m)` : ''}
      </span>
    );
  }

  return (
    <span className="text-text-muted text-xs font-semibold">
      Ended
    </span>
  );
}
