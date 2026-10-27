import {
  Box,
  Typography,
  Chip,
  Paper,
  Button,
} from "@mui/material";

const STATUS_LABELS = {
  SCHEDULED: "Scheduled — time to be confirmed",
  TIMED: "Scheduled",
  IN_PLAY: "In progress",
  PAUSED: "Half-time",
  FINISHED: "Finished",
  POSTPONED: "Postponed",
  SUSPENDED: "Suspended",
  CANCELLED: "Cancelled",
  AWARDED: "Awarded",
};

export default function MatchCard({
  match,
  isPicked = false,
  onAddPick,
  onRemovePick,
}) {
  const score = match.score?.fullTime;

  const hasScore =
    Number.isFinite(score?.home) &&
    Number.isFinite(score?.away);

  const kickoff = match.utcDate
    ? new Date(match.utcDate)
    : null;

  const formattedDate =
    kickoff && !Number.isNaN(kickoff.getTime())
      ? kickoff.toLocaleString(undefined, {
          weekday: "short",
          day: "numeric",
          month: "short",
          year: "numeric",
          ...(match.status !== "SCHEDULED"
            ? { hour: "2-digit", minute: "2-digit" }
            : {}),
        })
      : "Date to be confirmed";

  const isFinished = ["FINISHED", "AWARDED"].includes(
  match.status
);

const isCancelled = match.status === "CANCELLED";

const canAddPick =
  !isFinished &&
  !isCancelled &&
  typeof onAddPick === "function";

const canManagePick = isPicked
  ? typeof onRemovePick === "function"
  : canAddPick;

function handlePickClick() {
  if (isPicked) {
    onRemovePick?.(match.id);
  } else if (canAddPick) {
    onAddPick(match);
  }
}

  return (
    <Paper
      sx={{
        background:
          "linear-gradient(135deg, rgba(33,150,243,0.1), rgba(233,30,99,0.1))",
        color: "white",
        p: 3,
        borderRadius: "16px",
        border: isPicked
          ? "1px solid #ff4081"
          : "1px solid rgba(255,255,255,0.1)",
        boxShadow: 8,
        height: "100%",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease",
        "&:hover": {
          transform: "translateY(-4px)",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1,
          mb: 2,
        }}
      >
        <Typography
          variant="body2"
          sx={{ color: "#90caf9" }}
        >
          {match.competition?.name ||
            "Competition unavailable"}
        </Typography>

        {isPicked && (
          <Chip
            label="Picked"
            size="small"
            sx={{
              backgroundColor: "rgba(255,64,129,0.15)",
              color: "#ff80ab",
            }}
          />
        )}
      </Box>

      <Typography
        variant="h6"
        fontWeight="bold"
        sx={{
          fontSize: { xs: "1rem", sm: "1.25rem" },
          overflowWrap: "anywhere",
        }}
      >
        {match.homeTeam?.name || "TBD"}
        {" vs "}
        {match.awayTeam?.name || "TBD"}
      </Typography>

      <Typography
        variant="body2"
        sx={{ mt: 1.5, color: "grey.400" }}
      >
        {formattedDate}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mt: 3,
          mb: 3,
        }}
      >
        <Chip
          label={
            STATUS_LABELS[match.status] ||
            match.status ||
            "Status unavailable"
          }
          size="small"
          sx={{
            maxWidth: "100%",
            height: "auto",
            "& .MuiChip-label": {
              whiteSpace: "normal",
              py: 0.5,
            },
            backgroundColor:
              match.status === "FINISHED"
                ? "rgba(76,175,80,0.18)"
                : "rgba(33,150,243,0.18)",
            color:
              match.status === "FINISHED"
                ? "#a5d6a7"
                : "#90caf9",
          }}
        />

        {hasScore && (
          <Typography variant="h5" fontWeight="bold">
            {score.home} – {score.away}
          </Typography>
        )}
      </Box>

      {canManagePick && (
        <Box sx={{ mt: "auto" }}>
          <Button
            fullWidth
            variant={isPicked ? "outlined" : "contained"}
            onClick={handlePickClick}
            aria-pressed={isPicked}
            sx={{
              color: isPicked ? "#ff80ab" : "white",
              borderColor: "#ff4081",
              backgroundColor: isPicked
                ? "transparent"
                : "#ad1457",
              "&:hover": {
                borderColor: "#ff80ab",
                backgroundColor: isPicked
                  ? "rgba(255,64,129,0.1)"
                  : "#880e4f",
              },
            }}
          >
            {isPicked ? "Remove from picks" : "Mark as pick"}
          </Button>
        </Box>
      )}
    </Paper>
  );
}