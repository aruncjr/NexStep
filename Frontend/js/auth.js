/* ==========================================================================
   NexStep — Authentication Interactivity & User Profile Integration
   ========================================================================== */

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

document.addEventListener('DOMContentLoaded', () => {
  // Password Visibility Toggle Logic
  setupPasswordToggle('loginPassword', 'togglePasswordBtn');
  setupPasswordToggle('regPassword', 'toggleRegPasswordBtn');

  // Password Strength Meter in Registration Form
  const regPasswordInput = document.getElementById('regPassword');
  if (regPasswordInput) {
    regPasswordInput.addEventListener('input', (e) => {
      updatePasswordStrength(e.target.value);
    });
  }

  // ------------------------------------------------------------------------
  // Login Form Handling
  // ------------------------------------------------------------------------
  const loginEmail = document.getElementById('loginEmail');
  const loginPassword = document.getElementById('loginPassword');
  const loginForm = document.getElementById('loginForm');

  if (loginEmail) {
    loginEmail.addEventListener('blur', () => {
      validateEmailInput(loginEmail, 'loginEmailError');
    });
    loginEmail.addEventListener('input', () => {
      if (loginEmail.classList.contains('input-error-border')) {
        validateEmailInput(loginEmail, 'loginEmailError');
      }
    });
  }

  if (loginPassword) {
    loginPassword.addEventListener('blur', () => {
      validateRequiredInput(loginPassword, 'loginPasswordError', 'Password is required.');
    });
    loginPassword.addEventListener('input', () => {
      if (loginPassword.classList.contains('input-error-border')) {
        validateRequiredInput(loginPassword, 'loginPasswordError', 'Password is required.');
      }
    });
  }

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const isEmailValid = validateEmailInput(loginEmail, 'loginEmailError');
      const isPasswordValid = validateRequiredInput(loginPassword, 'loginPasswordError', 'Password is required.');

      if (!isEmailValid || !isPasswordValid) {
        if (!isEmailValid && loginEmail) loginEmail.focus();
        else if (!isPasswordValid && loginPassword) loginPassword.focus();
        return;
      }

      // Save user profile state
      const emailVal = loginEmail.value.trim();
      if (typeof NexStepState !== 'undefined') {
        // Check if user already exists
        const existing = NexStepState.getUser();
        const nameToUse = (existing && existing.email === emailVal) ? existing.name : "";
        NexStepState.saveUser({ name: nameToUse, email: emailVal });
        NexStepState.logActivity("User Logged In", `Session started for ${emailVal}`);
      }

      // Redirect to dashboard
      window.location.href = 'dashboard.html';
    });
  }

  // ------------------------------------------------------------------------
  // Registration Form Handling
  // ------------------------------------------------------------------------
  const regFullName = document.getElementById('regFullName');
  const regEmail = document.getElementById('regEmail');
  const regPassword = document.getElementById('regPassword');
  const regConfirmPassword = document.getElementById('regConfirmPassword');
  const termsCheck = document.getElementById('termsCheck');
  const registerForm = document.getElementById('registerForm');

  if (regEmail) {
    regEmail.addEventListener('blur', () => {
      validateEmailInput(regEmail, 'regEmailError');
    });
  }

  if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
      e.preventDefault();

      const isNameValid = validateRequiredInput(regFullName, 'regNameError', 'Full name is required.');
      const isEmailValid = validateEmailInput(regEmail, 'regEmailError');
      const isPasswordValid = validateMinLengthInput(regPassword, 'regPasswordError', 8, 'Password must be at least 8 characters.');
      
      let isMatchValid = true;
      if (regPassword && regConfirmPassword) {
        if (regPassword.value !== regConfirmPassword.value) {
          showError(regConfirmPassword, 'regConfirmError', 'Passwords do not match.');
          isMatchValid = false;
        } else {
          clearError(regConfirmPassword, 'regConfirmError');
        }
      }

      let isTermsValid = true;
      const termsErrorEl = document.getElementById('regTermsError');
      if (termsCheck && !termsCheck.checked) {
        if (termsErrorEl) termsErrorEl.textContent = 'You must accept the Terms & Privacy Policy.';
        isTermsValid = false;
      } else if (termsErrorEl) {
        termsErrorEl.textContent = '';
      }

      if (!isNameValid || !isEmailValid || !isPasswordValid || !isMatchValid || !isTermsValid) {
        return;
      }

      const fullNameVal = regFullName.value.trim();
      const emailVal = regEmail.value.trim();

      if (typeof NexStepState !== 'undefined') {
        NexStepState.saveUser({ name: fullNameVal, email: emailVal });
        NexStepState.logActivity("Account Created", `Registered profile for ${emailVal}`);
      }

      if (typeof NexStepState !== 'undefined' && NexStepState.showToast) {
        NexStepState.showToast(`Account created successfully for ${fullNameVal}! Redirecting to login...`, 'success', 2500);
      } else if (typeof showToast === 'function') {
        showToast(`Account created successfully for ${fullNameVal}! Redirecting to login...`, 'success', 2500);
      }
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1200);
    });
  }
});

// Helper Validation Functions
function validateEmailInput(inputEl, errorElId) {
  if (!inputEl) return false;
  const val = inputEl.value.trim();

  if (!val) {
    showError(inputEl, errorElId, 'Email address is required.');
    return false;
  }
  if (!EMAIL_REGEX.test(val)) {
    showError(inputEl, errorElId, 'Enter a valid email address.');
    return false;
  }

  clearError(inputEl, errorElId);
  return true;
}

function validateRequiredInput(inputEl, errorElId, msg) {
  if (!inputEl) return false;
  if (!inputEl.value.trim()) {
    showError(inputEl, errorElId, msg);
    return false;
  }
  clearError(inputEl, errorElId);
  return true;
}

function validateMinLengthInput(inputEl, errorElId, minLen, msg) {
  if (!inputEl) return false;
  if (inputEl.value.length < minLen) {
    showError(inputEl, errorElId, msg);
    return false;
  }
  clearError(inputEl, errorElId);
  return true;
}

function showError(inputEl, errorElId, msg) {
  if (inputEl) inputEl.classList.add('input-error-border');
  const errorEl = document.getElementById(errorElId);
  if (errorEl) errorEl.textContent = msg;
}

function clearError(inputEl, errorElId) {
  if (inputEl) inputEl.classList.remove('input-error-border');
  const errorEl = document.getElementById(errorElId);
  if (errorEl) errorEl.textContent = '';
}

function setupPasswordToggle(inputId, toggleBtnId) {
  const pwdInput = document.getElementById(inputId);
  const toggleBtn = document.getElementById(toggleBtnId);

  if (pwdInput && toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isPassword = pwdInput.getAttribute('type') === 'password';
      pwdInput.setAttribute('type', isPassword ? 'text' : 'password');
      toggleBtn.style.color = isPassword ? 'var(--color-primary)' : 'var(--color-text-muted)';
    });
  }
}

function updatePasswordStrength(val) {
  const barFill = document.getElementById('pwdStrengthBar');
  const strengthText = document.getElementById('pwdStrengthText');

  if (!barFill || !strengthText) return;

  if (val.length === 0) {
    barFill.style.width = '0%';
    strengthText.textContent = 'Enter a strong password';
    return;
  }

  let score = 0;
  if (val.length >= 8) score += 1;
  if (/[A-Z]/.test(val)) score += 1;
  if (/[0-9]/.test(val)) score += 1;
  if (/[^A-Za-z0-9]/.test(val)) score += 1;

  if (score === 1) {
    barFill.style.width = '25%';
    barFill.style.backgroundColor = 'var(--color-error)';
    strengthText.textContent = 'Weak password';
  } else if (score === 2 || score === 3) {
    barFill.style.width = '65%';
    barFill.style.backgroundColor = 'var(--color-accent-warm)';
    strengthText.textContent = 'Medium strength password';
  } else {
    barFill.style.width = '100%';
    barFill.style.backgroundColor = 'var(--color-primary)';
    strengthText.textContent = 'Strong password';
  }
}
