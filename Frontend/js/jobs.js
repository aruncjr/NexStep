/* ==========================================================================
   NexStep — Job Recommendations Client Script
   Features:
   - Client-side filtering by Title/Company search query
   - Dynamic Location dropdown populated from loaded jobs
   - Minimum Match Score slider filter
   - Friendly empty state for filter mismatches
   - Matched skills (green chips) & missing skills (muted gray chips)
   - Save / External Application state tracking with non-blocking toasts
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  // Mobile Dashboard Sidebar Toggle
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

  // Element References
  const loadingState = document.getElementById("jobsLoadingState");
  const errorState = document.getElementById("jobsErrorState");
  const errorMessage = document.getElementById("jobsErrorMessage");
  const emptyState = document.getElementById("jobsEmptyState");
  const jobsListContainer = document.getElementById("jobsListContainer");
  const fallbackNoticeBanner = document.getElementById("fallbackNoticeBanner");

  // Filter Element References
  const jobsFilterCard = document.getElementById("jobsFilterCard");
  const jobSearchInput = document.getElementById("jobSearchInput");
  const jobLocationSelect = document.getElementById("jobLocationSelect");
  const jobScoreSlider = document.getElementById("jobScoreSlider");
  const jobScoreValue = document.getElementById("jobScoreValue");
  const jobsFilterCount = document.getElementById("jobsFilterCount");
  const resetFiltersBtn = document.getElementById("resetFiltersBtn");
  const jobsNoFilterState = document.getElementById("jobsNoFilterState");
  const clearFiltersBtn = document.getElementById("clearFiltersBtn");

  // In-memory cache of loaded jobs for client-side filtering without refetching
  let allRecommendations = [];

  // Read stored resume data from NexStepState helper
  const analysis = typeof NexStepState !== 'undefined' ? NexStepState.getAnalysis() : null;

  const resumeText = (analysis && analysis.resume_text ? analysis.resume_text : "Software Developer proficient in Python, SQL, JavaScript, React, Flask, Git, Docker and Machine Learning.").trim();

  // Attach filter event listeners
  if (jobSearchInput) {
    jobSearchInput.addEventListener("input", () => applyFilters());
  }
  if (jobLocationSelect) {
    jobLocationSelect.addEventListener("change", () => applyFilters());
  }
  if (jobScoreSlider) {
    jobScoreSlider.addEventListener("input", () => {
      if (jobScoreValue) {
        jobScoreValue.textContent = `${jobScoreSlider.value}%`;
      }
      applyFilters();
    });
  }
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", () => resetFilters());
  }
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", () => resetFilters());
  }

  // Fetch ML job recommendations from backend API
  fetchRecommendations(resumeText);

  async function fetchRecommendations(text) {
    try {
      showLoading();

      const apiBase = (typeof CONFIG !== 'undefined' && CONFIG.API_BASE_URL) ? CONFIG.API_BASE_URL : "http://127.0.0.1:5000";

      const response = await fetch(`${apiBase}/api/recommendations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resume: text,
          top_n: 25
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.recommendations || data.recommendations.length === 0) {
        showEmpty();
        return;
      }

      if (fallbackNoticeBanner) {
        if (data.is_demo_fallback) {
          fallbackNoticeBanner.style.display = "flex";
        } else {
          fallbackNoticeBanner.style.display = "none";
        }
      }

      // Store loaded recommendations for client-side filtering
      allRecommendations = data.recommendations;

      // Populate location options from actual loaded jobs
      populateLocationOptions(allRecommendations);

      // Show filter controls bar
      if (jobsFilterCard) {
        jobsFilterCard.style.display = "block";
      }

      // Render filtered list
      applyFilters();
    } catch (err) {
      console.error("Error fetching job recommendations:", err);
      showError(`Unable to fetch job recommendations: ${err.message}`);
    }
  }

  function populateLocationOptions(jobs) {
    if (!jobLocationSelect) return;

    const uniqueLocations = Array.from(
      new Set(
        jobs
          .map(j => (j.location || '').trim())
          .filter(loc => loc.length > 0)
      )
    ).sort((a, b) => a.localeCompare(b));

    jobLocationSelect.innerHTML = `<option value="">All Locations (${jobs.length})</option>`;
    uniqueLocations.forEach(loc => {
      const opt = document.createElement("option");
      opt.value = loc;
      opt.textContent = loc;
      jobLocationSelect.appendChild(opt);
    });
  }

  function applyFilters() {
    hideAllStates();

    const query = (jobSearchInput ? jobSearchInput.value : "").trim().toLowerCase();
    const selectedLocation = (jobLocationSelect ? jobLocationSelect.value : "").trim().toLowerCase();
    const minScore = jobScoreSlider ? parseInt(jobScoreSlider.value, 10) || 0 : 0;

    if (jobScoreValue) {
      jobScoreValue.textContent = `${minScore}%`;
    }

    const filtered = allRecommendations.filter(job => {
      // 1. Min Match Score
      const score = Number(job.match_score) || 0;
      if (score < minScore) return false;

      // 2. Location
      if (selectedLocation) {
        const jobLoc = (job.location || "").toLowerCase();
        if (jobLoc !== selectedLocation) return false;
      }

      // 3. Search input (Title or Company)
      if (query) {
        const title = (job.title || "").toLowerCase();
        const company = (job.company || "").toLowerCase();
        if (!title.includes(query) && !company.includes(query)) {
          return false;
        }
      }

      return true;
    });

    // Update filter results count summary
    if (jobsFilterCount) {
      if (filtered.length === allRecommendations.length) {
        jobsFilterCount.textContent = `Showing all ${allRecommendations.length} recommendations`;
      } else {
        jobsFilterCount.textContent = `Showing ${filtered.length} of ${allRecommendations.length} recommendations`;
      }
    }

    // Check for empty results after filtering
    if (filtered.length === 0) {
      if (jobsListContainer) jobsListContainer.style.display = "none";
      if (jobsNoFilterState) jobsNoFilterState.style.display = "block";
    } else {
      if (jobsNoFilterState) jobsNoFilterState.style.display = "none";
      renderJobs(filtered);
    }
  }

  function resetFilters() {
    if (jobSearchInput) jobSearchInput.value = "";
    if (jobLocationSelect) jobLocationSelect.value = "";
    if (jobScoreSlider) jobScoreSlider.value = "0";
    if (jobScoreValue) jobScoreValue.textContent = "0%";
    applyFilters();
  }

  function renderJobs(jobs) {
    if (!jobsListContainer) return;

    jobsListContainer.innerHTML = "";
    jobsListContainer.style.display = "flex";

    jobs.forEach((job) => {
      const isSaved = typeof NexStepState !== 'undefined' ? NexStepState.isJobSaved(job.id) : false;
      
      let fitBadgeBg = "rgba(2, 89, 221, 0.08)";
      let fitBadgeColor = "#0259DD";
      let gaugeThemeClass = "gauge-good";
      let gaugeColor = "#0259DD";
      
      if (job.prediction === "Potential Fit") {
        fitBadgeBg = "rgba(132, 175, 251, 0.22)";
        fitBadgeColor = "#0259DD";
        gaugeThemeClass = "gauge-potential";
        gaugeColor = "#84AFFB";
      } else if (job.prediction === "No Fit") {
        fitBadgeBg = "rgba(255, 102, 72, 0.12)";
        fitBadgeColor = "#FF6648";
        gaugeThemeClass = "gauge-nofit";
        gaugeColor = "#FF6648";
      }

      const scoreNum = Math.min(Math.max(Number(job.match_score) || 0, 0), 100);
      const strokeOffset = (113.1 * (1 - scoreNum / 100)).toFixed(1);

      const card = document.createElement("article");
      card.className = "dash-card";
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.gap = "1rem";

      const sourceLabel = job.source || "Greenhouse";
      const isDemo = job.is_demo;

      const matchedSkills = Array.isArray(job.matched_skills) ? job.matched_skills : [];
      const missingSkills = Array.isArray(job.missing_skills) ? job.missing_skills : [];

      let matchedSkillsHtml = "";
      if (matchedSkills.length > 0) {
        matchedSkillsHtml = `
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            ${matchedSkills.map(skill => `
              <span class="skill-chip" style="background-color: rgba(2, 89, 221, 0.08); color: #0259DD; border: 1px solid rgba(2, 89, 221, 0.25); font-weight: 600;">
                ${escapeHtml(skill)}
              </span>
            `).join("")}
          </div>
        `;
      }

      let missingSkillsHtml = "";
      if (missingSkills.length > 0) {
        missingSkillsHtml = `
          <div style="font-size: 0.8125rem; color: var(--color-text-muted, #64748B); display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span style="font-weight: 700; font-size: 0.75rem;">You're missing:</span>
            ${missingSkills.map(skill => `
              <span class="skill-chip" style="background-color: rgba(11, 27, 61, 0.05); color: #64748B; border: 1px solid rgba(11, 27, 61, 0.12); font-weight: 600;">
                ${escapeHtml(skill)}
              </span>
            `).join("")}
          </div>
        `;
      }

      let skillsContainerHtml = "";
      if (matchedSkillsHtml || missingSkillsHtml) {
        skillsContainerHtml = `
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${matchedSkillsHtml}
            ${missingSkillsHtml}
          </div>
        `;
      }

      card.innerHTML = `
        <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
          <div style="flex: 1; min-width: 240px;">
            <div style="font-size: 0.75rem; font-weight: 800; color: var(--color-primary, #2563EB); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.25rem;">
              ${escapeHtml(job.company)} · ${escapeHtml(job.location)}
            </div>
            <h3 style="font-size: 1.25rem; font-weight: 800; color: var(--color-primary-dark, #0F172A); margin-bottom: 0.4rem;">
              ${escapeHtml(job.title)}
            </h3>
            <div style="display: flex; align-items: center; gap: 0.75rem; font-size: 0.8125rem; color: var(--color-text-muted, #64748B); flex-wrap: wrap;">
              <span>💼 ${escapeHtml(job.type || 'Full-time')}</span>
              <span>•</span>
              <span>⏳ ${escapeHtml(job.experience || 'Mid-Level')}</span>
              <span>•</span>
              <span>🌐 ${escapeHtml(sourceLabel)}</span>
              ${isDemo ? '<span class="badge" style="background:#f1f5f9; color:#475569; padding:2px 6px; font-size:11px;">Demo Listing</span>' : ''}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 0.85rem; flex-shrink: 0;">
            <div class="match-gauge-wrap" title="${scoreNum}% Match Score">
              <svg class="match-gauge-svg" viewBox="0 0 44 44" aria-hidden="true">
                <circle class="gauge-bg" cx="22" cy="22" r="18" />
                <circle class="gauge-progress ${gaugeThemeClass}" cx="22" cy="22" r="18" stroke-dashoffset="${strokeOffset}" />
              </svg>
              <div class="gauge-center-content">
                <span class="gauge-pct" style="color: ${gaugeColor};">${scoreNum}<small>%</small></span>
                <span class="gauge-lbl">FIT</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem;">
              <span style="font-size: 0.78125rem; font-weight: 800; padding: 0.3rem 0.75rem; border-radius: 20px; background-color: ${fitBadgeBg}; color: ${fitBadgeColor}; display: inline-flex; align-items: center; white-space: nowrap;">
                ${escapeHtml(job.prediction)}
              </span>
              <span style="font-size: 0.7rem; font-weight: 700; color: var(--color-text-muted, #64748B);">
                ${scoreNum}% match
              </span>
            </div>
          </div>
        </div>

        <p style="font-size: 0.9rem; color: var(--color-text-body, #334155); line-height: 1.55; margin: 0;">
          ${escapeHtml((job.description || '').substring(0, 220))}...
        </p>

        ${skillsContainerHtml}

        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 0.75rem; border-top: 1px solid var(--color-border, #E2E8F0); flex-wrap: wrap; gap: 0.75rem;">
          <span style="font-size: 0.75rem; color: var(--color-text-muted, #64748B);">
            Model-based job match probability.
          </span>

          <div style="display: flex; align-items: center; gap: 0.75rem;">
            <button type="button" class="btn ${isSaved ? 'btn-secondary' : 'btn-outline'} btn-sm save-job-btn" data-job-id="${job.id}">
              ${isSaved ? '✓ Saved' : 'Save Job'}
            </button>
            <button type="button" class="btn btn-primary btn-sm view-job-btn" data-job-id="${job.id}">
              <i class="fa-solid fa-arrow-up-right-from-square" style="margin-right: 4px;"></i> View Job
            </button>
          </div>
        </div>
      `;

      jobsListContainer.appendChild(card);
    });

    // Attach Event Listeners for Save and View buttons
    document.querySelectorAll(".save-job-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = e.currentTarget.getAttribute("data-job-id");
        const targetJob = allRecommendations.find(j => String(j.id) === String(jobId)) || jobs.find(j => String(j.id) === String(jobId));
        if (targetJob && typeof NexStepState !== 'undefined') {
          const nowSaved = NexStepState.saveJob(targetJob);
          e.currentTarget.textContent = nowSaved ? "✓ Saved" : "Save Job";
          e.currentTarget.className = nowSaved ? "btn btn-secondary btn-sm save-job-btn" : "btn btn-outline btn-sm save-job-btn";
          if (typeof NexStepState.showToast === 'function') {
            NexStepState.showToast(nowSaved ? `Saved "${targetJob.title}" to your profile` : `Removed "${targetJob.title}" from saved jobs`, nowSaved ? "success" : "info");
          }
        }
      });
    });

    document.querySelectorAll(".view-job-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const jobId = e.currentTarget.getAttribute("data-job-id");
        const targetJob = allRecommendations.find(j => String(j.id) === String(jobId)) || jobs.find(j => String(j.id) === String(jobId));
        if (targetJob) {
          if (typeof NexStepState !== 'undefined') {
            NexStepState.recordApplication(targetJob);
          }
          const targetUrl = targetJob.url && targetJob.url !== '#' ? targetJob.url : "https://boards.greenhouse.io";
          window.open(targetUrl, "_blank");
        }
      });
    });
  }

  // UI State Helpers
  function showLoading() {
    hideAllStates();
    if (jobsFilterCard) jobsFilterCard.style.display = "none";
    if (loadingState) loadingState.style.display = "block";
  }

  function showError(msg) {
    hideAllStates();
    if (jobsFilterCard) jobsFilterCard.style.display = "none";
    if (errorMessage) errorMessage.textContent = msg;
    if (errorState) errorState.style.display = "block";
  }

  function showEmpty() {
    hideAllStates();
    if (jobsFilterCard) jobsFilterCard.style.display = "none";
    if (emptyState) emptyState.style.display = "block";
  }

  function hideAllStates() {
    if (loadingState) loadingState.style.display = "none";
    if (errorState) errorState.style.display = "none";
    if (emptyState) emptyState.style.display = "none";
    if (jobsNoFilterState) jobsNoFilterState.style.display = "none";
    if (jobsListContainer) jobsListContainer.style.display = "none";
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
});
