"""
NexStep API Endpoint Tests using Flask's test client.

Covers:
- GET /: 200 and model_classes
- GET /api/jobs: success with jobs list
- POST /api/predict: probabilities summing to ~100
- POST /api/recommendations: rejects empty resume with 400, returns ranked results (descending match_score, max 98)
- POST /api/analyze: rejects non-PDF files with 400, processes valid PDF fixture
"""

import io
import pytest


def test_home_endpoint(client):
    """
    GET / returns 200 and model_classes list.
    """
    response = client.get("/")
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data.get("status") == "success"
    assert "model_classes" in data
    assert isinstance(data["model_classes"], list)
    assert set(data["model_classes"]) == {"Good Fit", "No Fit", "Potential Fit"}


def test_get_jobs_endpoint(client):
    """
    GET /api/jobs returns success with a jobs list.
    """
    response = client.get("/api/jobs")
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data.get("success") is True
    assert "jobs" in data
    assert isinstance(data["jobs"], list)
    assert len(data["jobs"]) > 0

    # Verify structural schema of returned jobs
    first_job = data["jobs"][0]
    for key in ("id", "title", "company", "location"):
        assert key in first_job, f"Expected key '{key}' in job object"


def test_predict_endpoint_probabilities(client):
    """
    POST /api/predict returns probabilities summing to ~100%.
    """
    payload = {
        "resume": "Software engineer skilled in Python, Flask, SQL, Git, and Docker with 4 years experience.",
        "job_description": "Looking for a Python Developer proficient in Flask, REST APIs, and database design."
    }
    response = client.post("/api/predict", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert "prediction" in data
    assert data["prediction"] in ("Good Fit", "Potential Fit", "No Fit")
    assert "probabilities" in data

    prob_map = data["probabilities"]
    assert isinstance(prob_map, dict)
    assert len(prob_map) == 3

    # Probabilities must sum to approximately 100%
    total_prob = sum(prob_map.values())
    assert abs(total_prob - 100.0) < 1.0, f"Expected probabilities to sum to ~100%, got {total_prob}"


def test_predict_endpoint_validation(client):
    """
    POST /api/predict rejects missing fields with 400.
    """
    # Missing job description
    res1 = client.post("/api/predict", json={"resume": "Python developer"})
    assert res1.status_code == 400

    # Missing resume
    res2 = client.post("/api/predict", json={"job_description": "Python job"})
    assert res2.status_code == 400

    # Empty payload
    res3 = client.post("/api/predict", json={})
    assert res3.status_code == 400


def test_recommendations_endpoint_rejects_empty_resume(client):
    """
    POST /api/recommendations rejects an empty resume with 400.
    """
    # Empty string resume
    response_empty = client.post("/api/recommendations", json={"resume": ""})
    assert response_empty.status_code == 400
    data_empty = response_empty.get_json()
    assert "error" in data_empty

    # Whitespace-only resume
    response_whitespace = client.post("/api/recommendations", json={"resume": "    "})
    assert response_whitespace.status_code == 400

    # Missing payload
    response_none = client.post("/api/recommendations", json={})
    assert response_none.status_code == 400


def test_recommendations_endpoint_ranked_valid(client):
    """
    POST /api/recommendations returns ranked results (descending match_score, max 98)
    for a valid resume.
    """
    payload = {
        "resume": "Senior Software Engineer with deep expertise in Python, SQL, React, Flask, Git, Docker, and Machine Learning.",
        "top_n": 20
    }
    response = client.post("/api/recommendations", json=payload)
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data.get("success") is True
    assert "recommendations" in data

    recommendations = data["recommendations"]
    assert isinstance(recommendations, list)
    assert len(recommendations) > 0

    scores = [r["match_score"] for r in recommendations]

    # Verify maximum match score is capped at 98
    for score in scores:
        assert score <= 98, f"match_score {score} exceeds maximum allowed (98)"
        assert score >= 0, f"match_score {score} cannot be negative"

    # Verify descending ordering
    assert scores == sorted(scores, reverse=True), "Recommendations must be ranked in descending order of match_score"

    # Verify matched_skills and missing_skills are present on each recommendation
    for r in recommendations:
        assert "matched_skills" in r
        assert isinstance(r["matched_skills"], list)
        assert "missing_skills" in r
        assert isinstance(r["missing_skills"], list)
        assert len(r["missing_skills"]) <= 6


def test_analyze_rejects_non_pdf(client):
    """
    POST /api/analyze rejects non-PDF files with 400.
    """
    # Text file
    txt_file = (io.BytesIO(b"Candidate Resume Text Content"), "resume.txt")
    response_txt = client.post(
        "/api/analyze",
        data={"resume": txt_file},
        content_type="multipart/form-data"
    )
    assert response_txt.status_code == 400
    data_txt = response_txt.get_json()
    assert "error" in data_txt
    assert "Only PDF files are supported" in data_txt["error"]

    # Image file
    png_file = (io.BytesIO(b"\x89PNG\r\n\x1a\n"), "avatar.png")
    response_png = client.post(
        "/api/analyze",
        data={"resume": png_file},
        content_type="multipart/form-data"
    )
    assert response_png.status_code == 400
    data_png = response_png.get_json()
    assert "error" in data_png

    # Missing file upload key
    response_missing = client.post(
        "/api/analyze",
        data={},
        content_type="multipart/form-data"
    )
    assert response_missing.status_code == 400


def test_analyze_valid_pdf_fixture(client, tiny_pdf_bytes):
    """
    POST /api/analyze successfully parses and analyzes the tiny generated PDF fixture.
    """
    pdf_upload = (io.BytesIO(tiny_pdf_bytes), "alex_morgan_resume.pdf")
    response = client.post(
        "/api/analyze",
        data={"resume": pdf_upload},
        content_type="multipart/form-data"
    )
    assert response.status_code == 200

    data = response.get_json()
    assert data is not None
    assert data.get("success") is True
    assert data.get("filename") == "alex_morgan_resume.pdf"
    assert "candidate_name" in data
    assert "skills" in data
    assert isinstance(data["skills"], list)
    assert "prediction" in data
    assert "probabilities" in data

    # Probabilities should sum to ~100%
    probs = data["probabilities"]
    assert abs(sum(probs.values()) - 100.0) < 1.0
