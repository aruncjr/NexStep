"""
Local Fallback Job Source for NexStep
Loads static fallback jobs from local jobs.json and flags them as demo listings.
"""

import os
import json
from typing import List, Dict, Any

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
JOBS_FILE = os.path.join(BASE_DIR, "jobs.json")

def fetch_local_jobs() -> List[Dict[str, Any]]:
    """
    Load fallback job listings from jobs.json.
    Ensures all jobs conform to canonical structure and are marked is_demo = True.
    """
    if not os.path.exists(JOBS_FILE):
        print(f"[Local Job Source] Warning: {JOBS_FILE} not found.")
        return []

    try:
        with open(JOBS_FILE, "r", encoding="utf-8") as f:
            raw_jobs = json.load(f)

        normalized = []
        for idx, j in enumerate(raw_jobs):
            job_id = str(j.get("id", f"demo_{idx+1}"))
            title = j.get("title", "Software Developer")
            company = j.get("company", "Tech Enterprise")
            location = j.get("location", "Remote")
            jtype = j.get("type", "Full-time")
            exp = j.get("experience", "Mid-Level")
            desc = j.get("description", f"{title} position at {company}.")
            url = j.get("url", j.get("link", "#"))

            normalized.append({
                "id": job_id,
                "title": title,
                "company": company,
                "location": location,
                "type": jtype,
                "experience": exp,
                "description": desc,
                "url": url,
                "source": j.get("source", "Demo Dataset"),
                "updated_at": j.get("updated_at", "2026-09-01"),
                "is_demo": True
            })

        return normalized
    except Exception as e:
        print(f"[Local Job Source] Error reading jobs.json: {e}")
        return []
