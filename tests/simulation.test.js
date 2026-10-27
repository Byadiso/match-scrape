import test from "node:test";
import assert from "node:assert/strict";
import {
  createTickets,
  monthlyLedger,
  reconcileTicket,
  refreshTickets,
  ticketResult,
  ticketReturn,
  chartSeries,
  parseStake,
  parseOdds,
} from "../src/services/simulationEngine.js";

const now = new Date("2026-10-10T12:00:00Z");
let sequence = 0;
const makeId = () => `ticket-${++sequence}`;
const match = (id = 1, changes = {}) => ({
  id,
  utcDate: "2026-10-20T18:00:00Z",
  status: "TIMED",
  homeTeam: { id: 57, name: "Arsenal" },
  awayTeam: { id: 524, name: "PSG" },
  score: { winner: null },
  ...changes,
});
const selection = (id = 1, odds = 2) => ({
  match: match(id),
  teamId: 57,
  odds,
});
const create = (
  legs = [selection()],
  mode = "single",
  stake = "10",
  existing = [],
) => createTickets(existing, legs, mode, stake, now, makeId);
const settle = (ticket, outcomes) =>
  reconcileTicket(
    {
      ...ticket,
      legs: ticket.legs.map((leg, i) => ({ ...leg, override: outcomes[i] })),
    },
    "2026-10-21T12:00:00Z",
  );

test("single win returns stake plus profit, while pending reserves the stake", () => {
  const [ticket] = create();
  assert.equal(monthlyLedger([ticket], "2026-10").available, 9000);
  assert.equal(monthlyLedger([ticket], "2026-10").pending, 1000);
  const won = settle(ticket, ["won"]);
  assert.equal(ticketReturn(won), 2000);
  const ledger = monthlyLedger([won], "2026-10");
  assert.equal(ledger.available, 11000);
  assert.equal(ledger.profit, 1000);
  assert.equal(ledger.pending, 0);
});

test("loss consumes stake; void returns it with no profit", () => {
  const [ticket] = create();
  assert.equal(
    monthlyLedger([settle(ticket, ["lost"])], "2026-10").available,
    9000,
  );
  const ledger = monthlyLedger([settle(ticket, ["void"])], "2026-10");
  assert.equal(ledger.available, 10000);
  assert.equal(ledger.profit, 0);
  assert.equal(ledger.settledStake, 0);
});

test("accumulator multiplies odds, loses on one loss, and handles void legs", () => {
  const [ticket] = create([selection(1, 2), selection(2, 3)], "accumulator");
  assert.equal(ticketReturn(settle(ticket, ["won", "won"])), 6000);
  assert.equal(ticketReturn(settle(ticket, ["won", "void"])), 2000);
  assert.equal(ticketReturn(settle(ticket, ["void", "void"])), 1000);
  assert.equal(ticketResult(settle(ticket, ["pending", "lost"])), "lost");
  assert.equal(ticketReturn(settle(ticket, ["pending", "lost"])), 0);
  assert.equal(ticketResult(settle(ticket, ["won", "pending"])), "pending");
});

test("singles create distinct tickets and validate the total batch cost", () => {
  assert.equal(create([selection(1), selection(2)]).length, 2);
  assert.throws(
    () => create([selection(1), selection(2)], "single", "60"),
    /Not enough/,
  );
  assert.throws(() => create([selection(1), selection(1)]), /only appear once/);
});

test("reject invalid inputs, unselected teams, past matches, and finished games", () => {
  for (const value of ["-1", "0", "NaN", "Infinity", "1.001", "1e3"])
    assert.throws(() => parseStake(value));
  for (const value of ["1", "0", "-2", "NaN", "2.0001", "1001"])
    assert.throws(() => parseOdds(value));
  assert.equal(parseStake("10,50"), 1050);
  assert.equal(parseOdds("1,80"), 1.8);
  assert.throws(
    () => create([{ ...selection(), teamId: 81 }]),
    /Choose a team/,
  );
  assert.throws(
    () => create([{ ...selection(), match: match(1, { status: "FINISHED" }) }]),
    /future kickoff/,
  );
  assert.throws(
    () =>
      create([
        {
          ...selection(),
          match: match(1, { utcDate: "2026-01-01T00:00:00Z" }),
        },
      ]),
    /future kickoff/,
  );
});

test("result refresh is idempotent and honors manual overrides", () => {
  const [ticket] = create();
  const finished = match(1, {
    status: "FINISHED",
    score: { winner: "HOME_TEAM" },
  });
  const once = refreshTickets([ticket], [finished], "2026-10-21T00:00:00Z");
  const twice = refreshTickets(once, [finished], "2026-10-22T00:00:00Z");
  assert.deepEqual(once, twice);
  assert.equal(monthlyLedger(twice, "2026-10").available, 11000);
  const overridden = settle(ticket, ["lost"]);
  assert.equal(
    ticketResult(refreshTickets([overridden], [finished])[0]),
    "lost",
  );
});

test("draw loses, cancellation voids, postponement stays pending", () => {
  const [ticket] = create();
  for (const [changes, expected] of [
    [{ status: "FINISHED", score: { winner: "DRAW" } }, "lost"],
    [{ status: "CANCELLED" }, "void"],
    [{ status: "POSTPONED" }, "pending"],
    [{ status: "FINISHED", score: { winner: null } }, "pending"],
  ])
    assert.equal(
      ticketResult(refreshTickets([ticket], [match(1, changes)])[0]),
      expected,
    );
});

test("later-month settlement stays in original bankroll and new month resets to 100", () => {
  const [ticket] = create();
  const won = settle(ticket, ["won"]);
  won.settledAt = "2026-11-01T12:00:00Z";
  assert.equal(monthlyLedger([won], "2026-10").available, 11000);
  assert.equal(monthlyLedger([won], "2026-11").available, 10000);
  const points = chartSeries([won], "2026-10");
  assert.equal(points.at(-1).cash, 11000);
  assert.equal(points.at(-1).profit, 1000);
});

test("manual corrections recalculate and reopening reserves stake without duplicate credit", () => {
  const [ticket] = create();
  assert.equal(
    monthlyLedger([settle(ticket, ["won"])], "2026-10").available,
    11000,
  );
  assert.equal(
    monthlyLedger([settle(ticket, ["lost"])], "2026-10").available,
    9000,
  );
  const reopened = settle(settle(ticket, ["won"]), ["pending"]);
  assert.equal(reopened.settledAt, null);
  assert.equal(monthlyLedger([reopened], "2026-10").available, 9000);
  assert.equal(monthlyLedger([reopened], "2026-10").pending, 1000);
});

test("payout rounds half a grosz consistently using integer arithmetic", () => {
  const [ticket] = create([selection(1, 1.005)], "single", "1");
  assert.equal(ticketReturn(settle(ticket, ["won"])), 101);
});

test("available balance prevents spending pending stakes twice", () => {
  const existing = create([selection()], "single", "95");
  assert.throws(
    () => create([selection(2)], "single", "10", existing),
    /Not enough/,
  );
});
