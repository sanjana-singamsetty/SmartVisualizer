import { Box, Text } from "@mantine/core";
import "./animations.css";

export default function ThinkingRobot() {
  return (
    <Box ta="center" py="sm">
      <Box style={{ position: "relative", display: "inline-block" }}>
        {/* Thought bubble */}
        <Box style={{
          position: "absolute",
          top: -18,
          right: -10,
          fontSize: 12,
          lineHeight: 1,
          animation: "fadeInOut 1.2s ease-in-out infinite",
        }}>
          💭
        </Box>
        {/* Robot tilting */}
        <Box style={{
          fontSize: 26,
          display: "inline-block",
          animation: "tilt 0.8s ease-in-out infinite",
          transformOrigin: "bottom center",
        }}>
          🤖
        </Box>
      </Box>
      <Text size="xs" c="dimmed" mt={4}>Thinking…</Text>
    </Box>
  );
}
