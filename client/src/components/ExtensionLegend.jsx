import { Group, Box, Text, Paper } from "@mantine/core";
import { EXT_COLORS } from "../utils/extColors";

const SHOW = ["js", "jsx", "ts", "tsx", "py", "md", "json", "css", "html"];

export default function ExtensionLegend() {
  return (
    <Paper
      p="xs"
      withBorder
      pos="absolute"
      bottom={16}
      right={16}
      style={{ zIndex: 10 }}
    >
      <Text size="xs" fw={600} c="dimmed" mb={4}>
        File types
      </Text>
      <Group gap={8} wrap="wrap" maw={200}>
        {SHOW.map((ext) => (
          <Group key={ext} gap={4} wrap="nowrap">
            <Box
              w={10}
              h={10}
              style={{
                borderRadius: "50%",
                backgroundColor: EXT_COLORS[ext],
                flexShrink: 0,
              }}
            />
            <Text size="xs" c="dimmed">
              .{ext}
            </Text>
          </Group>
        ))}
      </Group>
    </Paper>
  );
}
