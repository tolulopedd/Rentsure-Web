const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/lib/additional-information.ts"), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } });
const context = { exports: {} };
vm.runInNewContext(compiled.outputText, context);
const label = context.exports.applicationDecisionLabel;
const items = ["Work History", "Work Reference Letter"];
const submitted = { submittedAt: "2026-10-28T12:00:00.000Z", workHistory: "Employment details" };
assert.equal(label("HOLD", null, items), "Awaiting renter information");
assert.equal(label("HOLD", submitted, items), "Information received — awaiting landlord review");
assert.equal(label("HOLD", null, []), "Additional information requested");
assert.equal(label("HOLD"), "Additional information requested");
assert.equal(label("APPROVED", submitted, items), "Approved");
assert.equal(label("DECLINED", submitted, items), "Declined");
assert.equal(label(null), "Pending");
assert.equal(label("UNDER_REVIEW"), "Under review");
// A renewed request clears its previous response, returning responsibility to the renter.
assert.equal(label("HOLD", null, ["Work Reference Letter"]), "Awaiting renter information");
console.log("PASS information status: pending submission, submitted, legacy requests, final decisions and renewed requests");

const pending = context.exports.awaitingRenterInformation;
assert.equal(pending("HOLD", null, items), true);
assert.equal(pending("HOLD", submitted, items), false);
assert.equal(pending("HOLD", null, []), false); // Legacy request can be upgraded to a structured request.
assert.equal(pending("APPROVED", null, items), false);
assert.equal(pending(null, null, []), false);
console.log("PASS decision lock: pending renter response locks actions; submission unlocks them");
