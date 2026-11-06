/* ==========================================================================
   NexStep — Resume Analysis Interactivity & Dynamic ML Display
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Mobile Sidebar Toggle
    const mobileDashToggle = document.getElementById('mobileDashToggle');
    const dashSidebar = document.getElementById('dashSidebar');

    if (mobileDashToggle && dashSidebar) {
      mobileDashToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        dashSidebar.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!dashSidebar.contains(e.target) && !mobileDashToggle.contains(e.target)) {
          dashSidebar.classList.remove('active');
        }
      });
    }

    renderAnalysisData();
});

function renderAnalysisData() {
    // Read stored analysis result from NexStepState helper
    const data = typeof NexStepState !== 'undefined' ? NexStepState.getAnalysis() : null;

    if (!data) {
        renderEmptyAnalysisState();
        return;
    }

    const filenameElement = document.getElementById("analysisFilename");
    const metaElement = document.getElementById("analysisMeta");
    const skillsContainer = document.getElementById("analysisSkillsContainer");
    const skillsBadge = document.getElementById("skillsCountBadge");
    const expContainer = document.getElementById("analysisExperienceContainer");
    const eduContainer = document.getElementById("analysisEducationContainer");
    
    const scoreElement = document.querySelector(".score-val");
    const scoreFill = document.querySelector(".score-circle-fill");
    const scoreDescription = document.querySelector(".score-gauge-box p");

    // 1. Resume Filename & Metadata
    if (filenameElement) {
        filenameElement.textContent = data.filename || "Uploaded Resume.pdf";
    }

    if (metaElement) {
        const pages = data.pages || 1;
        const charLen = data.resume_text ? data.resume_text.length : 0;
        metaElement.textContent = `PDF · ${pages} page${pages === 1 ? "" : "s"} · ${charLen} characters extracted`;
    }

    // 2. Dynamic Technical Skills Rendering
    const skills = Array.isArray(data.skills) ? data.skills : [];
    if (skillsBadge) {
        skillsBadge.textContent = `${skills.length} skill${skills.length === 1 ? '' : 's'} identified`;
    }

    if (skillsContainer) {
        if (skills.length > 0) {
            skillsContainer.innerHTML = skills.map(sk => `
                <span class="skill-chip" style="background: var(--color-surface-dark, #0B1B3D); color: #FFFFFF; font-weight: 600; padding: 6px 14px; border-radius: 9999px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.12);">
                    <i class="fa-solid fa-code" style="font-size: 11px; margin-right: 4px; color: var(--palette-coral, #FF6648);"></i> ${escapeHtml(sk)}
                </span>
            `).join("");
        } else {
            skillsContainer.innerHTML = `
                <p style="color: var(--color-text-muted); font-size: 0.9rem; font-style: italic;">
                    No specific technical keywords from dictionary automatically detected in parsed text.
                </p>
            `;
        }
    }

    // 3. Dynamic Experience Snippets Rendering
    const expList = Array.isArray(data.experience) ? data.experience : [];
    if (expContainer) {
        if (expList.length > 0) {
            expContainer.innerHTML = expList.map((item, idx) => `
                <div class="timeline-item" style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                    <div class="timeline-title" style="font-weight: 700; color: var(--color-primary-dark, #0F172A);">${escapeHtml(item)}</div>
                    <div class="timeline-meta" style="font-size: 0.825rem; color: #64748B;">Extracted from resume section ${idx + 1}</div>
                </div>
            `).join("");
        } else {
            expContainer.innerHTML = `<p style="color: #64748B; font-size: 0.875rem;">Experience details extracted from uploaded resume.</p>`;
        }
    }

    // 4. Dynamic Education Snippets Rendering
    const eduList = Array.isArray(data.education) ? data.education : [];
    if (eduContainer) {
        if (eduList.length > 0) {
            eduContainer.innerHTML = eduList.map((item, idx) => `
                <div class="timeline-item" style="padding-bottom: 12px; margin-bottom: 12px; border-bottom: 1px solid #f1f5f9;">
                    <div class="timeline-title" style="font-weight: 700; color: var(--color-primary-dark, #0F172A);">${escapeHtml(item)}</div>
                    <div class="timeline-meta" style="font-size: 0.825rem; color: #64748B;">Qualification entry ${idx + 1}</div>
                </div>
            `).join("");
        } else {
            eduContainer.innerHTML = `<p style="color: #64748B; font-size: 0.875rem;">Education history extracted from uploaded resume.</p>`;
        }
    }

    // 5. ML Result & Probability Display
    const probabilities = data.probabilities || {};
    const goodFit = Number(probabilities["Good Fit"] || 0);
    const potentialFit = Number(probabilities["Potential Fit"] || 0);
    const noFit = Number(probabilities["No Fit"] || 0);
    const prediction = data.prediction || "Good Fit";

    const matchScore = Math.round(goodFit);
    if (scoreElement) {
        scoreElement.textContent = matchScore;
    }

    if (scoreFill) {
        const circum = 263.89; // 2 * Math.PI * 42
        const fillOffset = circum * (1 - Math.min(Math.max(matchScore, 0), 100) / 100);
        scoreFill.style.strokeDasharray = `${circum}`;
        scoreFill.style.strokeDashoffset = `${circum}`;
        
        let strokeColor = "#0259DD";
        if (prediction === "Potential Fit") {
            strokeColor = "#84AFFB";
        } else if (prediction === "No Fit") {
            strokeColor = "#FF6648";
        }
        scoreFill.style.stroke = strokeColor;

        requestAnimationFrame(() => {
            setTimeout(() => {
                scoreFill.style.strokeDashoffset = `${fillOffset}`;
            }, 60);
        });
    }

    if (scoreDescription) {
        scoreDescription.innerHTML = `
            The ML model evaluated your resume against standard software roles:
            <strong>${prediction}</strong> with <strong>${goodFit.toFixed(1)}% Good Fit probability</strong>.
        `;
    }

    // Details Breakdown Box
    const scoreCard = document.querySelector(".score-gauge-box");
    if (scoreCard && scoreCard.parentElement) {
        const existing = document.getElementById("mlResultDetails");
        if (existing) existing.remove();

        const resultBox = document.createElement("div");
        resultBox.id = "mlResultDetails";
        resultBox.style.marginTop = "1.25rem";
        resultBox.style.paddingTop = "1rem";
        resultBox.style.borderTop = "1px solid #E2E8F0";
        resultBox.style.width = "100%";

        resultBox.innerHTML = `
            <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.05em; margin-bottom:0.5rem; color:var(--color-text-muted);">Model Probability Breakdown</div>
            <div style="font-size:1.15rem; font-family:var(--font-display); font-weight:400; color:var(--palette-cobalt, #0259DD); margin-bottom:0.5rem;">${prediction}</div>
            <div style="display:flex; flex-direction:column; gap:0.4rem; font-size:0.85rem;">
              <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 12px; background: rgba(2, 89, 221, 0.08); border: 1px solid rgba(2, 89, 221, 0.25); border-radius: 8px; color: #0259DD; font-weight:600;">
                <span>Good Fit</span><strong>${goodFit.toFixed(1)}%</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 12px; background: rgba(132, 175, 251, 0.22); border: 1px solid rgba(132, 175, 251, 0.4); border-radius: 8px; color: #0259DD; font-weight:600;">
                <span>Potential Fit</span><strong>${potentialFit.toFixed(1)}%</strong>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; padding: 7px 12px; background: rgba(255, 102, 72, 0.12); border: 1px solid rgba(255, 102, 72, 0.3); border-radius: 8px; color: #FF6648; font-weight:600;">
                <span>No Fit</span><strong>${noFit.toFixed(1)}%</strong>
              </div>
            </div>
        `;
        scoreCard.parentElement.appendChild(resultBox);
    }

    // Circular gauge animation
    if (scoreFill) {
        const radius = 42;
        const circumference = 2 * Math.PI * radius;
        scoreFill.style.strokeDasharray = `${circumference}`;
        const offset = circumference - (matchScore / 100) * circumference;
        scoreFill.style.strokeDashoffset = `${offset}`;
    }
}

function renderEmptyAnalysisState() {
    const filenameElement = document.getElementById("analysisFilename");
    const metaElement = document.getElementById("analysisMeta");
    const skillsBadge = document.getElementById("skillsCountBadge");
    
    if (filenameElement) filenameElement.textContent = "No active resume";
    if (metaElement) metaElement.textContent = "Please upload a resume PDF to view analysis";
    if (skillsBadge) {
        skillsBadge.textContent = "No resume uploaded";
        skillsBadge.style.backgroundColor = "rgba(11, 27, 61, 0.06)";
        skillsBadge.style.color = "#64748B";
        skillsBadge.style.borderColor = "rgba(11, 27, 61, 0.12)";
    }

    const skillsContainer = document.getElementById("analysisSkillsContainer");
    if (skillsContainer) {
        skillsContainer.innerHTML = `
            <div style="text-align: center; padding: 24px; width: 100%;">
                <p style="color: #64748B; margin-bottom: 14px; font-size: 0.95rem;">No active resume analysis found in this browser session.</p>
                <div style="display: flex; gap: 0.75rem; justify-content: center; align-items: center; flex-wrap: wrap;">
                    <a href="upload.html" class="btn btn-primary btn-sm">Upload Resume PDF</a>
                    <button type="button" id="loadDemoResumeBtn" class="btn btn-outline btn-sm">Load Demo Resume</button>
                </div>
            </div>
        `;
        const demoBtn = document.getElementById("loadDemoResumeBtn");
        if (demoBtn) {
            demoBtn.addEventListener("click", () => {
                const sampleData = {
                    filename: "Alex_Morgan_Software_Engineer.pdf",
                    candidate_name: "Alex Morgan",
                    candidate_email: "alex.morgan@example.com",
                    pages: 1,
                    resume_text: "Senior Software Engineer with 5+ years building full-stack cloud applications with Python, Flask, React, JavaScript, TypeScript, SQL, PostgreSQL, Docker, Git, CI/CD, REST APIs, and Machine Learning.",
                    skills: ["Python", "Flask", "React", "JavaScript", "TypeScript", "SQL", "PostgreSQL", "Docker", "Git", "REST API", "CI/CD", "Machine Learning"],
                    education: ["B.S. in Computer Science - University of Technology"],
                    experience: ["Senior Software Engineer - CloudTech Solutions (2021 - Present)", "Full Stack Developer - Innovate Labs (2019 - 2021)"],
                    prediction: "Good Fit",
                    probabilities: { "Good Fit": 88.5, "Potential Fit": 9.1, "No Fit": 2.4 }
                };
                if (typeof NexStepState !== 'undefined') {
                    NexStepState.saveAnalysis(sampleData);
                } else {
                    localStorage.setItem("nexstepAnalysis", JSON.stringify(sampleData));
                    sessionStorage.setItem("nexstepAnalysis", JSON.stringify(sampleData));
                }
                renderAnalysisData();
            });
        }
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
