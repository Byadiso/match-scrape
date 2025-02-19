import { useEffect, useState } from "react";
import Loader from "./LoaderComponent";
import { Container, Typography, Grid, Box } from "@mui/material";
import UpcomingMatches from "./UpcomingMatches";
import LowOddsMatches from "./LowOddsMatches"; // Ensure this component is imported

const API_URL = "https://fastapi-scraping-api-production.up.railway.app/matches";
const LOW_ODDS_API_URL = "https://fastapi-scraping-api-production.up.railway.app/low-odds-matches";

// Custom Hook for Fetching Data
const useFetch = (url) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setData(data.matches || data.lowOddsMatches || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [url]);

  return { data, loading };
};

export default function LandingPage() {
  const { data: matches, loading: matchesLoading } = useFetch(API_URL);
  const { data: lowOddsMatches, loading: lowOddsLoading } = useFetch(LOW_ODDS_API_URL);

  console.log(matches);
  console.log(lowOddsMatches);
  

  return (
    <Box sx={{ minHeight: "100vh", backgroundColor: "#121212", color: "white", paddingY: 5 }}>
      {/* Web3 Header */}
      <Container maxWidth="lg" sx={{ textAlign: "center", marginBottom: 5 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          sx={{
            background: "linear-gradient(45deg, #9c27b0, #2196f3)",
            WebkitBackgroundClip: "text",
            color: "transparent",
            boxShadow: 2,
            fontSize: { xs: "2rem", sm: "3rem" },
            textShadow: "0px 0px 8px rgba(255, 255, 255, 0.6)", // Reduced glow
          }}
        >
          ⚡  Live matches with real-time odds
        </Typography>
        
      </Container>

      {/* Upcoming Matches */}
     
      {matchesLoading ? (
        <Loader /> // Assuming you have a Loader component for showing loading state
      ) : (
        <UpcomingMatches matches={matches} matchesLoading={matchesLoading} />
      )}

      {/* Low Odds Matches */}
      {lowOddsLoading ? (
        <Loader /> // Assuming you have a Loader component for showing loading state
      ) : (
        <LowOddsMatches lowOddsMatches={lowOddsMatches} />
      )}
    </Box>
  );
}
