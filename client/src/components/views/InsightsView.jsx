import { useEffect, useState } from "react";
import {
  Box, Stack, Paper, Text, Badge, Group, ThemeIcon,
  List, Loader, Center, Alert, Button, ActionIcon, Tooltip,
  Divider, SimpleGrid,
} from "@mantine/core";
import {
  IconSword, IconShield, IconBulb, IconAlertCircle,
  IconRefresh, IconStarFilled,
} from "@tabler/icons-react";
import {
  Chart as ChartJS, RadialLinearScale, PointElement,
  LineElement, Filler, Tooltip as ChartTooltip, Legend,
} from "chart.js";
import { Radar } from "react-chartjs-2";
import axios from "axios";
import { useRepo } from "../../context/RepoContext";
import { useMantineColorScheme } from "@mantine/core";

ChartJS.register(RadialLinearScale, PointElement, LineElement, Filler, ChartTooltip, Legend);

const API = import.meta.env.VITE_API_BASE_URL || "";

const SCORE_LABELS = {
  readability:     "Readability",
  testCoverage:    "Tests",
  security:        "Security",
  maintainability: "Maintainability",
  modularity:      "Modularity",
};

const SCORE_COLORS = {
  readability:     "blue",
  testCoverage:    "teal",
  security:        "green",
  maintainability: "violet",
  modularity:      "orange",
};

function isValidDebate(d) {
  return d?.advocate?.trim() && d?.critic?.trim();
}

// ── Radar chart component ────────────────────────────────────────────────────
function QualityRadar({ score, onRefresh }) {
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";
  const labelColor = isDark ? "#9CA3AF" : "#4B5563";
  const gridColor  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  const DIMS = ["readability", "testCoverage", "security", "maintainability", "modularity"];
  const values = DIMS.map(d => score.scores?.[d] ?? 0);

  const data = {
    labels: DIMS.map(d => SCORE_LABELS[d]),
    datasets: [{
      label: "Score",
      data: values,
      fill: true,
      backgroundColor: "rgba(124,58,237,0.15)",
      borderColor: "rgba(124,58,237,0.8)",
      pointBackgroundColor: "rgba(124,58,237,1)",
      pointBorderColor: "#fff",
      pointHoverBackgroundColor: "#fff",
      pointHoverBorderColor: "rgba(124,58,237,1)",
    }],
  };

  const options = {
    responsive: true,
    scales: {
      r: {
        min: 0,
        max: 10,
        ticks: { stepSize: 2, color: labelColor, backdropColor: "transparent", font: { size: 10 } },
        grid:        { color: gridColor },
        angleLines:  { color: gridColor },
        pointLabels: { color: labelColor, font: { size: 11 } },
      },
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.raw}/10`,
          afterLabel: (ctx) => {
            const dim = DIMS[ctx.dataIndex];
            return score.explanations?.[dim] ? `  ${score.explanations[dim]}` : "";
          },
        },
      },
    },
  };

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Group gap="xs">
          <ThemeIcon color="violet" variant="light" size="sm">
            <IconStarFilled size={13} />
          </ThemeIcon>
          <Text size="sm" fw={600} c="violet">Code Quality Score</Text>
        </Group>
        <Group gap="xs">
          <Badge size="lg" variant="filled" color={score.overall >= 7 ? "teal" : score.overall >= 5 ? "yellow" : "red"}>
            {score.overall}/10
          </Badge>
          <Tooltip label="Re-score">
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={onRefresh}>
              <IconRefresh size={13} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Group>

      <Box style={{ maxWidth: 320, margin: "0 auto" }}>
        <Radar data={data} options={options} />
      </Box>

      <SimpleGrid cols={1} mt="sm" spacing={4}>
        {DIMS.map(d => (
          <Group key={d} gap="xs" wrap="nowrap">
            <Badge size="xs" color={SCORE_COLORS[d]} variant="light" style={{ minWidth: 100 }}>
              {SCORE_LABELS[d]}: {score.scores?.[d] ?? "?"}/10
            </Badge>
            <Text size="xs" c="dimmed" truncate>
              {score.explanations?.[d]}
            </Text>
          </Group>
        ))}
      </SimpleGrid>
    </Paper>
  );
}

// ── Main view ────────────────────────────────────────────────────────────────
export default function InsightsView() {
  const { repoId, repoData } = useRepo();

  // Debate state
  const [debate, setDebate]   = useState(isValidDebate(repoData?.debate) ? repoData.debate : null);
  const [debateLoading, setDebateLoading] = useState(false);
  const [debateError,   setDebateError]   = useState(null);

  // Score state
  const [score, setScore]       = useState(repoData?.qualityScore?.scores ? repoData.qualityScore : null);
  const [scoreLoading, setScoreLoading] = useState(false);
  const [scoreError,   setScoreError]   = useState(null);

  useEffect(() => {
    if (isValidDebate(repoData?.debate)) setDebate(repoData.debate);
    else if (repoId) fetchDebate();

    if (repoData?.qualityScore?.scores) setScore(repoData.qualityScore);
    else if (repoId) fetchScore();
  }, [repoId]); // eslint-disable-line

  async function fetchDebate(force = false) {
    setDebateLoading(true);
    setDebateError(null);
    if (force) setDebate(null);
    try {
      const { data } = await axios.post(`${API}/api/debate`, { repoId, force });
      if (!isValidDebate(data)) throw new Error("Debate returned empty content");
      setDebate(data);
    } catch (err) {
      setDebateError(err.response?.data?.message || err.message || "Failed to generate insights");
    } finally {
      setDebateLoading(false);
    }
  }

  async function fetchScore(force = false) {
    setScoreLoading(true);
    setScoreError(null);
    try {
      const { data } = await axios.post(`${API}/api/score`, { repoId, force });
      setScore(data);
    } catch (err) {
      setScoreError(err.response?.data?.message || err.message || "Failed to score repo");
    } finally {
      setScoreLoading(false);
    }
  }

  return (
    <Stack gap="md">
      {/* ── Code Quality Score ─────────────────────────────────────── */}
      {scoreLoading && (
        <Center h={80}>
          <Stack align="center" gap="xs">
            <Loader size="sm" color="violet" />
            <Text size="xs" c="dimmed">LLM judging your codebase…</Text>
          </Stack>
        </Center>
      )}
      {scoreError && (
        <Alert icon={<IconAlertCircle size={14} />} color="orange" p="xs">
          {scoreError}
          <Button size="xs" variant="subtle" ml="xs" onClick={() => fetchScore()}>Retry</Button>
        </Alert>
      )}
      {score && !scoreLoading && (
        <QualityRadar score={score} onRefresh={() => fetchScore(true)} />
      )}

      <Divider />

      {/* ── Debate ─────────────────────────────────────────────────── */}
      {debateLoading && (
        <Center h={200}>
          <Stack align="center" gap="xs">
            <Loader color="violet" />
            <Text size="sm" c="dimmed">Two agents are debating your repo…</Text>
          </Stack>
        </Center>
      )}
      {debateError && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mb="md">
          {debateError}
          <Button size="xs" variant="subtle" ml="sm" onClick={() => fetchDebate()}>Retry</Button>
        </Alert>
      )}

      {debate && !debateLoading && (
        <>
          <Group justify="space-between">
            <Badge size="lg" variant="light" color="violet" leftSection={<IconBulb size={13} />}>
              {debate.topic}
            </Badge>
            <Tooltip label="Regenerate debate">
              <ActionIcon variant="subtle" color="gray" size="sm" onClick={() => fetchDebate(true)}>
                <IconRefresh size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Paper p="md" withBorder>
            <Group gap="xs" mb="xs">
              <ThemeIcon color="teal" variant="light" size="sm"><IconShield size={14} /></ThemeIcon>
              <Text size="sm" fw={600} c="teal">The Advocate</Text>
            </Group>
            <Text size="sm" style={{ lineHeight: 1.7 }}>{debate.advocate}</Text>
          </Paper>

          <Paper p="md" withBorder>
            <Group gap="xs" mb="xs">
              <ThemeIcon color="red" variant="light" size="sm"><IconSword size={14} /></ThemeIcon>
              <Text size="sm" fw={600} c="red">The Critic</Text>
            </Group>
            <Text size="sm" style={{ lineHeight: 1.7 }}>{debate.critic}</Text>
          </Paper>

          {debate.synthesis?.length > 0 && (
            <Paper p="md" withBorder>
              <Group gap="xs" mb="xs">
                <ThemeIcon color="violet" variant="light" size="sm"><IconBulb size={14} /></ThemeIcon>
                <Text size="sm" fw={600} c="violet">Key Takeaways</Text>
              </Group>
              <List size="sm" spacing="xs" style={{ lineHeight: 1.7 }}>
                {debate.synthesis.map((point, i) => <List.Item key={i}>{point}</List.Item>)}
              </List>
            </Paper>
          )}
        </>
      )}
    </Stack>
  );
}
