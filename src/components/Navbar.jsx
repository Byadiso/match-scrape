import React, { useState } from "react";
import { AppBar, Toolbar, Typography, Button, IconButton, Drawer, List, ListItem, ListItemText, useTheme, useMediaQuery } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from "react-router-dom";  // Correctly import Link from React Router

export default function Navbar() {
  // State for the Drawer (side menu) on mobile
  const [openDrawer, setOpenDrawer] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm")); // Check if screen size is mobile or smaller

  // Function to toggle drawer (open/close)
  const toggleDrawer = () => {
    setOpenDrawer(!openDrawer);
  };

  return (
    <AppBar position="sticky" sx={{ background: "linear-gradient(90deg, #9c27b0, #2196f3)", boxShadow: 3 }}>
      <Toolbar>
        {/* Logo/Brand */}
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: "white", fontWeight: "bold" }}>
          ⚡ Web3 Match Explorer
        </Typography>

        {/* If on mobile, display the hamburger icon */}
        {isMobile ? (
          <IconButton color="inherit" onClick={toggleDrawer}>
            <MenuIcon />
          </IconButton>
        ) : (
          // Otherwise, show navigation buttons
          <>
            <Button color="inherit" component={Link} to="/" sx={{ marginLeft: 2 }}>Home</Button>
            <Button color="inherit" component={Link} to="/upcoming-matches" sx={{ marginLeft: 2 }}>Upcoming Matches</Button>
            <Button color="inherit" component={Link} to="/low-odds-matches" sx={{ marginLeft: 2 }}>Picks of the day</Button>
            <Button color="inherit" component={Link} to="/previous-matches" sx={{ marginLeft: 2 }}>previous matches</Button>
          </>
        )}
      </Toolbar>

      {/* Drawer (Side Menu) for Mobile */}
      <Drawer anchor="right" open={openDrawer} onClose={toggleDrawer}>
        <List sx={{ width: 250 }}>
          <ListItem button component={Link} to="/" onClick={toggleDrawer}>
            <ListItemText primary="Home" />
          </ListItem>
          <ListItem button component={Link} to="/upcoming-matches" onClick={toggleDrawer}>
            <ListItemText primary="Upcoming Matches" />
          </ListItem>
          <ListItem button component={Link} to="/low-odds-matches" onClick={toggleDrawer}>
            <ListItemText primary="Low Odds Matches" />
          </ListItem>
          <ListItem button component={Link} to="/previous-matches" onClick={toggleDrawer}>
            <ListItemText primary="Previous matches" />
          </ListItem>
        </List>
      </Drawer>
    </AppBar>
  );
}
