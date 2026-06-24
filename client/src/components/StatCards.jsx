import { Group, Paper, Text } from "@mantine/core";

export default function StatCards({ stats }) {
  if (!stats) return null;

  const cards = [
    { label: "Total commits",       value: stats.totalCommits },
    { label: "Contributors",        value: stats.contributorCount },
    { label: "Most active",         value: stats.mostActive },
  ];

  return (
    <Group mb="sm" grow>
      {cards.map(({ label, value }) => (
        <Paper key={label} p="sm" withBorder ta="center">
          <Text size="xl" fw={700} c="violet.3">
            {value ?? "—"}
          </Text>
          <Text size="xs" c="dimmed">
            {label}
          </Text>
        </Paper>
      ))}
    </Group>
  );
}
