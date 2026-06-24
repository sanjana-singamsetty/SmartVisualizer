import { Box, Text } from "@mantine/core";
import "./animations.css";

export default function RadarInspector() {
  return (
    <Box ta="center" py="sm">
      <Box style={{ position: "relative", width: 160, height: 36, margin: "0 auto" }}>
        {/* Faint code line */}
        <Box style={{
          position: "absolute",
          top: "50%",
          left: 0,
          right: 0,
          height: 2,
          background: "rgba(124,58,237,0.2)",
          borderRadius: 1,
          transform: "translateY(-50%)",
        }} />
        {/* Sliding inspector */}
        <Box style={{
          position: "absolute",
          top: "50%",
          left: 0,
          fontSize: 20,
          lineHeight: 1,
          transform: "translateY(-50%)",
          animation: "slideLR 2s ease-in-out infinite",
          display: "inline-block",
        }}>
          🔍
        </Box>
      </Box>
      <Text size="xs" c="dimmed" mt={4}>Scoring your codebase…</Text>
    </Box>
  );
}
