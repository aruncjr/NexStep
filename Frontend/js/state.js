/* ==========================================================================
   NexStep — Single Shared State Manager
   Central state layer managing User Profile, Resume Analysis, Saved Jobs,
   Applications, and Activity Log.
   ========================================================================== */

const NexStepState = {
  // Key Definitions
  STORAGE_KEYS: {
    USER_PROFILE: "nexstepUserProfile",
    ANALYSIS: "nexstepAnalysis",
    SAVED_JOBS: "nexstepSavedJobsList",
    APPLICATIONS: "nexstepApplicationsList",
    ACTIVITY_LOG: "nexstepActivityLog"
  },

  // Helper to strip raw HTML tags or script injection strings
  sanitizeText(str) {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/<[^>]*>?/gm, '').trim();
  },

  deriveDisplayName(fullName, email) {
    const sanitizedName = this.sanitizeText(fullName);
    if (sanitizedName && !sanitizedName.toLowerCase().includes("alex morgan") && !sanitizedName.toLowerCase().includes("alex smith") && !sanitizedName.includes("onerror")) {
      return sanitizedName;
    }
    if (email && typeof email === 'string' && email.trim()) {
      const handle = this.sanitizeText(email.trim().split("@")[0]);
      const cleaned = handle.replace(/[\d._-]+$/, "");
      const namePart = cleaned.length > 0 ? cleaned : handle;
      return namePart.charAt(0).toUpperCase() + namePart.slice(1);
    }
    return "Candidate";
  },

  deriveInitials(name) {
    const clean = this.sanitizeText(name);
    if (!clean || clean === "Candidate" || clean === "User") return "C";
    const parts = clean.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  },

  getUser() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.USER_PROFILE);
      if (raw) {
        const u = JSON.parse(raw);
        if (u.name && (u.name.includes('<') || u.name.includes('onerror'))) {
          localStorage.removeItem(this.STORAGE_KEYS.USER_PROFILE);
          return { name: "Candidate", email: "", initials: "C", role: "Candidate" };
        }
        const displayName = this.deriveDisplayName(u.name, u.email);
        return {
          name: displayName,
          email: this.sanitizeText(u.email || ""),
          initials: this.deriveInitials(displayName),
          role: u.role || "Candidate"
        };
      }
    } catch (e) {
      console.warn("Error loading user profile:", e);
    }

    return {
      name: "Candidate",
      email: "",
      initials: "C",
      role: "Candidate"
    };
  },

  getProfile() {
    return this.getUser();
  },

  saveUser(userObj) {
    if (!userObj) return;
    try {
      const displayName = this.deriveDisplayName(userObj.name, userObj.email);
      const profile = {
        name: displayName,
        email: userObj.email || "",
        role: userObj.role || "Candidate"
      };
      localStorage.setItem(this.STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
      this.syncUserUI();
    } catch (e) {
      console.warn("Error saving user profile:", e);
    }
  },

  // ------------------------------------------------------------------------
  // 2. Resume & Analysis State (sessionStorage with localStorage backup)
  // ------------------------------------------------------------------------
  getAnalysis() {
    try {
      const rawSession = sessionStorage.getItem(this.STORAGE_KEYS.ANALYSIS);
      if (rawSession) {
        const data = JSON.parse(rawSession);
        if (data && data.filename) data.filename = this.sanitizeText(data.filename);
        return data;
      }

      const rawLocal = localStorage.getItem(this.STORAGE_KEYS.ANALYSIS);
      if (rawLocal) {
        const data = JSON.parse(rawLocal);
        if (data && data.filename) data.filename = this.sanitizeText(data.filename);
        return data;
      }
    } catch (e) {
      console.warn("Error reading analysis state:", e);
    }
    return null;
  },

  saveAnalysis(data) {
    if (!data) return;
    try {
      const jsonStr = JSON.stringify(data);
      sessionStorage.setItem(this.STORAGE_KEYS.ANALYSIS, jsonStr);
      localStorage.setItem(this.STORAGE_KEYS.ANALYSIS, jsonStr);

      const skillCount = Array.isArray(data.skills) ? data.skills.length : 0;
      this.logActivity("Resume Analyzed", `${data.filename || 'Uploaded Resume.pdf'} (${skillCount} skills detected)`);
    } catch (e) {
      console.warn("Error saving analysis state:", e);
    }
  },

  clearResume() {
    try {
      sessionStorage.removeItem(this.STORAGE_KEYS.ANALYSIS);
      localStorage.removeItem(this.STORAGE_KEYS.ANALYSIS);
      this.logActivity("Resume Removed", "Active resume cleared from profile");
    } catch (e) {}
  },

  // ------------------------------------------------------------------------
  // 3. Saved Jobs State (localStorage)
  // ------------------------------------------------------------------------
  getSavedJobs() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.SAVED_JOBS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  saveJob(job) {
    if (!job || !job.id) return false;
    try {
      const savedList = this.getSavedJobs();
      const existingIndex = savedList.findIndex(j => String(j.id) === String(job.id));

      if (existingIndex >= 0) {
        savedList.splice(existingIndex, 1);
        localStorage.setItem(this.STORAGE_KEYS.SAVED_JOBS, JSON.stringify(savedList));
        this.logActivity("Job Unsaved", `${job.title} at ${job.company}`);
        return false;
      } else {
        savedList.push(job);
        localStorage.setItem(this.STORAGE_KEYS.SAVED_JOBS, JSON.stringify(savedList));
        this.logActivity("Job Saved", `${job.title} at ${job.company}`);
        return true;
      }
    } catch (e) {
      console.warn("Error saving job:", e);
      return false;
    }
  },

  removeSavedJob(jobId) {
    try {
      let savedList = this.getSavedJobs();
      const job = savedList.find(j => String(j.id) === String(jobId));
      savedList = savedList.filter(j => String(j.id) !== String(jobId));
      localStorage.setItem(this.STORAGE_KEYS.SAVED_JOBS, JSON.stringify(savedList));
      if (job) {
        this.logActivity("Job Removed", `${job.title} at ${job.company}`);
      }
    } catch (e) {
      console.warn("Error removing saved job:", e);
    }
  },

  isJobSaved(jobId) {
    const savedList = this.getSavedJobs();
    return savedList.some(j => String(j.id) === String(jobId));
  },

  // ------------------------------------------------------------------------
  // 4. Applications Activity State (localStorage)
  // ------------------------------------------------------------------------
  getApplications() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.APPLICATIONS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  recordApplication(job) {
    if (!job || !job.id) return;
    try {
      const apps = this.getApplications();
      const now = new Date();
      const appRecord = {
        job_id: String(job.id),
        title: job.title || "Position",
        company: job.company || "Employer",
        location: job.location || "Remote",
        url: job.url || job.link || "#",
        status: "External Application",
        date: now.toISOString().split("T")[0],
        time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      const existingIdx = apps.findIndex(a => String(a.job_id) === String(job.id));
      if (existingIdx >= 0) {
        apps.splice(existingIdx, 1);
      }
      apps.unshift(appRecord);

      localStorage.setItem(this.STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
      this.logActivity("External Application Opened", `${job.title} at ${job.company}`);
    } catch (e) {
      console.warn("Error recording application:", e);
    }
  },

  // ------------------------------------------------------------------------
  // 5. Activity Log (localStorage)
  // ------------------------------------------------------------------------
  getRecentActivity() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEYS.ACTIVITY_LOG);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  },

  logActivity(action, details) {
    try {
      const logs = this.getRecentActivity();
      const newEntry = {
        action: action,
        details: details,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: "Today"
      };

      logs.unshift(newEntry);
      const trimmed = logs.slice(0, 15);
      localStorage.setItem(this.STORAGE_KEYS.ACTIVITY_LOG, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("Error logging activity:", e);
    }
  },

  // ------------------------------------------------------------------------
  // 6. UI Synchronization Helper for Header/Sidebar
  // ------------------------------------------------------------------------
  syncUserUI() {
    const user = this.getUser();

    // Elements across pages
    const headerUserName = document.getElementById("headerUserName");
    const sidebarUserName = document.getElementById("sidebarUserName");
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    const headerAvatar = document.getElementById("headerAvatar");
    const cardUserName = document.getElementById("cardUserName");
    const mainCardAvatar = document.getElementById("mainCardAvatar");
    const dashGreetingTitle = document.getElementById("dashGreetingTitle");

    if (headerUserName) headerUserName.textContent = user.name;
    if (sidebarUserName) sidebarUserName.textContent = user.name;
    if (cardUserName) cardUserName.textContent = user.name;
    if (dashGreetingTitle) {
      const firstName = user.name.split(" ")[0];
      dashGreetingTitle.textContent = user.name === "Candidate" ? "Welcome to NexStep" : `Welcome back, ${firstName}`;
    }

    if (sidebarAvatar) sidebarAvatar.textContent = user.initials;
    if (headerAvatar) headerAvatar.textContent = user.initials;
    if (mainCardAvatar) mainCardAvatar.textContent = user.initials;
  },

  // ------------------------------------------------------------------------
  // 7. Non-Blocking Toast Notification System
  // ------------------------------------------------------------------------
  showToast(message, type = 'info', duration = 3500) {
    if (!message) return null;

    let container = document.getElementById("nexstepToastContainer");
    if (!container) {
      container = document.createElement("div");
      container.id = "nexstepToastContainer";
      container.setAttribute("aria-live", "polite");
      container.style.cssText = `
        position: fixed;
        top: 24px;
        right: 24px;
        z-index: 999999;
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-width: 400px;
        width: calc(100vw - 48px);
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    // Type configuration using Reference 2 design tokens
    let accentColor = "#0259DD";
    let badgeBg = "rgba(2, 89, 221, 0.12)";
    let iconSvg = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
      </svg>
    `;

    if (type === "success") {
      accentColor = "#0259DD";
      badgeBg = "rgba(2, 89, 221, 0.12)";
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      `;
    } else if (type === "error") {
      accentColor = "#FF6648";
      badgeBg = "rgba(255, 102, 72, 0.15)";
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      `;
    } else if (type === "warning") {
      accentColor = "#84AFFB";
      badgeBg = "rgba(132, 175, 251, 0.25)";
      iconSvg = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      `;
    }

    const toast = document.createElement("div");
    toast.className = "nexstep-toast";
    toast.style.cssText = `
      pointer-events: auto;
      background: var(--color-surface, #ffffff);
      color: var(--color-primary-dark, #0F172A);
      border: 1px solid var(--color-border, #E2E8F0);
      border-left: 4px solid ${accentColor};
      border-radius: var(--radius-md, 10px);
      box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: var(--font-family, 'Plus Jakarta Sans', sans-serif);
      font-size: 0.875rem;
      font-weight: 600;
      line-height: 1.45;
      opacity: 0;
      transform: translateX(30px);
      transition: all 260ms cubic-bezier(0.16, 1, 0.3, 1);
    `;

    toast.innerHTML = `
      <div style="flex-shrink: 0; width: 30px; height: 30px; border-radius: 50%; background: ${badgeBg}; color: ${accentColor}; display: flex; align-items: center; justify-content: center;">
        ${iconSvg}
      </div>
      <div style="flex: 1; word-break: break-word;">${this.sanitizeText(message)}</div>
      <button type="button" aria-label="Close notification" style="background: none; border: none; font-size: 1.25rem; line-height: 1; color: var(--color-text-muted, #6C6C68); cursor: pointer; padding: 2px 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center;">
        &times;
      </button>
    `;

    const closeBtn = toast.querySelector("button");
    const dismiss = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(30px)";
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 260);
    };

    closeBtn.addEventListener("click", dismiss);

    container.appendChild(toast);

    // Trigger entrance animation
    requestAnimationFrame(() => {
      toast.style.opacity = "1";
      toast.style.transform = "translateX(0)";
    });

    // Auto dismiss timer
    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    return dismiss;
  }
};

// Global helper bindings and alert override
if (typeof window !== 'undefined') {
  window.NexStepState = NexStepState;
  window.showToast = (msg, type = 'info', duration = 3500) => NexStepState.showToast(msg, type, duration);
  window.alert = (msg) => {
    NexStepState.showToast(String(msg), 'info');
  };
}

// Auto-sync UI when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  NexStepState.syncUserUI();
});
