import { Box, Paper, Skeleton, Stack, useMediaQuery } from "@mui/material";

export default function Loader({ variant = "cards" }) {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const animation = reduceMotion ? false : "wave";
  const panel = {
    bgcolor: "#191f2c",
    color: "#eef2f8",
    backgroundImage: "none",
    border: "1px solid rgba(255,255,255,0.09)",
    borderRadius: 3,
  };
  const skeleton = { bgcolor: "rgba(203,213,225,0.12)" };

  return (
    <Box
      aria-busy="true"
      aria-label="Loading football data"
      sx={{ width: "100%", py: 2 }}
    >
      <Box aria-hidden="true">
        {variant === "table" ? (
          <>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  md: "repeat(4, minmax(0, 1fr))",
                },
                gap: 2,
                mb: 3,
              }}
            >
              {Array.from({ length: 4 }, (_, i) => (
                <Paper key={i} elevation={0} sx={{ ...panel, p: 2.5 }}>
                  <Skeleton animation={animation} width="70%" sx={skeleton} />
                  <Skeleton
                    animation={animation}
                    width="50%"
                    height={52}
                    sx={skeleton}
                  />
                  <Skeleton animation={animation} width="85%" sx={skeleton} />
                </Paper>
              ))}
            </Box>
            <Paper elevation={0} sx={{ ...panel, p: { xs: 2, sm: 3 } }}>
              <Skeleton
                animation={animation}
                width="40%"
                height={32}
                sx={{ ...skeleton, mb: 2 }}
              />
              {Array.from({ length: 6 }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr",
                    gap: 3,
                    py: 2,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <Skeleton animation={animation} height={25} sx={skeleton} />
                  <Skeleton animation={animation} height={25} sx={skeleton} />
                  <Skeleton animation={animation} height={25} sx={skeleton} />
                </Box>
              ))}
            </Paper>
          </>
        ) : (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(2, minmax(0, 1fr))",
              },
              gap: 3,
            }}
          >
            {Array.from({ length: 4 }, (_, i) => (
              <Paper
                key={i}
                elevation={0}
                sx={{ ...panel, p: 3, minHeight: 218 }}
              >
                <Skeleton
                  animation={animation}
                  width="38%"
                  height={22}
                  sx={{ ...skeleton, mb: 2 }}
                />
                <Skeleton
                  animation={animation}
                  width="88%"
                  height={34}
                  sx={skeleton}
                />
                <Skeleton
                  animation={animation}
                  width="60%"
                  height={24}
                  sx={{ ...skeleton, mt: 1 }}
                />
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  sx={{ mt: 3 }}
                >
                  <Skeleton
                    animation={animation}
                    variant="rounded"
                    width={100}
                    height={27}
                    sx={skeleton}
                  />
                  <Skeleton
                    animation={animation}
                    width={55}
                    height={27}
                    sx={skeleton}
                  />
                </Stack>
              </Paper>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
