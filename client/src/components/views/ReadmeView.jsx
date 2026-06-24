import { useState } from "react";
import {
  Box, Button, Group, Paper, Text, ScrollArea, Center,
  Alert, Code, CopyButton, Tooltip, ActionIcon,
} from "@mantine/core";
import {
  IconSparkles, IconDownload, IconCopy, IconCheck, IconAlertCircle,
} from "@tabler/icons-react";
import axios from "axios";
import { useRepo } from "../../context/RepoContext";
import TypewriterWriter from "../animations/TypewriterWriter";

const API = import.meta.env.VITE_API_BASE_URL || "";

export default function ReadmeView() {
  const { repoId, repoData } = useRepo();
  const [readme, setReadme] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.post(`${API}/api/readme`, { repoId });
      setReadme(data.readme);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to generate README");
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    const blob = new Blob([readme], { type: "text/markdown" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `${repoData?.name || "repo"}-README.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Box style={{ display: "flex", justifyContent: "center", alignItems: "center", height: 300 }}>
        <TypewriterWriter />
      </Box>
    );
  }

  return (
    <Box>
      {!readme ? (
        // Pre-generate state
        <Center h={300}>
          <Box ta="center" maw={400}>
            <IconSparkles size={40} color="var(--mantine-color-violet-4)" style={{ marginBottom: 12 }} />
            <Text size="lg" fw={600} mb="xs">AI-Generated README</Text>
            <Text size="sm" c="dimmed" mb="lg">
              Generate a professional README.md based on{" "}
              <strong>{repoData?.name}</strong>'s file structure, tech stack, and commit history.
            </Text>
            <Button
              leftSection={<IconSparkles size={16} />}
              color="violet"
              size="md"
              onClick={generate}
            >
              Generate README
            </Button>
          </Box>
        </Center>
      ) : (
        // Generated state
        <Box>
          <Group justify="space-between" mb="sm">
            <Text size="sm" c="dimmed">
              {repoData?.name}-README.md
            </Text>
            <Group gap="xs">
              <Button
                size="xs"
                variant="subtle"
                leftSection={<IconSparkles size={13} />}
                onClick={generate}
              >
                Regenerate
              </Button>
              <CopyButton value={readme} timeout={2000}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied!" : "Copy markdown"}>
                    <ActionIcon
                      variant="light"
                      color={copied ? "teal" : "violet"}
                      onClick={copy}
                    >
                      {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
              <Button
                size="xs"
                variant="light"
                leftSection={<IconDownload size={13} />}
                onClick={download}
              >
                Download .md
              </Button>
            </Group>
          </Group>

          <ScrollArea h="calc(100vh - 260px)">
            <Paper p="md" withBorder>
              {/* Render as formatted code block — install react-markdown for rich preview */}
              <Code block style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.7 }}>
                {readme}
              </Code>
            </Paper>
          </ScrollArea>
        </Box>
      )}

      {error && (
        <Alert icon={<IconAlertCircle size={16} />} color="red" mt="md">
          {error}
        </Alert>
      )}
    </Box>
  );
}
