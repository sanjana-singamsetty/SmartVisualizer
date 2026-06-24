import { createContext, useContext, useState } from "react";

const RepoContext = createContext(null);

export function RepoProvider({ children }) {
  const [repoId, setRepoId] = useState(null);
  const [repoData, setRepoData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("structure");
  const [selectedNode, setSelectedNode] = useState(null);

  const reset = () => {
    setRepoId(null);
    setRepoData(null);
    setError(null);
    setProgress(0);
    setStage("");
    setSelectedNode(null);
    setActiveTab("structure");
  };

  return (
    <RepoContext.Provider
      value={{
        repoId, setRepoId,
        repoData, setRepoData,
        loading, setLoading,
        progress, setProgress,
        stage, setStage,
        error, setError,
        activeTab, setActiveTab,
        selectedNode, setSelectedNode,
        reset,
      }}
    >
      {children}
    </RepoContext.Provider>
  );
}

export function useRepo() {
  const ctx = useContext(RepoContext);
  if (!ctx) throw new Error("useRepo must be used inside <RepoProvider>");
  return ctx;
}
