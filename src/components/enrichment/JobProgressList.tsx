"use client";

import { useEffect, useState } from "react";

interface EnrichmentJob {
  id: string;
  status: "pending" | "running" | "completed" | "stopped" | "error";
  total: number;
  processed: number;
  enriched: number;
  skipped: number;
  errors: number;
  startedAt: string | null;
  stoppedAt: string | null;
  errorMessage: string | null;
  category: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface Props {
  onStop?: (jobId: string) => void;
  refreshTrigger?: number;
}

export function JobProgressList({ onStop, refreshTrigger }: Props) {
  const [jobs, setJobs] = useState<EnrichmentJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const res = await fetch("/api/drafts/enrich?action=status");
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();

    // Polling каждые 1.5 сек если есть активные job'ы
    const interval = setInterval(fetchJobs, 1500);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  if (loading) {
    return null;
  }

  if (jobs.length === 0) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "stopped":
        return "bg-yellow-500";
      case "error":
        return "bg-red-500";
      default:
        return "bg-gray-400";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "pending":
        return "Ожидание...";
      case "running":
        return "Обработка";
      case "completed":
        return "Завершено";
      case "stopped":
        return "Остановлено";
      case "error":
        return "Ошибка";
      default:
        return status;
    }
  };

  return (
    <div className="space-y-1.5">
      {jobs.map((job) => {
        const progress = job.total > 0 ? (job.processed / job.total) * 100 : 0;
        const isActive = job.status === "running" || job.status === "pending";
        return (
          <div key={job.id}
            className={`p-2 rounded border text-xs ${
              job.status === "error" ? "bg-red-50 border-red-200" :
              job.status === "completed" ? "bg-green-50 border-green-200" :
              job.status === "stopped" ? "bg-yellow-50 border-yellow-200" : "bg-blue-50 border-blue-200"}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor(job.status)} ${isActive ? "animate-pulse" : ""}`} />
                <span className="font-medium">{job.category?.name || "Без категории (AI)"}</span>
                <span className="text-gray-500">{job.processed}/{job.total}</span>
              </div>
              {isActive && onStop && (
                <button onClick={() => onStop(job.id)} className="text-red-500 hover:text-red-700">Стоп</button>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1">
              <div className={`h-1 rounded-full transition-all ${getStatusColor(job.status)}`} style={{ width: `${progress}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
