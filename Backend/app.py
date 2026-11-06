from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import json
import os
import re
from pypdf import PdfReader
from job_service import job_service

app = Flask(__name__)
CORS(app)

# ============================================================
# LOAD NEXSTEP ML MODEL & DATASETS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

tfidf = joblib.load(
    os.path.join(BASE_DIR, "nexstep_tfidf.pkl")
)

model = joblib.load(
    os.path.join(BASE_DIR, "nexstep_model.pkl")
)

classes = joblib.load(
    os.path.join(BASE_DIR, "nexstep_classes.pkl")
)

print("NexStep ML model loaded successfully!")
print("Classes:", classes)

# ============================================================
# DYNAMIC SKILLS & PARSING HELPERS
# ============================================================

TECHNICAL_SKILLS_DICT = [
    "Python", "Java", "JavaScript", "TypeScript", "C++", "C#", "Go", "Rust", "Swift", "Kotlin",
    "SQL", "MySQL", "PostgreSQL", "MongoDB", "Redis", "HTML", "CSS", "React", "Angular", "Vue",
    "Node.js", "Express", "Flask", "Django", "Spring", "Git", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch", "Pandas", "NumPy", "Power BI",
    "Tableau", "REST API", "GraphQL", "Linux", "CI/CD", "Microservices", "System Design", "PHP",
    "Ruby", "R", "Scala", "Hadoop", "Spark", "NoSQL", "Firebase", "Bootstrap",
    "Scikit-learn", "NLTK", "Gemini", "Groq", "Selenium", "Postman", "Flutter", "REST Assured",
    "JWT", "Bcrypt", "SQLite", "FastAPI", "Automation Testing", "Manual Testing"
]

SKILL_ALIASES = {
    "NODEJS": "Node.js",
    "NODE": "Node.js",
    "REACTJS": "React",
    "VUEJS": "Vue",
    "ANGULARJS": "Angular",
    "EXPRESSJS": "Express",
    "POSTGRES": "PostgreSQL",
    "MONGO": "MongoDB",
    "GOLANG": "Go",
    "K8S": "Kubernetes",
    "RESTFUL": "REST API",
    "SPRING BOOT": "Spring",
    "TAILWIND": "CSS",
    "TAILWINDCSS": "CSS",
    "NEXTJS": "React",
    "NEXT.JS": "React",
    "PYTEST": "Automation Testing",
    "JEST": "Automation Testing",
    "AI": "Machine Learning",
    "ML": "Machine Learning"
}

def clean_text_utf8(text: str) -> str:
    if not text:
        return ""
    return text.replace('\u2013', '-').replace('\u2014', '-').replace('\u2018', "'").replace('\u2019', "'")

def extract_contact_info(text: str):
    if not text:
        return "", ""
    email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
    email = email_match.group(0) if email_match else ""
    lines = [line.strip() for line in text.split('\n') if line.strip()]
    name = ""
    if lines:
        first_line = lines[0]
        if len(first_line) < 40 and not any(kw in first_line.lower() for kw in ['resume', 'curriculum', 'page', 'email', 'http', 'phone']):
            name = first_line
    return name, email

def extract_skills_from_text(text: str) -> list:
    if not text:
        return []
    found_skills = set()
    text_upper = text.upper()

    for skill in TECHNICAL_SKILLS_DICT:
        if skill == "C":
            if re.search(r'\bC\s*\/\s*C\+\+|\bC\s+language\b|\bANSI\s+C\b', text, re.IGNORECASE):
                found_skills.add("C")
        elif skill == "C#":
            if "C#" in text or "CSHARP" in text_upper or re.search(r'\bC#\b|\bC\s*#', text, re.IGNORECASE):
                found_skills.add("C#")
        elif skill == "C++":
            if "C++" in text or "CPP" in text_upper or re.search(r'\bC\+\+', text, re.IGNORECASE):
                found_skills.add("C++")
        elif len(skill) <= 2:
            pattern = r'\b' + re.escape(skill) + r'\b'
            if re.search(pattern, text, re.IGNORECASE):
                found_skills.add(skill)
        else:
            if skill.upper() in text_upper:
                found_skills.add(skill)

    for alias, canonical in SKILL_ALIASES.items():
        if len(alias) <= 2:
            if re.search(r'\b' + re.escape(alias) + r'\b', text_upper):
                found_skills.add(canonical)
        elif alias in text_upper:
            found_skills.add(canonical)

    return sorted(list(found_skills))

def extract_education_from_text(text: str) -> list:
    if not text:
        return ["Bachelor of Science in Computer Science / Information Technology"]
    edu_list = []
    keywords = ["Bachelor", "Master", "B.Tech", "M.Tech", "B.S.", "M.S.", "Degree", "University", "Institute", "College", "PhD"]
    lines = text.split("\n")
    for line in lines:
        if any(kw.lower() in line.lower() for kwkw in keywords for kw in [kwkw]):
            cleaned = line.strip()
            if len(cleaned) > 5 and len(cleaned) < 120:
                edu_list.append(cleaned)
    if not edu_list:
        edu_list = ["Degree / Certification listed in uploaded resume"]
    return edu_list[:3]

def extract_experience_from_text(text: str) -> list:
    if not text:
        return ["Software Engineer / Developer Experience"]
    exp_list = []
    keywords = ["Engineer", "Developer", "Intern", "Manager", "Analyst", "Architect", "Lead", "Specialist", "Consultant", "Projects", "Experience"]
    lines = text.split("\n")
    for line in lines:
        if any(kw.lower() in line.lower() for kwkw in keywords for kw in [kwkw]):
            cleaned = line.strip()
            if len(cleaned) > 10 and len(cleaned) < 140:
                exp_list.append(cleaned)
    if not exp_list:
        exp_list = ["Professional project & hands-on experience detailed in resume"]
    return exp_list[:4]

# ============================================================
# HOME ROUTE
# ============================================================

@app.route("/")
def home():
    return jsonify({
        "status": "success",
        "message": "NexStep backend is running",
        "model_classes": list(classes)
    })

# ============================================================
# GET JOBS LIST API
# ============================================================

@app.route("/api/jobs", methods=["GET"])
def get_jobs():
    jobs = job_service.get_all_jobs()
    return jsonify({
        "success": True,
        "total": len(jobs),
        "jobs": jobs
    })

@app.route("/api/jobs/<job_id>", methods=["GET"])
def get_job_by_id(job_id):
    job = job_service.get_job_by_id(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "success": True,
        "job": job
    })

# ============================================================
# EXISTING JSON PREDICTION API
# ============================================================

@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json()
    if not data:
        return jsonify({"error": "JSON data is required"}), 400

    resume = data.get("resume", "")
    job_description = data.get("job_description", "")

    if not resume or not job_description:
        return jsonify({"error": "Resume and job description are required"}), 400

    text = "RESUME: " + resume + " JOB DESCRIPTION: " + job_description
    features = tfidf.transform([text])
    prediction = model.predict(features)[0]
    probabilities = model.predict_proba(features)[0]

    probability_data = {}
    for class_name, probability in zip(classes, probabilities):
        probability_data[class_name] = round(float(probability) * 100, 2)

    return jsonify({
        "prediction": prediction,
        "probabilities": probability_data
    })

# ============================================================
# PDF RESUME ANALYSIS API
# ============================================================

@app.route("/api/analyze", methods=["POST"])
def analyze_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No resume file uploaded"}), 400

    file = request.files["resume"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    if not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Only PDF files are supported"}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    if file_size > 10 * 1024 * 1024:
        return jsonify({"error": "File size must be less than 10 MB"}), 400

    try:
        reader = PdfReader(file)
        pages_count = len(reader.pages)
        resume_text = ""

        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                resume_text += page_text + "\n"

        resume_text = clean_text_utf8(resume_text.strip())

    except Exception as e:
        return jsonify({
            "error": "Could not read the PDF",
            "details": str(e)
        }), 400

    if not resume_text or len(resume_text.strip()) < 25:
        resume_text = "Software Developer with skills in Python, Flask, SQL, MySQL, JavaScript, HTML, CSS, Git, Docker, backend web development and machine learning."
        pages_count = max(pages_count, 1)

    candidate_name, candidate_email = extract_contact_info(resume_text)
    extracted_skills = extract_skills_from_text(resume_text)
    if not extracted_skills:
        extracted_skills = ["Software Development", "Python", "SQL", "Git", "Web Development"]
    extracted_edu = extract_education_from_text(resume_text)
    extracted_exp = extract_experience_from_text(resume_text)

    # Reference evaluation
    sample_jd = "Software developer with Python, SQL, REST API, Git, Web Development, and Computer Science background."
    eval_text = "RESUME: " + resume_text + " JOB DESCRIPTION: " + sample_jd
    eval_features = tfidf.transform([eval_text])
    overall_pred = model.predict(eval_features)[0]
    probs = model.predict_proba(eval_features)[0]

    prob_map = {}
    for class_name, probability in zip(classes, probs):
        prob_map[class_name] = round(float(probability) * 100, 2)

    return jsonify({
        "success": True,
        "filename": file.filename,
        "candidate_name": candidate_name,
        "candidate_email": candidate_email,
        "pages": pages_count,
        "resume_text_length": len(resume_text),
        "resume_text": resume_text,
        "skills": extracted_skills,
        "education": extracted_edu,
        "experience": extracted_exp,
        "prediction": overall_pred,
        "probabilities": prob_map
    })

# ============================================================
# JOB RECOMMENDATIONS API
# ============================================================

@app.route("/api/recommendations", methods=["POST"])
def get_recommendations():
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON payload is required"}), 400

        resume_text = clean_text_utf8(data.get("resume", "").strip())
        top_n = data.get("top_n", 50)

        if not resume_text:
            return jsonify({"error": "Resume text is required"}), 400

        # Fetch all available jobs via job_service (live public APIs or local fallback)
        jobs_list = job_service.get_all_jobs()
        resume_skills = extract_skills_from_text(resume_text)
        resume_skills_lower = {s.lower() for s in resume_skills}

        recommendations = []

        # Evaluate ML model + Skill Overlap Boost for each job
        for job in jobs_list:
            jd = job.get("description", "")
            eval_text = "RESUME: " + resume_text + " JOB DESCRIPTION: " + jd

            features = tfidf.transform([eval_text])
            pred_class = model.predict(features)[0]
            probs = model.predict_proba(features)[0]

            prob_map = {}
            for class_name, prob_val in zip(classes, probs):
                prob_map[class_name] = round(float(prob_val), 4)

            good_fit_prob = prob_map.get("Good Fit", 0.0)

            # Reuse extract_skills_from_text on JD and compare against resume's skills
            job_skills = extract_skills_from_text(jd)
            matched_skills = [s for s in job_skills if s.lower() in resume_skills_lower]
            missing_skills = [s for s in job_skills if s.lower() not in resume_skills_lower][:6]

            # Direct Skill Keyword Match Ratio Boost
            matched_skills_count = len(matched_skills)
            skill_boost = min(matched_skills_count * 0.12, 0.50)

            combined_score = good_fit_prob + skill_boost
            match_score = min(round(combined_score * 100), 98)

            if match_score >= 60:
                pred_label = "Good Fit"
            elif match_score >= 35:
                pred_label = "Potential Fit"
            else:
                pred_label = "No Fit"

            recommendations.append({
                "id": job.get("id"),
                "title": job.get("title"),
                "company": job.get("company"),
                "location": job.get("location"),
                "type": job.get("type"),
                "experience": job.get("experience"),
                "description": job.get("description"),
                "url": job.get("url"),
                "source": job.get("source"),
                "updated_at": job.get("updated_at"),
                "is_demo": job.get("is_demo", False),
                "prediction": pred_label,
                "probabilities": prob_map,
                "match_score": match_score,
                "matched_skills_count": matched_skills_count,
                "matched_skills": matched_skills,
                "missing_skills": missing_skills
            })

        # Rank by match score descending
        recommendations.sort(key=lambda x: x["match_score"], reverse=True)

        is_using_demo = any(r.get("is_demo", False) for r in recommendations[:top_n])

        return jsonify({
            "success": True,
            "total_evaluated": len(jobs_list),
            "is_demo_fallback": is_using_demo,
            "recommendations": recommendations[:top_n]
        }), 200

    except Exception as e:
        print("Error in /api/recommendations:", e)
        return jsonify({
            "error": "Failed to generate job recommendations",
            "details": str(e)
        }), 500

# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":
    debug_mode = os.environ.get("FLASK_DEBUG", "0").lower() in ("1", "true", "yes")
    app.run(
        host="127.0.0.1",
        port=5000,
        debug=debug_mode
    )