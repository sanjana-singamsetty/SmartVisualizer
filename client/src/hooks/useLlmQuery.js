import { useState, useCallback } from "react";
import axios from "axios";
import { useRepo } from "../context/RepoContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export function useLlmQuery() {
  const { repoId, selectedNode } = useRepo();
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const ask = useCallback(
    async (questionType, customQuestion = null) => {
      if (!repoId || !selectedNode) return;
      setLoading(true);
      setAnswer(null);
      setError(null);

      try {
        const { data } = await axios.post(`${API}/api/context`, {
          repoId,
          path: selectedNode.path,
          questionType,
          customQuestion,
        });
        setAnswer(data.answer);
      } catch (err) {
        setError(err.response?.data?.error || "Failed to get answer");
      } finally {
        setLoading(false);
      }
    },
    [repoId, selectedNode]
  );

  const clear = useCallback(() => {
    setAnswer(null);
    setError(null);
  }, []);

  return { ask, answer, loading, error, clear };
}
