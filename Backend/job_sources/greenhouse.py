"""
Greenhouse Public Job Source for NexStep
Fetches published job listings from official Greenhouse public job board endpoints.
"""

import urllib.request
import json
import re
import html
from typing import List, Dict, Any

DEFAULT_BOARDS = ["gitlab", "cloudflare", "canonical", "figma"]

def clean_html(raw_html: str) -> str:
    """Strip HTML tags and unescape entities to get clean description text."""
    if not raw_html:
        return ""
    # Unescape HTML entities
    text = html.unescape(raw_html)
    # Replace breaks/paragraphs with newlines
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
    # Strip remaining HTML tags
    clean = re.sub(r'<[^>]+>', ' ', text)
    # Collapse multiple spaces
    clean = re.sub(r'[ \t]+', ' ', clean)
    clean = re.sub(r'\n+', '\n', clean)
    return clean.strip()

def fetch_greenhouse_jobs(board_tokens: List[str] = None, timeout: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch published jobs from public Greenhouse Job Boards.
    Returns normalized job dictionaries.
    """
    if board_tokens is None:
        board_tokens = DEFAULT_BOARDS

    jobs = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexStepCareerPlatform/1.0'
    }

    for board in board_tokens:
        url = f"https://boards-api.greenhouse.io/v1/boards/{board}/jobs?content=true"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if response.status == 200:
                    data = json.loads(response.read().decode('utf-8'))
                    raw_jobs = data.get("jobs", [])
                    company_name = board.capitalize()

                    for rj in raw_jobs[:10]: # Limit to top 10 per company for speed
                        job_id = f"gh_{board}_{rj.get('id')}"
                        title = rj.get("title", "Software Engineer")
                        location = rj.get("location", {}).get("name", "Remote")
                        job_url = rj.get("absolute_url", f"https://boards.greenhouse.io/{board}/jobs/{rj.get('id')}")
                        raw_content = rj.get("content", "")
                        desc = clean_html(raw_content)

                        if not desc:
                            desc = f"{title} position at {company_name} in {location}."

                        updated_at = rj.get("updated_at", "")
                        if updated_at:
                            updated_at = updated_at.split("T")[0]

                        # Infer job type / experience from title/content
                        job_type = "Full-time"
                        if "part-time" in title.lower() or "part time" in title.lower():
                            job_type = "Part-time"
                        elif "contract" in title.lower() or "freelance" in title.lower():
                            job_type = "Contract"

                        experience = "Mid-Level"
                        title_lower = title.lower()
                        if "senior" in title_lower or "sr." in title_lower or "lead" in title_lower or "principal" in title_lower:
                            experience = "Senior Level"
                        elif "junior" in title_lower or "jr." in title_lower or "entry" in title_lower or "intern" in title_lower:
                            experience = "Entry Level"

                        jobs.append({
                            "id": job_id,
                            "title": title,
                            "company": company_name,
                            "location": location,
                            "type": job_type,
                            "experience": experience,
                            "description": desc,
                            "url": job_url,
                            "source": "Greenhouse",
                            "updated_at": updated_at,
                            "is_demo": False
                        })
        except Exception as e:
            print(f"[Greenhouse Source] Warning fetching from board '{board}': {e}")
            continue

    return jobs
