import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Container,
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

import Loader from "./LoaderComponent";

import { fetchMonthlyMatches, TEAMS } from "../services/footballApi";

const TEAM_IDS = new Set(TEAMS.map((team) => team.id));
const FINISHED = new Set(["FINISHED", "AWARDED"]);

const RESULTS = {
  won: { label: "Won", short: "W", color: "#86efac" },
  lost: { label: "Lost", short: "L", color: "#fca5a5" },
  draw: { label: "Draw", short: "D", color: "#fcd34d" },
  unknown: {
    label: "Unconfirmed",
    short: "?",
    color: "#94a3b8",
  },
};

const panelStyle = {
  backgroundColor: "#171c28",
  backgroundImage: "none",
  color: "#eef2f8",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: 3,
};

const fieldStyle = {
  colorScheme: "dark",
  "& .MuiInputBase-root": {
    color: "#eef2f8",
    borderRadius: 2,
  },
  "& .MuiInputLabel-root": {
    color: "#aab5c5",
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: "#536176",
  },
  "& .MuiSelect-icon": {
    color: "#aab5c5",
  },
};

const tableStyle = {
  "& th, & td": {
    color: "#dce3ee",
    borderColor: "rgba(255,255,255,0.08)",
    py: 1.75,
  },
  "& th": {
    color: "#aab5c5",
    fontWeight: 700,
    whiteSpace: "nowrap",
  },
};

const menuProps = {
  PaperProps: {
    sx: {
      backgroundColor: "#202635",
      color: "#eef2f8",
    },
  },
};

function currentMonth() {
  const date = new Date();

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function shiftMonth(month, amount) {
  const [year, number] = month.split("-").map(Number);
  const date = new Date(year, number - 1 + amount, 1);

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0",
  )}`;
}

function monthLabel(month) {
  const [year, number] = month.split("-").map(Number);

  return new Date(year, number - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

function percent(value, total) {
  return total ? `${((value / total) * 100).toFixed(1)}%` : "—";
}

function favoriteTeams(match) {
  return [match.homeTeam, match.awayTeam].filter(
    (team) => team && TEAM_IDS.has(team.id),
  );
}

function getResult(match, teamId) {
  const winner = match.score?.winner;

  if (winner === "DRAW") return "draw";

  if (!["HOME_TEAM", "AWAY_TEAM"].includes(winner)) {
    return "unknown";
  }

  const winningTeam = winner === "HOME_TEAM" ? match.homeTeam : match.awayTeam;

  return winningTeam?.id === teamId ? "won" : "lost";
}

function summarize(records) {
  const stats = {
    total: records.length,
    won: 0,
    lost: 0,
    draw: 0,
    unknown: 0,
  };

  for (const record of records) {
    stats[record.result] += 1;
  }

  stats.resolved = stats.won + stats.lost + stats.draw;

  return stats;
}

function ResultChip({ result, compact = false }) {
  const style = RESULTS[result];

  return (
    <Chip
      size="small"
      label={compact ? style.short : style.label}
      aria-label={style.label}
      sx={{
        height: 25,
        minWidth: compact ? 27 : undefined,
        fontWeight: 750,
        color: style.color,
        backgroundColor: `${style.color}16`,
        "& .MuiChip-label": {
          px: compact ? 0.75 : 1.25,
        },
      }}
    />
  );
}

function SummaryCard({ label, value, detail, color }) {
  return (
    <Paper elevation={0} sx={{ ...panelStyle, p: 2.5 }}>
      <Typography variant="body2" sx={{ color: "#aab5c5" }}>
        {label}
      </Typography>

      <Typography
        sx={{
          my: 1,
          fontSize: { xs: "1.65rem", sm: "2rem" },
          fontWeight: 800,
          color,
          letterSpacing: "-0.04em",
        }}
      >
        {value}
      </Typography>

      <Typography variant="caption" sx={{ color: "#aab5c5" }}>
        {detail}
      </Typography>
    </Paper>
  );
}

export default function PreviousMatches() {
  const [month, setMonth] = useState(currentMonth);
  const [matches, setMatches] = useState([]);
  const [teamFilter, setTeamFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setMatches([]);

    fetchMonthlyMatches(month, {
      force: refreshVersion > 0,
    })
      .then((data) => {
        if (active) setMatches(data);
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Could not load previous matches.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, refreshVersion]);

  const previousMatches = useMemo(
    () =>
      matches
        .filter((match) => FINISHED.has(match.status))
        .sort((a, b) => Date.parse(b.utcDate) - Date.parse(a.utcDate)),
    [matches],
  );

  const records = useMemo(
    () =>
      previousMatches.flatMap((match) =>
        favoriteTeams(match).map((team) => ({
          teamId: team.id,
          match,
          result: getResult(match, team.id),
        })),
      ),
    [previousMatches],
  );

  const teamRows = useMemo(
    () =>
      TEAMS.map((team) => {
        const teamRecords = records.filter(
          (record) => record.teamId === team.id,
        );

        return {
          ...team,
          records: teamRecords,
          stats: summarize(teamRecords),
        };
      }),
    [records],
  );

  const summary = useMemo(
    () =>
      summarize(
        teamFilter === "all"
          ? records
          : records.filter((record) => record.teamId === Number(teamFilter)),
      ),
    [records, teamFilter],
  );

  const visibleMatches = useMemo(
    () =>
      previousMatches.filter((match) => {
        const teams = favoriteTeams(match).filter(
          (team) => teamFilter === "all" || team.id === Number(teamFilter),
        );

        return (
          teams.length > 0 &&
          (resultFilter === "all" ||
            teams.some((team) => getResult(match, team.id) === resultFilter))
        );
      }),
    [previousMatches, teamFilter, resultFilter],
  );

  function changeMonth(value) {
    if (
      /^\d{4}-(0[1-9]|1[0-2])$/.test(value) &&
      value >= "2000-01" &&
      value <= currentMonth()
    ) {
      setMonth(value);
      setRefreshVersion(0);
    }
  }

  const selectedTeamName =
    TEAMS.find((team) => team.id === Number(teamFilter))?.name ||
    "All favorite clubs";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "#eef2f8",
        py: { xs: 3, sm: 5 },
      }}
    >
      <Container maxWidth="lg">
        <Stack
          direction={{ xs: "column", md: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", md: "center" }}
          spacing={3}
          sx={{ mb: 4 }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1.8rem", sm: "2.4rem" },
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              Team performance
            </Typography>

            <Typography
              variant="body2"
              sx={{ mt: 1, color: "#aab5c5", maxWidth: 550 }}
            >
              Monthly wins, losses, and draws for your favorite clubs,
              independently of your saved picks.
            </Typography>
          </Box>

          <Button
            variant="outlined"
            startIcon={<RefreshRoundedIcon />}
            disabled={loading}
            onClick={() => setRefreshVersion((value) => value + 1)}
            sx={{
              textTransform: "none",
              color: "#93c5fd",
              borderColor: "#425572",
            }}
          >
            Refresh results
          </Button>
        </Stack>

        <Paper elevation={0} sx={{ ...panelStyle, p: 2.5, mb: 3 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
          >
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button
                aria-label="Previous month"
                disabled={loading || month <= "2000-01"}
                onClick={() => changeMonth(shiftMonth(month, -1))}
                sx={{ minWidth: 36, color: "#cbd5e1" }}
              >
                <ChevronLeftRoundedIcon />
              </Button>

              <TextField
                label="Month"
                type="month"
                size="small"
                value={month}
                disabled={loading}
                onChange={(event) => changeMonth(event.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: {
                    min: "2000-01",
                    max: currentMonth(),
                  },
                }}
                sx={{ ...fieldStyle, width: 205 }}
              />

              <Button
                aria-label="Next month"
                disabled={loading || month >= currentMonth()}
                onClick={() => changeMonth(shiftMonth(month, 1))}
                sx={{ minWidth: 36, color: "#cbd5e1" }}
              >
                <ChevronRightRoundedIcon />
              </Button>
            </Stack>

            <TextField
              select
              label="Club"
              size="small"
              value={teamFilter}
              onChange={(event) => setTeamFilter(event.target.value)}
              slotProps={{
                select: { MenuProps: menuProps },
              }}
              sx={{ ...fieldStyle, minWidth: 200, flex: 1 }}
            >
              <MenuItem value="all">All favorite clubs</MenuItem>

              {TEAMS.map((team) => (
                <MenuItem key={team.id} value={String(team.id)}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>

            <Button
              disabled={loading}
              onClick={() => changeMonth(currentMonth())}
              sx={{
                color: "#93c5fd",
                textTransform: "none",
                whiteSpace: "nowrap",
              }}
            >
              Current month
            </Button>
          </Stack>
        </Paper>

        {loading ? (
          <Loader variant="table" />
        ) : error ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setRefreshVersion((value) => value + 1)}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : (
          <>
            <Typography component="h2" variant="h6" fontWeight={700}>
              {monthLabel(month)}
            </Typography>

            <Typography sx={{ color: "#aab5c5", mt: 0.5, mb: 3 }}>
              {selectedTeamName} ·{" "}
              {month === currentMonth() ? "Month to date" : "Monthly results"}
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
                mb: 3,
              }}
            >
              <SummaryCard
                label="Resolved appearances"
                value={summary.resolved}
                detail="Club results included in rates"
                color="#eef2f8"
              />

              <SummaryCard
                label="Success rate"
                value={percent(summary.won, summary.resolved)}
                detail={`${summary.won} wins`}
                color={RESULTS.won.color}
              />

              <SummaryCard
                label="Failure rate"
                value={percent(summary.lost, summary.resolved)}
                detail={`${summary.lost} losses`}
                color={RESULTS.lost.color}
              />

              <SummaryCard
                label="Draw rate"
                value={percent(summary.draw, summary.resolved)}
                detail={`${summary.draw} draws`}
                color={RESULTS.draw.color}
              />
            </Box>

            <Alert
              severity="info"
              sx={{
                mb: 4,
                backgroundColor: "rgba(147,197,253,0.07)",
                color: "#cbd5e1",
              }}
            >
              Rates use wins + losses + draws. A fixture between two favorites
              gives each club its own result in the statistics, but appears once
              in the fixture list. Unconfirmed results are excluded from rates.
            </Alert>

            <Typography
              component="h2"
              variant="h6"
              fontWeight={700}
              sx={{ mb: 2 }}
            >
              Club comparison
            </Typography>

            <TableContainer
              component={Paper}
              elevation={0}
              sx={{ ...panelStyle, mb: 2 }}
            >
              <Table
                size="small"
                aria-label="Monthly club comparison"
                sx={{ ...tableStyle, minWidth: 900 }}
              >
                <TableHead>
                  <TableRow>
                    {[
                      "Club",
                      "Played",
                      "Won",
                      "Lost",
                      "Draw",
                      "Win %",
                      "Loss %",
                      "Draw %",
                      "Latest form",
                    ].map((label, index) => (
                      <TableCell
                        key={label}
                        align={index > 0 && index < 8 ? "right" : "left"}
                      >
                        {label}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>

                <TableBody>
                  {teamRows.map((team) => (
                    <TableRow
                      key={team.id}
                      sx={{
                        backgroundColor:
                          teamFilter === String(team.id)
                            ? "rgba(147,197,253,0.045)"
                            : "transparent",
                      }}
                    >
                      <TableCell>
                        <Button
                          onClick={() =>
                            setTeamFilter(
                              teamFilter === String(team.id)
                                ? "all"
                                : String(team.id),
                            )
                          }
                          aria-pressed={teamFilter === String(team.id)}
                          sx={{
                            p: 0,
                            minWidth: 0,
                            color: "#eef2f8",
                            textTransform: "none",
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {team.name}
                        </Button>
                      </TableCell>

                      <TableCell align="right">{team.stats.total}</TableCell>

                      <TableCell align="right">{team.stats.won}</TableCell>

                      <TableCell align="right">{team.stats.lost}</TableCell>

                      <TableCell align="right">{team.stats.draw}</TableCell>

                      <TableCell align="right">
                        <Box component="span" sx={{ color: RESULTS.won.color }}>
                          {percent(team.stats.won, team.stats.resolved)}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        <Box
                          component="span"
                          sx={{ color: RESULTS.lost.color }}
                        >
                          {percent(team.stats.lost, team.stats.resolved)}
                        </Box>
                      </TableCell>

                      <TableCell align="right">
                        {percent(team.stats.draw, team.stats.resolved)}
                      </TableCell>

                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          {team.records
                            .filter((record) => record.result !== "unknown")
                            .slice(0, 5)
                            .map((record) => (
                              <ResultChip
                                key={record.match.id}
                                result={record.result}
                                compact
                              />
                            ))}

                          {!team.stats.resolved && (
                            <Typography
                              variant="caption"
                              sx={{ color: "#94a3b8" }}
                            >
                              No results
                            </Typography>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#aab5c5",
                mb: 4,
                lineHeight: 1.8,
              }}
            >
              Latest form shows up to five results in this month, newest first.
              Played includes unconfirmed finished results; percentages exclude
              them.
            </Typography>

            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Box>
                <Typography component="h2" variant="h6" fontWeight={700}>
                  Match results
                </Typography>

                <Typography
                  variant="body2"
                  role="status"
                  sx={{ color: "#aab5c5", mt: 0.5 }}
                >
                  {visibleMatches.length} fixtures shown
                </Typography>
              </Box>

              <TextField
                select
                label="Result"
                size="small"
                value={resultFilter}
                onChange={(event) => setResultFilter(event.target.value)}
                slotProps={{
                  select: { MenuProps: menuProps },
                }}
                sx={{ ...fieldStyle, minWidth: 180 }}
              >
                <MenuItem value="all">All results</MenuItem>
                <MenuItem value="won">Wins</MenuItem>
                <MenuItem value="lost">Losses</MenuItem>
                <MenuItem value="draw">Draws</MenuItem>
                <MenuItem value="unknown">Unconfirmed</MenuItem>
              </TextField>
            </Stack>

            {visibleMatches.length === 0 ? (
              <Paper
                elevation={0}
                sx={{
                  ...panelStyle,
                  py: 6,
                  px: 3,
                  textAlign: "center",
                }}
              >
                <Typography variant="h6" fontWeight={700}>
                  No matching results
                </Typography>

                <Typography sx={{ color: "#aab5c5", mt: 1 }}>
                  Try another month, club, or result filter.
                </Typography>
              </Paper>
            ) : (
              <TableContainer component={Paper} elevation={0} sx={panelStyle}>
                <Table
                  size="small"
                  aria-label="Finished match results"
                  sx={{ ...tableStyle, minWidth: 800 }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Fixture</TableCell>
                      <TableCell align="center">Score</TableCell>
                      <TableCell>Favorite outcome</TableCell>
                      <TableCell>Competition</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {visibleMatches.map((match) => {
                      const teams = favoriteTeams(match).filter(
                        (team) =>
                          teamFilter === "all" ||
                          team.id === Number(teamFilter),
                      );

                      const score = match.score?.fullTime;

                      const hasScore =
                        Number.isFinite(score?.home) &&
                        Number.isFinite(score?.away);

                      return (
                        <TableRow key={match.id}>
                          <TableCell sx={{ whiteSpace: "nowrap" }}>
                            {new Date(match.utcDate).toLocaleDateString(
                              undefined,
                              {
                                day: "numeric",
                                month: "short",
                              },
                            )}
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2" fontWeight={650}>
                              {match.homeTeam?.name}
                            </Typography>

                            <Typography
                              variant="body2"
                              sx={{ color: "#aab5c5", mt: 0.5 }}
                            >
                              vs {match.awayTeam?.name}
                            </Typography>

                            {match.score?.duration === "PENALTY_SHOOTOUT" && (
                              <Typography
                                variant="caption"
                                sx={{ color: "#aab5c5" }}
                              >
                                After penalties
                              </Typography>
                            )}

                            {match.score?.duration === "EXTRA_TIME" && (
                              <Typography
                                variant="caption"
                                sx={{ color: "#aab5c5" }}
                              >
                                After extra time
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell
                            align="center"
                            sx={{
                              fontWeight: 800,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {hasScore ? `${score.home} – ${score.away}` : "—"}
                          </TableCell>

                          <TableCell>
                            <Stack spacing={1}>
                              {teams.map((team) => (
                                <Stack
                                  key={team.id}
                                  direction="row"
                                  alignItems="center"
                                  spacing={1}
                                >
                                  <ResultChip
                                    result={getResult(match, team.id)}
                                  />

                                  <Typography
                                    variant="caption"
                                    sx={{ color: "#aab5c5" }}
                                  >
                                    {team.shortName || team.name}
                                  </Typography>
                                </Stack>
                              ))}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            {match.competition?.name || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            )}

            <Typography
              variant="caption"
              sx={{
                display: "block",
                color: "#94a3b8",
                mt: 3,
                lineHeight: 1.8,
              }}
            >
              Results follow the API’s final winner, including extra time or
              penalties. Only competitions available on your plan are included.
              Past win rates are not probabilities for the next fixture.
            </Typography>
          </>
        )}
      </Container>
    </Box>
  );
}
