import { userStorage } from "../services/browserProfile";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  TextField,
  Typography,
} from "@mui/material";

import UpcomingMatches from "./UpcomingMatches";
import LowOddsMatches from "./LowOddsMatches";

import {
  fetchMonthlyMatches,
  TEAMS,
} from "../services/footballApi";

const STORAGE_KEY = "football-picks-v1";
const CHANGE_EVENT = "football-picks-changed";
const FINISHED = new Set(["FINISHED", "AWARDED"]);

function currentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function readPicks() {
  try {
    const saved = JSON.parse(
      userStorage.getItem(STORAGE_KEY) || "[]"
    );

    if (!Array.isArray(saved)) return [];

    return [
      ...new Map(
        saved
          .filter(
            (match) =>
              match?.id &&
              match.utcDate &&
              !Number.isNaN(Date.parse(match.utcDate))
          )
          .map((match) => [match.id, match])
      ).values(),
    ];
  } catch {
    return [];
  }
}

export default function LandingPage() {
  const [month, setMonth] = useState(currentMonth);
  const [matches, setMatches] = useState([]);
  const [picks, setPicks] = useState(readPicks);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    function syncPicks() {
      setPicks(readPicks());
    }

    function handleStorage(event) {
      if (userStorage.matches(event.key, STORAGE_KEY) || event.key === null) {
        syncPicks();
      }
    }

    window.addEventListener(CHANGE_EVENT, syncPicks);
    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", syncPicks);

    return () => {
      window.removeEventListener(CHANGE_EVENT, syncPicks);
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", syncPicks);
    };
  }, []);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError("");
    setMatches([]);

    fetchMonthlyMatches(month)
      .then((data) => {
        if (!active) return;

        setMatches(data);

        const latest = new Map(
          data.map((match) => [match.id, match])
        );

        const saved = readPicks();

        if (saved.some((match) => latest.has(match.id))) {
          const updated = saved.map(
            (match) => latest.get(match.id) || match
          );

          try {
            userStorage.setItem(
              STORAGE_KEY,
              JSON.stringify(updated)
            );

            setStorageError("");
            window.dispatchEvent(new Event(CHANGE_EVENT));
          } catch {
            setStorageError(
              "Could not save updated pick results."
            );
          }

          setPicks(updated);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || "Could not load matches.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [month, retry]);

  function savePicks(updated) {
    try {
      userStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );

      setPicks(updated);
      setStorageError("");
      window.dispatchEvent(new Event(CHANGE_EVENT));
    } catch {
      setStorageError(
        "Could not save your pick changes. Please try again."
      );
    }
  }

  function addPick(match) {
    if (
      FINISHED.has(match.status) ||
      match.status === "CANCELLED"
    ) {
      return;
    }

    const saved = readPicks();

    if (!saved.some((pick) => pick.id === match.id)) {
      savePicks([...saved, match]);
    }
  }

  function removePick(matchId) {
    savePicks(
      readPicks().filter((match) => match.id !== matchId)
    );
  }

  const pickedIds = useMemo(
    () => new Set(picks.map((match) => match.id)),
    [picks]
  );

  const upcomingMatches = useMemo(
    () =>
      matches.filter(
        (match) =>
          !FINISHED.has(match.status) &&
          match.status !== "CANCELLED"
      ),
    [matches]
  );

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#121212",
        color: "#eef2f8",
        py: 5,
      }}
    >
      <Container maxWidth="lg">
        <Box sx={{ textAlign: "center", mb: 5 }}>
          <Typography
            variant="h4"
            fontWeight={800}
            sx={{
              fontSize: { xs: "2rem", sm: "3rem" },
              letterSpacing: "-0.04em",
              background:
                "linear-gradient(45deg, #ce93d8, #90caf9)",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            Football fixtures and picks
          </Typography>

          <Typography sx={{ mt: 2, color: "#aab5c5" }}>
            {TEAMS.map((team) => team.name).join(" · ")}
          </Typography>

          <TextField
            label="Fixtures month"
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
              mt: 3,
              width: 240,
              colorScheme: "dark",
              "& .MuiInputLabel-root": {
                color: "#aab5c5",
              },
              "& .MuiInputBase-input": {
                color: "#eef2f8",
              },
              "& .MuiOutlinedInput-notchedOutline": {
                borderColor: "#64748b",
              },
            }}
          />

          <Typography
            variant="body2"
            sx={{ mt: 2, color: "#aab5c5" }}
          >
            Local kickoff times. Scores and statuses may be delayed.
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
          <UpcomingMatches
            matches={upcomingMatches}
            matchesLoading={loading}
            pickedIds={pickedIds}
            onAddPick={addPick}
            onRemovePick={removePick}
          />
        )}

        <Box sx={{ mt: 7 }}>
          <LowOddsMatches
            picks={picks}
            onRemovePick={removePick}
            onUpdatePicks={setPicks}
          />
        </Box>
      </Container>
    </Box>
  );
}