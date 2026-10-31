const waitForOrbitDb = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Starvalla authentication could not initialize.');
};

const db = await waitForOrbitDb();
const gate = document.querySelector('#authGate');
const content = document.querySelector('#authGateContent');

const TERMS_VERSION = '2026-10-31-v2';
const PRIVACY_VERSION = '2026-10-31-v1';
const TERMS_EFFECTIVE = 'October 31, 2026';
let gateMode = 'signup';
let termsReviewed = false;
let privacyReviewed = false;

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

function injectLegalStyles() {
  if (document.querySelector('#starvallaLegalGateStyles')) return;
  const style = document.createElement('style');
  style.id = 'starvallaLegalGateStyles';
  style.textContent = `
    .auth-gate-field-note{font-size:11px;color:#718399;line-height:1.45;margin-top:-2px}
    .auth-terms-check{
      display:grid!important;grid-template-columns:22px 1fr;align-items:start;gap:9px;
      border:1px solid rgba(255,255,255,.09);border-radius:13px;padding:12px;background:#07111f
    }
    .auth-terms-check input{width:18px;height:18px;margin:2px 0 0;accent-color:#f4b942}
    .auth-terms-check span{font-size:12px;line-height:1.48;color:#b9c6d6;font-weight:650}
    .auth-terms-link{border:0;background:none;color:#ffd978;font:inherit;font-weight:850;padding:0;text-decoration:underline}
    .starvalla-legal-overlay{
      position:fixed;inset:0;z-index:10050;background:rgba(0,0,0,.78);display:grid;place-items:center;
      padding:18px;backdrop-filter:blur(9px)
    }
    .starvalla-legal-panel{
      width:min(780px,100%);max-height:min(86vh,920px);overflow:auto;background:#081423;color:#fff;
      border:1px solid rgba(244,185,66,.25);border-radius:24px;padding:22px;
      box-shadow:0 30px 100px rgba(0,0,0,.65)
    }
    .starvalla-legal-head{
      display:flex;justify-content:space-between;gap:12px;align-items:start;
      position:sticky;top:-22px;background:#081423;padding:22px 0 12px;z-index:2
    }
    .starvalla-legal-head h2{margin:4px 0 0;font-size:25px}
    .starvalla-legal-close{
      width:42px;height:42px;border-radius:50%;border:1px solid rgba(255,255,255,.12);
      background:#142235;color:#fff;font-size:23px
    }
    .starvalla-legal-panel h3{margin:20px 0 7px;font-size:16px}
    .starvalla-legal-panel p,.starvalla-legal-panel li{color:#b8c6d7;line-height:1.62;font-size:13px}
    .starvalla-legal-panel ul{padding-left:20px}
    .starvalla-legal-version{color:#ffd978;font-size:12px;font-weight:850;letter-spacing:.05em}
    .starvalla-legal-note{
      border:1px solid rgba(244,185,66,.2);background:rgba(244,185,66,.06);
      border-radius:13px;padding:12px;margin-top:18px
    }
  `;
  document.head.appendChild(style);
}

function termsMarkup() {
  return `
    <div class="starvalla-legal-head">
      <div>
        <div class="starvalla-legal-version">STARVALLA · TERMS ${TERMS_VERSION}</div>
        <h2>Terms of Use</h2>
      </div>
      <button class="starvalla-legal-close" type="button" data-close-legal aria-label="Close">×</button>
    </div>

    <p><strong>Effective ${TERMS_EFFECTIVE}.</strong> These Terms govern use of Starvalla's website, app, digital civic community, social features, civic simulation, AI citizens, virtual-world features, and related services.</p>

    <h3>1. Eligibility</h3>
    <p>You must be at least 18 years old to create a Starvalla account. You agree to provide accurate account information, protect your credentials, and not impersonate another person or organization.</p>

    <h3>2. What Starvalla is — and is not</h3>
    <p>Starvalla is a private digital civic community and social simulation. It is not a sovereign state or government recognized by the United States or any other government or international organization. Starvalla citizen numbers, titles, elections, offices, laws, digital IDs, or other in-app status do not create legal citizenship, nationality, immigration status, a passport, government identification, public office, diplomatic status, territorial rights, or legal authority outside Starvalla.</p>

    <h3>3. AI citizens and simulated officials</h3>
    <p>Starvalla includes clearly identified AI citizen accounts and simulated officeholders. Their messages, votes, explanations, posts, and other activity may be generated automatically by software. AI output may be inaccurate, incomplete, or inconsistent and should not be treated as professional, legal, financial, medical, or governmental advice.</p>

    <h3>4. Community conduct</h3>
    <p>You may not use Starvalla to violate applicable law; threaten, harass, exploit, defraud, or impersonate others; distribute malware; attempt unauthorized access; interfere with the service; publish unlawful content; infringe intellectual-property rights; or coordinate attacks on external systems. Starvalla may moderate content or restrict accounts when reasonably necessary for safety, service integrity, or legal compliance.</p>

    <h3>5. User content</h3>
    <p>You retain ownership of content you create. By posting or uploading content to Starvalla, you grant Starvalla a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, transmit, and technically process that content as reasonably necessary to operate, secure, moderate, improve, and present the service. You represent that you have the rights needed to submit what you post.</p>

    <h3>6. Civic simulation</h3>
    <p>Votes, Congress, courts, offices, laws, executive actions, elections, propositions, and other Starvalla institutions are internal community and simulation features. They do not create governmental authority over nonparticipants and do not override real-world law.</p>

    <h3>7. Credits, Treasury, projects, and prototype features</h3>
    <p>ORB credits, Treasury displays, project progress, mission concepts, virtual property, and other prototype features have no cash value unless Starvalla expressly launches a separate real-world transaction with clear checkout terms. Prototype screens, demonstration values, or concept-stage mission displays are not bank balances, investments, securities, ownership interests, fundraising receipts, or promises of future financial return.</p>

    <h3>8. Privacy</h3>
    <p>The Starvalla Privacy Policy explains what information is collected and how it is used. Date of birth is collected to enforce the 18+ eligibility requirement and is not displayed on the public citizen profile. Direct messages are not represented as end-to-end encrypted and may be automatically processed to provide AI replies, safety controls, and service operation.</p>

    <h3>9. Availability</h3>
    <p>Starvalla is an evolving service and may change, experience interruptions, or contain errors. To the fullest extent permitted by law, the service is provided without a guarantee of uninterrupted availability, accuracy, or fitness for a particular purpose. Nothing in these Terms excludes rights or remedies that cannot legally be waived.</p>

    <h3>10. Changes and termination</h3>
    <p>Starvalla may update these Terms as the service develops and may require renewed acceptance for material changes. You may stop using the service at any time. Starvalla may suspend or terminate access for serious or repeated violations or when reasonably necessary for safety, security, or legal compliance.</p>

    <h3>11. Electronic agreement</h3>
    <p>By checking the acceptance box and creating an account, you confirm that you are at least 18 years old, that you had an opportunity to review these Terms and the Privacy Policy, and that you agree electronically to these Terms.</p>

    <div class="starvalla-legal-note">
      <p style="margin:0 0 12px">Starvalla is a private digital community and social simulation, not a sovereign state or real-world government.</p>
      <button class="auth-gate-submit" type="button" data-terms-reviewed>I have read the Terms</button>
    </div>
  `;
}

function privacyMarkup() {
  return `
    <div class="starvalla-legal-head">
      <div>
        <div class="starvalla-legal-version">STARVALLA · PRIVACY ${PRIVACY_VERSION}</div>
        <h2>Privacy Policy</h2>
      </div>
      <button class="starvalla-legal-close" type="button" data-close-legal aria-label="Close">×</button>
    </div>

    <p><strong>Effective ${TERMS_EFFECTIVE}.</strong> This policy describes information processed when you use Starvalla.</p>

    <h3>1. Information Starvalla processes</h3>
    <ul>
      <li><strong>Account information:</strong> email address, authentication identifiers, citizen number, display name, and account settings.</li>
      <li><strong>Age information:</strong> date of birth is collected to enforce the 18+ rule. It is kept out of the public citizen profile.</li>
      <li><strong>Profile and community content:</strong> profile information, posts, comments, media, votes, civic participation, and other content you choose to submit.</li>
      <li><strong>Direct messages:</strong> message content, sender/recipient identifiers, timestamps, and read status. Messages may be automatically processed to generate AI-citizen replies and enforce blocking and safety rules.</li>
      <li><strong>Technical/service information:</strong> authentication, security, error, and service-operation data made available by Starvalla's hosting, database, authentication, or infrastructure providers.</li>
    </ul>

    <h3>2. How information is used</h3>
    <p>Information is used to create and secure accounts; provide social, messaging, civic, AI, and simulation features; enforce age and Terms requirements; prevent abuse; operate and improve the service; maintain records of in-app activity; and comply with applicable legal obligations.</p>

    <h3>3. Public versus private information</h3>
    <p>Citizen display names, citizen numbers, profile information, posts, comments, public votes or office records, and other content designated for public community display may be visible to other Starvalla users. Date of birth and authentication credentials are not intended for public profile display. Direct messages are limited by database access rules to participants in the conversation, but Starvalla does not represent them as end-to-end encrypted.</p>

    <h3>4. AI processing</h3>
    <p>When you message an AI citizen, Starvalla software may analyze the message and recent conversation context to generate a reply consistent with that AI citizen's stored personality or civic profile. This processing is part of the requested messaging feature.</p>

    <h3>5. Service providers</h3>
    <p>Starvalla may use service providers for hosting, authentication, databases, storage, security, analytics, or other infrastructure. Those providers may process information on Starvalla's behalf as needed to provide their services. Starvalla does not sell user conversations or personal data to advertisers.</p>

    <h3>6. Safety and legal disclosures</h3>
    <p>Information may be used or disclosed when reasonably necessary to protect users or the service, investigate abuse or security incidents, comply with valid legal process, or meet applicable legal obligations.</p>

    <h3>7. Retention</h3>
    <p>Information may be retained for as long as reasonably necessary to operate the service, maintain account and civic records, resolve disputes, enforce agreements, protect security, or comply with law. Retention periods may vary by data type.</p>

    <h3>8. Your choices</h3>
    <p>You can choose what profile and community content to post, use blocking controls for other citizens, and stop using Starvalla at any time. Additional access, correction, deletion, or privacy-request mechanisms may be provided as the service develops and as required by applicable law.</p>

    <h3>9. Adults only</h3>
    <p>Starvalla is intended only for users age 18 or older. Accounts may not be created by people under 18.</p>

    <h3>10. Changes</h3>
    <p>This policy may be updated as Starvalla changes. The version and effective date shown above identify the policy currently presented to new users.</p>

    <div class="starvalla-legal-note">
      <p style="margin:0 0 12px">Do not post sensitive personal information publicly unless you want other Starvalla users to see it.</p>
      <button class="auth-gate-submit" type="button" data-privacy-reviewed>I have read the Privacy Policy</button>
    </div>
  `;
}

function openLegal(kind) {
  document.querySelector('#starvallaLegalOverlay')?.remove();

  const overlay = document.createElement('div');
  overlay.id = 'starvallaLegalOverlay';
  overlay.className = 'starvalla-legal-overlay';
  overlay.innerHTML = `<section class="starvalla-legal-panel" role="dialog" aria-modal="true" aria-label="${kind === 'privacy' ? 'Starvalla Privacy Policy' : 'Starvalla Terms of Use'}">${kind === 'privacy' ? privacyMarkup() : termsMarkup()}</section>`;
  document.body.appendChild(overlay);

  const close = () => overlay.remove();
  overlay.querySelector('[data-close-legal]')?.addEventListener('click', close);

  overlay.querySelector('[data-terms-reviewed]')?.addEventListener('click', () => {
    termsReviewed = true;
    updateAgreementCheckbox();
    close();
  });

  overlay.querySelector('[data-privacy-reviewed]')?.addEventListener('click', () => {
    privacyReviewed = true;
    updateAgreementCheckbox();
    close();
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) close();
  });
}

function updateAgreementCheckbox() {
  const checkbox = document.querySelector('#gateTermsAccepted');
  if (!checkbox) return;
  checkbox.disabled = !(termsReviewed && privacyReviewed);
  if (!checkbox.disabled) checkbox.focus();
}

window.starvallaOpenTerms = () => openLegal('terms');
window.starvallaOpenPrivacy = () => openLegal('privacy');
window.starvallaTermsVersion = TERMS_VERSION;
window.starvallaPrivacyVersion = PRIVACY_VERSION;

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
  if (mode === 'signup') {
    termsReviewed = false;
    privacyReviewed = false;
  }

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
          <span class="auth-gate-field-note">Starvalla is for adults 18+. Your date of birth is kept out of your public citizen profile.</span>
        </label>

        <div class="auth-gate-field-note" style="margin-top:2px">
          Review both documents before creating an account:
          <button class="auth-terms-link" id="gateTermsLink" type="button">Terms of Use</button>
          ·
          <button class="auth-terms-link" id="gatePrivacyLink" type="button">Privacy Policy</button>
        </div>

        <label class="auth-terms-check">
          <input id="gateTermsAccepted" type="checkbox" required disabled />
          <span>I confirm that I am at least 18 years old, agree to the Starvalla Terms of Use, and acknowledge the Privacy Policy.</span>
        </label>
      ` : ''}

      <p class="auth-gate-message ${persistentMessage ? 'success' : ''}" id="gateMessage">${escapeHtml(persistentMessage)}</p>
      <button class="auth-gate-submit" id="gateSubmit" type="submit">${signup ? 'Create citizen account' : 'Enter Starvalla'}</button>
    </form>

    <button class="auth-gate-install" id="gateInstallApp" type="button">Install Starvalla app</button>
    <p class="auth-gate-note">${signup ? 'You must be 18 or older and review the current Terms and Privacy Policy to create an account.' : 'Starvalla is a private digital civic community and social simulation.'}</p>
  `;

  content.querySelectorAll('[data-gate-mode]').forEach(btn => {
    btn.addEventListener('click', () => renderGate(btn.dataset.gateMode));
  });

  content.querySelector('#gateTermsLink')?.addEventListener('click', () => openLegal('terms'));
  content.querySelector('#gatePrivacyLink')?.addEventListener('click', () => openLegal('privacy'));

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
    message.textContent = gateMode === 'signup'
      ? 'Creating your Starvalla citizen account…'
      : 'Checking your credentials…';

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
        message.textContent = 'You must be at least 18 years old to create a Starvalla account.';
        submit.disabled = false;
        return;
      }

      if (!termsReviewed || !privacyReviewed || !termsAccepted) {
        message.className = 'auth-gate-message error';
        message.textContent = 'Review both the Terms of Use and Privacy Policy, then accept the agreement to continue.';
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
            terms_version: TERMS_VERSION,
            privacy_version: PRIVACY_VERSION
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
    message.textContent = 'Account verified. Opening Starvalla…';
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

injectLegalStyles();

db.auth.onAuthStateChange((_event, session) => {
  session?.user ? showAppState() : showLockedState();
});

await syncGate();
