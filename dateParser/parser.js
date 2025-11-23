// parser.js

/**
 * Parse a relative time expression like "now()+1d+3h"
 * and return a Date (in UTC).
 *
 * Supported:
 *   - Modifier: now()
 *   - Operators: +, -
 *   - Units: s, m, h, d, mon, y
 *
 * Examples (assuming now() = 2025-01-08T09:00:00Z):
 *   now()+1d        -> 2025-01-09T09:00:00Z
 *   now()+10d+12h   -> 2025-01-18T21:00:00Z
 *   now()-2d+12h    -> 2025-01-06T21:00:00Z
 *
 * @param {string} expression The input like "now()+1d+3h"
 * @param {{ now?: Date }} [options] Optional { now } so tests are deterministic
 * @returns {Date}
 */
function parse(expression, options = {}) {
  if (typeof expression !== "string") {
    throw new Error("Expression must be a string");
  }

  const trimmed = expression.trim();
  const NOW_TOKEN = "now()";

  // 1. Must start with "now()"
  if (!trimmed.startsWith(NOW_TOKEN)) {
    throw new Error('Expression must start with "now()"');
  }

  // 2. Base time (UTC)
  const baseNow =
    options.now instanceof Date ? new Date(options.now.getTime()) : new Date();

  // Work on a copy so we don't modify the original Date
  let result = new Date(baseNow.getTime());

  // 3. Remaining part after "now()"
  const tail = trimmed.slice(NOW_TOKEN.length);

  // If it's just "now()", we are done
  if (tail.length === 0) {
    return result;
  }

  // 4. Parse sequences like +1d, -2h, +10mon etc.
  // Order is important: "mon" comes before "m"
  const tokenRegex = /([+-])(\d+)(s|mon|m|h|d|y)/g;

  let match;
  let consumedLength = 0;

  while ((match = tokenRegex.exec(tail)) !== null) {
    const operator = match[1]; // "+" or "-"
    const amountStr = match[2]; // e.g. "10"
    const unit = match[3]; // "s", "m", "h", "d", "mon", "y"

    const amount = parseInt(amountStr, 10);
    if (Number.isNaN(amount)) {
      throw new Error(`Invalid amount "${amountStr}" in "${expression}"`);
    }

    // Positive for "+", negative for "-"
    const delta = operator === "+" ? amount : -amount;

    result = applyOffsetUtc(result, delta, unit);

    // Track how many characters we've successfully parsed
    consumedLength += match[0].length;
  }

  // 5. Check that the whole tail string was valid
  if (consumedLength !== tail.length) {
    throw new Error(
      `"Invalid syntax in expression ${expression}"`);
  }

  return result;
}

/**
 * Apply an offset (delta) in a given unit to a Date, using UTC fields.
 *
 * @param {Date} date
 * @param {number} delta - can be positive or negative
 * @param {"s"|"m"|"h"|"d"|"mon"|"y"} unit
 * @returns {Date}
 */
function applyOffsetUtc(date, delta, unit) {
  // Work on a copy
  const d = new Date(date.getTime());

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
    case "mon": // months (0–11)
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
