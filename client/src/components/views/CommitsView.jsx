import { useMemo, useRef } from "react";
import { Box, Group, Button, Text, useMantineColorScheme } from "@mantine/core";
import { Bubble, getElementAtEvent } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BubbleController,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import { useRepo } from "../../context/RepoContext";
import RepoBuilder from "../animations/RepoBuilder";
import { parseCommits } from "../../utils/parseCommits";
import StatCards from "../StatCards";

ChartJS.register(BubbleController, LinearScale, PointElement, Tooltip, Legend, zoomPlugin);

const AUTHOR_COLORS = [
  "#7C3AED", "#3B82F6", "#10B981", "#F59E0B",
  "#EF4444", "#EC4899", "#14B8A6", "#F97316",
];

export default function CommitsView() {
  const { repoData, loading } = useRepo();
  const { colorScheme } = useMantineColorScheme();
  const chartRef = useRef(null);
  const isDark = colorScheme === "dark";
  const labelColor  = isDark ? "#9CA3AF" : "#4B5563";
  const gridColor   = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
  const tooltipBg   = isDark ? "rgba(17,17,27,0.95)" : "rgba(255,255,255,0.97)";

  const { chartData, stats, authors } = useMemo(() => {
    if (!repoData?.commitsData) return { chartData: null, stats: null, authors: [] };

    const { points, authors } = parseCommits(repoData.commitsData);

    const datasets = authors.map((author, i) => ({
      label: author,
      data: points.filter((p) => p.author === author),
      backgroundColor: AUTHOR_COLORS[i % AUTHOR_COLORS.length] + "BB",
      borderColor:     AUTHOR_COLORS[i % AUTHOR_COLORS.length],
      borderWidth: 1.5,
      hoverBackgroundColor: AUTHOR_COLORS[i % AUTHOR_COLORS.length],
      hoverBorderWidth: 2,
    }));

    const authorCounts = {};
    for (const p of points) authorCounts[p.author] = (authorCounts[p.author] || 0) + 1;
    const mostActive = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

    return {
      chartData: { datasets },
      authors,
      stats: {
        totalCommits:     repoData.commitsData.length,
        contributorCount: authors.length,
        mostActive,
      },
    };
  }, [repoData]);

  const resetZoom = () => chartRef.current?.resetZoom();

  if (loading) return <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 400 }}><RepoBuilder /></Box>;
  if (!chartData) return null;

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: labelColor, boxWidth: 12, padding: 16 },
      },
      tooltip: {
        backgroundColor: tooltipBg,
        borderColor: "rgba(139,92,246,0.4)",
        borderWidth: 1,
        padding: 12,
        titleColor: "#7C3AED",
        bodyColor: isDark ? "#D1D5DB" : "#374151",
        callbacks: {
          title: (items) => {
            const p = items[0]?.raw;
            return p?.author ?? "";
          },
          label: (ctx) => {
            const p = ctx.raw;
            const lines = [];
            if (p?.date)    lines.push(`📅 ${p.date}`);
            if (p?.sha)     lines.push(`🔖 ${p.sha}`);
            if (p?.message) lines.push(`💬 ${p.message.slice(0, 72)}${p.message.length > 72 ? "…" : ""}`);
            return lines;
          },
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true, speed: 0.08 },
          pinch: { enabled: true },
          mode: "xy",
        },
        pan: {
          enabled: true,
          mode: "xy",
        },
        limits: {
          x: { min: "original", max: "original" },
          y: { min: "original", max: "original" },
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: "Week", color: labelColor },
        ticks: { color: labelColor },
        grid:  { color: gridColor },
      },
      y: {
        title: { display: true, text: "Author", color: labelColor },
        ticks: {
          color: labelColor,
          stepSize: 1,
          callback: (val) => authors[val] ?? val,
        },
        grid: { color: gridColor },
      },
    },
  };

  return (
    <Box>
      <StatCards stats={stats} />

      <Group justify="space-between" mb="xs">
        <Text size="xs" c="dimmed">
          Scroll to zoom · drag to pan
        </Text>
        <Button size="xs" variant="subtle" color="violet" onClick={resetZoom}>
          Reset zoom
        </Button>
      </Group>

      <Box h={420}>
        <Bubble ref={chartRef} data={chartData} options={options} />
      </Box>
    </Box>
  );
}
