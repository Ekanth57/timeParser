// parser.js

/**
 * Parse a relative time expression like "now()+1d+3h-10m"
 * and return a Date (in UTC).
 *
 * Supported:
 *   - Modifier: now()
 *   - Operators: +, -
 *   - Units: s (seconds), m (minutes), h (hours), d (days), mon (months), y (years)
 *
 * Examples (assuming now() = 2025-01-08T09:00:00Z):
 *   now()+1d        -> 2025-01-09T09:00:00Z
 *   now()+10d+12h   -> 2025-01-18T21:00:00Z
 *   now()-2d+12h    -> 2025-01-06T21:00:00Z
 *
 * @param {string} expression - Input string like "now()+1d+3h"
 * @param {{ now?: Date }} [options] - Optional base time (for deterministic testing)
 * @returns {Date} A new Date in UTC with the calculated offset applied
 */
function parse(expression, options = {}) {
  if (typeof expression !== "string") {
    throw new Error("Expression must be a string");
  }

  const trimmed = expression.trim();
  const NOW_TOKEN = "now()";

  // 1. Expression must begin with "now()"
  if (!trimmed.startsWith(NOW_TOKEN)) {
    throw new Error('Expression must start with "now()"');
  }

  // 2. Determine base time (UTC)
  const baseNow =
    options.now instanceof Date ? new Date(options.now.getTime()) : new Date();

  // Work on a copy
  let result = new Date(baseNow.getTime());

  // 3. Extract the part after "now()"
  const tail = trimmed.slice(NOW_TOKEN.length);

  // If expression is exactly "now()", return the base time
  if (tail.length === 0) {
    return result;
  }

  // 4. Match sequences like +1d, -2h, +10mon, etc.
  const tokenRegex = /([+-])(\d+)(s|mon|m|h|d|y)/g;

  let match;
  let consumedLength = 0;

  while ((match = tokenRegex.exec(tail)) !== null) {
    const operator = match[1];
    const amountStr = match[2];
    const unit = match[3];

    const amount = parseInt(amountStr, 10);
    if (Number.isNaN(amount)) {
      throw new Error(`Invalid amount "${amountStr}" in "${expression}"`);
    }

    // Convert operator + amount into a positive or negative number
    const delta = operator === "+" ? amount : -amount;

    result = applyOffsetUtc(result, delta, unit);

    // Track how much of the string we've successfully parsed
    consumedLength += match[0].length;
  }

  // 5. Ensure no invalid text remains
  if (consumedLength !== tail.length) {
    const remaining = tail.slice(consumedLength);
    throw new Error(
      `Invalid syntax in expression "${expression}", unexpected "${remaining}"`
    );
  }

  return result;
}

/**
 * Apply an offset (delta) in a specific unit to a Date, using UTC fields.
 *
 * @param {Date} date - The base date
 * @param {number} delta - Positive or negative number
 * @param {"s"|"m"|"h"|"d"|"mon"|"y"} unit - Unit of time to modify
 * @returns {Date} New Date with the offset applied
 */
function applyOffsetUtc(date, delta, unit) {
  const d = new Date(date.getTime()); // Work on a copy

  switch (unit) {
    case "s": // seconds
      d.setUTCSeconds(d.getUTCSeconds() + delta);
      break;

    case "m": // minutes
      d.setUTCMinutes(d.getUTCMinutes() + delta);
      break;

    case "h": // hours
      d.setUTCHours(d.getUTCHours() + delta);
      break;

    case "d": // days
      d.setUTCDate(d.getUTCDate() + delta);
      break;

    case "mon": // months
      d.setUTCMonth(d.getUTCMonth() + delta);
      break;

    case "y": // years
      d.setUTCFullYear(d.getUTCFullYear() + delta);
      break;

    default:
      throw new Error(`Unsupported unit "${unit}"`);
  }

  return d;
}

// Export for Node.js
module.exports = {
  parse,
  applyOffsetUtc,
};
