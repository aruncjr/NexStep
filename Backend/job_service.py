"""
Central Job Service for NexStep
Aggregates, normalizes, deduplicates, and caches jobs from live APIs (Greenhouse, Lever)
with automatic fallback to local demo dataset.
"""

import time
from typing import List, Dict, Any
from job_sources.greenhouse import fetch_greenhouse_jobs
from job_sources.lever import fetch_lever_jobs
from job_sources.local import fetch_local_jobs

class JobService:
    def __init__(self, cache_ttl_seconds: int = 900):
        self.cache_ttl = cache_ttl_seconds
        self._cached_jobs: List[Dict[str, Any]] = []
        self._last_fetch_time: float = 0.0

    def get_all_jobs(self, force_refresh: bool = False) -> List[Dict[str, Any]]:
        """
        Fetch normalized jobs from live sources. Fallback to local if empty/unavailable.
        """
        now = time.time()
        if not force_refresh and self._cached_jobs and (now - self._last_fetch_time < self.cache_ttl):
            return self._cached_jobs

        live_jobs = []
        
        # 1. Greenhouse
        try:
            gh_jobs = fetch_greenhouse_jobs()
            live_jobs.extend(gh_jobs)
        except Exception as e:
            print(f"[JobService] Greenhouse fetch error: {e}")

        # 2. Lever
        try:
            lev_jobs = fetch_lever_jobs()
            live_jobs.extend(lev_jobs)
        except Exception as e:
            print(f"[JobService] Lever fetch error: {e}")

        # If live jobs were obtained, deduplicate and use them
        if live_jobs:
            dedup = {}
            for j in live_jobs:
                key = f"{j['company'].lower()}_{j['title'].lower()}"
                if key not in dedup:
                    dedup[key] = j
            final_jobs = list(dedup.values())
            print(f"[JobService] Successfully fetched {len(final_jobs)} live public jobs.")
            self._cached_jobs = final_jobs
            self._last_fetch_time = now
            return final_jobs

        # Fallback to local jobs
        print("[JobService] Live jobs unavailable or empty. Falling back to local demo jobs.")
        local_jobs = fetch_local_jobs()
        self._cached_jobs = local_jobs
        self._last_fetch_time = now
        return local_jobs

    def get_job_by_id(self, job_id: str) -> Dict[str, Any]:
        jobs = self.get_all_jobs()
        for j in jobs:
            if str(j.get("id")) == str(job_id):
                return j
        return None

# Global instance
job_service = JobService()
