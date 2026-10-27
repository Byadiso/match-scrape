export const OPENING_CENTS = 10000;
export const SIMULATION_KEY = "football-simulator-v1";
const FINISHED = new Set(["FINISHED", "AWARDED"]);

export function localMonth(value = new Date()) {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function parseStake(value) {
  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(text))
    throw new Error("Enter a positive stake with at most two decimal places.");
  const cents = Math.round(Number(text) * 100);
  if (!Number.isSafeInteger(cents) || cents <= 0)
    throw new Error("Stake must be greater than 0 PLN.");
  return cents;
}

export function parseOdds(value) {
  const text = String(value).trim().replace(",", ".");
  if (!/^\d+(\.\d{1,3})?$/.test(text))
    throw new Error("Use decimal odds with up to three decimal places.");
  const odds = Number(text);
  if (!Number.isFinite(odds) || odds <= 1 || odds > 1000)
    throw new Error(
      "Each decimal odd must be greater than 1 and at most 1000.",
    );
  return odds;
}

export function matchResult(match, teamId) {
  if (match.status === "CANCELLED") return "void";
  if (!FINISHED.has(match.status)) return "pending";
  if (match.score?.winner === "DRAW") return "lost";
  if (!["HOME_TEAM", "AWAY_TEAM"].includes(match.score?.winner))
    return "pending";
  const winner =
    match.score.winner === "HOME_TEAM" ? match.homeTeam : match.awayTeam;
  return Number(winner?.id) === Number(teamId) ? "won" : "lost";
}

export function legResult(leg) {
  return leg.override || matchResult(leg.match, leg.teamId);
}

export function ticketResult(ticket) {
  const results = ticket.legs.map(legResult);
  if (results.includes("lost")) return "lost";
  if (results.includes("pending")) return "pending";
  if (results.every((result) => result === "void")) return "void";
  return "won";
}

export function combinedOdds(legs, settled = false) {
  return legs.reduce(
    (value, leg) =>
      value * (settled && legResult(leg) === "void" ? 1 : leg.odds),
    1,
  );
}

export function ticketReturn(ticket) {
  const result = ticketResult(ticket);
  if (result === "pending" || result === "lost") return 0;
  if (result === "void") return ticket.stakeCents;
  // Odds have at most three decimal places. Integer arithmetic avoids
  // binary floating-point rounding at half-grosz payout boundaries.
  let numerator = BigInt(ticket.stakeCents);
  let denominator = 1n;
  for (const leg of ticket.legs) {
    if (legResult(leg) === "void") continue;
    numerator *= BigInt(Math.round(leg.odds * 1000));
    denominator *= 1000n;
  }
  return Number((numerator * 2n + denominator) / (denominator * 2n));
}

export function reconcileTicket(ticket, now = new Date().toISOString()) {
  const result = ticketResult(ticket);
  const returnCents = ticketReturn(ticket);
  const unchanged =
    result === ticket.result && returnCents === ticket.returnCents;
  return {
    ...ticket,
    result,
    returnCents,
    settledAt:
      result === "pending"
        ? null
        : unchanged && ticket.settledAt
          ? ticket.settledAt
          : now,
  };
}

export function monthlyLedger(tickets, month) {
  const monthly = tickets.filter((ticket) => ticket.month === month);
  const stats = {
    opening: OPENING_CENTS,
    available: OPENING_CENTS,
    pending: 0,
    staked: 0,
    returned: 0,
    profit: 0,
    wins: 0,
    losses: 0,
    voids: 0,
    settledStake: 0,
    tickets: monthly.length,
  };
  for (const ticket of monthly) {
    const result = ticketResult(ticket);
    const returned = ticketReturn(ticket);
    stats.staked += ticket.stakeCents;
    stats.returned += returned;
    if (result === "pending") stats.pending += ticket.stakeCents;
    else {
      stats.profit += returned - ticket.stakeCents;
      if (result !== "void") stats.settledStake += ticket.stakeCents;
    }
    if (result === "won") stats.wins++;
    if (result === "lost") stats.losses++;
    if (result === "void") stats.voids++;
  }
  stats.available += stats.returned - stats.staked;
  stats.equity = stats.available + stats.pending;
  return stats;
}

export function createTickets(
  existing,
  selections,
  mode,
  stake,
  now = new Date(),
  makeId = () => crypto.randomUUID(),
) {
  if (!["single", "accumulator"].includes(mode))
    throw new Error("Choose a valid ticket type.");
  if (!selections.length) throw new Error("Choose at least one saved pick.");
  const stakeCents = parseStake(stake);
  const ids = new Set();
  const legs = selections.map(({ match, teamId, odds }) => {
    if (ids.has(match.id))
      throw new Error("A match can only appear once in a selection.");
    ids.add(match.id);
    if (![match.homeTeam?.id, match.awayTeam?.id].includes(Number(teamId)))
      throw new Error("Choose a team for every selected match.");
    if (
      FINISHED.has(match.status) ||
      match.status === "CANCELLED" ||
      !Number.isFinite(Date.parse(match.utcDate)) ||
      Date.parse(match.utcDate) <= now.getTime()
    ) {
      throw new Error(
        "Only matches with a future kickoff can be added to new simulations.",
      );
    }
    return {
      match: structuredClone(match),
      teamId: Number(teamId),
      odds: parseOdds(odds),
      override: null,
    };
  });
  const month = localMonth(now);
  const cost = stakeCents * (mode === "single" ? legs.length : 1);
  if (
    !Number.isSafeInteger(cost) ||
    cost > monthlyLedger(existing, month).available
  )
    throw new Error("Not enough available simulated balance for these stakes.");
  const groups = mode === "single" ? legs.map((leg) => [leg]) : [legs];
  return groups.map((group) => {
    const potential = stakeCents * combinedOdds(group);
    if (!Number.isFinite(potential) || potential > 100000000000)
      throw new Error(
        "Combined potential return is too large. Reduce odds or selections.",
      );
    return reconcileTicket({
      id: makeId(),
      month,
      mode,
      stakeCents,
      legs: group,
      createdAt: now.toISOString(),
    });
  });
}

export function refreshTickets(
  tickets,
  matches,
  now = new Date().toISOString(),
) {
  const latest = new Map(matches.map((match) => [match.id, match]));
  return tickets.map((ticket) => {
    if (!ticket.legs.some((leg) => latest.has(leg.match.id))) return ticket;
    return reconcileTicket(
      {
        ...ticket,
        legs: ticket.legs.map((leg) => ({
          ...leg,
          match: latest.get(leg.match.id) || leg.match,
        })),
      },
      now,
    );
  });
}

export function chartSeries(tickets, month) {
  const monthly = tickets.filter((ticket) => ticket.month === month);
  const events = [];
  for (const ticket of monthly) {
    events.push({
      at: ticket.createdAt,
      cash: -ticket.stakeCents,
      profit: 0,
      order: 0,
    });
    if (ticketResult(ticket) !== "pending") {
      const returned = ticketReturn(ticket);
      events.push({
        at: ticket.settledAt || ticket.createdAt,
        cash: returned,
        profit: returned - ticket.stakeCents,
        order: 1,
      });
    }
  }
  events.sort(
    (a, b) => Date.parse(a.at) - Date.parse(b.at) || a.order - b.order,
  );
  const points = [
    { at: `${month}-01T00:00:00`, cash: OPENING_CENTS, profit: 0 },
  ];
  for (const event of events) {
    const previous = points.at(-1);
    points.push({
      at: event.at,
      cash: previous.cash + event.cash,
      profit: previous.profit + event.profit,
    });
  }
  return points;
}
