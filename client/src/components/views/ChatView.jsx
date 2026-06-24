import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  Box, Stack, Paper, Text, TextInput, ActionIcon,
  Group, ScrollArea, Avatar, Loader, Badge, Collapse,
  UnstyledButton, Tooltip, Switch,
} from "@mantine/core";
import {
  IconSend, IconRobot, IconUser, IconChevronDown, IconChevronUp,
  IconCode, IconTool, IconEye, IconSearch,
} from "@tabler/icons-react";
import { useRepo } from "../../context/RepoContext";
import { colorForExt } from "../../utils/extColors";

const API = import.meta.env.VITE_API_BASE_URL || "";

const SUGGESTIONS = [
  "What is this project about?",
  "What are the main technologies used?",
  "Where is the entry point of the app?",
  "Who contributes the most and to what areas?",
  "Where is authentication handled?",
];

// ── Sources accordion ─────────────────────────────────────────────────────────
function SourcesPanel({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources?.length) return null;
  return (
    <Box mt={6}>
      <UnstyledButton onClick={() => setOpen(o => !o)}>
        <Group gap={4}>
          <IconCode size={12} />
          <Text size="xs" c="dimmed">{sources.length} source{sources.length > 1 ? "s" : ""}</Text>
          {open ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}
        </Group>
      </UnstyledButton>
      <Collapse in={open}>
        <Stack gap={6} mt={6}>
          {sources.map((s, i) => (
            <Paper key={i} p="xs" withBorder radius="sm"
              style={{ borderLeft: `3px solid ${colorForExt(s.ext)}` }}>
              <Group gap={6} mb={4}>
                <Badge size="xs" variant="filled"
                  style={{ background: colorForExt(s.ext), color: "#fff" }}>
                  .{s.ext || "?"}
                </Badge>
                <Text size="xs" ff="monospace" c="dimmed" truncate style={{ maxWidth: 260 }}>
                  {s.path}
                </Text>
              </Group>
              <Text size="xs" c="dimmed" ff="monospace"
                style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.5, opacity: 0.8 }}>
                {s.snippet}{s.snippet?.length >= 200 ? "…" : ""}
              </Text>
            </Paper>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

// ── Agent reasoning trace ─────────────────────────────────────────────────────
const TOOL_ICONS = { read_file: "📄", search_code: "🔍", list_directory: "📁", get_commits: "📝" };

function TracePanel({ trace }) {
  const [open, setOpen] = useState(false);
  const steps = (trace || []).filter(s => s.type !== "answer");
  if (!steps.length) return null;

  return (
    <Box mt={6}>
      <UnstyledButton onClick={() => setOpen(o => !o)}>
        <Group gap={4}>
          <IconSearch size={12} />
          <Text size="xs" c="dimmed">
            {steps.filter(s => s.type === "action").length} tool calls
          </Text>
          {open ? <IconChevronUp size={11} /> : <IconChevronDown size={11} />}
        </Group>
      </UnstyledButton>
      <Collapse in={open}>
        <Stack gap={4} mt={6}>
          {steps.map((step, i) => (
            <Box key={i}>
              {step.type === "action" && (
                <Group gap={6} wrap="nowrap">
                  <Text size="xs">{TOOL_ICONS[step.tool] || "🔧"}</Text>
                  <Text size="xs" ff="monospace" c="violet">
                    {step.tool}({Object.entries(step.args || {}).map(([k, v]) => `${k}="${v}"`).join(", ")})
                  </Text>
                </Group>
              )}
              {step.type === "observation" && (
                <Paper p="xs" withBorder radius="sm" style={{ background: "transparent" }}>
                  <Text size="xs" ff="monospace" c="dimmed"
                    style={{ whiteSpace: "pre-wrap", maxHeight: 120, overflow: "hidden", lineHeight: 1.4 }}>
                    {step.content?.slice(0, 400)}{step.content?.length > 400 ? "…" : ""}
                  </Text>
                </Paper>
              )}
            </Box>
          ))}
        </Stack>
      </Collapse>
    </Box>
  );
}

// ── Main ChatView ─────────────────────────────────────────────────────────────
export default function ChatView() {
  const { repoId, repoData } = useRepo();
  const [messages, setMessages] = useState([{
    role: "assistant",
    content: `Hi! I've analyzed **${repoData?.name || "this repo"}**. Ask me anything — or enable **Deep Search** to let me read actual files.`,
  }]);
  const [input, setInput]       = useState("");
  const [loading, setLoading]   = useState(false);
  const [deepSearch, setDeepSearch] = useState(false);
  const viewport = useRef(null);

  useEffect(() => {
    viewport.current?.scrollTo({ top: viewport.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = useCallback(async (text) => {
    const question = (text || input).trim();
    if (!question || loading) return;

    const userMsg   = { role: "user", content: question };
    const newMsgs   = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    if (deepSearch) {
      // ── ReAct agent path ────────────────────────────────────────────
      try {
        const resp = await fetch(`${API}/api/agent`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ repoId, question }),
        });
        const data = await resp.json();
        if (!resp.ok) throw new Error(data.message || "Agent error");

        setMessages(prev => [...prev, {
          role:    "assistant",
          content: data.answer,
          trace:   data.trace,
          isAgent: true,
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          role: "assistant", content: err.message || "Agent error.", isError: true,
        }]);
      } finally {
        setLoading(false);
      }
    } else {
      // ── Streaming chat path ─────────────────────────────────────────
      // Add a placeholder that we'll stream into
      const placeholderIdx = newMsgs.length;
      setMessages(prev => [...prev, { role: "assistant", content: "", sources: [], streaming: true }]);

      try {
        const history = newMsgs.map(({ role, content }) => ({ role, content }));
        const resp = await fetch(`${API}/api/chat/stream`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ repoId, messages: history }),
        });

        if (!resp.ok) throw new Error("Stream request failed");

        const reader  = resp.body.getReader();
        const decoder = new TextDecoder();
        let sources = [];

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const raw = decoder.decode(value, { stream: true });
          const lines = raw.split("\n").filter(l => l.startsWith("data: "));

          for (const line of lines) {
            const payload = line.slice(6);
            if (payload === "[DONE]") break;

            try {
              const event = JSON.parse(payload);

              if (event.type === "sources") {
                sources = event.data;
                setMessages(prev => prev.map((m, i) =>
                  i === placeholderIdx ? { ...m, sources } : m
                ));
              } else if (event.type === "token") {
                setMessages(prev => prev.map((m, i) =>
                  i === placeholderIdx ? { ...m, content: m.content + event.text } : m
                ));
              } else if (event.type === "error") {
                throw new Error(event.message);
              }
            } catch { /* ignore unparsable lines */ }
          }
        }

        // Mark streaming done
        setMessages(prev => prev.map((m, i) =>
          i === placeholderIdx ? { ...m, streaming: false } : m
        ));
      } catch (err) {
        setMessages(prev => prev.map((m, i) =>
          i === placeholderIdx
            ? { role: "assistant", content: err.message || "Streaming failed.", isError: true, streaming: false }
            : m
        ));
      } finally {
        setLoading(false);
      }
    }
  }, [input, loading, messages, repoId, deepSearch]);

  return (
    <Box h="calc(100vh - 220px)" style={{ display: "flex", flexDirection: "column" }}>
      {/* Message area */}
      <ScrollArea flex={1} viewportRef={viewport} mb="sm">
        <Stack gap="md" p="xs">
          {messages.map((msg, i) => (
            <Group key={i} align="flex-start"
              justify={msg.role === "user" ? "flex-end" : "flex-start"} gap="xs">
              {msg.role === "assistant" && (
                <Tooltip label={msg.isAgent ? "ReAct agent" : "RAG chat"}>
                  <Avatar size="sm" color={msg.isAgent ? "orange" : "violet"} radius="xl">
                    {msg.isAgent ? <IconTool size={14} /> : <IconRobot size={14} />}
                  </Avatar>
                </Tooltip>
              )}

              <Box maw="78%">
                <Paper p="sm" withBorder={msg.role === "assistant"}
                  bg={msg.role === "user" ? "violet.8" : undefined}
                  style={{ borderRadius: 12 }}>
                  {msg.role === "user" ? (
                    <Text size="sm" style={{ lineHeight: 1.65 }}>
                      {msg.content}
                    </Text>
                  ) : (
                    <Box
                      c={msg.isError ? "red.4" : undefined}
                      style={{ fontSize: 14, lineHeight: 1.65 }}
                      className="md-body"
                    >
                      <ReactMarkdown>{msg.content || ""}</ReactMarkdown>
                      {msg.streaming && <Loader size={10} color="violet" type="dots" ml={4} />}
                    </Box>
                  )}
                </Paper>

                {/* Agent trace */}
                {msg.isAgent && <TracePanel trace={msg.trace} />}

                {/* RAG sources */}
                {!msg.isAgent && <SourcesPanel sources={msg.sources} />}
              </Box>

              {msg.role === "user" && (
                <Avatar size="sm" color="gray" radius="xl">
                  <IconUser size={14} />
                </Avatar>
              )}
            </Group>
          ))}

          {loading && deepSearch && (
            <Group align="flex-start" gap="xs">
              <Avatar size="sm" color="orange" radius="xl"><IconTool size={14} /></Avatar>
              <Paper p="sm" withBorder style={{ borderRadius: 12 }}>
                <Group gap={6}>
                  <Loader size="xs" color="orange" type="dots" />
                  <Text size="xs" c="dimmed">Agent is reading files…</Text>
                </Group>
              </Paper>
            </Group>
          )}
        </Stack>
      </ScrollArea>

      {/* Suggestions */}
      {messages.filter(m => m.role === "user").length === 0 && (
        <Group gap="xs" mb="xs" wrap="wrap">
          {SUGGESTIONS.map(s => (
            <Paper key={s} p="xs" withBorder style={{ cursor: "pointer", borderRadius: 20 }}
              onClick={() => send(s)}>
              <Text size="xs" c="dimmed">{s}</Text>
            </Paper>
          ))}
        </Group>
      )}

      {/* Input bar */}
      <Group gap="xs" align="center">
        <Tooltip label={deepSearch
          ? "Deep Search ON — agent reads actual files (slower, more accurate)"
          : "Deep Search OFF — fast RAG retrieval"}>
          <Switch
            size="sm"
            color="orange"
            checked={deepSearch}
            onChange={e => setDeepSearch(e.currentTarget.checked)}
            thumbIcon={deepSearch ? <IconSearch size={10} /> : undefined}
            label={<Text size="xs" c="dimmed">Deep</Text>}
          />
        </Tooltip>
        <TextInput
          flex={1}
          placeholder={deepSearch ? "Ask a deep question — agent will read files…" : "Ask anything…"}
          value={input}
          onChange={e => setInput(e.currentTarget.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          disabled={loading}
          radius="xl"
        />
        <ActionIcon size="lg" radius="xl" variant="filled"
          color={deepSearch ? "orange" : "violet"}
          onClick={() => send()}
          disabled={!input.trim() || loading}>
          <IconSend size={16} />
        </ActionIcon>
      </Group>
    </Box>
  );
}
