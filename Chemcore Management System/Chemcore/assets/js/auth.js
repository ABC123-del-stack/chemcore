/* ==========================================================================
   auth.js — login page logic (client-side only, no backend)
   ========================================================================== */

const DEMO_CREDENTIALS = { email: 'admin@chemcore.com', password: 'admin123' };

document.addEventListener('DOMContentLoaded', () => {
  // If already logged in, skip straight to the dashboard
  if (localStorage.getItem(STORAGE_KEYS.session) === 'true') {
    window.location.href = 'dashboard.html';
    return;
  }

  hidePageLoader();

  const form = $('#loginForm');
  const emailInput = $('#loginEmail');
  const passwordInput = $('#loginPassword');
  const toggleBtn = $('#togglePassword');
  const loginCard = $('#loginCard');
  const submitBtn = $('#loginSubmitBtn');

  toggleBtn?.addEventListener('click', () => {
    const isPw = passwordInput.type === 'password';
    passwordInput.type = isPw ? 'text' : 'password';
    toggleBtn.innerHTML = `<i class="fa-solid ${isPw ? 'fa-eye-slash' : 'fa-eye'}"></i>`;
  });

  $('#fillDemoBtn')?.addEventListener('click', () => {
    emailInput.value = DEMO_CREDENTIALS.email;
    passwordInput.value = DEMO_CREDENTIALS.password;
    clearFieldError(emailInput);
    clearFieldError(passwordInput);
  });

  function setFieldError(input, message) {
    input.classList.add('invalid');
    const err = input.closest('.form-group')?.querySelector('.form-error');
    if (err) { err.textContent = message; err.classList.add('show'); }
  }
  function clearFieldError(input) {
    input.classList.remove('invalid');
    const err = input.closest('.form-group')?.querySelector('.form-error');
    if (err) err.classList.remove('show');
  }

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    let valid = true;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setFieldError(emailInput, 'Enter a valid work email address.');
      valid = false;
    } else clearFieldError(emailInput);

    if (!password || password.length < 6) {
      setFieldError(passwordInput, 'Password must be at least 6 characters.');
      valid = false;
    } else clearFieldError(passwordInput);

    if (!valid) {
      loginCard.classList.remove('form-shake');
      void loginCard.offsetWidth; // restart animation
      loginCard.classList.add('form-shake');
      return;
    }

    // Simulate an authentication request
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner spinner-sm"></span> Signing in…`;

    setTimeout(() => {
      const matchesDemo = email.toLowerCase() === DEMO_CREDENTIALS.email && password === DEMO_CREDENTIALS.password;

      localStorage.setItem(STORAGE_KEYS.session, 'true');
      localStorage.setItem(STORAGE_KEYS.user, JSON.stringify({
        name: matchesDemo ? 'Samrudhi Mhaske' : (email.split('@')[0] || 'Team Member').replace(/[._]/g, ' '),
        role: 'Plant Supervisor',
        email
      }));
      window.location.href = 'dashboard.html';
    }, 700);
  });
});
