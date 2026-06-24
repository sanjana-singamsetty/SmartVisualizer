import {
  IconFolderFilled, IconGitCommit, IconGitBranch,
  IconBulb, IconMessageCircle, IconFileText, IconSparkles,
} from "@tabler/icons-react";

const FEATURES = [
  {
    icon: IconFolderFilled,
    title: "Structure Explorer",
    desc: "Interactive file tree showing your entire codebase. Color-coded by language with size-weighted layout.",
    color: "#c084fc",
    bg: "#f3e8ff",
  },
  {
    icon: IconGitCommit,
    title: "Commit Analysis",
    desc: "Bubble chart of commit activity per author over time. Zoom, filter, and click to drill into commits.",
    color: "#fb923c",
    bg: "#fff7ed",
  },
  {
    icon: IconGitBranch,
    title: "Branch Overview",
    desc: "Visual breakdown of all branches, default branch, and AI-generated branching strategy summary.",
    color: "#34d399",
    bg: "#ecfdf5",
  },
  {
    icon: IconBulb,
    title: "Code Insights",
    desc: "Language distribution donut chart, tech stack detection, and file-type statistics at a glance.",
    color: "#60a5fa",
    bg: "#eff6ff",
  },
  {
    icon: IconMessageCircle,
    title: "AI Chat",
    desc: "Ask anything about the repo. Enable Deep Search to let the agent read actual files for precise answers.",
    color: "#f472b6",
    bg: "#fdf2f8",
  },
  {
    icon: IconFileText,
    title: "README Viewer",
    desc: "Rendered README with full markdown support and an AI-generated summary to bootstrap understanding fast.",
    color: "#a78bfa",
    bg: "#f5f3ff",
  },
];

export default function HelpView() {
  return (
    <div className="help-root">
      {/* ── Hero ─────────────────────────────────────────── */}
      <div className="help-hero">
        <div className="help-hero__blob help-hero__blob--1" />
        <div className="help-hero__blob help-hero__blob--2" />
        <div className="help-hero__blob help-hero__blob--3" />

        <div className="help-hero__content">
          <div className="help-hero__badge">
            <IconSparkles size={14} />
            <span>AI-Powered GitHub Explorer</span>
          </div>
          <h1 className="help-hero__title">
            Understand any repo<br />
            <span className="help-hero__title--accent">in seconds</span>
          </h1>
          <p className="help-hero__sub">
            Paste a GitHub URL above. SmartVisualizer analyzes the structure,
            commits, and code — then lets you chat with an AI that has read
            every file.
          </p>
        </div>
      </div>

      {/* ── Feature grid ─────────────────────────────────── */}
      <div className="help-grid">
        {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
          <div
            key={title}
            className="help-card"
            style={{ "--card-color": color, "--card-bg": bg }}
          >
            <div className="help-card__icon">
              <Icon size={22} color={color} />
            </div>
            <h3 className="help-card__title">{title}</h3>
            <p className="help-card__desc">{desc}</p>
          </div>
        ))}
      </div>

      {/* ── Bottom hint ──────────────────────────────────── */}
      <p className="help-hint">
        Works with any public GitHub repository · No sign-in required
      </p>
    </div>
  );
}
