/* ==========================================================================
   NexStep — Saved Jobs Page Script
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initSavedJobsPage();
});

function initSavedJobsPage() {
    renderSavedJobs();
}

function renderSavedJobs() {
    const container = document.getElementById("savedJobsContainer");
    const headerTitle = document.getElementById("savedJobsHeaderTitle");
    if (!container) return;

    const savedJobs = NexStepState.getSavedJobs();
    
    if (headerTitle) {
        headerTitle.textContent = `${savedJobs.length} Saved Job${savedJobs.length === 1 ? '' : 's'}`;
    }

    if (!savedJobs || savedJobs.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 48px 24px; background: white; border-radius: 12px; border: 1px solid var(--border-color, #E2E8F0);">
                <div style="font-size: 48px; color: var(--text-muted, #94A3B8); margin-bottom: 16px;">
                    <i class="fa-regular fa-bookmark"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary, #1E293B);">No Saved Jobs Yet</h3>
                <p style="color: var(--text-secondary, #64748B); max-width: 460px; margin: 0 auto 24px auto;">
                    Bookmark relevant job recommendations to review them later or track your interest.
                </p>
                <a href="jobs.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-briefcase"></i> Browse Job Recommendations
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = savedJobs.map(job => {
        const matchScore = job.match_score || 75;
        const fitClass = job.prediction || "Good Fit";

        let fitBadgeClass = "badge-success";
        if (fitClass === "Potential Fit") fitBadgeClass = "badge-warning";
        if (fitClass === "No Fit") fitBadgeClass = "badge-danger";

        const sourceLabel = job.source || "Greenhouse";
        const isDemo = job.is_demo;

        return `
            <div class="job-card" data-id="${job.id}">
                <div class="job-card-header">
                    <div class="company-badge">
                        <i class="fa-solid fa-building"></i>
                    </div>
                    <div class="job-titles">
                        <h3>${escapeHtml(job.title)}</h3>
                        <span class="company-name">${escapeHtml(job.company)}</span>
                    </div>
                    <div class="match-pill">
                        <span class="match-score">${matchScore}%</span>
                        <span class="match-label">Match</span>
                    </div>
                </div>

                <div class="job-meta">
                    <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location || 'Remote')}</span>
                    <span><i class="fa-solid fa-clock"></i> ${escapeHtml(job.type || 'Full-time')}</span>
                    <span><i class="fa-solid fa-layer-group"></i> ${escapeHtml(job.experience || 'Mid-Level')}</span>
                    <span><i class="fa-solid fa-globe"></i> ${escapeHtml(sourceLabel)}</span>
                </div>

                <p class="job-description">
                    ${escapeHtml((job.description || '').substring(0, 180))}...
                </p>

                <div class="job-card-tags">
                    <span class="badge ${fitBadgeClass}">${escapeHtml(fitClass)}</span>
                    ${isDemo ? `<span class="badge badge-secondary" style="background:#f1f5f9; color:#475569;">Demo Listing</span>` : ''}
                </div>

                <div class="job-card-actions">
                    <button class="btn btn-primary btn-view-job" data-id="${job.id}">
                        <i class="fa-solid fa-arrow-up-right-from-square"></i> View Job
                    </button>
                    <button class="btn btn-outline btn-remove-saved" data-id="${job.id}" style="color: #ef4444; border-color: #fca5a5;">
                        <i class="fa-solid fa-trash-can"></i> Remove
                    </button>
                </div>
            </div>
        `;
    }).join("");

    // Attach Action Listeners
    container.querySelectorAll(".btn-view-job").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const jobId = e.currentTarget.getAttribute("data-id");
            const job = savedJobs.find(j => String(j.id) === String(jobId));
            if (job) {
                NexStepState.recordApplication(job);
                const targetUrl = job.url && job.url !== "#" ? job.url : "https://boards.greenhouse.io";
                window.open(targetUrl, "_blank");
            }
        });
    });

    container.querySelectorAll(".btn-remove-saved").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const jobId = e.currentTarget.getAttribute("data-id");
            NexStepState.removeSavedJob(jobId);
            renderSavedJobs(); // Re-render immediately
        });
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
