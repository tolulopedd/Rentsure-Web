const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const vm = require("node:vm");
const root = path.join(__dirname, "../src");
function load(name) {
  const source = fs.readFileSync(path.join(root, name + ".ts"), "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 } });
  const context = { exports: {}, require: spec => {
    assert.ok(spec.startsWith("@/lib/"));
    return load(spec.slice(2));
  } };
  vm.runInNewContext(output.outputText, context);
  return context.exports;
}
const { createRentScoreReport } = load("lib/rent-score-report");
const detail = {
  firstName: "Tolu", lastName: "Davids", email: "example@example.com", phone: "08000000000",
  address: "", status: "UNDER_REVIEW",
  property: { name: "Test Property", address: "Test Street", city: "Lagos", state: "Lagos" },
  propertyUnit: { label: "Ground Floor", isOccupied: false },
  decision: { decision: "HOLD", note: '<script>alert("unsafe")</script>' },
  requestedInformation: ["Work History"], additionalInformationResponse: { submittedAt: "2026-10-28T13:00:00.000Z" },
  linkedRentScoreReport: { summary: { score: 60, maxScore: 900, scoreBand: "RISK", positivePoints: 60, negativePoints: 0 },
    policy: { name: "Default policy" }, breakdown: [{ name: "Account created", points: 20, appliedOccurrences: 1, contribution: 20 }] },
  paymentSchedules: [{ paymentType: "RENT", amountNgn: 1200000, dueDate: "2026-11-01", status: "PENDING" }]
};
const report = createRentScoreReport(detail);
for (const text of ["RentSure logo", "RentScore Report", "Test Property", "Ground Floor", "60", "900", "High Risk",
  "Account created", "Default policy", "Payment schedules", "Information received — awaiting landlord review"]) assert.ok(report.html.includes(text), text);
assert.ok(report.html.includes("&lt;script&gt;"));
assert.ok(!report.html.includes("<script>"));
assert.ok(!report.html.includes("http://"));
assert.ok(!report.html.includes("https://"));
assert.equal(report.fileName, "tolu-davids-rentsure-report.html");
const snapshot = report.html;
detail.firstName = "Changed after opening";
assert.equal(report.html, snapshot);
assert.equal(createRentScoreReport({ ...detail, linkedRentScoreReport: null }), null);
console.log("PASS branded report: complete data, decision state, escaped content, offline assets, stable snapshot, and unavailable-report handling");
