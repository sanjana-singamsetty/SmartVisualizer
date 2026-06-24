import { Skeleton } from "@mantine/core";
import ReactMarkdown from "react-markdown";
import { useRepo } from "../context/RepoContext";

const VIEW_TITLES = {
  structure: "Codebase Structure",
  commits:   "Commit History",
  branches:  "Branch Overview",
  readme:    "README",
  insights:  "Code Insights",
  chat:      "AI Chat",
};

const BLOB_COLORS = {
  structure: "#f87171",
  commits:   "#fb923c",
  branches:  "#34d399",
  readme:    "#60a5fa",
  insights:  "#a78bfa",
  chat:      "#f472b6",
};

export default function AiOverviewBanner({ view }) {
  const { repoData, loading } = useRepo();
  const summary = repoData?.overviewSummary?.[view];
  const title   = VIEW_TITLES[view] || view;
  const blob    = BLOB_COLORS[view] || "#f87171";

  if (loading) return <Skeleton height={180} mb="sm" radius="xl" />;
  if (!summary) return null;

  return (
    <div className="overview-banner">
      <div className="overview-banner__blob" style={{ background: blob }} />
      <div className="overview-banner__blob-dots" />
      <p className="overview-banner__title">{title}</p>
      <div className="overview-banner__body md-body">
        <ReactMarkdown>{summary}</ReactMarkdown>
      </div>
    </div>
  );
}
