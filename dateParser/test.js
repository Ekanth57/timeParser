// test.js

const assert = require("assert");
const { parse } = require("./parser");

// Helper to turn a Date into ISO string (always UTC)
function iso(date) {
  return date.toISOString();
}

// Fixed "now" so tests are deterministic
// This matches the example in the assessment:
// "Assuming now() returns 2025-01-08T09:00:00Z"
const FIXED_NOW = new Date("2025-01-08T09:00:00Z");

// 1. now() only
{
  const result = parse("now()", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-08T09:00:00.000Z");
}

// 2. now()+1d -> 2025-01-09T09:00:00.000Z
{
  const result = parse("now()+1d", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-09T09:00:00.000Z");
}

// 3. now()+8d -> 2025-01-16T09:00:00.000Z
{
  const result = parse("now()+8d", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-16T09:00:00.000Z");
}

// 4. now()+10d+12h -> 2025-01-18T21:00:00.000Z
{
  const result = parse("now()+10d+12h", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-18T21:00:00.000Z");
}

// 5. now()-2d+12h -> 2025-01-06T21:00:00.000Z
{
  const result = parse("now()-2d+12h", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-06T21:00:00.000Z");
}

// 6. Test seconds, minutes, months, years just to show they work

// now()+30s
{
  const result = parse("now()+30s", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-08T09:00:30.000Z");
}

// now()+15m
{
  const result = parse("now()+15m", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2025-01-08T09:15:00.000Z");
}

// now()+1mon (1 month later)
{
  const result = parse("now()+1mon", { now: FIXED_NOW });
  // 1 month after Jan 8 2025 is Feb 8 2025
  assert.strictEqual(iso(result), "2025-02-08T09:00:00.000Z");
}

// now()+1y (1 year later)
{
  const result = parse("now()+1y", { now: FIXED_NOW });
  assert.strictEqual(iso(result), "2026-01-08T09:00:00.000Z");
}

// 7. Basic validation: wrong start
{
  let errorCaught = false;
  try {
    parse("later()+1d", { now: FIXED_NOW });
  } catch (e) {
    errorCaught = true;
  }
  assert.strictEqual(errorCaught, true);
}

// 8. Basic validation: junk at the end
{
  let errorCaught = false;
  try {
    parse("now()+1dXYZ", { now: FIXED_NOW });
  } catch (e) {
    errorCaught = true;
  }
  assert.strictEqual(errorCaught, true);
}

console.log("All tests passed!");
