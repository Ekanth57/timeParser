// parser.js

/**
 * Parse a relative time expression like "now()+1d-2h^mon"
 * and return a Date (in UTC).
 *
 * Supported:
 *   - Modifier: now()
 *   - Operators: +, -
 *   - Units: s, m, h, d, mon, y
 *   - Optional rounding suffix: ^s, ^m, ^h, ^d, ^mon, ^y
 *
 * Examples (assuming now() = 2025-01-08T09:00:00Z):
 *   now()+1d        -> 2025-01-09T09:00:00Z
 *   now()+10d+12h   -> 2025-01-18T21:00:00Z
 *   now()-2d+12h    -> 2025-01-06T21:00:00Z
 *   now()+2y^mon    -> (now()+2y, rounded to nearest month)
 *
 * @param {string} expression The input like "now()+1d+3h^d"
 * @param {{ now?: Date }} [options] Optional { now } so tests are deterministic
 * @returns {Date}
 */
function parse(expression, options = {}) {
  if (typeof expression !== "string") {
    throw new Error("Expression must be a string");
  }

  const trimmed = expression.trim();
  const NOW_TOKEN = "now()";

  // 1. Split into core expression and optional rounding part: now()+...[^unit]
  const [coreExpr, roundPart] = trimmed.split("^", 2); // e.g. "now()+2y", "mon"

  // 2. Must start with "now()"
  if (!coreExpr.startsWith(NOW_TOKEN)) {
    throw new Error('Expression must start with "now()"');
  }

  // 3. Base time (UTC)
  const baseNow =
    options.now instanceof Date ? new Date(options.now.getTime()) : new Date();

  // Work on a copy so we don't modify the original Date
  let result = new Date(baseNow.getTime());

  // 4. Remaining part after "now()"
  const tail = coreExpr.slice(NOW_TOKEN.length); // everything after now()

  if (tail.length > 0) {
    // Parse sequences like +1d, -2h, +10mon etc.
    // Order is important: "mon" comes before "m"
    const tokenRegex = /([+-])(\d+)(s|mon|m|h|d|y)/g;

    let match;
    let lastIndex = 0;

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

      // Track how far we've successfully parsed
      lastIndex = tokenRegex.lastIndex;
    }

    // 5. Check that the whole tail string was valid
    if (lastIndex !== tail.length) {
      const invalidSubstring = tail.slice(lastIndex);
      const errorIndex = trimmed.indexOf(tail) + lastIndex;

      throw new Error(
        `Invalid syntax in expression "${expression}" at index ${errorIndex}, unexpected "${invalidSubstring}"`
      );
    }
  }

  // 6. Optional rounding, e.g. now()+2y^mon
  if (roundPart !== undefined) {
    const roundUnit = roundPart.trim(); // "s" | "m" | "h" | "d" | "mon" | "y"
    if (!roundUnit) {
      throw new Error(
        `Invalid rounding suffix in expression "${expression}", expected a unit after "^"`
      );
    }
    result = roundUtc(result, roundUnit, expression);
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

/**
 * Round a Date (UTC) to the nearest given unit.
 *
 * @param {Date} date
 * @param {"s"|"m"|"h"|"d"|"mon"|"y"} unit
 * @param {string} [expression] - for error messages
 * @returns {Date}
 */
function roundUtc(date, unit, expression = "") {
  const d = new Date(date.getTime());

  switch (unit) {
    case "s": {
      // round milliseconds to nearest second
      const ms = d.getUTCMilliseconds();
      if (ms >= 500) {
        d.setUTCSeconds(d.getUTCSeconds() + 1);
      }
      d.setUTCMilliseconds(0);
      break;
    }
    case "m": {
      // round seconds to nearest minute
      const sec = d.getUTCSeconds();
      if (sec >= 30) {
        d.setUTCMinutes(d.getUTCMinutes() + 1);
      }
      d.setUTCSeconds(0, 0);
      break;
    }
    case "h": {
      // round minutes to nearest hour
      const min = d.getUTCMinutes();
      if (min >= 30) {
        d.setUTCHours(d.getUTCHours() + 1);
      }
      d.setUTCMinutes(0, 0, 0);
      break;
    }
    case "d": {
      // round hours to nearest day
      const hour = d.getUTCHours();
      if (hour >= 12) {
        d.setUTCDate(d.getUTCDate() + 1);
      }
      d.setUTCHours(0, 0, 0, 0);
      break;
    }
    case "mon": {
      // round day-of-month to nearest month
      const day = d.getUTCDate();
      if (day > 15) {
        // second half of month -> bump to next month
        d.setUTCMonth(d.getUTCMonth() + 1);
      }
      d.setUTCDate(1);
      d.setUTCHours(0, 0, 0, 0);
      break;
    }
    case "y": {
      // round month to nearest year
      const month = d.getUTCMonth(); // 0-11
      if (month >= 6) {
        d.setUTCFullYear(d.getUTCFullYear() + 1);
      }
      d.setUTCMonth(0, 1); // Jan 1
      d.setUTCHours(0, 0, 0, 0);
      break;
    }
    default:
      throw new Error(
        `Unsupported rounding unit "${unit}" in expression "${expression}"`
      );
  }

  return d;
}

// Export for Node.js
module.exports = {
  parse,
  applyOffsetUtc,
  roundUtc,
};
