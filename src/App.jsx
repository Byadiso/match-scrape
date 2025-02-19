import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar"; // Import your Navbar here
import Home from "./components/LandingPage"; // Import your Home page here
import LowOddsMatches from "./components/LowOddsMatches";
import UpcomingMatches from "./components/UpcomingMatches";

export default function App() {
  return (
    <Router>
      <Navbar /> {/* Render Navbar */}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/upcoming-matches" element={<UpcomingMatches />} />
        <Route path="/low-odds-matches" element={<LowOddsMatches />} />
      </Routes>
    </Router>
  );
}
