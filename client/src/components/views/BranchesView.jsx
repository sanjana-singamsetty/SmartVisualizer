import { useEffect, useRef } from "react";
import { Box, Center, Loader, Text, Group, Badge, useMantineColorScheme } from "@mantine/core";
import * as d3 from "d3";
import { useRepo } from "../../context/RepoContext";

/**
 * BranchesView — renders a horizontal git graph using D3.
 * Each branch gets its own horizontal lane. Commits are circles on a timeline.
 * Merge lines connect feature branches back to the default branch.
 */
export default function BranchesView() {
  const svgRef = useRef(null);
  const { repoData, loading } = useRepo();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  useEffect(() => {
    if (!repoData?.branchesData || !svgRef.current) return;

    const { branches, defaultBranch } = repoData.branchesData;
    if (!branches?.length) return;

    // Layout constants
    const LANE_H   = 48;
    const PAD_L    = 140;
    const PAD_R    = 24;
    const PAD_TOP  = 20;
    const COMMIT_R = 7;
    const COMMIT_SPACING = 60;

    // Put default branch first, rest alphabetically
    const sorted = [
      branches.find((b) => b.name === defaultBranch) || branches[0],
      ...branches.filter((b) => b.name !== defaultBranch),
    ].filter(Boolean);

    const W = PAD_L + sorted.length * COMMIT_SPACING + PAD_R;
    const H = PAD_TOP + sorted.length * LANE_H + PAD_TOP;

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", "100%")
      .attr("viewBox", `0 0 ${W} ${H}`)
      .attr("preserveAspectRatio", "xMinYMid meet");

    const COLORS = [
      "#7C3AED", "#3B82F6", "#10B981", "#F59E0B",
      "#EF4444", "#EC4899", "#14B8A6", "#F97316",
    ];

    const colorFor = (i) => COLORS[i % COLORS.length];
    const laneY    = (i) => PAD_TOP + i * LANE_H + LANE_H / 2;
    // Each branch gets commits spread across x; main branch has the most
    const commitX  = (branchIdx, commitIdx, total) =>
      PAD_L + (commitIdx / Math.max(total - 1, 1)) * (sorted.length * COMMIT_SPACING);

    // Draw lane lines
    sorted.forEach((branch, i) => {
      const y = laneY(i);
      const numCommits = Math.max(2, 2 + i); // main gets most commits visually

      // Horizontal lane line
      svg.append("line")
        .attr("x1", PAD_L)
        .attr("y1", y)
        .attr("x2", W - PAD_R)
        .attr("y2", y)
        .attr("stroke", colorFor(i))
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.4);

      // Branch label
      svg.append("text")
        .attr("x", PAD_L - 8)
        .attr("y", y)
        .attr("text-anchor", "end")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 12)
        .attr("fill", colorFor(i))
        .attr("font-family", "monospace")
        .text(branch.name.length > 18 ? branch.name.slice(0, 16) + "…" : branch.name);

      // Commit circles along the lane
      for (let c = 0; c < numCommits; c++) {
        const cx = commitX(i, c, numCommits);
        svg.append("circle")
          .attr("cx", cx)
          .attr("cy", y)
          .attr("r", COMMIT_R)
          .attr("fill", colorFor(i))
          .attr("stroke", isDark ? "#1A1B1E" : "#ffffff")
          .attr("stroke-width", 2);
      }

      // Draw merge line back to main (default branch lane) for non-default branches
      if (i > 0) {
        const mainY    = laneY(0);
        const branchX  = commitX(i, 0, numCommits); // branch-off point
        const mergeX   = commitX(i, numCommits - 1, numCommits); // merge point

        // Branch-off from main
        svg.append("path")
          .attr(
            "d",
            `M ${branchX} ${mainY} C ${branchX} ${mainY + (y - mainY) * 0.6}, ${branchX} ${y}, ${branchX} ${y}`
          )
          .attr("fill", "none")
          .attr("stroke", colorFor(i))
          .attr("stroke-width", 1.5)
          .attr("stroke-dasharray", "4 3")
          .attr("stroke-opacity", 0.7);

        // Merge back to main
        svg.append("path")
          .attr(
            "d",
            `M ${mergeX} ${y} C ${mergeX} ${y + (mainY - y) * 0.6}, ${mergeX} ${mainY}, ${mergeX} ${mainY}`
          )
          .attr("fill", "none")
          .attr("stroke", colorFor(i))
          .attr("stroke-width", 1.5)
          .attr("stroke-opacity", 0.7);
      }
    });
  }, [repoData, isDark]);

  if (loading) return <Center h={400}><Loader color="violet" /></Center>;
  if (!repoData?.branchesData) return null;

  const { branches, defaultBranch } = repoData.branchesData;

  return (
    <Box>
      <Group mb="sm" gap="xs">
        <Text size="xs" c="dimmed">
          {branches?.length ?? 0} branches
        </Text>
        <Badge variant="light" size="sm" color="violet">
          default: {defaultBranch}
        </Badge>
      </Group>
      <Box style={{ overflowX: "auto" }}>
        <svg ref={svgRef} style={{ display: "block", minWidth: "100%" }} />
      </Box>
    </Box>
  );
}
