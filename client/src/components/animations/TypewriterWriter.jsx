import { Box, Text } from "@mantine/core";
import "./animations.css";

export default function TypewriterWriter() {
  return (
    <Box ta="center" py="xl">
      <Box style={{ position: "relative", display: "inline-flex", alignItems: "flex-end", gap: 10 }}>
        {/* Writer character */}
        <Box style={{
          fontSize: 32,
          display: "inline-block",
          animation: "writingArm 0.5s ease-in-out infinite",
          transformOrigin: "bottom center",
        }}>
          ✍️
        </Box>

        {/* Animated text lines */}
        <Box style={{ display: "flex", flexDirection: "column", gap: 5, paddingBottom: 6 }}>
          <Box className="sv-text-line" style={{ animationDelay: "0s" }} />
          <Box className="sv-text-line" style={{ animationDelay: "0.6s" }} />
          <Box className="sv-text-line" style={{ animationDelay: "1.2s" }} />
        </Box>
      </Box>

      {/* Desk line */}
      <Box style={{
        width: 120,
        height: 2,
        background: "rgba(124,58,237,0.2)",
        borderRadius: 1,
        margin: "8px auto 12px",
      }} />

      <Text size="xs" c="dimmed">Writing your README…</Text>
    </Box>
  );
}
