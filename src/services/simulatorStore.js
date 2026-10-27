import {
  readUserJSON,
  userStorage,
  ensureBrowserProfile,
} from "./browserProfile";
import { SIMULATION_KEY } from "./simulationEngine";

export function readSimulation() {
  const state = readUserJSON(SIMULATION_KEY, { version: 1, tickets: [] });
  if (
    state?.version !== 1 ||
    !Array.isArray(state.tickets) ||
    state.tickets.some(
      (ticket) =>
        !ticket.id ||
        !/^\d{4}-(0[1-9]|1[0-2])$/.test(ticket.month) ||
        !Number.isSafeInteger(ticket.stakeCents) ||
        ticket.stakeCents <= 0 ||
        !Number.isFinite(Date.parse(ticket.createdAt)) ||
        !Array.isArray(ticket.legs) ||
        !ticket.legs.length ||
        ticket.legs.some(
          (leg) =>
            !leg.match?.id ||
            !Number.isFinite(leg.odds) ||
            leg.odds <= 1 ||
            ![leg.match.homeTeam?.id, leg.match.awayTeam?.id].includes(
              leg.teamId,
            ) ||
            ![null, undefined, "pending", "won", "lost", "void"].includes(
              leg.override,
            ),
        ),
    )
  ) {
    throw new Error(
      "Saved simulation data is unreadable. It has not been replaced. Keep your browser storage for recovery.",
    );
  }
  return state;
}

// Re-read inside the lock so simultaneous tabs cannot spend the same balance.
export async function updateSimulation(transform) {
  const commit = () => {
    const current = readSimulation();
    const next = transform(current);
    userStorage.setItem(SIMULATION_KEY, JSON.stringify(next));
    return next;
  };
  const lockName = `football-simulator:${ensureBrowserProfile().id}`;
  if (globalThis.navigator?.locks) {
    return navigator.locks.request(lockName, commit);
  }
  return commit();
}
