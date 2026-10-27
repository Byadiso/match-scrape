const WINDOW_MS = 61000;
const LOCAL_BUDGET = 9;
const MAX_WAIT_MS = 120000;

export function retryDelay(headers, now = Date.now()) {
  const retryAfter = headers.get("Retry-After");
  if (retryAfter !== null) {
    if (/^\d+(\.\d+)?$/.test(retryAfter.trim())) {
      return Math.max(1000, Number(retryAfter) * 1000);
    }
    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) return Math.max(1000, date - now);
  }
  const reset = headers.get("X-RequestCounter-Reset");
  if (reset !== null && /^\d+$/.test(reset)) {
    return Math.max(1000, Number(reset) * 1000);
  }
  return 60000;
}

export function createApiClient({
  fetcher = (...args) => fetch(...args),
  clock = () => Date.now(),
  sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  let tail = Promise.resolve();
  let pending = 0;
  let starts = [];
  let blockedUntil = 0;
  let snapshot = { phase: "idle", pending: 0, waitStarted: 0, waitUntil: 0 };
  const listeners = new Set();

  function publish(values) {
    snapshot = { ...snapshot, pending, ...values };
    listeners.forEach((listener) => listener());
  }

  async function waitUntil(until, reason) {
    if (until <= clock()) return;
    publish({
      phase: "waiting",
      waitStarted: clock(),
      waitUntil: until,
      reason,
    });
    // Recheck the actual timestamp after background-tab timer throttling.
    while (until > clock()) await sleep(Math.min(1000, until - clock()));
  }

  async function execute(url) {
    // A maximum of one automatic retry per HTTP request.
    for (let attempt = 0; attempt < 2; attempt++) {
      starts = starts.filter((time) => clock() - time < WINDOW_MS);
      const budgetReady =
        starts.length >= LOCAL_BUDGET
          ? starts[starts.length - LOCAL_BUDGET] + WINDOW_MS
          : 0;
      const readyAt = Math.max(budgetReady, blockedUntil);
      if (readyAt - clock() > MAX_WAIT_MS) {
        throw new Error(
          "The football API needs a longer break. Please try again later.",
        );
      }
      await waitUntil(readyAt, "Preparing the next fixture update");
      publish({ phase: "loading", waitUntil: 0 });
      starts.push(clock());
      const response = await fetcher(url, {
        signal: AbortSignal.timeout(15000),
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        const delay = retryDelay(response.headers, clock());
        // Never retry sooner than requested by the server.
        if (delay > MAX_WAIT_MS) {
          blockedUntil = clock() + delay;
          throw new Error(
            "The football API needs a longer break. Please try again later.",
          );
        }
        blockedUntil = clock() + delay + 500;
        if (attempt === 1) {
          throw new Error(
            "The football API is still busy after an automatic retry. Please try again in a minute.",
          );
        }
        await waitUntil(blockedUntil, "The football data provider is busy");
        continue;
      }

      if (!response.ok) {
        if ([401, 403].includes(response.status)) {
          throw new Error(
            "Football API access denied. Check your API key and competition access.",
          );
        }
        throw new Error(
          `Could not load football data (${response.status}). Please try again.`,
        );
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The football endpoint returned an invalid response. Check the deployed API function and routing.",
        );
      }
      if (!Array.isArray(data.matches))
        throw new Error("The football API returned an unexpected response.");
      return data;
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot() {
      return snapshot;
    },
    request(url) {
      pending++;
      publish({});
      const task = tail.then(() => execute(url));
      // A failed request must not block later requests in the queue.
      tail = task.catch(() => {});
      return task.finally(() => {
        pending--;
        publish({ phase: pending ? "loading" : "idle", waitUntil: 0 });
      });
    },
  };
}

export const footballApiClient = createApiClient();
