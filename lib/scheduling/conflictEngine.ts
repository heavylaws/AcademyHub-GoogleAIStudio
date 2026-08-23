export interface TimeRange {
  startMinutes: number;
  endMinutes: number;
}

/**
 * Parses timeSlot string like "14:00 - 15:30" or "09:00-10:30" into start and end minutes from midnight.
 */
export function parseTimeSlot(timeSlot: string): TimeRange | null {
  if (!timeSlot || typeof timeSlot !== 'string') return null;
  const parts = timeSlot.split('-').map((s) => s.trim());
  if (parts.length !== 2) return null;

  const parseTime = (timeStr: string): number | null => {
    const timeParts = timeStr.split(':').map((s) => parseInt(s, 10));
    if (timeParts.length !== 2 || isNaN(timeParts[0]) || isNaN(timeParts[1])) return null;
    const [hours, minutes] = timeParts;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  };

  const start = parseTime(parts[0]);
  const end = parseTime(parts[1]);

  if (start === null || end === null || start >= end) {
    return null;
  }

  return { startMinutes: start, endMinutes: end };
}

/**
 * Checks if two time ranges overlap.
 */
export function doTimesOverlap(range1: TimeRange, range2: TimeRange): boolean {
  return range1.startMinutes < range2.endMinutes && range1.endMinutes > range2.startMinutes;
}
