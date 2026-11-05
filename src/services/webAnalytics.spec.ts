/** US-015 / T-007, 2026-10-29. Browser timing and transport use an injected clock and no real HTTP. */
import test from "node:test";
import assert from "node:assert/strict";
import { WebAnalyticsClient, type ClientOptions } from "./webAnalytics";
const storage = () => {
  const values = new Map<string, string>();
  return {
    getItem: (k: string) => values.get(k) || null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
};
function fixture() {
  let now = 0,
    id = 0;
  const sent: { url: string; body: any }[] = [];
  const local = storage(),
    session = storage();
  let status = 200;
  const options: ClientOptions = {
    local,
    session,
    id: () => `identifier-${String(++id).padStart(12, "0")}`,
    now: () => now,
    monotonic: () => now,
    auth: () => null,
    delay: async () => {},
    send: async (url, init) => {
      sent.push({ url, body: JSON.parse(String(init.body)) });
      return {
        ok: status === 200,
        status,
        json: async () => ({ token: "capture-token" }),
        headers: new Headers(),
      };
    },
  };
  const client = new WebAnalyticsClient(options, "test");
  return {
    client,
    options,
    sent,
    advance: (ms: number) => (now += ms),
    status: (s: number) => (status = s),
  };
}
test("one logical page, duplicate rendering, and bounded accumulated active time", async () => {
  const f = fixture();
  f.client.page("landing");
  f.client.page("landing");
  await f.client.flush();
  assert.equal(
    f.sent
      .filter((x) => x.url.endsWith("events"))
      .flatMap((x) => x.body.events)
      .filter((e) => e.name === "page_view").length,
    1,
  );
  for (let i = 0; i < 10; i++) {
    f.advance(5000);
    f.client.tick(true, true);
  }
  f.client.sample();
  await f.client.flush();
  const activity = f.sent
    .filter((x) => x.url.endsWith("events"))
    .flatMap((x) => x.body.events)
    .filter((e) => e.name === "activity");
  assert.equal(activity.at(-1).activeMs, 50000);
});
test("hidden pages, blur, idle and long suspension cannot fabricate elapsed time", async () => {
  const f = fixture();
  f.client.page("landing");
  f.advance(5000);
  f.client.tick(false, true);
  f.advance(5000);
  f.client.tick(true, false);
  f.advance(600000);
  f.client.tick(true, true);
  f.client.sample();
  await f.client.flush();
  const e = f.sent
    .flatMap((x) => x.body.events || [])
    .find((x) => x.name === "activity");
  assert.equal(e.activeMs, 0);
});
test("repeated form openings and starts are deduplicated while step returns remain visible", async () => {
  const f = fixture();
  f.client.page("patient_form");
  await f.client.flush();
  f.client.attempt("request-123456789012345");
  f.client.event("form_opened");
  f.client.event("form_opened");
  f.client.event("form_started");
  f.client.event("form_started");
  f.client.event("form_step_viewed", { step: "payment" });
  f.client.event("form_step_viewed", { step: "medication" });
  await new Promise((r) => setImmediate(r));
  await f.client.flush();
  const events = f.sent.flatMap((x) => x.body.events || []);
  assert.equal(events.filter((e) => e.name === "form_opened").length, 1);
  assert.equal(events.filter((e) => e.name === "form_started").length, 1);
  assert.equal(events.filter((e) => e.name === "form_step_viewed").length, 2);
});
test("network retry preserves event IDs and does not invoke a business endpoint", async () => {
  const f = fixture();
  f.client.page("landing");
  await f.client.flush();
  f.sent.length = 0;
  f.status(503);
  f.client.attempt("request-123456789012345");
  f.client.event("form_step_viewed", { step: "medication" });
  await f.client.flush();
  const requests = f.sent.filter((x) => x.url.endsWith("events"));
  assert.equal(requests.length, 3);
  assert.equal(new Set(requests.map((r) => r.body.events[0].eventId)).size, 1);
  assert.equal(f.client.lostEvents, 1);
  assert(f.sent.every((x) => x.url.startsWith("/api/analytics/")));
});
test("session rotates after inactivity only after draining the old token batch", async () => {
  const f = fixture();
  f.client.page("patient_form");
  await f.client.flush();
  f.advance(30 * 60000);
  f.client.activity();
  await new Promise((r) => setImmediate(r));
  await f.client.flush();
  const inits = f.sent.filter((x) => x.url.endsWith("session"));
  assert.equal(inits.length, 2);
  assert.notEqual(inits[0].body.sessionId, inits[1].body.sessionId);
  assert.equal(f.client.lostEvents, 0);
});
test("repeated idle samples do not keep generating requests", async () => {
  const f = fixture();
  f.client.page("landing");
  await f.client.flush();
  f.client.sample();
  await f.client.flush();
  const before = f.sent.length;
  f.client.sample();
  await f.client.flush();
  assert.equal(f.sent.length, before);
});
test("storage failure is ephemeral and still allows capture", async () => {
  const f = fixture();
  const bad = {
    getItem() {
      throw new Error();
    },
    setItem() {
      throw new Error();
    },
  };
  const c = new WebAnalyticsClient(
    { ...f.options, local: bad, session: bad },
    "test",
  );
  c.page("landing");
  await c.flush();
  assert.equal(f.sent[0].body.identityMode, "ephemeral");
});
test("a failed initial page registration is replayed before later activity after recovery", async () => {
  const f = fixture();
  f.status(503);
  f.client.page("landing");
  await f.client.flush();
  f.status(200);
  f.advance(5000);
  f.client.tick(true, true);
  f.client.sample();
  await f.client.flush();
  const events = f.sent
    .filter((r) => r.url.endsWith("events"))
    .flatMap((r) => r.body.events);
  assert.equal(events[0].name, "page_view");
  assert.equal(events[1].name, "activity");
  assert.equal(events[0].pageViewId, events[1].pageViewId);
});
test("two tabs reuse visitor IDs, retain separate sessions, and a new request gets a different attempt", async () => {
  const f = fixture();
  const other = new WebAnalyticsClient(
    { ...f.options, session: storage() },
    "test",
  );
  f.client.page("landing");
  other.page("landing");
  await f.client.flush();
  await other.flush();
  const init = f.sent.filter((x) => x.url.endsWith("session"));
  assert.equal(init[0].body.visitorId, init[1].body.visitorId);
  assert.notEqual(init[0].body.sessionId, init[1].body.sessionId);
  f.client.attempt("request-123456789012345");
  const one = f.client.context();
  f.client.attempt("request-123456789012346");
  assert.notEqual(one?.formAttemptId, f.client.context()?.formAttemptId);
});
