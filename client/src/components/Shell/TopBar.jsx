import { useState } from "react";
import {
  Group, TextInput, Button, Text, Progress,
  Alert, Box, ActionIcon, Tooltip,
} from "@mantine/core";
import {
  IconBrandGithub, IconSearch, IconAlertCircle,
  IconSun, IconMoon,
} from "@tabler/icons-react";
import { useMantineColorScheme } from "@mantine/core";
import { useRepo } from "../../context/RepoContext";
import { useRepoData } from "../../hooks/useRepoData";

export default function TopBar() {
  const [url, setUrl] = useState("");
  const { loading, progress, error, stage } = useRepo();
  const { analyze } = useRepoData();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  const handleAnalyze = () => {
    if (!url.trim()) return;
    analyze(url.trim());
  };

  const handleKey = (e) => {
    if (e.key === "Enter") handleAnalyze();
  };

  return (
    <Box px="md" h="100%">
      <Group h="100%" justify="space-between" wrap="nowrap">
        {/* Brand */}
        <Group gap={6} wrap="nowrap">
          <IconBrandGithub size={22} color="var(--mantine-color-violet-4)" />
          <Text fw={700} size="lg" c="violet.3" visibleFrom="sm">
            SmartVisualizer
          </Text>
        </Group>

        {/* Input */}
        <Group flex={1} maw={640} gap="xs" wrap="nowrap">
          <TextInput
            flex={1}
            placeholder="https://github.com/owner/repo"
            value={url}
            onChange={(e) => setUrl(e.currentTarget.value)}
            onKeyDown={handleKey}
            leftSection={<IconSearch size={16} />}
            disabled={loading}
          />
          <Button
            onClick={handleAnalyze}
            loading={loading}
            disabled={!url.trim()}
            variant="filled"
          >
            Analyze
          </Button>
        </Group>

        {/* Dark/light toggle */}
        <Tooltip label={colorScheme === "dark" ? "Light mode" : "Dark mode"}>
          <ActionIcon
            variant="subtle"
            size="lg"
            onClick={toggleColorScheme}
            color={colorScheme === "dark" ? "yellow" : "blue"}
          >
            {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Progress bar with stage label */}
      {loading && (
        <Box pos="absolute" bottom={0} left={0} right={0}>
          {stage && (
            <Text
              size="xs"
              c="dimmed"
              ta="center"
              pos="absolute"
              style={{ bottom: 6, width: "100%", zIndex: 1 }}
            >
              {stage}
            </Text>
          )}
          <Progress
            value={progress}
            animated
            size="xs"
            radius={0}
            color="violet"
          />
        </Box>
      )}

      {/* Error banner */}
      {error && (
        <Alert
          icon={<IconAlertCircle size={16} />}
          color="red"
          pos="absolute"
          top={64}
          left={0}
          right={0}
          radius={0}
          style={{ zIndex: 100 }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
}
