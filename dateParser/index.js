// index.js

const { parse } = require("./parser");



const result = parse("now()+3d+3h+2y");
console.log(result.toISOString());
