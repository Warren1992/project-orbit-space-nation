const waitForOrbitDb = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Staralia authentication could not initialize.');
};

const db = await waitForOrbitDb();
const gate = document.querySelector('#authGate');
const content = document.querySelector('#authGateContent');

let gateMode = 'signup';

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));

function showLockedState() {
  document.documentElement.classList.remove('auth-pending');
  document.documentElement.classList.add('auth-locked');
  gate.hidden = false;
  renderGate(gateMode);
}

function showAppState() {
  document.documentElement.classList.remove('auth-pending', 'auth-locked');
  gate.hidden = true;
}

function renderGate(mode = 'signup', persistentMessage = '') {
  gateMode = mode;
  content.className = '';
  content.innerHTML = `
    <div class="auth-gate-tabs">
      <button class="auth-gate-tab ${mode === 'signup' ? 'active' : ''}" data-gate-mode="signup">Create account</button>
      <button class="auth-gate-tab ${mode === 'login' ? 'active' : ''}" data-gate-mode="login">Log in</button>
    </div>
    <form class="auth-gate-form" id="gateAuthForm">
      <label id="gateNameWrap" ${mode === 'login' ? 'hidden' : ''}>Citizen display name
        <input class="auth-gate-input" id="gateDisplayName" maxlength="80" autocomplete="name" placeholder="Your citizen name" />
      </label>
      <label>Email
        <input class="auth-gate-input" id="gateEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
      </label>
      <label>Password
        <input class="auth-gate-input" id="gatePassword" type="password" minlength="8" autocomplete="${mode === 'signup' ? 'new-password' : 'current-password'}" required placeholder="At least 8 characters" />
      </label>
      <p class="auth-gate-message ${persistentMessage ? 'success' : ''}" id="gateMessage">${escapeHtml(persistentMessage)}</p>
      <button class="auth-gate-submit" id="gateSubmit" type="submit">${mode === 'signup' ? 'Create citizen account' : 'Enter Staralia'}</button>
    </form>
    <button class="auth-gate-install" id="gateInstallApp" type="button">Install Staralia app</button>
    <p class="auth-gate-note">Staralia content is available to registered citizens after authentication.</p>
  `;

  content.querySelectorAll('[data-gate-mode]').forEach(btn => {
    btn.addEventListener('click', () => renderGate(btn.dataset.gateMode));
  });

  content.querySelector('#gateInstallApp')?.addEventListener('click', async () => {
    if (typeof window.projectOrbitInstallApp === 'function') {
      await window.projectOrbitInstallApp();
    } else {
      alert('Open your browser menu and choose Add to Home screen or Install app.');
    }
  });

  content.querySelector('#gateAuthForm')?.addEventListener('submit', async event => {
    event.preventDefault();
    const submit = content.querySelector('#gateSubmit');
    const message = content.querySelector('#gateMessage');
    const email = content.querySelector('#gateEmail').value.trim();
    const password = content.querySelector('#gatePassword').value;
    const displayName = content.querySelector('#gateDisplayName')?.value.trim() || '';

    submit.disabled = true;
    message.className = 'auth-gate-message';
    message.textContent = gateMode === 'signup' ? 'Creating your citizenship…' : 'Checking your credentials…';

    let result;
    if (gateMode === 'signup') {
      if (!displayName) {
        message.className = 'auth-gate-message error';
        message.textContent = 'Enter the citizen display name you want to use.';
        submit.disabled = false;
        return;
      }

      result = await db.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: `${location.origin}${location.pathname}`
        }
      });
    } else {
      result = await db.auth.signInWithPassword({ email, password });
    }

    if (result.error) {
      message.className = 'auth-gate-message error';
      message.textContent = result.error.message;
      submit.disabled = false;
      return;
    }

    if (gateMode === 'signup' && !result.data.session) {
      renderGate('login', 'Account created. Check your email, confirm your address, then log in.');
      return;
    }

    message.className = 'auth-gate-message success';
    message.textContent = 'Citizenship verified. Opening Staralia…';
  });
}

async function syncGate() {
  const { data: { session }, error } = await db.auth.getSession();
  if (error) {
    showLockedState();
    const msg = content.querySelector('#gateMessage');
    if (msg) {
      msg.className = 'auth-gate-message error';
      msg.textContent = error.message;
    }
    return;
  }
  session?.user ? showAppState() : showLockedState();
}

db.auth.onAuthStateChange((_event, session) => {
  session?.user ? showAppState() : showLockedState();
});

await syncGate();
