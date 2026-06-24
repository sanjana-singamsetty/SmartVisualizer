# Character Animations Design

**Date:** 2026-06-25  
**Status:** Approved

## Summary

Replace all plain `<Loader />` spinner placeholders across SmartVisualizer with small expressive character animations. Each character performs an action that visually communicates what is happening (debating, scanning, writing, searching, thinking, building).

---

## Animation Inventory

### 1. DebatingAgents — `InsightsView` debate load

**Trigger:** `debateLoading === true`  
**Replaces:** `<Center h={200}><Loader color="violet" /></Center>`

**Character behavior:**
- Two emoji characters face each other: `🛡️` (Advocate, teal side) and `⚔️` (Critic, red side)
- A speech bubble pops up above each, alternating every 1.4s with `• • •` animated dots
- Label beneath cycles: *"The Advocate is drafting…"* → *"The Critic responds…"*
- Characters bob slightly up/down on their turn (scale + translateY)

**Layout:** horizontal flex row, centered, ~120px tall

---

### 2. RadarInspector — `InsightsView` score load

**Trigger:** `scoreLoading === true`  
**Replaces:** `<Center h={80}><Loader size="sm" color="violet" /></Center>`

**Character behavior:**
- `🔍` character slides left-to-right across a single faint horizontal code line
- Reaches end, bounces back, repeats (infinite)
- Label: *"Scoring your codebase…"*

**Layout:** compact, ~60px tall, single row

---

### 3. TypewriterWriter — `ReadmeView` generate load

**Trigger:** `loading === true` in ReadmeView  
**Replaces:** `<Center h={300}><Loader color="violet" /></Center>`

**Character behavior:**
- `✍️` character sits above a faint horizontal line (the "desk")
- Arm bobs up/down in a writing rhythm (translateY keyframe, 0.5s loop)
- Three short animated lines appear to the right, filling left-to-right then fading, simulating written text
- Label: *"Writing your README…"*

**Layout:** centered, ~140px tall

---

### 4. FileDetective — `ChatView` deep search load

**Trigger:** `loading && deepSearch === true`  
**Replaces:** existing `<Group gap={6}><Loader type="dots" /><Text>Agent is reading files…</Text></Group>`

**Character behavior:**
- `🕵️` character runs (left-right translateX, easing bounce) between three file icons: `📄 📁 📄`
- Detective slides to each file, pauses briefly (animation-delay stagger), then moves on
- Label cycles every 2s: *"Reading files…"* → *"Searching code…"* → *"Connecting the dots…"*

**Layout:** chat bubble style (Paper withBorder), ~48px tall, matches existing message row

---

### 5. ThinkingRobot — `ContextBox` AI query load

**Trigger:** `loading === true` in ContextBox  
**Replaces:** `<Group justify="center"><Loader size="sm" color="violet" /></Group>`

**Character behavior:**
- `🤖` character tilts head left-right (rotate ±12deg, 0.8s loop)
- Small `💭` thought bubble appears above, pulsing opacity 0.4→1→0.4
- Label: *"Thinking…"*

**Layout:** compact inline, ~56px tall

---

### 6. RepoBuilder — `BranchesView` + `CommitsView` global load

**Trigger:** `loading === true` from RepoContext  
**Replaces:** bare `<Center h={400}><Loader color="violet" /></Center>` in both views

**Character behavior:**
- `👷` character stands above a small progress bar that fills gradually (animated width, no real data, just visual loop)
- Character arm swings in a hammering motion (rotate keyframe on pseudo-element or wrapper span)
- Label shows real `stage` from RepoContext if available, else *"Building your visualization…"*

**Layout:** centered, ~160px tall, includes faint progress bar beneath character

---

## Implementation Plan

### New files

```
client/src/components/animations/
  animations.css          ← all @keyframes definitions
  DebatingAgents.jsx
  RadarInspector.jsx
  TypewriterWriter.jsx
  FileDetective.jsx
  ThinkingRobot.jsx
  RepoBuilder.jsx
```

### Existing files modified (drop-in replacements)

| File | Change |
|---|---|
| `InsightsView.jsx` | Import + use `DebatingAgents`, `RadarInspector` |
| `ReadmeView.jsx` | Import + use `TypewriterWriter` |
| `ChatView.jsx` | Import + use `FileDetective` |
| `ContextBox.jsx` | Import + use `ThinkingRobot` |
| `BranchesView.jsx` | Import + use `RepoBuilder` |
| `CommitsView.jsx` | Import + use `RepoBuilder` |

### No new dependencies

All animations use CSS `@keyframes` + emoji characters. No Framer Motion, Lottie, or other libs required.

### CSS keyframes needed

- `@keyframes bob` — translateY up/down (characters on their turn)
- `@keyframes slideLR` — translateX left→right loop (detective, inspector)
- `@keyframes tilt` — rotate ±deg loop (thinking robot)
- `@keyframes fadeInOut` — opacity pulse (thought bubble, speech bubble dots)
- `@keyframes fillBar` — width 0→100% loop (builder progress bar)
- `@keyframes writingArm` — translateY short bob (writer)
- `@keyframes textLineGrow` — width 0→100%, then fade (simulated text lines)
- `@keyframes hammer` — rotate 0→-30deg→0 (builder arm)

---

## Constraints

- Each component is self-contained — import and drop in, no props required except optional `stage` string for RepoBuilder
- All animations loop infinitely while their trigger condition is true
- Font size for emoji: 24–28px to stay "small" without being unreadable
- Labels use Mantine `<Text size="xs" c="dimmed">` to match existing style
