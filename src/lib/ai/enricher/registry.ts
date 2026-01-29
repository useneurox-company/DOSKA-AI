/**
 * In-memory реестр активных заданий обогащения
 * Нужен для быстрой проверки shouldStop и статуса
 */

import { JobState } from "./types";

class EnrichmentJobRegistryClass {
  private jobs = new Map<string, JobState>();

  register(jobId: string, state: JobState): void {
    this.jobs.set(jobId, state);
  }

  get(jobId: string): JobState | undefined {
    return this.jobs.get(jobId);
  }

  update(jobId: string, updates: Partial<JobState>): void {
    const current = this.jobs.get(jobId);
    if (current) {
      Object.assign(current, updates);
    }
  }

  unregister(jobId: string): void {
    this.jobs.delete(jobId);
  }

  shouldStop(jobId: string): boolean {
    return this.jobs.get(jobId)?.shouldStop ?? true;
  }

  getAll(): Map<string, JobState> {
    return new Map(this.jobs);
  }

  getActiveCount(): number {
    let count = 0;
    this.jobs.forEach((state) => {
      if (state.status === "running" || state.status === "pending") {
        count++;
      }
    });
    return count;
  }
}

export const EnrichmentJobRegistry = new EnrichmentJobRegistryClass();
