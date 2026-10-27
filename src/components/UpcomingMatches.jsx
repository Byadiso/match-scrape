import { userStorage } from "../services/browserProfile";
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Box,
  Button,
  Container,
  TextField,
  Typography,
} from "@mui/material";

import MatchCard from "./MatchCard";
import Loader from "./LoaderComponent";
import { fetchMonthlyMatches } from "../services/footballApi";

const STORAGE_KEY = "football-picks-v1";
const FINISHED_STATUSES = new Set(["FINISHED", "AWARDED"]);

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function readSavedPicks() {
  try {
    const saved = JSON.parse(
      userStorage.getItem(STORAGE_KEY) || "[]"
    );

    return Array.isArray(saved)
      ? saved.filter((match) => match?.id && match?.utcDate)
      : [];
  } catch {
    return [];
  }
}

function isUpcoming(match) {
  return (
    !FINISHED_STATUSES.has(match.status) &&
    match.status !== "CANCELLED"
  );
}

// Shared display for both the landing page and standalone page.
function UpcomingMatchesList({
  matches = [],
  matchesLoading = false,
  pickedIds = new Set(),
  onAddPick,
  onRemovePick,
}) {
  const upcomingMatches = useMemo(
    () =>
      matches
        .filter(isUpcoming)
        .sort(
          (a, b) =>
            Date.parse(a.utcDate) - Date.parse(b.utcDate)
        ),
    [matches]
  );

  return (
    <section>
      <Typography
        variant="h4"
        textAlign="center"
        sx={{
          mb: 4,
          mt: 3,
          fontWeight: "bold",
          fontSize: {
            xs: "1.5rem",
            sm: "2rem",
          },
          background:
            "linear-gradient(45deg, #8e2de2, #2196f3)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        Upcoming matches
      </Typography>

      {matchesLoading ? (
        <Loader />
      ) : upcomingMatches.length === 0 ? (
        <Typography
          textAlign="center"
          sx={{ color: "grey.400" }}
        >
          No upcoming matches in the selected month. Try the
          next month.
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "repeat(2, minmax(0, 1fr))",
            },
            gap: 3,
          }}
        >
          {upcomingMatches.map((match) => (
            <motion.div
              key={match.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ minWidth: 0 }}
            >
              <MatchCard
                match={match}
                isPicked={pickedIds.has(match.id)}
                onAddPick={onAddPick}
                onRemovePick={onRemovePick}
              />
            </motion.div>
          ))}
        </Box>
      )}
    </section>
  );
}

// Fetching and pick storage for the standalone page.
function UpcomingMatchesPage() {
  const [month, setMonth] = useState(getCurrentMonth);
  const [matches, setMatches] = useState([]);
  const [picks, setPicks] = useState(readSavedPicks);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setMatches([]);

    fetchMonthlyMatches(month)
      .then((data) => {
        if (!active) return;

        setMatches(data);

        // Update saved picks with available status and score data.
        const latest = new Map(
          data.map((match) => [match.id, match])
        );

        setPicks((previous) =>
          previous.map(
            (match) => latest.get(match.id) || match
          )
        );
      })
      .catch((err) => {
        if (active) {
          setError(
            err.message || "Could not load upcoming matches."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, retry]);

  // Read storage again when returning to this browser tab.
  useEffect(() => {
    function syncPicks() {
      setPicks(readSavedPicks());
    }

    function handleStorage(event) {
      if (userStorage.matches(event.key, STORAGE_KEY) || event.key === null) {
        syncPicks();
      }
    }

    window.addEventListener("football-picks-changed", syncPicks);
    window.addEventListener("focus", syncPicks);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("football-picks-changed", syncPicks);
      window.removeEventListener("focus", syncPicks);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  function savePicks(nextPicks) {
    setPicks(nextPicks);

    try {
      userStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextPicks)
      );
      setStorageError("");
    } catch {
      setStorageError(
        "Your pick changes could not be saved in this browser."
      );
    }
  }

  function addPick(match) {
    if (!isUpcoming(match)) return;

    const saved = readSavedPicks();
    if (!saved.some((pick) => pick.id === match.id)) {
      savePicks([...saved, match]);
    }
  }

  function removePick(matchId) {
    savePicks(readSavedPicks().filter((pick) => pick.id !== matchId));
  }

  const pickedIds = useMemo(
    () => new Set(picks.map((match) => match.id)),
    [picks]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "white",
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <TextField
            label="Matches month"
            type="month"
            value={month}
            onChange={(event) => {
              const value = event.target.value;

              if (/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) {
                setMonth(value);
              }
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                min: "2000-01",
                max: "2100-12",
              },
            }}
            sx={{
              width: 240,
              colorScheme: "dark",
              "& .MuiInputLabel-root": {
                color: "grey.400",
              },
              "& .MuiInputBase-input": {
                color: "white",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "grey.600",
              },
            }}
          />

          <Typography
            variant="body2"
            sx={{ mt: 2, color: "grey.400" }}
          >
            Times shown in your local timezone. Scores and
            statuses may be delayed.
          </Typography>
        </Box>

        {storageError && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            {storageError}
          </Alert>
        )}

        {error ? (
          <Alert
            severity="error"
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => setRetry((value) => value + 1)}
              >
                Retry
              </Button>
            }
          >
            {error}
          </Alert>
        ) : (
          <UpcomingMatchesList
            matches={matches}
            matchesLoading={loading}
            pickedIds={pickedIds}
            onAddPick={addPick}
            onRemovePick={removePick}
          />
        )}
      </Container>
    </Box>
  );
}

export default function UpcomingMatches(props) {
  // LandingPage already supplies data and manages saved picks.
  if (props.matches !== undefined) {
    return <UpcomingMatchesList {...props} />;
  }

  // A standalone route fetches and manages its own data.
  return <UpcomingMatchesPage />;
}