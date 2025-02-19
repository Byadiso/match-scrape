import React from 'react';
import MatchCard from './MatchCard';
import { motion } from 'framer-motion';
import { Grid, Typography } from '@mui/material';
import Loader from './LoaderComponent';
import PropTypes from 'prop-types'; // Import PropTypes for type checking

function UpcomingMatches({ matches, matchesLoading }) {  // Destructure matches and matchesLoading from props
  return (
    <section>
      <Typography
        variant="h4"
        color="primary"
        textAlign="center"
        sx={{
          marginBottom: 5,
          marginTop: 3,
          fontWeight: "bold",
          fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
          textTransform: "uppercase",
          letterSpacing: "1px",
          background: "linear-gradient(45deg, #8e2de2, #4a00e0)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          textShadow: "0px 0px 8px rgba(255, 255, 255, 0.6)", // Reduced glow
        }}
      >
        🔥 Upcoming Matches
      </Typography>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Grid container spacing={2} justifyContent="center">
          {matchesLoading ? (
            <Loader />  // Show the loader while fetching data
          ) : (
            matches && matches.length > 0 ? (
              matches.map((match, index) => (
                <Grid item xs={12} sm={8} md={6} key={index}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                  >
                    <MatchCard match={match} /> 
                  </motion.div>
                </Grid>
              ))
            ) : (
              <Typography variant="h6" color="textSecondary" textAlign="center">
                No upcoming matches available.
              </Typography>  // Message if there are no matches
            )
          )}
        </Grid>
      </motion.div>
    </section>
  );
}

// Prop-Types validation (Optional)
UpcomingMatches.propTypes = {
  matches: PropTypes.array.isRequired,  // Expect matches to be an array
  matchesLoading: PropTypes.bool.isRequired,  // matchesLoading should be a boolean
};

export default UpcomingMatches;
