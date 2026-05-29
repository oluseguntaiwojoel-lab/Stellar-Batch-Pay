import { useState, useEffect } from "react";
import type { JobStatus, BatchResult } from "@/lib/stellar/types";

export interface JobState {
  status: JobStatus;
  totalBatches: number;
  completedBatches: number;
  totalPayments: number;
  result?: BatchResult;
  error?: string;
}

export function useBatchPolling(jobId: string | null) {
  const [jobState, setJobState] = useState<JobState | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!jobId) {
      setJobState(null);
      setIsPolling(false);
      return;
    }

    setIsPolling(true);
    let intervalId: NodeJS.Timeout;
    let retryCount = 0;
    const MAX_INTERVAL = 30000; // 30 seconds
    const BASE_INTERVAL = 2000; // 2 seconds

    const getBackoffInterval = () => {
      const backoffInterval = Math.min(
        BASE_INTERVAL * Math.pow(2, retryCount),
        MAX_INTERVAL
      );
      return backoffInterval;
    };

    const poll = async () => {
      try {
        const response = await fetch(`/api/batch-status/${jobId}`);

        if (!response.ok) {
          if (response.status === 404) {
            // Job not found - stop polling
            setIsPolling(false);
            clearInterval(intervalId);
            return;
          }
          // 5xx or other errors - retry with backoff
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setJobState(data);
        retryCount = 0; // Reset on success

        if (data.status === "completed" || data.status === "failed") {
          setIsPolling(false);
          clearInterval(intervalId);
        }
      } catch (error) {
        retryCount++;
        const nextInterval = getBackoffInterval();
        clearInterval(intervalId);
        intervalId = setInterval(poll, nextInterval);
      }
    };

    poll();
    intervalId = setInterval(poll, BASE_INTERVAL);

    return () => clearInterval(intervalId);
  }, [jobId]);

  return { jobState, isPolling };
}
