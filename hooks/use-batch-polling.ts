import { useState, useEffect, useRef } from "react";
import type { JobStatus, BatchResult } from "@/lib/stellar/types";

export interface JobState {
  status: JobStatus;
  totalBatches: number;
  completedBatches: number;
  totalPayments: number;
  result?: BatchResult;
  error?: string;
}

const BASE_POLL_INTERVAL = 2000;
const MAX_POLL_INTERVAL = 30000;

function isTerminal(status: JobStatus) {
  return status === "completed" || status === "failed";
}

// SSE-based live updates with automatic polling fallback.
export function useBatchPolling(jobId: string | null, publicKey: string | null) {
  const [jobState, setJobState] = useState<JobState | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!jobId || !publicKey) {
      setJobState(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    let active = true;

    // Try SSE first. If EventSource is unavailable or the connection errors
    // immediately, fall back to the exponential-backoff polling path.
    if (typeof EventSource !== "undefined") {
      const params = new URLSearchParams({ publicKey });
      const es = new EventSource(`/api/batch-events/${jobId}?${params.toString()}`);
      let sseEstablished = false;

      es.onopen = () => {
        sseEstablished = true;
      };

      es.onmessage = (event) => {
        if (!active) return;
        try {
          const data = JSON.parse(event.data) as JobState & { error?: string };
          if (data.error) {
            es.close();
            setIsPolling(false);
            return;
          }
          setJobState(data);
          if (isTerminal(data.status)) {
            es.close();
            setIsPolling(false);
          }
        } catch {
          // ignore malformed frames
        }
      };

      es.onerror = () => {
        es.close();
        if (!active) return;

        if (!sseEstablished) {
          // SSE never connected — fall back to polling immediately.
          startPolling();
        } else {
          // Connection dropped after being established — treat as done.
          setIsPolling(false);
        }
      };

      cleanupRef.current = () => {
        es.close();
      };

      return () => {
        active = false;
        es.close();
        cleanupRef.current = null;
      };
    }

    // Polling fallback (also used when EventSource is unavailable).
    startPolling();
    return () => {
      active = false;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };

    function startPolling() {
      let retryCount = 0;
      let timeoutId: ReturnType<typeof setTimeout>;

      const poll = async () => {
        if (!active) return;
        try {
          const params = new URLSearchParams({ publicKey: publicKey! });
          const response = await fetch(`/api/batch-status/${jobId}?${params.toString()}`);
          if (!response.ok) throw new Error("Failed to fetch job status");

          const data = (await response.json()) as JobState;
          if (!active) return;
          setJobState(data);
          retryCount = 0;

          if (isTerminal(data.status)) {
            setIsPolling(false);
            return;
          }
        } catch {
          retryCount++;
        }

        if (!active) return;
        const delay = Math.min(BASE_POLL_INTERVAL * Math.pow(2, retryCount), MAX_POLL_INTERVAL);
        timeoutId = setTimeout(poll, delay);
      };

      poll();

      cleanupRef.current = () => clearTimeout(timeoutId);
    }
  }, [jobId, publicKey]);

  return { jobState, isPolling };
}
