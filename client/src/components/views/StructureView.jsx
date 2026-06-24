import { useEffect, useRef, useState, useCallback } from "react";
import {
  Box, Text, Center, Loader, Paper, Badge, Group,
  useMantineColorScheme,
} from "@mantine/core";
import * as d3 from "d3";
import { useRepo } from "../../context/RepoContext";
import { colorForExt } from "../../utils/extColors";
import ExtensionLegend from "../ExtensionLegend";

function formatSize(bytes) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export default function StructureView() {
  const svgRef       = useRef(null);
  const containerRef = useRef(null);
  const { repoData, loading, setSelectedNode } = useRepo();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // Tooltip state
  const [tooltip, setTooltip] = useState(null); // { x, y, data }

  const hideTooltip = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    if (!repoData?.treeData || !svgRef.current || !containerRef.current) return;

    const W = containerRef.current.clientWidth || 800;
    const H = Math.max(520, containerRef.current.clientHeight || 600);

    d3.select(svgRef.current).selectAll("*").remove();

    const svg = d3
      .select(svgRef.current)
      .attr("width", W)
      .attr("height", H)
      .attr("viewBox", `0 0 ${W} ${H}`);

    const root = d3
      .hierarchy(repoData.treeData)
      .sum((d) => d.value || 1)
      .sort((a, b) => b.value - a.value);

    const pack = d3.pack().size([W - 4, H - 4]).padding(4);
    pack(root);

    const folderStroke  = isDark ? "rgba(139,92,246,0.45)" : "rgba(109,40,217,0.35)";
    const labelFill     = isDark ? "rgba(255,255,255,0.65)" : "rgba(30,30,30,0.75)";

    const node = svg
      .selectAll("g")
      .data(root.descendants())
      .join("g")
      .attr("transform", (d) => `translate(${d.x},${d.y})`)
      .style("cursor", "pointer");

    // ── Folder circles ────────────────────────────────────────────────
    node
      .filter((d) => d.children)
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)")
      .attr("stroke", folderStroke)
      .attr("stroke-width", 1.5)
      .on("mousemove", (event, d) => {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          isFolder: true,
          name: d.data.name,
          path: d.data.path || d.data.name,
          fileCount: d.leaves().length,
          totalSize: d.leaves().reduce((s, l) => s + (l.data.value || 0), 0),
        });
      })
      .on("mouseleave", hideTooltip)
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode({
          name: d.data.name,
          path: d.data.path || d.data.name,
          fileCount: d.leaves().length,
          value: d.leaves().reduce((s, l) => s + (l.data.value || 0), 0),
        });
      });

    // ── File circles ─────────────────────────────────────────────────
    const fileNodes = node.filter((d) => !d.children);

    fileNodes
      .append("circle")
      .attr("r", (d) => d.r)
      .attr("fill", (d) => colorForExt(d.data.ext))
      .attr("fill-opacity", 0.82)
      .attr("stroke", isDark ? "rgba(0,0,0,0.3)" : "rgba(255,255,255,0.4)")
      .attr("stroke-width", 0.5)
      .style("transition", "r 0.15s ease, fill-opacity 0.15s ease")
      .on("mousemove", (event, d) => {
        const rect = containerRef.current.getBoundingClientRect();
        setTooltip({
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          isFolder: false,
          name: d.data.name,
          path: d.data.path,
          ext:  d.data.ext,
          size: d.data.value,
          color: colorForExt(d.data.ext),
        });
        d3.select(event.currentTarget)
          .attr("r", d.r * 1.15)
          .attr("fill-opacity", 1);
      })
      .on("mouseleave", (event, d) => {
        hideTooltip();
        d3.select(event.currentTarget)
          .attr("r", d.r)
          .attr("fill-opacity", 0.82);
      })
      .on("click", (event, d) => {
        event.stopPropagation();
        setSelectedNode({
          name: d.data.name,
          path: d.data.path,
          ext:  d.data.ext,
          value: d.data.value,
          fileCount: null,
        });
      });

    // ── Folder labels ─────────────────────────────────────────────────
    node
      .filter((d) => d.children && d.r > 22)
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", (d) => Math.min(13, d.r / 3.5))
      .attr("font-family", "Inter, sans-serif")
      .attr("fill", labelFill)
      .attr("pointer-events", "none")
      .text((d) => (d.r > 40 ? d.data.name : d.data.name.slice(0, Math.floor(d.r / 5))));

  }, [repoData, isDark, setSelectedNode, hideTooltip]);

  if (loading) {
    return (
      <Center h={400}>
        <Loader color="violet" />
      </Center>
    );
  }

  if (!repoData?.treeData) return null;

  return (
    <Box ref={containerRef} pos="relative" w="100%" style={{ minHeight: 520 }}>
      <svg ref={svgRef} style={{ display: "block" }} />
      <ExtensionLegend />

      {/* Floating tooltip */}
      {tooltip && (
        <Paper
          pos="absolute"
          p="sm"
          withBorder
          shadow="md"
          style={{
            left: tooltip.x + 14,
            top:  tooltip.y - 10,
            pointerEvents: "none",
            zIndex: 50,
            minWidth: 180,
            maxWidth: 280,
          }}
        >
          {tooltip.isFolder ? (
            <>
              <Text size="sm" fw={700} truncate>📁 {tooltip.name}/</Text>
              <Text size="xs" c="dimmed" mb={6} truncate>{tooltip.path}</Text>
              <Group gap={6}>
                <Badge size="xs" variant="light" color="violet">
                  {tooltip.fileCount} files
                </Badge>
                <Badge size="xs" variant="light" color="gray">
                  {formatSize(tooltip.totalSize)}
                </Badge>
              </Group>
            </>
          ) : (
            <>
              <Text size="sm" fw={700} truncate>{tooltip.name}</Text>
              <Text size="xs" c="dimmed" mb={6} truncate style={{ wordBreak: "break-all" }}>
                {tooltip.path}
              </Text>
              <Group gap={6}>
                {tooltip.ext && (
                  <Badge
                    size="xs"
                    variant="filled"
                    style={{ background: tooltip.color, color: "#fff" }}
                  >
                    .{tooltip.ext}
                  </Badge>
                )}
                <Badge size="xs" variant="light" color="gray">
                  {formatSize(tooltip.size)}
                </Badge>
              </Group>
              <Text size="xs" c="dimmed" mt={4}>Click to inspect with AI</Text>
            </>
          )}
        </Paper>
      )}
    </Box>
  );
}
