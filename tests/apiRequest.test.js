import test from "node:test";
import assert from "node:assert/strict";
import { createApiClient, retryDelay } from "../src/services/apiRequest.js";

const good = () =>
  new Response(JSON.stringify({ matches: [] }), { status: 200 });
const limited = (seconds = "60") =>
  new Response("{}", { status: 429, headers: { "Retry-After": seconds } });
function setup(fetcher) {
  let time = 0;
  const waits = [];
  const states = [];
  const client = createApiClient({
    fetcher,
    clock: () => time,
    sleep: async (ms) => {
      waits.push(ms);
      time += ms;
    },
  });
  client.subscribe(() => states.push(client.getSnapshot()));
  return { client, waits, states, time: () => time };
}

test("429 waits for the specified cooldown, exposes progress timestamps, and retries automatically", async () => {
  let calls = 0;
  const { client, states, time } = setup(async () =>
    ++calls === 1 ? limited() : good(),
  );
  assert.deepEqual(await client.request("/test"), { matches: [] });
  assert.equal(calls, 2);
  assert.equal(time(), 60500);
  assert.ok(
    states.some(
      (state) => state.phase === "waiting" && state.waitUntil === 60500,
    ),
  );
  assert.equal(client.getSnapshot().phase, "idle");
});

test("a persistent 429 retries once and exits with an actionable error", async () => {
  let calls = 0;
  const { client } = setup(async () => {
    calls++;
    return limited();
  });
  await assert.rejects(
    client.request("/test"),
    /still busy after an automatic retry/,
  );
  assert.equal(calls, 2);
});

test("queue spaces the tenth request beyond the local minute budget", async () => {
  const sent = [];
  let timer;
  const setupResult = setup(async () => {
    sent.push(timer());
    return good();
  });
  timer = setupResult.time;
  await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      setupResult.client.request(`/test/${i}`),
    ),
  );
  assert.equal(sent.length, 10);
  assert.equal(sent[8], 0);
  assert.equal(sent[9], 61000);
});

test("failed requests do not poison the shared queue and auth errors are not retried", async () => {
  let calls = 0;
  const { client } = setup(async () =>
    ++calls === 1 ? new Response("{}", { status: 403 }) : good(),
  );
  const first = client.request("/bad");
  const second = client.request("/good");
  await assert.rejects(first, /access denied/);
  assert.deepEqual(await second, { matches: [] });
  assert.equal(calls, 2);
});

test("retry timing supports seconds, HTTP dates, provider reset header, and a fallback", () => {
  assert.equal(retryDelay(new Headers({ "Retry-After": "30" }), 0), 30000);
  assert.equal(
    retryDelay(
      new Headers({ "Retry-After": "Thu, 01 Jan 1970 00:01:00 GMT" }),
      0,
    ),
    60000,
  );
  assert.equal(
    retryDelay(new Headers({ "X-RequestCounter-Reset": "15" }), 0),
    15000,
  );
  assert.equal(retryDelay(new Headers(), 0), 60000);
});

test("long cooldowns are honored by refusing early retries rather than loading indefinitely", async () => {
  let calls = 0;
  const { client, time } = setup(async () => {
    calls++;
    return limited("3600");
  });
  await assert.rejects(client.request("/test"), /longer break/);
  await assert.rejects(client.request("/test-again"), /longer break/);
  assert.equal(calls, 1);
  assert.equal(time(), 0);
});
