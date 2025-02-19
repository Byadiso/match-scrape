import { Grid, Typography } from '@mui/material';
import React from 'react';
import MatchCard from './MatchCard';
import { motion } from 'framer-motion';
import Loader from './LoaderComponent';
import PropTypes from 'prop-types';  

function LowOddsMatches({ lowOddsLoading, lowOddsMatches }) {  
  return (
    <section className="mt-16">
      <Typography
        variant="h4"
        color="secondary"
        textAlign="center"
        sx={{
          marginBottom: 5,
          marginTop: 5,
          fontWeight: "bold",
          fontSize: { xs: "1.5rem", sm: "2rem", md: "2.5rem" },
          textTransform: "uppercase",
          letterSpacing: "1px",
          background: "linear-gradient(45deg, #e91e63, #ff4081)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          textShadow: "0px 0px 8px rgba(255, 255, 255, 0.6)", // Reduced glow
        }}
      >
        💰 Pick of the day
      </Typography>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Grid container spacing={2} justifyContent="center">
          {lowOddsLoading ? (
            <Loader />  
          ) : (
            lowOddsMatches && lowOddsMatches.length > 0 ? (
              lowOddsMatches.map((match, index) => (
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
                Come back later for the best pick!
              </Typography>  
            )
          )}
        </Grid>
      </motion.div>
    </section>
  );
}


LowOddsMatches.propTypes = {
  lowOddsMatches: PropTypes.array.isRequired,  
  lowOddsLoading: PropTypes.bool.isRequired,  
};

export default LowOddsMatches;
