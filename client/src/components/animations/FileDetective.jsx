import { useEffect, useState } from "react";
import { Box, Text, Paper } from "@mantine/core";
import "./animations.css";

const LABELS = ["Reading files…", "Searching code…", "Connecting the dots…"];

export default function FileDetective() {
  const [labelIdx, setLabelIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setLabelIdx(i => (i + 1) % LABELS.length), 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <Paper p="sm" withBorder style={{ borderRadius: 12, display: "inline-flex", flexDirection: "column", gap: 4 }}>
      <Box style={{ position: "relative", width: 140, height: 32 }}>
        {/* Three file icons at fixed positions */}
        <Box style={{ position: "absolute", top: "50%", left: 0,   transform: "translateY(-50%)", fontSize: 16, lineHeight: 1 }}>📄</Box>
        <Box style={{ position: "absolute", top: "50%", left: 56,  transform: "translateY(-50%)", fontSize: 16, lineHeight: 1 }}>📁</Box>
        <Box style={{ position: "absolute", top: "50%", left: 112, transform: "translateY(-50%)", fontSize: 16, lineHeight: 1 }}>📄</Box>
        {/* Detective sliding across */}
        <Box style={{
          position: "absolute",
          top: "50%",
          left: 0,
          fontSize: 18,
          lineHeight: 1,
          animation: "detectiveScan 3s ease-in-out infinite",
          zIndex: 1,
        }}>
          🕵️
        </Box>
      </Box>
      <Text size="xs" c="dimmed">{LABELS[labelIdx]}</Text>
    </Paper>
  );
}
