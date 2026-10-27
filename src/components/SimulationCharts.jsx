import { Box, Paper, Stack, Typography } from "@mui/material";

const money = (cents) =>
  new Intl.NumberFormat("pl-PL", { style: "currency", currency: "PLN" }).format(
    cents / 100,
  );

function LineChart({ points, field, title, color }) {
  const values = points.map((point) => point[field] / 100);
  const min = Math.min(0, ...values);
  const max = Math.max(field === "cash" ? 100 : 1, ...values);
  const span = max - min || 1;
  const x = (index) => 58 + (index * 480) / Math.max(1, values.length - 1);
  const y = (value) => 166 - ((value - min) / span) * 132;
  const path = values
    .map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`)
    .join(" ");
  return (
    <Paper variant="outlined" sx={{ p: 2.5, minWidth: 0 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
      >
        <Typography component="h3" fontWeight={700}>
          {title}
        </Typography>
        <Typography fontWeight={800} sx={{ color }}>
          {money(points.at(-1)[field])}
        </Typography>
      </Stack>
      <Box
        component="svg"
        viewBox="0 0 560 210"
        role="img"
        aria-label={`${title}, ${points.length - 1} events, ending at ${money(points.at(-1)[field])}`}
        sx={{ display: "block", width: "100%", mt: 2 }}
      >
        <title>{title}</title>
        {[min, min + span / 2, max].map((value, i) => (
          <g key={i}>
            <line
              x1="58"
              x2="538"
              y1={y(value)}
              y2={y(value)}
              stroke="#334155"
              strokeDasharray="4 4"
            />
            <text
              x="49"
              y={y(value) + 4}
              textAnchor="end"
              fill="#94a3b8"
              fontSize="11"
            >
              {value.toFixed(0)}
            </text>
          </g>
        ))}
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle
          cx={x(values.length - 1)}
          cy={y(values.at(-1))}
          r="4"
          fill={color}
        />
        <text x="58" y="193" fill="#94a3b8" fontSize="11">
          Month opens
        </text>
        <text x="538" y="193" textAnchor="end" fill="#94a3b8" fontSize="11">
          Latest event
        </text>
      </Box>
      <Typography variant="caption" color="text.secondary">
        PLN · Events in chronological order, equally spaced.
      </Typography>
    </Paper>
  );
}

export default function SimulationCharts({ points, history }) {
  const largest = Math.max(
    1,
    ...history.flatMap((row) => [row.wins, row.losses]),
  );
  return (
    <Stack spacing={3}>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
          gap: 3,
        }}
      >
        <LineChart
          points={points}
          field="cash"
          title="Available bankroll"
          color="#93c5fd"
        />
        <LineChart
          points={points}
          field="profit"
          title="Realized profit / loss"
          color={points.at(-1).profit < 0 ? "#fca5a5" : "#86efac"}
        />
      </Box>
      <Paper variant="outlined" sx={{ p: 2.5 }}>
        <Typography component="h3" fontWeight={700} sx={{ mb: 2 }}>
          Wins and losses by month
        </Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Typography variant="caption" sx={{ color: "#86efac" }}>
            Green: won tickets
          </Typography>
          <Typography variant="caption" sx={{ color: "#fca5a5" }}>
            Red: lost tickets
          </Typography>
        </Stack>
        <Stack spacing={2}>
          {history.map((row) => (
            <Box
              key={row.month}
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "75px 1fr", sm: "100px 1fr 130px" },
                gap: 2,
                alignItems: "center",
              }}
            >
              <Typography variant="body2">{row.month}</Typography>
              <Stack spacing={0.75}>
                {[
                  [row.wins, "#86efac", "won"],
                  [row.losses, "#fca5a5", "lost"],
                ].map(([count, color, label]) => (
                  <Stack
                    key={label}
                    direction="row"
                    alignItems="center"
                    spacing={1}
                  >
                    <Box
                      sx={{
                        flex: 1,
                        height: 9,
                        bgcolor: "#263144",
                        borderRadius: 2,
                      }}
                    >
                      <Box
                        sx={{
                          width: `${(count / largest) * 100}%`,
                          height: "100%",
                          bgcolor: color,
                          borderRadius: 2,
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color, minWidth: 45 }}>
                      {count} {label}
                    </Typography>
                  </Stack>
                ))}
              </Stack>
              <Typography
                variant="body2"
                sx={{
                  display: { xs: "none", sm: "block" },
                  color: row.profit < 0 ? "#fca5a5" : "#86efac",
                  textAlign: "right",
                }}
              >
                {money(row.profit)} net
              </Typography>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Stack>
  );
}
