const ALLOWED_TEAMS = new Set([
  "57",  // Arsenal
  "86",  // Real Madrid
  "81",  // Barcelona
  "65",  // Manchester City
  "5",   // Bayern Munich
  "524", // Paris Saint-Germain
]);

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

function isValidDate(value) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

export default async function handler(request) {
  if (request.method !== "GET") {
    return json(
      { error: "Only GET requests are supported." },
      405,
      { Allow: "GET" }
    );
  }

  const apiKey = process.env.FOOTBALL_DATA_API_KEY?.trim();

  if (!apiKey) {
    return json(
      {
        error:
          "FOOTBALL_DATA_API_KEY is missing from the Netlify environment variables.",
      },
      500
    );
  }

  const incoming = new URL(request.url);

  // Works with the rewritten function URL or the original API URL.
  const match = incoming.pathname.match(
    /\/teams\/(\d+)\/matches\/?$/
  );

  if (!match || !ALLOWED_TEAMS.has(match[1])) {
    return json(
      { error: "Unsupported football API endpoint or team." },
      404
    );
  }

  const teamId = match[1];
  const dateFrom = incoming.searchParams.get("dateFrom");
  const dateTo = incoming.searchParams.get("dateTo");

  if (
    (dateFrom || dateTo) &&
    (!isValidDate(dateFrom) || !isValidDate(dateTo))
  ) {
    return json(
      {
        error:
          "Provide both dateFrom and dateTo in YYYY-MM-DD format.",
      },
      400
    );
  }

  if (dateFrom && dateTo && dateFrom >= dateTo) {
    return json(
      { error: "dateTo must be later than dateFrom." },
      400
    );
  }

  const limit = incoming.searchParams.get("limit") || "100";

  if (!/^\d+$/.test(limit) || Number(limit) < 1 || Number(limit) > 100) {
    return json(
      { error: "limit must be between 1 and 100." },
      400
    );
  }

  const endpoint = new URL(
    `https://api.football-data.org/v4/teams/${teamId}/matches`
  );

  endpoint.searchParams.set("limit", limit);

  if (dateFrom && dateTo) {
    endpoint.searchParams.set("dateFrom", dateFrom);
    endpoint.searchParams.set("dateTo", dateTo);
  }

  try {
    const upstream = await fetch(endpoint, {
      headers: {
        "X-Auth-Token": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!upstream.ok) {
      if (upstream.status === 429) {
        return json(
          {
            error:
              "Football API request limit reached. Try again in one minute.",
          },
          429,
          { "Retry-After": "60" }
        );
      }

      if ([401, 403].includes(upstream.status)) {
        return json(
          {
            error:
              "Football API access denied. Check your API key and subscription coverage.",
          },
          upstream.status
        );
      }

      return json(
        {
          error: `Football API returned status ${upstream.status}.`,
        },
        502
      );
    }

    let data;

    try {
      data = await upstream.json();
    } catch {
      return json(
        { error: "Football API returned an invalid JSON response." },
        502
      );
    }

    if (!Array.isArray(data.matches)) {
      return json(
        { error: "Football API returned an unexpected response." },
        502
      );
    }

    return json(data);
  } catch (error) {
    console.error("Football API request failed:", error.message);

    return json(
      {
        error:
          "Unable to reach the football API. Please try again later.",
      },
      502
    );
  }
}