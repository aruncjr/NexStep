/* ==========================================================================
   NexStep — Applications Activity Script
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    initApplicationsPage();
});

function initApplicationsPage() {
    renderApplications();
}

function renderApplications() {
    const container = document.getElementById("applicationsContainer");
    if (!container) return;

    const apps = NexStepState.getApplications();

    if (!apps || apps.length === 0) {
        container.innerHTML = `
            <div class="empty-state-card" style="text-align: center; padding: 48px 24px; background: white; border-radius: 12px; border: 1px solid var(--border-color, #E2E8F0);">
                <div style="font-size: 48px; color: var(--text-muted, #94A3B8); margin-bottom: 16px;">
                    <i class="fa-regular fa-paper-plane"></i>
                </div>
                <h3 style="font-size: 20px; font-weight: 600; margin-bottom: 8px; color: var(--text-primary, #1E293B);">No External Applications Recorded</h3>
                <p style="color: var(--text-secondary, #64748B); max-width: 480px; margin: 0 auto 24px auto;">
                    When you click "View Job" on job recommendations or saved jobs, your external application activity will be automatically tracked here.
                </p>
                <a href="jobs.html" class="btn btn-primary" style="display: inline-flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-briefcase"></i> View Job Recommendations
                </a>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div style="background: white; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="padding: 20px 24px; border-bottom: 1px solid #E2E8F0; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 16px; font-weight: 600; color: #1E293B;">Recorded Application History (${apps.length})</h3>
                <span class="badge badge-info"><i class="fa-solid fa-clock-rotate-left"></i> Real-time state</span>
            </div>
            
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; text-align: left;">
                    <thead>
                        <tr style="background: #F8FAFC; border-bottom: 1px solid #E2E8F0; font-size: 13px; color: #64748B;">
                            <th style="padding: 14px 24px; font-weight: 600;">Job Title & Company</th>
                            <th style="padding: 14px 20px; font-weight: 600;">Location</th>
                            <th style="padding: 14px 20px; font-weight: 600;">Date Clicked</th>
                            <th style="padding: 14px 20px; font-weight: 600;">Status</th>
                            <th style="padding: 14px 24px; font-weight: 600; text-align: right;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${apps.map(app => `
                            <tr style="border-bottom: 1px solid #F1F5F9; font-size: 14px;">
                                <td style="padding: 16px 24px;">
                                    <div style="font-weight: 600; color: #1E293B;">${escapeHtml(app.title)}</div>
                                    <div style="font-size: 13px; color: #64748B;">${escapeHtml(app.company)}</div>
                                </td>
                                <td style="padding: 16px 20px; color: #475569;">
                                    <i class="fa-solid fa-location-dot" style="color: #94A3B8; margin-right: 4px;"></i>
                                    ${escapeHtml(app.location || 'Remote')}
                                </td>
                                <td style="padding: 16px 20px; color: #475569;">
                                    <div>${escapeHtml(app.date)}</div>
                                    <div style="font-size: 12px; color: #94A3B8;">${escapeHtml(app.time || '')}</div>
                                </td>
                                <td style="padding: 16px 20px;">
                                    <span class="badge badge-info" style="display: inline-flex; align-items: center; gap: 4px; background: #e0f2fe; color: #0369a1;">
                                        <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 11px;"></i>
                                        ${escapeHtml(app.status)}
                                    </span>
                                </td>
                                <td style="padding: 16px 24px; text-align: right;">
                                    <a href="${app.url && app.url !== '#' ? escapeHtml(app.url) : 'https://boards.greenhouse.io'}" target="_blank" class="btn btn-outline" style="padding: 6px 12px; font-size: 13px;">
                                        Re-open Link <i class="fa-solid fa-external-link-alt" style="font-size: 11px; margin-left: 4px;"></i>
                                    </a>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
