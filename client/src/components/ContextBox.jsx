import { Drawer, Stack, Text, Button, Group, Loader, Alert, Badge, Divider } from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useRepo } from "../context/RepoContext";
import { useLlmQuery } from "../hooks/useLlmQuery";

const QUESTIONS = [
  { type: "what_does_it_do", label: "What does this do?" },
  { type: "connections",     label: "What does it connect to?" },
  { type: "refactor",        label: "Anything worth refactoring?" },
];

export default function ContextBox() {
  const { selectedNode, setSelectedNode } = useRepo();
  const { ask, answer, loading, error, clear } = useLlmQuery();

  const close = () => {
    setSelectedNode(null);
    clear();
  };

  return (
    <Drawer
      opened={!!selectedNode}
      onClose={close}
      title={
        <Stack gap={2}>
          <Text fw={600} size="sm" truncate>
            {selectedNode?.name}
          </Text>
          <Text size="xs" c="dimmed" truncate>
            {selectedNode?.path}
          </Text>
        </Stack>
      }
      position="right"
      size="md"
      overlayProps={{ opacity: 0.3 }}
    >
      {selectedNode && (
        <Stack gap="md">
          {/* Quick stats */}
          <Group gap="xs">
            {selectedNode.fileCount != null && (
              <Badge variant="light">{selectedNode.fileCount} files</Badge>
            )}
            {selectedNode.ext && (
              <Badge variant="light" color="violet">.{selectedNode.ext}</Badge>
            )}
            {selectedNode.value != null && (
              <Badge variant="light" color="gray">{selectedNode.value.toLocaleString()} bytes</Badge>
            )}
          </Group>

          <Divider />

          {/* Quick question buttons */}
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Ask AI
            </Text>
            {QUESTIONS.map(({ type, label }) => (
              <Button
                key={type}
                variant="light"
                size="sm"
                fullWidth
                justify="left"
                onClick={() => ask(type)}
                loading={loading}
              >
                {label}
              </Button>
            ))}
          </Stack>

          {/* Answer area */}
          {loading && (
            <Group justify="center" mt="md">
              <Loader size="sm" color="violet" />
            </Group>
          )}

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          {answer && (
            <Stack gap="xs">
              <Divider />
              <Text size="sm" style={{ lineHeight: 1.7 }}>
                {answer}
              </Text>
            </Stack>
          )}
        </Stack>
      )}
    </Drawer>
  );
}
