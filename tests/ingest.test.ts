import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseAddress, stripQuotedReply, normaliseSubject, prepareCase,
} from "../src/lib/ingest/email";

test("extracts the address from a display-name header", () => {
  assert.equal(parseAddress("Marcus Hale <AdOps@BluePeak.tv>"), "adops@bluepeak.tv");
  assert.equal(parseAddress("  tech@orchardtv.com "), "tech@orchardtv.com");
});

test("strips reply prefixes from the subject", () => {
  assert.equal(normaliseSubject("Re: Fwd: RE: Deal ID issue"), "Deal ID issue");
  assert.equal(normaliseSubject("Deal ID issue"), "Deal ID issue");
});

test("drops quoted history so a short reply is not routed on stale keywords", () => {
  const body = [
    "Any update on this?",
    "",
    "On Mon, 23 Nov 2026, Support wrote:",
    "> Your invoice dispute and MSA redlines are with legal.",
  ].join("\n");
  assert.equal(stripQuotedReply(body), "Any update on this?");
});

test("a reply quoting a legal thread is not routed to Legal on the quote alone", async () => {
  const quoted = await prepareCase({
    messageId: "m1",
    from: "ops@northwindmedia.com",
    subject: "Re: VAST 303 errors on our preroll router",
    body: "Any update?\n\nOn Mon, Support wrote:\n> MSA redlines and the DPA contract are attached.",
  });
  assert.equal(quoted.queue, "SpringServe Support");
});

test("a confidently classified email is routed and marked New", async () => {
  const c = await prepareCase({
    messageId: "m2",
    from: "Dana <tech@orchardtv.com>",
    subject: "Fill rate dropped on CTV after tag update",
    body: "Our CTV fill rate fell this morning.",
  });
  assert.equal(c.queue, "CTV Tech Ops");
  assert.equal(c.initialQueue, "CTV Tech Ops");
  assert.equal(c.status, "New");
  assert.ok(c.confidence >= 70);
});

test("an ambiguous email lands in review with the status to match", async () => {
  const c = await prepareCase({
    messageId: "m3",
    from: "partnerships@atlasbuyers.co",
    subject: "Question about our contract and an unpaid invoice",
  });
  assert.equal(c.queue, "Needs review");
  assert.equal(c.status, "Needs review");
  assert.ok(c.confidence < 70);
});

test("message size is recorded so it can be counted as kept out of Salesforce", async () => {
  const c = await prepareCase({
    messageId: "m4", from: "a@b.c", subject: "Invoice query", sizeBytes: 2_400_000,
  });
  assert.equal(c.attachmentBytes, 2_400_000);
});

test("case numbers do not collide within a run", async () => {
  const seen = new Set<string>();
  for (let i = 0; i < 50; i++) {
    const c = await prepareCase({ messageId: `x${i}`, from: "a@b.c", subject: "Invoice query" });
    assert.ok(!seen.has(c.caseNumber), `duplicate ${c.caseNumber}`);
    seen.add(c.caseNumber);
  }
});
