/* ==========================================================================
   NexStep — Dashboard Interactivity & Dynamic Real State Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
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

  // Load and render real application state
  renderDashboardState();
});

async function renderDashboardState() {
  if (typeof NexStepState === 'undefined') return;

  const profile = NexStepState.getProfile();
  const analysis = NexStepState.getAnalysis();
  const savedJobs = NexStepState.getSavedJobs();
  const applications = NexStepState.getApplications();
  const activityLog = NexStepState.getRecentActivity();

  // 1. User Header & Profile Info
  const headerUserName = document.getElementById("headerUserName");
  const sidebarUserName = document.getElementById("sidebarUserName");
  const cardUserName = document.getElementById("cardUserName");
  const dashGreetingTitle = document.getElementById("dashGreetingTitle");

  if (headerUserName) headerUserName.textContent = profile.name;
  if (sidebarUserName) sidebarUserName.textContent = profile.name;
  if (cardUserName) cardUserName.textContent = profile.name;
  if (dashGreetingTitle) dashGreetingTitle.textContent = `Welcome back, ${profile.name.split(" ")[0]}`;

  // 2. Resume Card State
  const filenameText = document.getElementById("dashResumeFilenameText");
  const uploadBtnText = document.getElementById("dashUploadBtnText");
  const resumeStatusBadge = document.getElementById("resumeStatusBadge");

  if (analysis && analysis.filename) {
    if (filenameText) filenameText.textContent = `Active Resume: ${analysis.filename}`;
    if (uploadBtnText) uploadBtnText.textContent = "Change Resume";
    if (resumeStatusBadge) {
      resumeStatusBadge.textContent = "Resume Active";
      resumeStatusBadge.className = "status-success";
    }
  } else {
    if (filenameText) filenameText.textContent = "No resume uploaded yet";
    if (uploadBtnText) uploadBtnText.textContent = "Upload Resume";
    if (resumeStatusBadge) {
      resumeStatusBadge.textContent = "No Resume";
      resumeStatusBadge.className = "status-warning";
    }
  }

  // 3. Stat Counters (Real State)
  const skillsCount = analysis && Array.isArray(analysis.skills) ? analysis.skills.length : 0;
  
  const statSkillsCount = document.getElementById("statSkillsCount");
  const statSavedJobsCount = document.getElementById("statSavedJobsCount");
  const statApplicationsCount = document.getElementById("statApplicationsCount");
  const statJobMatchesCount = document.getElementById("statJobMatchesCount");

  if (statSkillsCount) statSkillsCount.textContent = skillsCount;
  if (statSavedJobsCount) statSavedJobsCount.textContent = savedJobs.length;
  if (statApplicationsCount) statApplicationsCount.textContent = applications.length;

  // 4. Model Alignment Score & Ring Gauge
  const dashScoreNum = document.getElementById("dashScoreNum");
  const dashScoreSubtitle = document.getElementById("dashScoreSubtitle");
  const strokeCircle = document.querySelector(".ring-val");

  if (analysis && analysis.probabilities) {
    const goodFit = Number(analysis.probabilities["Good Fit"] || 0);
    const matchScore = Math.round(goodFit);
    if (dashScoreNum) dashScoreNum.textContent = matchScore;

    if (dashScoreSubtitle) {
      dashScoreSubtitle.textContent = `Model Good Fit probability for target software developer roles based on your uploaded resume text.`;
    }

    if (strokeCircle) {
      const radius = 48;
      const circumference = 2 * Math.PI * radius; // ~301
      const offset = circumference - (matchScore / 100) * circumference;
      strokeCircle.style.strokeDasharray = `${circumference}`;
      strokeCircle.style.strokeDashoffset = `${offset.toFixed(0)}`;
    }
  } else {
    if (dashScoreNum) dashScoreNum.textContent = "0";
    if (dashScoreSubtitle) {
      dashScoreSubtitle.textContent = "Upload your resume to calculate your model-based match probability.";
    }
  }

  // 5. Skills Chips
  const skillsChipsWrap = document.getElementById("dashSkillsChipsWrap");
  if (skillsChipsWrap) {
    if (analysis && Array.isArray(analysis.skills) && analysis.skills.length > 0) {
      skillsChipsWrap.innerHTML = analysis.skills.map(sk => `
        <span class="skill-chip">${escapeHtml(sk)}</span>
      `).join("");
    } else {
      skillsChipsWrap.innerHTML = `
        <p style="font-size: 0.85rem; color: #64748B; margin: 0;">No skills extracted yet. <a href="upload.html" style="color: var(--color-primary); font-weight: 700;">Upload resume</a> to populate profile.</p>
      `;
    }
  }

  // 6. Recent Activity Log
  const activityList = document.getElementById("dashRecentActivityList");
  if (activityList) {
    if (activityLog && activityLog.length > 0) {
      activityList.innerHTML = activityLog.slice(0, 5).map(item => `
        <div class="activity-item">
          <div class="activity-icon-wrap">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          </div>
          <div class="activity-details">
            <span class="activity-role">${escapeHtml(item.details || 'Action')}</span>
            <span class="activity-action">${escapeHtml(item.action)}</span>
            <span class="activity-time">${escapeHtml(item.timestamp || 'Today')}</span>
          </div>
        </div>
      `).join("");
    } else {
      activityList.innerHTML = `
        <p style="font-size: 0.85rem; color: #64748B; margin: 0;">No recent activity recorded yet.</p>
      `;
    }
  }

  // 7. Recommended Jobs Overview (Fetch Live Recommendations if resume exists)
  if (analysis && analysis.resume_text) {
    await fetchDashboardRecommendations(analysis.resume_text);
  } else {
    renderEmptyDashboardJobs();
  }
}

async function fetchDashboardRecommendations(text) {
  const jobsGrid = document.getElementById("dashRecommendedJobsGrid");
  const statJobMatchesCount = document.getElementById("statJobMatchesCount");
  if (!jobsGrid) return;

  const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "http://127.0.0.1:5000";

  try {
    const response = await fetch(`${apiBase}/api/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resume: text, top_n: 3 })
    });

    if (!response.ok) {
      renderEmptyDashboardJobs();
      return;
    }

    const resData = await response.json();
    if (resData.success && resData.recommendations && resData.recommendations.length > 0) {
      if (statJobMatchesCount) {
        statJobMatchesCount.textContent = resData.total_evaluated || resData.recommendations.length;
      }
      renderDashboardJobs(resData.recommendations);
    } else {
      renderEmptyDashboardJobs();
    }
  } catch (err) {
    console.warn("Live recommendation fetch for dashboard skipped:", err);
    renderEmptyDashboardJobs();
  }
}

function renderDashboardJobs(jobs) {
  const jobsGrid = document.getElementById("dashRecommendedJobsGrid");
  if (!jobsGrid) return;

  jobsGrid.innerHTML = "";

  jobs.forEach((job) => {
    let fitBadgeClass = "status-success";
    let gaugeThemeClass = "gauge-good";
    let gaugeColor = "#0259DD";

    if (job.prediction === "Potential Fit") {
      fitBadgeClass = "status-warning";
      gaugeThemeClass = "gauge-potential";
      gaugeColor = "#84AFFB";
    } else if (job.prediction === "No Fit") {
      fitBadgeClass = "status-error";
      gaugeThemeClass = "gauge-nofit";
      gaugeColor = "#FF6648";
    }

    const scoreNum = Math.min(Math.max(Number(job.match_score) || 0, 0), 100);
    const strokeOffset = (113.1 * (1 - scoreNum / 100)).toFixed(1);

    const isSaved = typeof NexStepState !== 'undefined' ? NexStepState.isJobSaved(job.id) : false;

    const card = document.createElement("div");
    card.className = "dash-job-card";
    card.innerHTML = `
      <div class="dash-job-top-row" style="display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;">
        <div style="flex: 1; min-width: 0;">
          <h3 class="dash-job-title">${escapeHtml(job.title)}</h3>
          <div class="dash-job-company">${escapeHtml(job.company)}</div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;">
          <div class="match-gauge-wrap" style="width: 48px; height: 48px;" title="${scoreNum}% Match Score">
            <svg class="match-gauge-svg" viewBox="0 0 44 44" aria-hidden="true">
              <circle class="gauge-bg" cx="22" cy="22" r="18" />
              <circle class="gauge-progress ${gaugeThemeClass}" cx="22" cy="22" r="18" stroke-dashoffset="${strokeOffset}" />
            </svg>
            <div class="gauge-center-content">
              <span class="gauge-pct" style="color: ${gaugeColor}; font-size: 0.8125rem;">${scoreNum}<small>%</small></span>
            </div>
          </div>
          <span class="${fitBadgeClass}" style="font-size: 0.75rem; padding: 0.25rem 0.65rem;">${escapeHtml(job.prediction || 'Fit')}</span>
        </div>
      </div>
      <div class="dash-job-meta">${escapeHtml(job.location)} · ${escapeHtml(job.type || 'Full-time')}</div>
      <div class="dash-job-skills-row">
        <span class="skill-chip">${escapeHtml(job.experience || 'Mid-Level')}</span>
        <span class="skill-chip">${escapeHtml(job.source || 'Greenhouse')}</span>
      </div>
      <div class="dash-job-actions">
        <a href="jobs.html" class="btn btn-primary" style="padding: 0.5rem 1.25rem; font-size: 0.875rem;">View Matches</a>
      </div>
    `;
    jobsGrid.appendChild(card);
  });
}

function renderEmptyDashboardJobs() {
  const jobsGrid = document.getElementById("dashRecommendedJobsGrid");
  if (!jobsGrid) return;
  jobsGrid.innerHTML = `
    <div style="grid-column: 1 / -1; background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 32px; text-align: center;">
      <h4 style="font-size: 1.1rem; font-weight: 700; color: #1e293b; margin-bottom: 8px;">No Job Recommendations Calculated</h4>
      <p style="font-size: 0.875rem; color: #64748b; margin-bottom: 16px;">Upload your resume PDF to calculate personalized model-based job recommendations.</p>
      <a href="upload.html" class="btn btn-primary" style="display: inline-flex;">Upload Resume Now</a>
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
