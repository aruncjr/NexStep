"""
Pytest configuration and shared fixtures for the NexStep test suite.
"""

import io
import os
import sys
import pytest

# Ensure Backend directory is on python path
TESTS_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(TESTS_DIR)
BACKEND_DIR = os.path.join(PROJECT_ROOT, "Backend")

if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app import app as flask_app


def generate_minimal_pdf(lines=None) -> bytes:
    """
    Generates a tiny, structurally valid 1-page PDF document containing
    resume text lines without relying on external PDF-generation tools.
    """
    if lines is None:
        lines = [
            "Alex Morgan",
            "alex.morgan@example.com",
            "Bachelor of Science in Computer Science",
            "Software Engineer Experience",
            "Skills: Python, SQL, React, Flask, Git, Docker, Machine Learning",
        ]

    stream_content = "BT\n/F1 12 Tf\n72 720 Td\n"
    for i, line in enumerate(lines):
        if i > 0:
            stream_content += "0 -22 Td\n"
        # Escape parentheses in PDF string literals
        clean_line = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        stream_content += f"({clean_line}) Tj\n"
    stream_content += "ET\n"
    stream_bytes = stream_content.encode("latin1")

    body = [
        b"%PDF-1.4\n",
        b"1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
        b"2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
        b"3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
        b"4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        f"5 0 obj\n<< /Length {len(stream_bytes)} >>\nstream\n".encode("latin1")
        + stream_bytes
        + b"\nendstream\nendobj\n",
    ]

    offsets = [0]
    cur = 0
    for chunk in body:
        cur += len(chunk)
        offsets.append(cur)

    xref = b"xref\n0 6\n0000000000 65535 f \n"
    for off in offsets[1:6]:
        xref += f"{off:010d} 00000 n \n".encode("latin1")

    trailer = f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{cur}\n%%EOF".encode("latin1")
    return b"".join(body) + xref + trailer


@pytest.fixture(autouse=True, scope="session")
def setup_job_service_cache():
    """
    Ensures job_service has a deterministic set of demo jobs loaded for the test session,
    preventing external network latency or transient rate-limiting from public job APIs.
    """
    import time
    from job_service import job_service
    from job_sources.local import fetch_local_jobs

    if not job_service._cached_jobs:
        job_service._cached_jobs = fetch_local_jobs()
        job_service._last_fetch_time = time.time()


@pytest.fixture
def client():
    """
    Flask test client fixture with TESTING mode enabled.
    """
    flask_app.config["TESTING"] = True
    with flask_app.test_client() as test_client:
        yield test_client


@pytest.fixture
def tiny_pdf_bytes():
    """
    Returns the binary content of a tiny, valid resume PDF.
    """
    return generate_minimal_pdf()


@pytest.fixture
def tiny_pdf_file(tiny_pdf_bytes):
    """
    Returns an in-memory BytesIO stream of the tiny valid resume PDF.
    """
    return io.BytesIO(tiny_pdf_bytes)
