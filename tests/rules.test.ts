import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyWithRules } from "../src/lib/router/rules";
import { classifyCase, setRoutingModel, type RoutingModel } from "../src/lib/router/classify";
import { NEEDS_REVIEW, confidenceBand } from "../src/lib/router/queues";

test("routes the wireframe's own subjects to the queues A1 shows", () => {
  const cases: [string, string][] = [
    ["Deal ID not showing in the streaming platform", "CTV Tech Ops"],
    ["Fill rate dropped to 12% on CTV after tag update", "CTV Tech Ops"],
    ["VAST 303 errors on our preroll router since last night", "SpringServe Support"],
    ["New seat for our trading desk in DV+", "DV+ Support"],
    ["Invoice 10422 does not match our report", "Billing & Finance"],
    ["Redlines on MSA section 7 (data processing)", "Legal & Contracts"],
    ['Can we add a "Renewal Risk" picklist to Opportunity?', "Salesforce Ops"],
    ["Who is our account manager now?", "Client Services"],
  ];
  for (const [subject, expected] of cases) {
    const r = classifyWithRules({ subject });
    assert.equal(r.queue, expected, `${subject} -> ${r.queue}`);
  }
});

test("an email about both an invoice and a contract is not confidently routed", () => {
  const r = classifyWithRules({ subject: "Question about our contract and an unpaid invoice" });
  assert.ok(r.confidence < 70, `expected low confidence, got ${r.confidence}`);
  assert.match(r.reason, /Ambiguous/);
});

test("an email matching nothing goes to review with zero confidence", () => {
  const r = classifyWithRules({ subject: "Hello" });
  assert.equal(r.queue, NEEDS_REVIEW);
  assert.equal(r.confidence, 0);
});

test("confidence bands match the A1 pill colours", () => {
  assert.equal(confidenceBand(94), "high");
  assert.equal(confidenceBand(85), "high");
  assert.equal(confidenceBand(84), "medium");
  assert.equal(confidenceBand(70), "medium");
  assert.equal(confidenceBand(69), "low");
  assert.equal(confidenceBand(null), "low");
});

test("the threshold sends a low-confidence prediction to review but keeps the prediction", async () => {
  setRoutingModel({
    route: async () => ({ queue: "Billing & Finance", confidence: 61, intent: "Fee configuration" }),
  } satisfies RoutingModel);

  const r = await classifyCase({ subject: "Fee looks wrong", fromEmail: "a@b.c" });
  assert.equal(r.queue, NEEDS_REVIEW);
  assert.equal(r.predictedQueue, "Billing & Finance");
  assert.equal(r.confidence, 61);
  assert.match(r.reason, /below the 70% threshold/);
  setRoutingModel(null);
});

test("a model that throws falls back to rules rather than failing the case", async () => {
  setRoutingModel({
    route: async () => {
      throw new Error("gateway down");
    },
  });
  const r = await classifyCase({ subject: "VAST 303 errors on our preroll router", fromEmail: "a@b.c" });
  assert.equal(r.mode, "rules");
  assert.equal(r.queue, "SpringServe Support");
  assert.match(r.reason, /Model unavailable/);
  setRoutingModel(null);
});

test("a model naming a queue that does not exist falls back to rules", async () => {
  setRoutingModel({ route: async () => ({ queue: "Made Up Queue", confidence: 99 }) });
  const r = await classifyCase({ subject: "Invoice 10422 does not match our report", fromEmail: "a@b.c" });
  assert.equal(r.mode, "rules");
  assert.equal(r.queue, "Billing & Finance");
  setRoutingModel(null);
});
