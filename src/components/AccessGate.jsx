import { ensureBrowserProfile } from "../services/browserProfile";
import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

const ACCESS_CODE = "3010";

const COOKIE_NAME = "football-tool-access";
const ACCESS_VERSION = "v1";
const ACCESS_DURATION = 30 * 24 * 60 * 60;

function readAccessCookie() {
  try {
    const entry = document.cookie
      .split(";")
      .map((item) => item.trim())
      .find((item) =>
        item.startsWith(`${COOKIE_NAME}=`)
      );

    if (!entry) return false;

    const value = decodeURIComponent(
      entry.slice(COOKIE_NAME.length + 1)
    );

    const [version, expiry] = value.split(":");
    const expiresAt = Number(expiry);

    return (
      version === ACCESS_VERSION &&
      Number.isFinite(expiresAt) &&
      expiresAt > Date.now()
    );
  } catch {
    return false;
  }
}

function saveAccessCookie() {
  const expiresAt =
    Date.now() + ACCESS_DURATION * 1000;

  const value = encodeURIComponent(
    `${ACCESS_VERSION}:${expiresAt}`
  );

  const secure =
    window.location.protocol === "https:"
      ? "; Secure"
      : "";

  document.cookie =
    `${COOKIE_NAME}=${value}` +
    `; Max-Age=${ACCESS_DURATION}` +
    "; Path=/" +
    "; SameSite=Lax" +
    secure;

  return readAccessCookie();
}

export default function AccessGate({ children }) {
  const [allowed, setAllowed] = useState(() => {
    if (!readAccessCookie()) return false;
    try { ensureBrowserProfile(); return true; } catch { return false; }
  });
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    function checkAccess() {
      try {
        if (!readAccessCookie()) { setAllowed(false); return; }
        ensureBrowserProfile();
        setAllowed(true);
      } catch { setAllowed(false); }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        checkAccess();
      }
    }

    // Recheck expiration while the app remains open.
    const interval = window.setInterval(checkAccess, 30000);

    window.addEventListener("focus", checkAccess);
    document.addEventListener(
      "visibilitychange",
      handleVisibility
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", checkAccess);
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
    };
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (code.trim() !== ACCESS_CODE) {
      setError("Incorrect access code. Please try again.");
      return;
    }

    try {
      ensureBrowserProfile();
      if (!saveAccessCookie()) {
        setError(
          "Access could not be remembered. Allow cookies for this website and try again."
        );
        return;
      }

      setCode("");
      setAllowed(true);
    } catch {
      setError(
        "Could not save access. Allow cookies for this website and try again."
      );
    }
  }

  if (allowed) {
    return children;
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background:
          "radial-gradient(ellipse at top, #202438 0%, #121212 65%)",
        color: "#eef2f8",
        p: 2,
        boxSizing: "border-box",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 430,
          p: { xs: 3, sm: 4 },
          boxSizing: "border-box",
          borderRadius: 4,
          backgroundColor: "#171c28",
          backgroundImage: "none",
          color: "#eef2f8",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.25)",
        }}
      >
        <Stack spacing={3}>
          <Box
            sx={{
              width: 54,
              height: 54,
              display: "grid",
              placeItems: "center",
              borderRadius: 3,
              color: "#93c5fd",
              backgroundColor: "rgba(147,197,253,0.1)",
            }}
          >
            <LockOutlinedIcon sx={{ fontSize: 28 }} />
          </Box>

          <Box>
            <Typography
              component="h1"
              sx={{
                fontSize: { xs: "1.7rem", sm: "2rem" },
                fontWeight: 800,
                letterSpacing: "-0.04em",
              }}
            >
              Welcome to your match tracker
            </Typography>

            <Typography
              variant="body2"
              sx={{
                mt: 1.5,
                color: "#aab5c5",
                lineHeight: 1.8,
              }}
            >
              Enter your access code to view fixtures,
              track picks, and review team performance.
            </Typography>
          </Box>

          <Box
            component="form"
            onSubmit={handleSubmit}
          >
            <Stack spacing={2}>
              <TextField
                label="Access code"
                type="password"
                value={code}
                onChange={(event) => {
                  setCode(event.target.value);
                  setError("");
                }}
                error={Boolean(error)}
                autoFocus
                fullWidth
                required
                autoComplete="off"
                slotProps={{
                  htmlInput: {
                    inputMode: "numeric",
                    maxLength: 16,
                  },
                }}
                sx={{
                  "& .MuiInputBase-root": {
                    color: "#eef2f8",
                    borderRadius: 2.5,
                    backgroundColor:
                      "rgba(255,255,255,0.025)",
                  },
                  "& .MuiInputBase-input": {
                    fontSize: "1.2rem",
                    letterSpacing: "0.2em",
                  },
                  "& .MuiInputLabel-root": {
                    color: "#aab5c5",
                  },
                  "& .MuiInputLabel-root.Mui-focused": {
                    color: "#93c5fd",
                  },
                  "& .MuiOutlinedInput-notchedOutline": {
                    borderColor: "#536176",
                  },
                  "& .MuiOutlinedInput-root.Mui-focused fieldset": {
                    borderColor: "#93c5fd",
                  },
                }}
              />

              {error && (
                <Alert severity="error">
                  {error}
                </Alert>
              )}

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={!code.trim()}
                endIcon={<ArrowForwardRoundedIcon />}
                sx={{
                  py: 1.4,
                  borderRadius: 2.5,
                  textTransform: "none",
                  fontSize: "0.95rem",
                  fontWeight: 750,
                  color: "#101827",
                  backgroundColor: "#93c5fd",
                  boxShadow: "none",
                  "&:hover": {
                    backgroundColor: "#bfdbfe",
                    boxShadow: "none",
                  },
                  "&.Mui-disabled": {
                    color: "#8390a5",
                    backgroundColor: "#293244",
                  },
                }}
              >
                Continue
              </Button>
            </Stack>
          </Box>

          <Typography
            variant="caption"
            sx={{
              color: "#94a3b8",
              textAlign: "center",
              lineHeight: 1.8,
            }}
          >
            Access is remembered in this browser for 30 days.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}