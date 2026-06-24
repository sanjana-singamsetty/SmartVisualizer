import { Paper, Group, Text, Skeleton } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useRepo } from "../context/RepoContext";

export default function AiOverviewBanner({ view }) {
  const { repoData, loading } = useRepo();

  const summary = repoData?.overviewSummary?.[view];

  if (loading) {
    return <Skeleton height={48} mb="sm" radius="md" />;
  }

  if (!summary) return null;

  return (
    <Paper p="sm" mb="sm" withBorder>
      <Group gap="xs" wrap="nowrap" align="flex-start">
        <IconSparkles size={16} color="var(--mantine-color-violet-4)" style={{ flexShrink: 0, marginTop: 2 }} />
        <Text size="sm" c="dimmed" style={{ lineHeight: 1.5 }}>
          {summary}
        </Text>
      </Group>
    </Paper>
  );
}
