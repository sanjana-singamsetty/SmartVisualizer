import { useEffect, useState } from "react";
import { Box, Text, Group } from "@mantine/core";
import "./animations.css";

const LABELS = ["The Advocate is drafting…", "The Critic responds…"];

export default function DebatingAgents() {
  const [turn, setTurn] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTurn(t => (t + 1) % 2), 1400);
    return () => clearInterval(id);
  }, []);

  return (
    <Box ta="center" py="md">
      <Group justify="center" gap={48} align="flex-end" mb="xs" style={{ minHeight: 80 }}>

        {/* Advocate */}
        <Box style={{ position: "relative", textAlign: "center" }}>
          {turn === 0 && (
            <Box
              className="sv-speech-bubble sv-speech-bubble--teal"
              style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)" }}
            >
              <span className="sv-dot" style={{ animationDelay: "0ms" }}>•</span>
              <span className="sv-dot" style={{ animationDelay: "160ms" }}>•</span>
              <span className="sv-dot" style={{ animationDelay: "320ms" }}>•</span>
            </Box>
          )}
          <Box style={{
            fontSize: 28,
            display: "inline-block",
            animation: turn === 0 ? "bob 0.6s ease-in-out infinite" : "none",
          }}>
            🛡️
          </Box>
        </Box>

        <Text size="xs" c="dimmed" mb={6}>vs</Text>

        {/* Critic */}
        <Box style={{ position: "relative", textAlign: "center" }}>
          {turn === 1 && (
            <Box
              className="sv-speech-bubble sv-speech-bubble--red"
              style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)" }}
            >
              <span className="sv-dot" style={{ animationDelay: "0ms" }}>•</span>
              <span className="sv-dot" style={{ animationDelay: "160ms" }}>•</span>
              <span className="sv-dot" style={{ animationDelay: "320ms" }}>•</span>
            </Box>
          )}
          <Box style={{
            fontSize: 28,
            display: "inline-block",
            animation: turn === 1 ? "bob 0.6s ease-in-out infinite" : "none",
          }}>
            ⚔️
          </Box>
        </Box>
      </Group>

      <Text size="xs" c="dimmed">{LABELS[turn]}</Text>
    </Box>
  );
}
