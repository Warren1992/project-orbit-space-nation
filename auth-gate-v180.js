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

const TERMS_VERSION = '2026-10-23-v1';
const TERMS_EFFECTIVE = 'October 23, 2026';
let gateMode = 'signup';
let termsReviewed = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));

function eighteenYearsAgoISO() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2,'0'),
    String(d.getDate()).padStart(2,'0')
  ].join('-');
}

function isAdultBirthday(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) return false;
  const [y,m,d] = value.split('-').map(Number);
  const birth = new Date(y, m - 1, d);
  if (birth.getFullYear() !== y || birth.getMonth() !== m - 1 || birth.getDate() !== d) return false;
  const now = new Date();
  const cutoff = new Date(now.getFullYear() - 18, now.getMonth(), now.getDate());
  return birth <= cutoff;
}

function injectTermsStyles() {
  if (document.querySelector('#staraliaTermsV180Styles')) return;
  const style = document.createElement('style');
  style.id = 'staraliaTermsV180Styles';
  style.textContent = `
    .auth-gate-field-note{font-size:11px;color:#718399;line-height:1.45;margin-top:-2px}
    .auth-terms-check{
      display:grid!important;grid-template-columns:22px 1fr;align-items:start;gap:9px;
      border:1px solid rgba(255,255,255,.09);border-radius:13px;padding:12px;background:#07111f
    }
    .auth-terms-check input{width:18px;height:18px;margin:2px 0 0;accent-color:#f4b942}
    .auth-terms-check span{font-size:12px;line-height:1.48;color:#b9c6d6;font-weight:650}
    .auth-terms-link{border:0;background:none;color:#ffd978;font:inherit;font-weight:850;padding:0;text-decoration:underline}
    .staralia-terms-overlay{
      position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.78);display:grid;place-items:center;
      padding:18px;backdrop-filter:blur(9px)
    }
    .staralia-terms-panel{
      width:min(760px,100%);max-height:min(84vh,900px);overflow:auto;background:#081423;color:#fff;
      border:1px solid rgba(244,185,66,.25);border-radius:24px;padding:22px;
      box-shadow:0 30px 100px rgba(0,0,0,.65)
    }
    .staralia-terms-head{display:flex;justify-content:space-between;gap:12px;align-items:start;position:sticky;top:-22px;background:#081423;padding:22px 0 12px;z-index:2}
    .staralia-terms-head h2{margin:4px 0 0;font-size:25px}
    .staralia-terms-close{width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.12);background:#142235;color:#fff;font-size:23px}
    .staralia-terms-panel h3{margin:20px 0 7px;font-size:16px}
    .staralia-terms-panel p,.staralia-terms-panel li{color:#b8c6d7;line-height:1.62;font-size:13px}
    .staralia-terms-panel ul{padding-left:20px}
    .staralia-terms-version{color:#ffd978;font-size:12px;font-weight:850;letter-spacing:.05em}
    .staralia-terms-accept-note{border:1px solid rgba(244,185,66,.2);background:rgba(244,185,66,.06);border-radius:13px;padding:12px;margin-top:18px}
  `;
  document.head.appendChild(style);
}

function termsMarkup() {
  return `
    <div class="staralia-terms-head">
      <div>
        <div class="staralia-terms-version">STARALIA · TERMS ${TERMS_VERSION}</div>
        <h2>User Agreement & Terms of Use</h2>
      </div>
      <button class="staralia-terms-close" type="button" data-close-staralia-terms aria-label="Close">×</button>
    </div>
    <p><strong>Effective ${TERMS_EFFECTIVE}.</strong> These terms govern use of Staralia's website, app, digital-nation community, citizen accounts, social features, civic features, virtual-world features, and related services.</p>

    <h3>1. Eligibility and account information</h3>
    <p>You must be at least 18 years old to create a Staralia account. You agree to provide accurate account information, maintain the security of your login credentials, and not impersonate another person or organization.</p>

    <h3>2. What Staralia is — and is not</h3>
    <p>Staralia is a private digital community and space-nation project. Staralia is not a sovereign state recognized by governments or international organizations. Staralia citizenship, residency, citizen numbers, digital IDs, titles, elections, offices, Senate activity, executive actions, or other in-app status do not replace or create legal nationality, immigration status, a passport, government identification, public office, or legal authority outside Staralia.</p>

    <h3>3. Community conduct</h3>
    <p>You may not use Staralia to break applicable law; threaten, harass, exploit, or defraud others; impersonate others; distribute malware; attempt unauthorized access; interfere with Staralia's systems; publish unlawful content; infringe intellectual-property rights; or coordinate attacks on external systems. Staralia may moderate content and restrict or terminate accounts when reasonably necessary to protect users, the service, or legal compliance.</p>

    <h3>4. User content</h3>
    <p>You retain ownership of content you create. By posting content to Staralia, you grant Staralia a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, and technically process that content as reasonably necessary to operate, secure, improve, and present the service. You represent that you have the rights needed to post what you submit.</p>

    <h3>5. Civic and governmental features</h3>
    <p>Votes, Senate activity, offices, laws, Executive Orders, Proclamations, and other Staralia institutions are internal digital-community governance features. They do not create governmental authority over nonparticipants or override applicable real-world law.</p>

    <h3>6. Purchases and paid features</h3>
    <p>Optional paid features, including any Residency offering, are digital services or supporter benefits unless expressly stated otherwise. Prices and checkout terms will be shown before purchase. Payments do not constitute an investment, security, bank deposit, legal residency, real property interest, or guaranteed financial return. Refunds, taxes, and payment processing remain subject to applicable law and any checkout terms shown at purchase.</p>

    <h3>7. Privacy and age verification</h3>
    <p>Staralia collects information needed to operate accounts and features. Date of birth is collected to enforce the 18+ eligibility requirement and is kept out of the public citizen profile. Do not post sensitive personal information publicly that you do not want other citizens to see.</p>

    <h3>8. Availability and responsibility</h3>
    <p>Staralia is an evolving service and may change, experience interruptions, or contain errors. To the fullest extent permitted by applicable law, the service is provided without guarantees that it will always be available, error-free, or suitable for every purpose. Nothing in these terms excludes rights or remedies that cannot legally be waived.</p>

    <h3>9. Changes and termination</h3>
    <p>Staralia may update these terms as the service develops. Material updates should be presented for renewed acceptance when appropriate. You may stop using Staralia at any time. Staralia may suspend or terminate access for serious or repeated violations of these terms or when reasonably necessary for safety or legal compliance.</p>

    <h3>10. Electronic agreement</h3>
    <p>By checking the acceptance box and creating an account, you confirm that you are at least 18 years old, that you had an opportunity to read these terms, and that you agree to them electronically.</p>

    <div class="staralia-terms-accept-note">
      <p style="margin:0 0 12px">This agreement is intended to establish clear user rules and consent for Staralia. It does not eliminate every possible legal obligation or liability.</p>
      <button class="auth-gate-submit" type="button" data-terms-reviewed>I have read this agreement</button>
    </div>
  `;
}

function openTerms() {
  document.querySelector('#staraliaTermsOverlay')?.remove();
  const overlay = document.createElement('div');
  overlay.id = 'staraliaTermsOverlay';
  overlay.className = 'staralia-terms-overlay';
  overlay.innerHTML = `<section class="staralia-terms-panel" role="dialog" aria-modal="true" aria-label="Staralia User Agreement and Terms of Use">${termsMarkup()}</section>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('[data-close-staralia-terms]')?.addEventListener('click', close);
  overlay.querySelector('[data-terms-reviewed]')?.addEventListener('click', () => {
    termsReviewed = true;
    const checkbox = document.querySelector('#gateTermsAccepted');
    if (checkbox) {
      checkbox.disabled = false;
      checkbox.focus();
    }
    close();
  });
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
}

window.staraliaOpenTerms = openTerms;
window.staraliaTermsVersion = TERMS_VERSION;

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
  if (mode === 'signup') termsReviewed = false;
  content.className = '';
  const signup = mode === 'signup';
  content.innerHTML = `
    <div class="auth-gate-tabs">
      <button class="auth-gate-tab ${signup ? 'active' : ''}" data-gate-mode="signup">Create account</button>
      <button class="auth-gate-tab ${!signup ? 'active' : ''}" data-gate-mode="login">Log in</button>
    </div>
    <form class="auth-gate-form" id="gateAuthForm">
      <label id="gateNameWrap" ${!signup ? 'hidden' : ''}>Citizen display name
        <input class="auth-gate-input" id="gateDisplayName" maxlength="80" autocomplete="name" placeholder="Your citizen name" ${signup ? 'required' : ''} />
      </label>
      <label>Email
        <input class="auth-gate-input" id="gateEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
      </label>
      <label>Password
        <input class="auth-gate-input" id="gatePassword" type="password" minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" required placeholder="At least 8 characters" />
      </label>
      ${signup ? `
        <label>Date of birth
          <input class="auth-gate-input" id="gateBirthDate" type="date" max="${eighteenYearsAgoISO()}" autocomplete="bday" required />
          <span class="auth-gate-field-note">Staralia is 18+. Your birth date is kept private and is not shown on your citizen profile.</span>
        </label>
        <label class="auth-terms-check">
          <input id="gateTermsAccepted" type="checkbox" required disabled />
          <span>Open and read the <button class="auth-terms-link" id="gateTermsLink" type="button">Staralia User Agreement & Terms of Use</button>. After confirming you have read it, check this box to agree.</span>
        </label>
      ` : ''}
      <p class="auth-gate-message ${persistentMessage ? 'success' : ''}" id="gateMessage">${escapeHtml(persistentMessage)}</p>
      <button class="auth-gate-submit" id="gateSubmit" type="submit">${signup ? 'Create citizen account' : 'Enter Staralia'}</button>
    </form>
    <button class="auth-gate-install" id="gateInstallApp" type="button">Install Staralia app</button>
    <p class="auth-gate-note">${signup ? 'You must be 18 or older and accept the current Terms to create an account.' : 'Staralia content is available to registered citizens after authentication.'}</p>
  `;

  content.querySelectorAll('[data-gate-mode]').forEach(btn => {
    btn.addEventListener('click', () => renderGate(btn.dataset.gateMode));
  });

  content.querySelector('#gateTermsLink')?.addEventListener('click', openTerms);

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
    const birthDate = content.querySelector('#gateBirthDate')?.value || '';
    const termsAccepted = !!content.querySelector('#gateTermsAccepted')?.checked;

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
      if (!birthDate || !isAdultBirthday(birthDate)) {
        message.className = 'auth-gate-message error';
        message.textContent = 'You must be at least 18 years old to create a Staralia account.';
        submit.disabled = false;
        return;
      }
      if (!termsReviewed || !termsAccepted) {
        message.className = 'auth-gate-message error';
        message.textContent = 'Open, read, and accept the Staralia User Agreement and Terms of Use to continue.';
        submit.disabled = false;
        return;
      }

      result = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            date_of_birth: birthDate,
            terms_accepted: true,
            terms_version: TERMS_VERSION
          },
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

injectTermsStyles();

db.auth.onAuthStateChange((_event, session) => {
  session?.user ? showAppState() : showLockedState();
});

await syncGate();
