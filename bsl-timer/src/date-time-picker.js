export const MINUTE_DIAL_STEP = 5;

function positiveModulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

export function wrapClockValue(value, maximum) {
  const normalizedMaximum = Math.max(1, Math.trunc(maximum));

  return positiveModulo(Math.trunc(value), normalizedMaximum);
}

export function shiftCalendarMonth(year, month, offset) {
  const shifted = new Date(
    Number(year),
    Number(month) + Number(offset),
    1
  );

  return {
    year: shifted.getFullYear(),
    month: shifted.getMonth()
  };
}

export function createCalendarDays(
  year,
  month,
  { firstDayOfWeek = 1, today = new Date() } = {}
) {
  const first = new Date(year, month, 1);
  const offset = positiveModulo(
    first.getDay() - firstDayOfWeek,
    7
  );
  const days = [];

  for (let index = 0; index < 42; index += 1) {
    const date = new Date(year, month, index - offset + 1);

    days.push({
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
      inCurrentMonth: date.getMonth() === month,
      isToday:
        date.getFullYear() === today.getFullYear()
        && date.getMonth() === today.getMonth()
        && date.getDate() === today.getDate()
    });
  }

  return days;
}

export function clockDialPosition(index, count, radius) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;

  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius
  };
}

export function minuteDialValues(step = MINUTE_DIAL_STEP) {
  const normalizedStep = Math.max(1, Math.min(30, Math.trunc(step)));
  const values = [];

  for (let value = 0; value < 60; value += normalizedStep) {
    values.push(value);
  }

  return values;
}
