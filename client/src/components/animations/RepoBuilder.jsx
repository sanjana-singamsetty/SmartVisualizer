import { Box, Text } from "@mantine/core";
import { useRepo } from "../../context/RepoContext";
import "./animations.css";

export default function RepoBuilder() {
  const { stage } = useRepo();

  return (
    <Box ta="center" py="xl">
      <Box style={{
        fontSize: 34,
        display: "inline-block",
        animation: "hammer 0.55s ease-in-out infinite",
        transformOrigin: "bottom center",
      }}>
        👷
      </Box>

      <Box style={{
        width: 160,
        height: 6,
        background: "rgba(124,58,237,0.12)",
        borderRadius: 3,
        margin: "12px auto 10px",
        overflow: "hidden",
      }}>
        <Box style={{
          height: "100%",
          background: "rgba(124,58,237,0.65)",
          borderRadius: 3,
          animation: "fillBar 2s ease-in-out infinite",
        }} />
      </Box>

      <Text size="xs" c="dimmed">{stage || "Building your visualization…"}</Text>
    </Box>
  );
}
