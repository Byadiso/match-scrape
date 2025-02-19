import { Box, Typography, Chip, Paper } from "@mui/material";

export default function MatchCard({ match }) {
  return (
    <Paper
      sx={{
        position: "relative",
        background: "linear-gradient(135deg, rgba(33, 150, 243, 0.1), rgba(233, 30, 99, 0.1))",
        padding: 2,
        borderRadius: "16px",
        boxShadow: 8,
        border: "1px solid transparent",
        transition: "transform 0.3s ease, box-shadow 0.3s ease",
        backdropFilter: "blur(5px)",  // Glass-like effect
        maxWidth: "450px",  // Increased width to fit all elements
        margin: "auto", // Center the card
        overflow: "hidden", // Prevent overflow
        height: "auto", // Flexible height
        display: "flex", // Flexbox for better control
        flexDirection: "column", // Stack items vertically
        "&:hover": {
          transform: "translateY(-10px)", // Hover effect
          boxShadow: "0 12px 30px rgba(0, 0, 0, 0.15)", // Hover shadow
        },
      }}
    >
      {/* Match Info */}
      <Box sx={{ marginBottom: 2, paddingBottom: 1 }}>
        <Typography
          variant="h6"
          color="primary"
          fontWeight="bold"
          sx={{
            fontSize: { xs: "1rem", sm: "1.25rem" },
            letterSpacing: "1px",
            background: "linear-gradient(45deg,rgb(157, 61, 241),rgb(93, 19, 243))", // Web3 neon gradient text
            WebkitBackgroundClip: "text",
            color: "transparent",
            textShadow: "0 0 6px rgba(255, 255, 255, 0.4)", // Reduced glow effect
            lineHeight: 1.2, // Prevent text from crowding
          }}
        >
          {match.homeTeam} vs {match.awayTeam}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            marginTop: 1,
            fontSize: { xs: "0.75rem", sm: "0.875rem" },
            color: "rgba(255, 255, 255, 0.7)", // Subtle white text for time
          }}
        >
          ⏰ {match.time}
        </Typography>
      </Box>

      {/* Odds Section */}
      <Box sx={{
        display: "flex",
        justifyContent: "space-between", // Space chips evenly on one line
        gap: 3, // More space between chips
        marginTop: 2, // Spacing above chips
        paddingTop: 1, // Prevent overlap with other sections
        width: "100%", // Ensure the Box spans the full width
        maxWidth: "100%", // Ensure it fits within the card's width
        boxSizing: "border-box", // Ensure padding is included in the width
        flexWrap: "nowrap", // Prevent wrapping of chips
      }}>
        <Chip
          label={`🏆 Home: ${match.odds.homeWin}`}
          sx={{
            backgroundColor: "rgba(33, 150, 243, 0.2)", // Neon blue background
            color: "#2196F3", // Blue text
            fontWeight: "600", // Bold text for emphasis
            borderRadius: "12px",
            padding: "8px 14px", // Adjusted padding for better text fit
            boxShadow: "0 4px 8px rgba(33, 150, 243, 0.2)", // Softer blue shadow
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: "rgba(33, 150, 243, 0.3)", // Slight hover effect
              boxShadow: "0 6px 16px rgba(33, 150, 243, 0.3)", // Hover shadow
            },
          }}
        />
        <Chip
          label={`🤝 Draw: ${match.odds.draw}`}
          sx={{
            backgroundColor: "rgba(158, 158, 158, 0.2)", // Grayish background
            color: "#9E9E9E", // Gray text
            fontWeight: "600", // Emphasize the draw odds
            borderRadius: "12px",
            padding: "8px 14px", // Adjusted padding for better text fit
            boxShadow: "0 4px 8px rgba(158, 158, 158, 0.2)", // Softer gray shadow
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: "rgba(158, 158, 158, 0.3)", // Slight hover effect
              boxShadow: "0 6px 16px rgba(158, 158, 158, 0.3)", // Hover shadow
            },
          }}
        />
        <Chip
          label={`🚀 Away: ${match.odds.awayWin}`}
          sx={{
            backgroundColor: "rgba(233, 30, 99, 0.2)", // Neon pink background
            color: "#E91E63", // Neon pink text
            fontWeight: "600", // Bold text for emphasis
            borderRadius: "12px",
            padding: "8px 14px", // Adjusted padding for better text fit
            boxShadow: "0 4px 8px rgba(233, 30, 99, 0.2)", // Softer pink shadow
            transition: "all 0.3s ease",
            "&:hover": {
              backgroundColor: "rgba(233, 30, 99, 0.3)", // Slight hover effect
              boxShadow: "0 6px 16px rgba(233, 30, 99, 0.3)", // Hover shadow
            },
          }}
        />
      </Box>
    </Paper>
  );
}
