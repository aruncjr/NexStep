"""
Lever Public Job Source for NexStep
Fetches published job postings from official Lever public API endpoints.
"""

import urllib.request
import json
import re
import html
from typing import List, Dict, Any

DEFAULT_COMPANIES = ["lever", "netflix", "figma"]

def clean_html(raw_html: str) -> str:
    """Strip HTML tags and unescape entities to get clean description text."""
    if not raw_html:
        return ""
    text = html.unescape(raw_html)
    text = re.sub(r'<br\s*/?>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</p>', '\n', text, flags=re.IGNORECASE)
    text = re.sub(r'</li>', '\n', text, flags=re.IGNORECASE)
    clean = re.sub(r'<[^>]+>', ' ', text)
    clean = re.sub(r'[ \t]+', ' ', clean)
    clean = re.sub(r'\n+', '\n', clean)
    return clean.strip()

def fetch_lever_jobs(companies: List[str] = None, timeout: int = 5) -> List[Dict[str, Any]]:
    """
    Fetch published jobs from public Lever Postings API.
    Returns normalized job dictionaries.
    """
    if companies is None:
        companies = DEFAULT_COMPANIES

    jobs = []
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NexStepCareerPlatform/1.0'
    }

    for comp in companies:
        url = f"https://api.lever.co/v0/postings/{comp}?mode=json"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=timeout) as response:
                if response.status == 200:
                    raw_postings = json.loads(response.read().decode('utf-8'))
                    company_name = comp.capitalize()

                    for rj in raw_postings[:10]: # Limit top 10 per company
                        job_id = f"lev_{comp}_{rj.get('id')}"
                        title = rj.get("text", "Software Engineer")
                        categories = rj.get("categories", {})
                        location = categories.get("location", "Remote")
                        commitment = categories.get("commitment", "Full-time")
                        job_url = rj.get("hostedUrl", f"https://jobs.lever.co/{comp}/{rj.get('id')}")

                        # Combine description and lists
                        desc_parts = []
                        if rj.get("descriptionPlain"):
                            desc_parts.append(rj.get("descriptionPlain"))
                        elif rj.get("description"):
                            desc_parts.append(clean_html(rj.get("description")))

                        lists = rj.get("lists", [])
                        for lst in lists:
                            if isinstance(lst, dict):
                                text = lst.get("text", "")
                                content = clean_html(lst.get("content", ""))
                                if text or content:
                                    desc_parts.append(f"{text}: {content}")

                        desc = "\n".join(desc_parts).strip()
                        if not desc:
                            desc = f"{title} position at {company_name} in {location}."

                        created_at = rj.get("createdAt")
                        updated_at = ""
                        if created_at:
                            import datetime
                            updated_at = datetime.datetime.fromtimestamp(created_at/1000.0).strftime('%Y-%m-%d')

                        title_lower = title.lower()
                        experience = "Mid-Level"
                        if "senior" in title_lower or "sr." in title_lower or "lead" in title_lower or "principal" in title_lower:
                            experience = "Senior Level"
                        elif "junior" in title_lower or "jr." in title_lower or "entry" in title_lower or "intern" in title_lower:
                            experience = "Entry Level"

                        jobs.append({
                            "id": job_id,
                            "title": title,
                            "company": company_name,
                            "location": location,
                            "type": commitment,
                            "experience": experience,
                            "description": desc,
                            "url": job_url,
                            "source": "Lever",
                            "updated_at": updated_at,
                            "is_demo": False
                        })
        except Exception as e:
            print(f"[Lever Source] Warning fetching for company '{comp}': {e}")
            continue

    return jobs
