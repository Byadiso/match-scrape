import { userStorage } from "../services/browserProfile";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
  Typography,
} from "@mui/material";

import ChevronLeftRoundedIcon from "@mui/icons-material/ChevronLeftRounded";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

import { fetchMonthlyMatches, TEAMS } from "../services/footballApi";

const PICKS_KEY = "football-picks-v1";
const TEAMS_KEY = "football-pick-teams-v1";
const CHANGE_EVENT = "football-picks-changed";

const CLUB_IDS = new Set(TEAMS.map((team) => team.id));
const FINISHED = new Set(["FINISHED", "AWARDED"]);

const RESULTS = {
  won: { label: "Won", color: "#86efac" },
  lost: { label: "Lost", color: "#fca5a5" },
  draw: { label: "Draw", color: "#fcd34d" },
  pending: { label: "Pending", color: "#93c5fd" },
  choose: { label: "Choose team", color: "#c4b5fd" },
  cancelled: { label: "Cancelled", color: "#94a3b8" },
};

const panelStyle = {
  backgroundColor: "#171c28",
  backgroundImage: "none",
  color: "#eef2f8",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 3,
};

function readJSON(key, fallback) {
  try {
    return JSON.parse(userStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function readPicks() {
  const saved = readJSON(PICKS_KEY, []);

  if (!Array.isArray(saved)) return [];

  return [
    ...new Map(
      saved
        .filter(
          (match) =>
            match?.id &&
            match.utcDate &&
            !Number.isNaN(Date.parse(match.utcDate)),
        )
        .map((match) => [match.id, match]),
    ).values(),
  ];
}

function readTeams() {
  const saved = readJSON(TEAMS_KEY, {});

  return saved && typeof saved === "object" && !Array.isArray(saved)
    ? saved
    : {};
}

function monthKey(value = new Date()) {
  const date = new Date(value);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function dayKey(value) {
  const date = new Date(value);

  return `${monthKey(date)}-${String(date.getDate()).padStart(2, "0")}`;
}

function shiftMonth(month, amount) {
  const [year, number] = month.split("-").map(Number);

  return monthKey(new Date(year, number - 1 + amount, 1));
}

function monthLabel(month) {
  const [year, number] = month.split("-").map(Number);

  return new Date(year, number - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function getTeams(match) {
  return [match.homeTeam, match.awayTeam].filter(
    (team) => team && CLUB_IDS.has(team.id),
  );
}

function getTrackedTeam(match, selections) {
  const teams = getTeams(match);

  return (
    teams.find((team) => team.id === Number(selections[match.id])) ||
    (teams.length === 1 ? teams[0] : null)
  );
}

function getOutcome(match, selections) {
  if (match.status === "CANCELLED") return "cancelled";

  const team = getTrackedTeam(match, selections);

  if (!team) return "choose";
  if (!FINISHED.has(match.status)) return "pending";

  const winner = match.score?.winner;

  if (winner === "DRAW") return "draw";

  if (!["HOME_TEAM", "AWAY_TEAM"].includes(winner)) {
    return "pending";
  }

  const winningTeam = winner === "HOME_TEAM" ? match.homeTeam : match.awayTeam;

  return winningTeam?.id === team.id ? "won" : "lost";
}

function percentage(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "—";
}

function getStats(matches, selections) {
  const stats = {
    total: matches.length,
    won: 0,
    lost: 0,
    draw: 0,
    pending: 0,
    choose: 0,
    cancelled: 0,
  };

  for (const match of matches) {
    stats[getOutcome(match, selections)] += 1;
  }

  stats.completed = stats.won + stats.lost + stats.draw;

  return stats;
}

function ResultChip({ result }) {
  const style = RESULTS[result];

  return (
    <Chip
      size="small"
      label={style.label}
      sx={{
        color: style.color,
        backgroundColor: `${style.color}16`,
        fontWeight: 700,
      }}
    />
  );
}

function CalendarMonth({
  month,
  matches,
  selections,
  onOpen,
  onRefresh,
  refreshing,
}) {
  const [year, number] = month.split("-").map(Number);
  const firstDay = new Date(year, number - 1, 1);
  const offset = (firstDay.getDay() + 6) % 7;
  const days = new Date(year, number, 0).getDate();
  const cells = Math.ceil((offset + days) / 7) * 7;
  const today = dayKey(new Date());

  const matchesByDay = new Map();

  for (const match of matches) {
    const key = dayKey(match.utcDate);

    if (!matchesByDay.has(key)) {
      matchesByDay.set(key, []);
    }

    matchesByDay.get(key).push(match);
  }

  return (
    <Paper elevation={0} sx={{ ...panelStyle, overflow: "hidden" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={2}
        sx={{ p: 2.5 }}
      >
        <Box>
          <Typography component="h3" fontWeight={700}>
            {monthLabel(month)}
          </Typography>

          <Typography variant="caption" sx={{ color: "#aab5c5" }}>
            {matches.length} saved picks
          </Typography>
        </Box>

        <Button
          size="small"
          startIcon={<RefreshRoundedIcon />}
          disabled={refreshing}
          onClick={() => onRefresh(month)}
          sx={{
            color: "#93c5fd",
            textTransform: "none",
            flexShrink: 0,
          }}
        >
          Refresh results
        </Button>
      </Stack>

      <Box
        tabIndex={0}
        aria-label={`${monthLabel(month)} calendar. Scroll horizontally on small screens.`}
        sx={{
          overflowX: "auto",
          "&:focus-visible": {
            outline: "2px solid #93c5fd",
            outlineOffset: -2,
          },
        }}
      >
        <Box sx={{ minWidth: 700 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
              backgroundColor: "rgba(255,255,255,0.025)",
            }}
          >
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
              <Typography
                key={day}
                variant="caption"
                sx={{
                  p: 1.5,
                  textAlign: "center",
                  color: "#aab5c5",
                  fontWeight: 700,
                }}
              >
                {day}
              </Typography>
            ))}
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
            }}
          >
            {Array.from({ length: cells }, (_, index) => {
              const day = index - offset + 1;
              const valid = day > 0 && day <= days;
              const key = valid
                ? `${month}-${String(day).padStart(2, "0")}`
                : "";

              const dailyMatches = matchesByDay.get(key) || [];

              return (
                <Box
                  key={index}
                  sx={{
                    minHeight: 118,
                    p: 1,
                    borderTop: "1px solid rgba(255,255,255,0.07)",
                    borderRight: "1px solid rgba(255,255,255,0.05)",
                    backgroundColor: !valid
                      ? "rgba(0,0,0,0.12)"
                      : key === today
                        ? "rgba(147,197,253,0.045)"
                        : "transparent",
                  }}
                >
                  {valid && (
                    <>
                      <Typography
                        variant="caption"
                        sx={{
                          display: "inline-grid",
                          placeItems: "center",
                          width: 25,
                          height: 25,
                          mb: 0.75,
                          borderRadius: "50%",
                          fontWeight: key === today ? 800 : 500,
                          backgroundColor:
                            key === today ? "#93c5fd" : "transparent",
                          color: key === today ? "#101827" : "#aab5c5",
                        }}
                      >
                        {day}
                      </Typography>

                      <Stack spacing={0.75}>
                        {dailyMatches.map((match) => {
                          const result = getOutcome(match, selections);
                          const style = RESULTS[result];

                          return (
                            <Box
                              component="button"
                              type="button"
                              key={match.id}
                              onClick={() => onOpen(match.id)}
                              aria-label={`${match.homeTeam?.name} versus ${match.awayTeam?.name}: ${style.label}`}
                              sx={{
                                width: "100%",
                                textAlign: "left",
                                font: "inherit",
                                cursor: "pointer",
                                borderRadius: 1.5,
                                border: `1px solid ${style.color}55`,
                                borderLeft: `3px solid ${style.color}`,
                                backgroundColor: `${style.color}0d`,
                                color: "#eef2f8",
                                p: 0.85,
                                "&:hover": {
                                  backgroundColor: `${style.color}22`,
                                },
                                "&:focus-visible": {
                                  outline: `2px solid ${style.color}`,
                                  outlineOffset: 2,
                                },
                              }}
                            >
                              <Typography
                                component="span"
                                sx={{
                                  display: "block",
                                  fontSize: 11,
                                  color: style.color,
                                  fontWeight: 700,
                                }}
                              >
                                {style.label}
                              </Typography>

                              <Typography
                                component="span"
                                sx={{
                                  display: "block",
                                  fontSize: 11,
                                  lineHeight: 1.5,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {match.homeTeam?.tla ||
                                  match.homeTeam?.shortName ||
                                  match.homeTeam?.name}
                                {" · "}
                                {match.awayTeam?.tla ||
                                  match.awayTeam?.shortName ||
                                  match.awayTeam?.name}
                              </Typography>

                              <Typography
                                component="span"
                                sx={{
                                  display: "block",
                                  fontSize: 10,
                                  color: "#aab5c5",
                                }}
                              >
                                {match.status === "SCHEDULED"
                                  ? "Time TBC"
                                  : new Date(match.utcDate).toLocaleTimeString(
                                      undefined,
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Stack>
                    </>
                  )}
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Paper>
  );
}

export default function LowOddsMatches({
  picks: suppliedPicks,
  onRemovePick,
  onUpdatePicks,
}) {
  const [savedPicks, setSavedPicks] = useState(readPicks);
  const [selections, setSelections] = useState(readTeams);
  const [startMonth, setStartMonth] = useState(() => monthKey());
  const [selectedId, setSelectedId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const picks = suppliedPicks ?? savedPicks;
  const months = [startMonth, shiftMonth(startMonth, 1)];

  useEffect(() => {
    function sync() {
      setSavedPicks(readPicks());
      setSelections(readTeams());
    }

    function handleStorage(event) {
      if (
        userStorage.matches(event.key, PICKS_KEY) ||
        userStorage.matches(event.key, TEAMS_KEY) ||
        event.key === null
      ) {
        sync();
      }
    }

    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", sync);

    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const sortedPicks = useMemo(
    () =>
      [...picks].sort((a, b) => Date.parse(a.utcDate) - Date.parse(b.utcDate)),
    [picks],
  );

  const selectedMatch = picks.find((match) => match.id === selectedId) || null;

  const selectedTeam = selectedMatch
    ? getTrackedTeam(selectedMatch, selections)
    : null;

  const selectableTeams = selectedMatch ? getTeams(selectedMatch) : [];

  function savePicks(updated) {
    userStorage.setItem(PICKS_KEY, JSON.stringify(updated));

    setSavedPicks(updated);
    onUpdatePicks?.(updated);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function chooseTeam(matchId, teamId) {
    const updated = {
      ...readTeams(),
      [matchId]: Number(teamId),
    };

    try {
      userStorage.setItem(TEAMS_KEY, JSON.stringify(updated));

      setSelections(updated);
      setError("");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setError("Could not save the selected team.");
    }
  }

  function removePick(matchId) {
    try {
      if (suppliedPicks !== undefined) {
        if (typeof onRemovePick !== "function") {
          throw new Error("Missing remove callback.");
        }

        onRemovePick(matchId);
      } else {
        savePicks(readPicks().filter((match) => match.id !== matchId));
      }

      setSelectedId(null);
      setError("");
    } catch {
      setError("Could not remove this pick.");
    }
  }

  async function refreshResults(month) {
    setRefreshing(true);
    setError("");
    setNotice("");

    try {
      if (suppliedPicks !== undefined && typeof onUpdatePicks !== "function") {
        throw new Error("Pass onUpdatePicks={setPicks} to the tracker.");
      }

      const fresh = await fetchMonthlyMatches(month, {
        force: true,
      });

      const latest = new Map(fresh.map((match) => [match.id, match]));

      const updated = readPicks().map((match) => latest.get(match.id) || match);

      savePicks(updated);

      setNotice(
        `${monthLabel(month)} results updated. Scores and statuses may still be delayed by the API.`,
      );
    } catch (err) {
      setError(err.message || "Could not refresh results.");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Box
      component="section"
      aria-label="Pick performance tracker"
      sx={{
        color: "#eef2f8",
        backgroundColor: "#121212",
        borderRadius: 3,
        p: { xs: 1, sm: 3 },
        my: 3,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Box>
          <Typography
            component="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: "1.7rem", sm: "2rem" },
              letterSpacing: "-0.04em",
            }}
          >
            Pick tracker
          </Typography>

          <Typography variant="body2" sx={{ mt: 0.75, color: "#aab5c5" }}>
            {picks.length} saved picks · Monthly results and performance
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            aria-label="Previous month"
            disabled={startMonth <= "2000-01"}
            onClick={() => setStartMonth((month) => shiftMonth(month, -1))}
            sx={{ minWidth: 40, color: "#cbd5e1" }}
          >
            <ChevronLeftRoundedIcon />
          </Button>

          <Button
            onClick={() => setStartMonth(monthKey())}
            sx={{
              textTransform: "none",
              color: "#93c5fd",
            }}
          >
            Current month
          </Button>

          <Button
            aria-label="Next month"
            disabled={startMonth >= "2100-11"}
            onClick={() => setStartMonth((month) => shiftMonth(month, 1))}
            sx={{ minWidth: 40, color: "#cbd5e1" }}
          >
            <ChevronRightRoundedIcon />
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {notice && (
        <Alert severity="info" sx={{ mb: 2 }}>
          {notice}
        </Alert>
      )}

      <TableContainer
        component={Paper}
        elevation={0}
        sx={{ ...panelStyle, mb: 2 }}
      >
        <Table
          size="small"
          aria-label="Monthly pick performance"
          sx={{
            minWidth: 850,
            "& th, & td": {
              color: "#cbd5e1",
              borderColor: "rgba(255,255,255,0.08)",
              py: 1.75,
              whiteSpace: "nowrap",
            },
            "& th": {
              fontWeight: 700,
            },
          }}
        >
          <TableHead>
            <TableRow>
              {[
                "Month",
                "Picks",
                "Won",
                "Lost",
                "Draw",
                "Unresolved",
                "Cancelled",
                "Win rate",
                "Loss rate",
                "Losses / all picks",
              ].map((label, index) => (
                <TableCell key={label} align={index === 0 ? "left" : "right"}>
                  {label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>

          <TableBody>
            {months.map((month) => {
              const monthlyPicks = picks.filter(
                (match) => monthKey(match.utcDate) === month,
              );

              const stats = getStats(monthlyPicks, selections);

              return (
                <TableRow key={month}>
                  <TableCell>{monthLabel(month)}</TableCell>
                  <TableCell align="right">{stats.total}</TableCell>

                  <TableCell align="right">
                    <Box component="span" sx={{ color: RESULTS.won.color }}>
                      {stats.won}
                    </Box>
                  </TableCell>

                  <TableCell align="right">
                    <Box component="span" sx={{ color: RESULTS.lost.color }}>
                      {stats.lost}
                    </Box>
                  </TableCell>

                  <TableCell align="right">{stats.draw}</TableCell>

                  <TableCell align="right">
                    {stats.pending + stats.choose}
                  </TableCell>

                  <TableCell align="right">{stats.cancelled}</TableCell>

                  <TableCell align="right">
                    {percentage(stats.won, stats.completed)}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(stats.lost, stats.completed)}
                  </TableCell>

                  <TableCell align="right">
                    {percentage(stats.lost, stats.total)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Typography
        variant="caption"
        sx={{
          display: "block",
          color: "#aab5c5",
          mb: 3,
          lineHeight: 1.8,
        }}
      >
        Win and loss rates use completed picks: wins, losses, and draws.
        Pending, unassigned, and cancelled picks are excluded. “Losses / all
        picks” uses every saved pick in the month.
      </Typography>

      <Stack
        direction="row"
        spacing={1}
        useFlexGap
        flexWrap="wrap"
        sx={{ mb: 3 }}
      >
        {Object.keys(RESULTS).map((result) => (
          <ResultChip key={result} result={result} />
        ))}
      </Stack>

      <Typography variant="body2" sx={{ color: "#aab5c5", mb: 2 }}>
        Select a match for details. Dates use your local timezone. On mobile,
        swipe the calendar sideways.
      </Typography>

      {picks.length === 0 && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Mark a match as a pick in Upcoming matches to start tracking.
        </Alert>
      )}

      <Stack spacing={3}>
        {months.map((month) => (
          <CalendarMonth
            key={month}
            month={month}
            matches={sortedPicks.filter(
              (match) => monthKey(match.utcDate) === month,
            )}
            selections={selections}
            onOpen={setSelectedId}
            onRefresh={refreshResults}
            refreshing={refreshing}
          />
        ))}
      </Stack>

      <Dialog
        open={Boolean(selectedMatch)}
        onClose={() => setSelectedId(null)}
        fullWidth
        maxWidth="sm"
        slotProps={{
          paper: {
            sx: panelStyle,
          },
        }}
      >
        {selectedMatch && (
          <>
            <DialogTitle sx={{ fontWeight: 700 }}>
              {selectedMatch.homeTeam?.name}
              {" vs "}
              {selectedMatch.awayTeam?.name}
            </DialogTitle>

            <DialogContent>
              <Typography variant="body2" sx={{ color: "#aab5c5", mb: 2 }}>
                {selectedMatch.competition?.name}
                {" · "}
                {new Date(selectedMatch.utcDate).toLocaleString()}
              </Typography>

              <ResultChip result={getOutcome(selectedMatch, selections)} />

              {selectedMatch.score?.fullTime?.home != null &&
                selectedMatch.score?.fullTime?.away != null && (
                  <Typography variant="h4" fontWeight={800} sx={{ my: 2 }}>
                    {selectedMatch.score.fullTime.home}
                    {" – "}
                    {selectedMatch.score.fullTime.away}
                  </Typography>
                )}

              <Typography variant="body2" sx={{ mt: 2, color: "#cbd5e1" }}>
                Tracking:{" "}
                {selectedTeam?.name || "Choose the team you picked to win"}
              </Typography>

              {selectableTeams.length > 1 && (
                <TextField
                  select
                  fullWidth
                  label="Team you picked to win"
                  value={selectedTeam?.id || ""}
                  onChange={(event) =>
                    chooseTeam(selectedMatch.id, event.target.value)
                  }
                  slotProps={{
                    select: {
                      MenuProps: {
                        PaperProps: {
                          sx: {
                            backgroundColor: "#202635",
                            color: "#eef2f8",
                          },
                        },
                      },
                    },
                  }}
                  sx={{
                    mt: 3,
                    "& .MuiInputBase-root": {
                      color: "#eef2f8",
                    },
                    "& .MuiInputLabel-root": {
                      color: "#aab5c5",
                    },
                    "& .MuiOutlinedInput-notchedOutline": {
                      borderColor: "#64748b",
                    },
                    "& .MuiSelect-icon": {
                      color: "#aab5c5",
                    },
                  }}
                >
                  <MenuItem value="" disabled>
                    Choose your team
                  </MenuItem>

                  {selectableTeams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 2,
                  color: "#aab5c5",
                  lineHeight: 1.8,
                }}
              >
                Results follow the API’s final winner, including extra time or
                penalties. This tracks team wins rather than a 90-minute betting
                result.
              </Typography>
            </DialogContent>

            <DialogActions
              sx={{
                px: 3,
                pb: 2,
                justifyContent: "space-between",
              }}
            >
              <Button
                color="error"
                onClick={() => removePick(selectedMatch.id)}
                sx={{ textTransform: "none" }}
              >
                Remove pick
              </Button>

              <Button
                onClick={() => setSelectedId(null)}
                sx={{
                  color: "#93c5fd",
                  textTransform: "none",
                }}
              >
                Close
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
