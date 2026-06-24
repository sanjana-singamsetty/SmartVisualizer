import { useCallback } from "react";
import axios from "axios";
import { useRepo } from "../context/RepoContext";

const API = import.meta.env.VITE_API_BASE_URL || "";

export function useRepoData() {
  const { setRepoId, setRepoData, setLoading, setProgress, setStage, setError, reset } =
    useRepo();

  const analyze = useCallback(async (url) => {
    reset();
    setLoading(true);
    setError(null);

    try {
      // POST — may return cached result or a jobId
      const { data } = await axios.post(`${API}/api/repo`, { url });

      if (data.status === "completed") {
        setRepoId(data._id || data.repoId);
        setRepoData(data);
        setLoading(false);
        return;
      }

      // Async path: poll until done
      const { jobId } = data;
      await pollJob(jobId, { setRepoId, setRepoData, setLoading, setProgress, setStage, setError });
    } catch (err) {
      const msg =
        err.response?.data?.error || err.message || "Something went wrong";
      setError(msg);
      setLoading(false);
    }
  }, []); // eslint-disable-line

  return { analyze };
}

async function pollJob(jobId, { setRepoId, setRepoData, setLoading, setProgress, setStage, setError }) {
  const API = import.meta.env.VITE_API_BASE_URL || "";
  const maxAttempts = 60; // 60 × 2s = 2 min timeout
  let attempts = 0;

  while (attempts < maxAttempts) {
    await sleep(2000);
    attempts++;

    try {
      const { data } = await axios.get(`${API}/api/jobs/${jobId}`);
      setProgress(data.progress ?? 0);
      if (data.stage) setStage(data.stage);

      if (data.status === "completed") {
        setRepoId(data.result._id || data.result.repoId);
        setRepoData(data.result);
        setLoading(false);
        return;
      }

      if (data.status === "failed") {
        setError("Analysis failed. Please try again.");
        setLoading(false);
        return;
      }
    } catch {
      // transient error — keep polling
    }
  }

  setError("Analysis timed out. Try a smaller repo.");
  setLoading(false);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
