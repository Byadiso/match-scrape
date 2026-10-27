import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ThemeProvider,
  Typography,
  createTheme,
} from "@mui/material";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import {
  ensureBrowserProfile,
  PROFILE_EVENT,
  readUserJSON,
  userStorage,
} from "../services/browserProfile";
import { TEAMS, fetchMonthlyMatches } from "../services/footballApi";
import { readSimulation, updateSimulation } from "../services/simulatorStore";
import {
  chartSeries,
  combinedOdds,
  createTickets,
  legResult,
  localMonth,
  monthlyLedger,
  reconcileTicket,
  refreshTickets,
  ticketResult,
  ticketReturn,
} from "../services/simulationEngine";
import SimulationCharts from "./SimulationCharts";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#93c5fd" },
    secondary: { main: "#c4b5fd" },
    background: { default: "#11151e", paper: "#191f2c" },
    text: { secondary: "#aab5c5" },
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
    button: { textTransform: "none", fontWeight: 650 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
  },
});
const money = (cents) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    cents / 100,
  );
const percent = (a, b) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
const labelMonth = (month) =>
  new Date(`${month}-01T12:00:00`).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
const teamIds = new Set(TEAMS.map((team) => team.id));
const eligible = (match) =>
  !["FINISHED", "AWARDED", "CANCELLED", "IN_PLAY", "PAUSED"].includes(
    match.status,
  ) && Date.parse(match.utcDate) > Date.now();
const optionsFor = (match) =>
  [match.homeTeam, match.awayTeam].filter(
    (team) => team && teamIds.has(team.id),
  );
const statusColor = {
  pending: "info",
  won: "success",
  lost: "error",
  void: "default",
};

function loadData() {
  const picks = readUserJSON("football-picks-v1", []);
  const teams = readUserJSON("football-pick-teams-v1", {});
  if (!Array.isArray(picks) || !teams || typeof teams !== "object")
    throw new Error("Saved picks could not be read.");
  return { picks, teams, tickets: readSimulation().tickets };
}

function Metric({ label, value, hint, color }) {
  return (
    <Paper variant="outlined" sx={{ p: 2.25 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        sx={{
          fontSize: { xs: "1.35rem", sm: "1.65rem" },
          fontWeight: 800,
          my: 0.75,
          color,
        }}
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">
        {hint}
      </Typography>
    </Paper>
  );
}

export default function BetSimulator() {
  const [data, setData] = useState({ picks: [], teams: {}, tickets: [] });
  const [readError, setReadError] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [month, setMonth] = useState(() => localMonth());
  const [mode, setMode] = useState("single");
  const [stake, setStake] = useState("10");
  const [draft, setDraft] = useState({});
  const [busy, setBusy] = useState(false);
  const [refreshMonth, setRefreshMonth] = useState(() => localMonth());
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  const [manualAction, setManualAction] = useState(null);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [profileId, setProfileId] = useState("");

  useEffect(() => {
    function sync() {
      try {
        setProfileId(ensureBrowserProfile().id);
        setData(loadData());
        setReadError("");
      } catch (err) {
        setReadError(err.message);
      }
    }
    sync();
    window.addEventListener(PROFILE_EVENT, sync);
    window.addEventListener("storage", sync);
    window.addEventListener("focus", sync);
    return () => {
      window.removeEventListener(PROFILE_EVENT, sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const months = useMemo(
    () =>
      [
        ...new Set([
          localMonth(),
          ...data.tickets.map((ticket) => ticket.month),
        ]),
      ]
        .sort()
        .reverse(),
    [data.tickets],
  );
  const stats = useMemo(
    () => monthlyLedger(data.tickets, month),
    [data.tickets, month],
  );
  const history = useMemo(
    () =>
      months
        .map((value) => ({
          month: value,
          ...monthlyLedger(data.tickets, value),
        }))
        .reverse(),
    [data.tickets, months],
  );
  const points = useMemo(
    () => chartSeries(data.tickets, month),
    [data.tickets, month],
  );
  const futurePicks = data.picks
    .filter(eligible)
    .sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate));
  const selectedPicks = futurePicks.filter(
    (match) => draft[match.id]?.selected,
  );
  const displayedTickets = data.tickets
    .filter(
      (ticket) =>
        ticket.month === month &&
        (ticketFilter === "all" || ticketResult(ticket) === ticketFilter),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  const selectedTicket = data.tickets.find(
    (ticket) => ticket.id === selectedTicketId,
  );
  const refreshMonths = [
    ...new Set([
      localMonth(),
      refreshMonth,
      ...data.tickets.flatMap((ticket) =>
        ticket.legs.map((leg) => localMonth(leg.match.utcDate)),
      ),
    ]),
  ]
    .sort()
    .reverse();

  function teamFor(match) {
    const options = optionsFor(match);
    const value = draft[match.id]?.teamId ?? data.teams[match.id];
    return (
      options.find((team) => team.id === Number(value))?.id ||
      (options.length === 1 ? options[0].id : "")
    );
  }
  function changeDraft(id, patch) {
    setDraft((previous) => ({
      ...previous,
      [id]: { ...previous[id], ...patch },
    }));
  }

  const draftLegs = selectedPicks.map((match) => ({
    match,
    teamId: teamFor(match),
    odds: Number(String(draft[match.id]?.odds || "").replace(",", ".")),
  }));
  const totalStake =
    Number(String(stake).replace(",", ".")) *
    100 *
    (mode === "single" ? selectedPicks.length : selectedPicks.length ? 1 : 0);
  const potential =
    draftLegs.length &&
    draftLegs.every((leg) => leg.odds > 1 && leg.odds <= 1000)
      ? Math.round(
          Number(String(stake).replace(",", ".")) *
            100 *
            (mode === "single"
              ? draftLegs.reduce((sum, leg) => sum + leg.odds, 0)
              : combinedOdds(draftLegs)),
        )
      : null;

  async function place(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      if (readError) throw new Error(readError);
      await updateSimulation((current) => {
        const created = createTickets(current.tickets, draftLegs, mode, stake);
        return { ...current, tickets: [...current.tickets, ...created] };
      });
      setDraft({});
      setMonth(localMonth());
      setNotice(
        "Simulation saved. Your stakes are now reserved from this month’s virtual bankroll.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function refreshResults() {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const matches = await fetchMonthlyMatches(refreshMonth, { force: true });
      await updateSimulation((current) => ({
        ...current,
        tickets: refreshTickets(current.tickets, matches),
      }));
      const latest = new Map(matches.map((match) => [match.id, match]));
      const picks = readUserJSON("football-picks-v1", []);
      userStorage.setItem(
        "football-picks-v1",
        JSON.stringify(picks.map((match) => latest.get(match.id) || match)),
      );
      setNotice(
        `${labelMonth(refreshMonth)} results checked. Refreshing again will not credit returns twice. Manual results are preserved.`,
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function confirmManual() {
    setBusy(true);
    setError("");
    try {
      await updateSimulation((current) => ({
        ...current,
        tickets: current.tickets.map((ticket) =>
          ticket.id !== manualAction.ticketId
            ? ticket
            : reconcileTicket({
                ...ticket,
                legs: ticket.legs.map((leg) =>
                  leg.match.id === manualAction.matchId
                    ? {
                        ...leg,
                        override:
                          manualAction.value === "auto"
                            ? null
                            : manualAction.value,
                      }
                    : leg,
                ),
              }),
        ),
      }));
      setManualAction(null);
      setNotice(
        "Simulation result updated. Bankroll and charts have been recalculated.",
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          color: "text.primary",
          py: { xs: 3, md: 5 },
        }}
      >
        <Container maxWidth="lg">
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            spacing={2}
            sx={{ mb: 3 }}
          >
            <Box>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ScienceOutlinedIcon color="primary" />
                <Typography
                  component="h1"
                  sx={{
                    fontSize: { xs: 28, sm: 36 },
                    fontWeight: 800,
                    letterSpacing: "-0.04em",
                  }}
                >
                  Bet simulator
                </Typography>
              </Stack>
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Your picks. Virtual stakes. A fresh 100 PLN bankroll each month.
              </Typography>
            </Box>
            <Stack
              alignItems={{ xs: "flex-start", sm: "flex-end" }}
              spacing={1}
            >
              <Chip
                label={`Browser ${profileId.slice(0, 8)}`}
                variant="outlined"
                size="small"
              />
              <Button component={Link} to="/low-odds-matches">
                View my picks
              </Button>
            </Stack>
          </Stack>
          <Alert severity="info" sx={{ mb: 3 }}>
            Simulation only. No deposits, payouts, or real bets. Data stays in
            this browser profile; other devices have separate histories.
          </Alert>
          {(readError || error) && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {readError || error}
            </Alert>
          )}
          {notice && (
            <Alert
              severity="success"
              onClose={() => setNotice("")}
              sx={{ mb: 3 }}
            >
              {notice}
            </Alert>
          )}

          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ sm: "center" }}
            sx={{ mb: 3 }}
          >
            <TextField
              select
              size="small"
              label="Bankroll month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              sx={{ minWidth: 210 }}
            >
              {months.map((value) => (
                <MenuItem key={value} value={value}>
                  {labelMonth(value)}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary">
              Each month starts at 100 PLN. Unused capital does not roll over.
              Tickets stay assigned to the month they were created.
            </Typography>
          </Stack>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
              gap: 2,
              mb: 2,
            }}
          >
            <Metric
              label="Available balance"
              value={money(stats.available)}
              hint="Opening + returns − stakes"
              color={stats.available < 0 ? "#fca5a5" : "#93c5fd"}
            />
            <Metric
              label="Pending stakes"
              value={money(stats.pending)}
              hint={`${stats.tickets - stats.wins - stats.losses - stats.voids} pending tickets`}
            />
            <Metric
              label="Realized profit / loss"
              value={money(stats.profit)}
              hint={`ROI: ${percent(stats.profit, stats.settledStake)}`}
              color={stats.profit < 0 ? "#fca5a5" : "#86efac"}
            />
            <Metric
              label="Ticket win rate"
              value={percent(stats.wins, stats.wins + stats.losses)}
              hint={`${stats.wins} won · ${stats.losses} lost · ${stats.voids} void`}
            />
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mb: 3 }}
          >
            Opening: {money(stats.opening)} · Total staked:{" "}
            {money(stats.staked)} · Returns: {money(stats.returned)} · Balance
            including pending stakes: {money(stats.equity)}
          </Typography>
          {stats.available < 0 && (
            <Alert severity="warning" sx={{ mb: 3 }}>
              A corrected result has reduced the balance below zero. New
              simulations are blocked until the balance is sufficient.
            </Alert>
          )}

          <SimulationCharts points={points} history={history} />

          <Paper
            component="form"
            onSubmit={place}
            variant="outlined"
            sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}
          >
            <Typography component="h2" variant="h6" fontWeight={750}>
              Build a simulation
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, mb: 3 }}
            >
              New tickets use {labelMonth(localMonth())}’s balance. Only saved
              picks with a future kickoff can be added. Odds are entered
              manually.
            </Typography>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <TextField
                select
                label="Ticket type"
                value={mode}
                onChange={(event) => setMode(event.target.value)}
                sx={{ minWidth: 220 }}
              >
                <MenuItem value="single">Singles — separate tickets</MenuItem>
                <MenuItem value="accumulator">
                  Accumulator — one ticket
                </MenuItem>
              </TextField>
              <TextField
                label={
                  mode === "single"
                    ? "Stake per selected match (PLN)"
                    : "Total ticket stake (PLN)"
                }
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                slotProps={{ htmlInput: { inputMode: "decimal" } }}
              />
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Decimal odds, e.g. 1.80. A 10 PLN win at 1.80 returns 18 PLN,
              including the 10 PLN stake.
            </Typography>
            {!futurePicks.length ? (
              <Alert severity="info" sx={{ my: 3 }}>
                No eligible picks yet. Add a future match in{" "}
                <Link to="/upcoming-matches" style={{ color: "inherit" }}>
                  Upcoming matches
                </Link>
                .
              </Alert>
            ) : (
              <Stack spacing={1.5} sx={{ my: 3 }}>
                {futurePicks.map((match) => (
                  <Paper
                    key={match.id}
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderColor: draft[match.id]?.selected
                        ? "primary.main"
                        : "divider",
                    }}
                  >
                    <Stack
                      direction={{ xs: "column", md: "row" }}
                      spacing={2}
                      alignItems={{ md: "center" }}
                    >
                      <FormControlLabel
                        sx={{ flex: 1, m: 0 }}
                        control={
                          <Checkbox
                            checked={Boolean(draft[match.id]?.selected)}
                            onChange={(event) =>
                              changeDraft(match.id, {
                                selected: event.target.checked,
                              })
                            }
                          />
                        }
                        label={
                          <Box>
                            <Typography variant="body2" fontWeight={700}>
                              {match.homeTeam.name} vs {match.awayTeam.name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {new Date(match.utcDate).toLocaleString()} ·{" "}
                              {match.competition?.name}
                            </Typography>
                          </Box>
                        }
                      />
                      <TextField
                        select
                        size="small"
                        label="Team to win"
                        value={teamFor(match)}
                        onChange={(event) =>
                          changeDraft(match.id, { teamId: event.target.value })
                        }
                        sx={{ minWidth: 190 }}
                      >
                        <MenuItem value="" disabled>
                          Choose team
                        </MenuItem>
                        {optionsFor(match).map((team) => (
                          <MenuItem key={team.id} value={team.id}>
                            {team.name}
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        size="small"
                        label="Decimal odds"
                        value={draft[match.id]?.odds || ""}
                        onChange={(event) =>
                          changeDraft(match.id, { odds: event.target.value })
                        }
                        slotProps={{ htmlInput: { inputMode: "decimal" } }}
                        sx={{ width: { xs: "100%", md: 145 } }}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
            <Divider sx={{ mb: 2 }} />
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              spacing={2}
              alignItems={{ sm: "center" }}
            >
              <Box>
                <Typography fontWeight={700}>
                  {selectedPicks.length} selections · Total stake{" "}
                  {Number.isFinite(totalStake)
                    ? money(Math.round(totalStake))
                    : "—"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Potential gross return if all win:{" "}
                  {potential !== null && Number.isFinite(potential)
                    ? money(potential)
                    : "—"}
                </Typography>
              </Box>
              <Button
                type="submit"
                variant="contained"
                disabled={busy || Boolean(readError) || !selectedPicks.length}
              >
                Save simulation
              </Button>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mt: 3 }}>
            <Typography component="h2" variant="h6" fontWeight={750}>
              Update results
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mt: 1, mb: 2 }}
            >
              Choose the month the matches take place in. A finished team-win
              selection loses on a draw. Cancelled matches are void; postponed
              or suspended matches stay pending. Manual overrides are never
              overwritten.
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                select
                size="small"
                label="Match month"
                value={refreshMonth}
                onChange={(event) => setRefreshMonth(event.target.value)}
                sx={{ minWidth: 220 }}
              >
                {refreshMonths.map((value) => (
                  <MenuItem key={value} value={value}>
                    {labelMonth(value)}
                  </MenuItem>
                ))}
              </TextField>
              <Button
                startIcon={<RefreshRoundedIcon />}
                variant="outlined"
                disabled={busy || Boolean(readError)}
                onClick={refreshResults}
              >
                {busy ? "Working…" : "Refresh API results"}
              </Button>
            </Stack>
          </Paper>

          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ mt: 4, mb: 2 }}
          >
            <Typography component="h2" variant="h6" fontWeight={750}>
              Simulation history
            </Typography>
            <TextField
              select
              size="small"
              label="Status"
              value={ticketFilter}
              onChange={(event) => setTicketFilter(event.target.value)}
              sx={{ minWidth: 150 }}
            >
              {["all", "pending", "won", "lost", "void"].map((value) => (
                <MenuItem key={value} value={value}>
                  {value === "all"
                    ? "All tickets"
                    : value.charAt(0).toUpperCase() + value.slice(1)}
                </MenuItem>
              ))}
            </TextField>
          </Stack>
          <TableContainer component={Paper} variant="outlined">
            <Table
              size="small"
              sx={{ minWidth: 740 }}
              aria-label="Simulation tickets"
            >
              <TableHead>
                <TableRow>
                  {[
                    "Created",
                    "Ticket",
                    "Stake",
                    "Result",
                    "Return",
                    "Net P/L",
                    "",
                  ].map((label, index) => (
                    <TableCell key={index}>{label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {displayedTickets.map((ticket) => {
                  const result = ticketResult(ticket);
                  const returned = ticketReturn(ticket);
                  return (
                    <TableRow key={ticket.id}>
                      <TableCell>
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {ticket.mode === "single" ? "Single" : "Accumulator"}{" "}
                          · {ticket.legs.length} selection
                          {ticket.legs.length > 1 ? "s" : ""}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Original odds {combinedOdds(ticket.legs).toFixed(3)}
                        </Typography>
                      </TableCell>
                      <TableCell>{money(ticket.stakeCents)}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          color={statusColor[result]}
                          label={result}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {result === "pending" ? "—" : money(returned)}
                      </TableCell>
                      <TableCell
                        sx={{
                          color:
                            result === "pending"
                              ? "text.secondary"
                              : returned - ticket.stakeCents < 0
                                ? "#fca5a5"
                                : "#86efac",
                        }}
                      >
                        {result === "pending"
                          ? "Pending"
                          : money(returned - ticket.stakeCents)}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="small"
                          onClick={() => setSelectedTicketId(ticket.id)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!displayedTickets.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      sx={{
                        textAlign: "center",
                        py: 5,
                        color: "text.secondary",
                      }}
                    >
                      No tickets for this month and filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2 }}
          >
            Win rate = won ÷ (won + lost). ROI = realized profit ÷ settled
            non-void stakes. Returns include the original stake. Removing a
            saved pick never deletes an existing simulation ticket.
          </Typography>

          <Dialog
            open={Boolean(selectedTicket)}
            onClose={() => setSelectedTicketId(null)}
            fullWidth
            maxWidth="sm"
          >
            <DialogTitle>Simulation ticket</DialogTitle>
            <DialogContent>
              {selectedTicket && (
                <Stack spacing={2}>
                  <Alert severity="info">
                    Final-winner market, including extra time or penalties. A
                    draw loses a team-win selection. A void leg uses odds of
                    1.00; all void legs return the stake.
                  </Alert>
                  <Typography variant="body2">
                    Stake {money(selectedTicket.stakeCents)} · Assigned to{" "}
                    {labelMonth(selectedTicket.month)}
                  </Typography>
                  {selectedTicket.legs.map((leg) => (
                    <Paper key={leg.match.id} variant="outlined" sx={{ p: 2 }}>
                      <Typography fontWeight={700}>
                        {leg.match.homeTeam.name} vs {leg.match.awayTeam.name}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ my: 1 }}
                      >
                        Team to win:{" "}
                        {
                          [leg.match.homeTeam, leg.match.awayTeam].find(
                            (team) => team.id === leg.teamId,
                          )?.name
                        }{" "}
                        · Odds {leg.odds.toFixed(3)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(leg.match.utcDate).toLocaleString()} ·{" "}
                        {leg.override ? "Manual result" : "API result"}:{" "}
                        {legResult(leg)}
                      </Typography>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Simulation result"
                        value={leg.override || "auto"}
                        disabled={busy}
                        onChange={(event) =>
                          setManualAction({
                            ticketId: selectedTicket.id,
                            matchId: leg.match.id,
                            value: event.target.value,
                          })
                        }
                        sx={{ mt: 2 }}
                      >
                        {[
                          ["auto", "Use API result"],
                          ["pending", "Manual: pending"],
                          ["won", "Manual: won"],
                          ["lost", "Manual: lost"],
                          ["void", "Manual: void"],
                        ].map(([value, label]) => (
                          <MenuItem key={value} value={value}>
                            {label}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Paper>
                  ))}
                </Stack>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedTicketId(null)}>Close</Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={Boolean(manualAction)}
            onClose={() => !busy && setManualAction(null)}
          >
            <DialogTitle>Change simulated result?</DialogTitle>
            <DialogContent>
              <Typography>
                This recalculates the ticket, balance, and charts. Correcting a
                credited win can reduce your balance. Manual results remain in
                place until you choose “Use API result”.
              </Typography>
            </DialogContent>
            <DialogActions>
              <Button disabled={busy} onClick={() => setManualAction(null)}>
                Cancel
              </Button>
              <Button
                disabled={busy}
                variant="contained"
                onClick={confirmManual}
              >
                Apply result
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
