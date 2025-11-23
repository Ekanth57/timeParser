# Relative Time Expression Parser

This project provides a JavaScript parser that evaluates expressions such as:

now()+1d+3h-10m

and returns the resulting time as a JavaScript `Date` object in UTC.

The parser is simple, deterministic, and easy to extend.

---

## Supported Format

Expressions must begin with:

now()

and may contain any number of modifiers in the form:

+<number><unit>
-<number><unit>

### Supported units

- s   (seconds)
- m   (minutes)
- h   (hours)
- d   (days)
- mon (months)
- y   (years)

---

## Examples

Assuming `now()` is:

2025-01-08T09:00:00Z

| Expression      | Result (UTC)                    |
|-----------------|---------------------------------|
| now()           | 2025-01-08T09:00:00Z            |
| now()+1d        | 2025-01-09T09:00:00Z            |
| now()+10d+12h   | 2025-01-18T21:00:00Z            |
| now()-2d+12h    | 2025-01-06T21:00:00Z            |
| now()+30s       | 2025-01-08T09:00:30Z            |
| now()+1mon      | 2025-02-08T09:00:00Z            |
| now()+1y        | 2026-01-08T09:00:00Z            |

---

## Usage

```js
const { parse } = require("./parser");

const result = parse("now()+1d+3h");

console.log(result.toISOString());

With fixed reference time (for testing)

parse("now()+1h", { now: new Date("2025-01-01T00:00:00Z") });


## Error Handling


The parser performs basic validation and will throw errors for:

Expressions not starting with now()
Invalid units
Missing operators
Unexpected trailing characters
Partially parsed expressions (e.g., now()+1dXYZ)
Incorrect syntax such as now()+1d2h


Tests
Run the automated tests using Node:
node test.js
The tests verify:
Basic functionality
All supported units
Positive/negative offsets
Conversion in UTC
Error cases


Files Included

parser.js     Main parser implementation
test.js       Automated tests using assert
README.md     Documentation file
