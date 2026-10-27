import { useState } from "react";
import {
  AppBar,
  Box,
  Button,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { NavLink } from "react-router-dom";

const pages = [
  ["/", "Home"],
  ["/upcoming-matches", "Upcoming"],
  ["/low-odds-matches", "My picks"],
  ["/previous-matches", "Team performance"],
  ["/simulator", "Bet Simulator"],
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  return (
    <AppBar
      position="sticky"
      sx={{
        background: "linear-gradient(90deg, #49235e, #183a60)",
        boxShadow: 3,
      }}
    >
      <Toolbar sx={{ gap: 2 }}>
        <Typography
          variant="h6"
          sx={{ flexGrow: 1, fontWeight: 750, fontSize: { xs: 16, sm: 19 } }}
        >
          Trying to beat the master
        </Typography>
        {mobile ? (
          <IconButton
            color="inherit"
            aria-label="Open navigation"
            onClick={() => setOpen(true)}
          >
            <MenuIcon />
          </IconButton>
        ) : (
          <Box sx={{ display: "flex", gap: 0.5 }}>
            {pages.map(([path, label]) => (
              <Button
                key={path}
                component={NavLink}
                to={path}
                end={path === "/"}
                color="inherit"
                sx={{
                  textTransform: "none",
                  "&.active": { backgroundColor: "rgba(255,255,255,0.14)" },
                }}
              >
                {label}
              </Button>
            ))}
          </Box>
        )}
      </Toolbar>
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        slotProps={{
          paper: { sx: { backgroundColor: "#191f2c", color: "#eef2f8" } },
        }}
      >
        <List sx={{ width: 260, pt: 3 }} aria-label="Main navigation">
          {pages.map(([path, label]) => (
            <ListItemButton
              key={path}
              component={NavLink}
              to={path}
              end={path === "/"}
              onClick={() => setOpen(false)}
              sx={{ "&.active": { backgroundColor: "rgba(147,197,253,0.12)" } }}
            >
              <ListItemText primary={label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>
    </AppBar>
  );
}
