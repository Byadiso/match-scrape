import { footballApiClient } from "./apiRequest";

export const TEAMS = [
  { id: 57, name: "Arsenal" },
  { id: 86, name: "Real Madrid" },
  { id: 81, name: "Barcelona" },
  { id: 65, name: "Manchester City" },
  { id: 5, name: "Bayern Munich" },
  { id: 524, name: "Paris Saint-Germain" },
];

const CACHE_DURATION = 15 * 60 * 1000;

const cache = new Map();
const pendingRequests = new Map();

function getLocalMonth(value) {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

async function loadMonthlyMatches(month) {
  const [year, monthNumber] = month.split("-").map(Number);

  // Include boundary days, then filter by the local month.
  const dateFrom = new Date(Date.UTC(year, monthNumber - 1, 0))
    .toISOString()
    .slice(0, 10);

  const dateTo = new Date(Date.UTC(year, monthNumber, 2))
    .toISOString()
    .slice(0, 10);

  const uniqueMatches = new Map();

  for (const team of TEAMS) {
    const params = new URLSearchParams({
      dateFrom,
      dateTo,
      limit: "100",
    });

    const data = await footballApiClient.request(
      `/api/football/teams/${team.id}/matches?${params}`,
    );

    for (const match of data.matches) {
      if (
        match.utcDate &&
        !Number.isNaN(Date.parse(match.utcDate)) &&
        getLocalMonth(match.utcDate) === month
      ) {
        uniqueMatches.set(match.id, match);
      }
    }
  }

  return [...uniqueMatches.values()].sort(
    (a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate),
  );
}

export function fetchMonthlyMatches(month, { force = false } = {}) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return Promise.reject(new Error("Select a valid month."));
  }

  const year = Number(month.slice(0, 4));

  if (year < 2000 || year > 2100) {
    return Promise.reject(new Error("Choose a year between 2000 and 2100."));
  }

  if (pendingRequests.has(month)) {
    return pendingRequests.get(month);
  }

  const cached = cache.get(month);

  if (!force && cached && Date.now() - cached.savedAt < CACHE_DURATION) {
    return Promise.resolve(cached.matches);
  }

  const request = loadMonthlyMatches(month)
    .then((matches) => {
      cache.set(month, {
        matches,
        savedAt: Date.now(),
      });

      return matches;
    })
    .finally(() => {
      pendingRequests.delete(month);
    });

  pendingRequests.set(month, request);

  return request;
}
