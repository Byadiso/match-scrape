module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        neon: "#00F0FF",
        cyberpunk: "#FF00FF",
      },
      backgroundOpacity: {
        10: "0.1",
      },
      backdropBlur: {
        md: "10px",
      },
    },
  },
  plugins: [],
};
