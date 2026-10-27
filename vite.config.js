import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");



  return {
    plugins: [react()],

    server: {
      proxy: {
        "/api/football": {
          target: "https://api.football-data.org",
          changeOrigin: true,

          rewrite: (path) =>
            path.replace(/^\/api\/football/, "/v4"),

          headers: {
            "X-Auth-Token": env.FOOTBALL_DATA_API_KEY || "",
          },
        },
      },
    },
  };
});