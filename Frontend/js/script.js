/* ==========================================================================
   NexStep — Frontend Interactivity Script (Almendra & Seashell Edition)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // Mobile Nav Toggle
  const mobileToggle = document.getElementById('mobileToggle');
  const navMenu = document.getElementById('navMenu');

  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener('click', () => {
      const expanded = mobileToggle.getAttribute('aria-expanded') === 'true';
      mobileToggle.setAttribute('aria-expanded', !expanded);
      navMenu.classList.toggle('active');
    });
  }

  // Smooth Scrolling for Anchor Links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;

      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Drag & Drop Simulation
  const dropzone = document.getElementById('dropzone');
  if (dropzone) {
    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.add('drag-over');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        dropzone.classList.remove('drag-over');
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      simulateResume('software');
    });
  }
});

// Resume Parser Simulation Function
function simulateResume(profileType) {
  const resultBox = document.getElementById('simResultBox');
  const progressBar = document.getElementById('simProgressBar');
  const percentText = document.getElementById('simPercentText');
  const statusText = document.getElementById('simStatusText');
  const detailsOutput = document.getElementById('simDetailsOutput');

  if (!resultBox || !progressBar) return;

  resultBox.style.display = 'block';
  progressBar.style.width = '0%';
  percentText.textContent = '0%';
  statusText.textContent = 'Reading PDF text & metadata...';
  detailsOutput.innerHTML = '';

  let progress = 0;
  const interval = setInterval(() => {
    progress += 15;
    if (progress > 100) progress = 100;
    
    progressBar.style.width = progress + '%';
    percentText.textContent = progress + '%';

    if (progress === 30) {
      statusText.textContent = 'Extracting technical skill vectors...';
    } else if (progress === 70) {
      statusText.textContent = 'Matching against active opportunity database...';
    } else if (progress >= 100) {
      clearInterval(interval);
      statusText.textContent = 'Parsing complete! Showing top matches:';

      let profileData = {};
      if (profileType === 'software') {
        profileData = {
          role: 'Software Developer',
          skills: ['Python', 'Flask', 'SQL', 'Git', 'JavaScript', 'Docker'],
          matches: [
            { title: 'Senior Backend Engineer', score: '95%', location: 'Remote', salary: '$130k - $155k', statusClass: 'status-success' },
            { title: 'Full Stack Developer', score: '91%', location: 'Hybrid', salary: '$115k - $135k', statusClass: 'status-success' }
          ]
        };
      } else if (profileType === 'data') {
        profileData = {
          role: 'Data Scientist',
          skills: ['Python', 'Pandas', 'TensorFlow', 'SQL', 'Scikit-Learn'],
          matches: [
            { title: 'Machine Learning Specialist', score: '97%', location: 'Remote', salary: '$145k - $175k', statusClass: 'status-success' },
            { title: 'Data Engineer', score: '88%', location: 'On-site', salary: '$125k - $145k', statusClass: 'status-warning' }
          ]
        };
      } else {
        profileData = {
          role: 'Frontend Engineer',
          skills: ['React.js', 'TypeScript', 'TailwindCSS', 'JavaScript', 'HTML5/CSS3'],
          matches: [
            { title: 'UI Architect / Lead Frontend', score: '96%', location: 'Remote', salary: '$135k - $160k', statusClass: 'status-success' },
            { title: 'Product Frontend Developer', score: '92%', location: 'Hybrid', salary: '$120k - $140k', statusClass: 'status-success' }
          ]
        };
      }

      let html = `
        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid var(--color-border);">
          <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.75rem;">
            <strong style="color: var(--color-primary-dark);">Detected Role:</strong>
            <span style="color: var(--color-primary); font-weight: 800;">${profileData.role}</span>
          </div>
          <div style="margin-bottom: 1rem;">
            <strong style="color: var(--color-primary-dark); font-size: 0.85rem; display: block; margin-bottom: 0.4rem;">Skills Extracted:</strong>
            <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
              ${profileData.skills.map(s => `<span class="skill-chip">${s}</span>`).join('')}
            </div>
          </div>
          <strong style="color: var(--color-primary-dark); font-size: 0.85rem; display: block; margin-bottom: 0.5rem;">Job Recommendations:</strong>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            ${profileData.matches.map(m => `
              <div class="job-item-row job-item-highlight">
                <div>
                  <h5 style="color: var(--color-primary-dark); font-size: 0.9rem; margin-bottom: 0.1rem;">${m.title}</h5>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted);">${m.location} · ${m.salary}</span>
                </div>
                <span class="${m.statusClass}">${m.score} Match</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;
      detailsOutput.innerHTML = html;
    }
  }, 120);
}
