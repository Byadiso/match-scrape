import { useEffect, useState, useSyncExternalStore } from "react";
import {
  Box,
  CircularProgress,
  Container,
  LinearProgress,
  Typography,
  useMediaQuery,
} from "@mui/material";
import HourglassTopRoundedIcon from "@mui/icons-material/HourglassTopRounded";
import { footballApiClient } from "../services/apiRequest";

export default function ApiLoadingNotice() {
  const state = useSyncExternalStore(
    footballApiClient.subscribe,
    footballApiClient.getSnapshot,
  );
  const [now, setNow] = useState(() => Date.now());
  const [visible, setVisible] = useState(false);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  useEffect(() => {
    if (state.pending > 0) {
      setVisible(true);
      return;
    }
    // Avoid flashing between the six consecutive team requests.
    const timer = setTimeout(() => setVisible(false), 300);
    return () => clearTimeout(timer);
  }, [state.pending]);

  useEffect(() => {
    if (state.phase !== "waiting") return;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [state.phase, state.waitUntil]);

  if (!visible && state.pending === 0) return null;

  const waiting = state.phase === "waiting";
  const current = Math.max(now, state.waitStarted);
  const remaining = Math.max(0, Math.ceil((state.waitUntil - current) / 1000));
  const duration = Math.max(1, state.waitUntil - state.waitStarted);
  const progress = Math.max(
    0,
    Math.min(100, ((current - state.waitStarted) / duration) * 100),
  );

  return (
    <Box
      data-testid="api-status-bar"
      sx={{
        position: "sticky",
        top: { xs: 56, sm: 64 },
        zIndex: 1090,
        backgroundColor: "#151e2c",
        borderBottom: "1px solid rgba(147,197,253,0.16)",
        color: "#dbeafe",
      }}
    >
      <Container maxWidth="lg" sx={{ py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.75 }}>
          {waiting ? (
            <HourglassTopRoundedIcon
              aria-hidden="true"
              sx={{ fontSize: 16, color: "#93c5fd", flexShrink: 0 }}
            />
          ) : (
            <CircularProgress
              size={15}
              thickness={4}
              aria-hidden="true"
              sx={{
                color: "#93c5fd",
                flexShrink: 0,
                ...(reduceMotion ? { animation: "none" } : {}),
              }}
            />
          )}
          <Typography
            role="status"
            noWrap
            sx={{
              fontSize: { xs: 12, sm: 13 },
              fontWeight: 650,
              flex: 1,
              minWidth: 0,
            }}
          >
            {waiting ? "Waiting for data" : "Updating fixtures…"}
          </Typography>
          <Typography
            variant="caption"
            aria-live="off"
            sx={{
              fontSize: { xs: 11, sm: 12 },
              flexShrink: 0,
              color: "#a9bfda",
              fontVariantNumeric: "tabular-nums",
              whiteSpace: "nowrap",
            }}
          >
            {waiting
              ? remaining
                ? `Resuming in ${remaining}s`
                : "Resuming…"
              : "Please wait"}
          </Typography>
        </Box>
        <LinearProgress
          variant={waiting ? "determinate" : "indeterminate"}
          value={waiting ? progress : undefined}
          aria-label={
            waiting
              ? "Waiting for the football API to become available"
              : "Updating football data"
          }
          sx={{
            height: 3,
            borderRadius: 2,
            backgroundColor: "#28374c",
            "& .MuiLinearProgress-bar": {
              backgroundColor: "#93c5fd",
              ...(reduceMotion
                ? { animation: "none", transition: "none" }
                : {}),
            },
          }}
        />
      </Container>
    </Box>
  );
}
