const waitForStaraliaDbV180 = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Staralia database client did not initialize.');
};

const dbV180 = await waitForStaraliaDbV180();

const civicV180 = {
  user: null,
  profile: null,
  actions: []
};

const escV180 = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));
const padV180 = n => String(n ?? '').padStart(3,'0');

function toastV180(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function injectV180Styles() {
  if (document.querySelector('#staraliaCivicV180Styles')) return;
  const style = document.createElement('style');
  style.id = 'staraliaCivicV180Styles';
  style.textContent = `
    #accountBtn.staralia-account-photo{overflow:hidden;padding:0!important;background:#111827}
    #accountBtn.staralia-account-photo img{width:100%;height:100%;display:block;object-fit:cover;border-radius:50%}
    .executive-actions-v180-root{display:grid;gap:16px}
    .executive-hero{border-color:rgba(244,185,66,.24)!important;background:linear-gradient(145deg,rgba(244,185,66,.06),rgba(9,20,35,.96))!important}
    .executive-hero h2{margin:7px 0 8px;font-size:30px}
    .executive-actions-list{display:grid;gap:12px}
    .executive-action-card{border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:18px;background:rgba(255,255,255,.025)}
    .executive-action-top{display:flex;justify-content:space-between;gap:12px;align-items:start}
    .executive-action-id{color:#ffd978;font-size:12px;font-weight:900;letter-spacing:.08em}
    .executive-action-card h3{margin:5px 0 8px}
    .executive-action-body{white-space:pre-wrap;line-height:1.65;color:#c1cede}
    .executive-action-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px;color:#8193aa;font-size:12px}
    .executive-admin{border-color:rgba(159,92,246,.25)!important}
    .executive-admin textarea{min-height:190px;resize:vertical}
    .executive-disclaimer{font-size:12px;color:#788ba1;line-height:1.55}
    .status-revoked{color:#ff9d9d!important;border-color:rgba(255,93,115,.28)!important;background:rgba(255,93,115,.08)!important}
    .terms-more-tile span{font-size:30px}
  `;
  document.head.appendChild(style);
}

async function fetchIdentityV180() {
  const { data: { session } } = await dbV180.auth.getSession();
  civicV180.user = session?.user || null;
  civicV180.profile = null;
  if (!civicV180.user) return;
  const { data, error } = await dbV180.rpc('my_profile');
  if (!error) civicV180.profile = data?.[0] || null;
}

async function fetchActionsV180() {
  if (!civicV180.user) {
    civicV180.actions = [];
    return;
  }
  const { data, error } = await dbV180
    .from('executive_actions')
    .select('id,action_type,action_number,title,body,signed_by_citizen_no,signed_at,status,revoked_at')
    .order('signed_at', { ascending:false });
  if (error) {
    console.error('Executive actions load failed', error);
    return;
  }
  civicV180.actions = data || [];
}

function syncAccountPhotoV180() {
  const btn = document.querySelector('#accountBtn');
  if (!btn) return;
  const p = civicV180.profile;
  if (!civicV180.user || !p) return;

  const url = String(p.avatar_url || '').trim();
  const initial = String(p.display_name || 'C').trim().charAt(0).toUpperCase();
  btn.textContent = initial;
  if (/^https?:\/\//i.test(url)) {
    btn.classList.add('staralia-account-photo-bg');
    btn.style.backgroundImage = `url("${url.replace(/"/g,'%22')}")`;
    btn.style.backgroundSize = 'cover';
    btn.style.backgroundPosition = 'center';
    btn.style.backgroundRepeat = 'no-repeat';
    btn.style.color = 'transparent';
    btn.style.fontSize = '0';
  } else {
    btn.classList.remove('staralia-account-photo-bg');
    btn.style.backgroundImage = '';
    btn.style.color = '';
    btn.style.fontSize = '';
  }
  btn.title = `View my profile · Citizen #${String(p.citizen_no).padStart(6,'0')}`;
}

function actionLabelV180(action) {
  return action.action_type === 'executive_order'
    ? `EXECUTIVE ORDER EO-${padV180(action.action_number)}`
    : `PROCLAMATION P-${padV180(action.action_number)}`;
}

function prettyDateV180(iso) {
  return new Date(iso).toLocaleString(undefined, {
    year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'
  });
}

async function renderExecutiveActionsV180() {
  const view = document.querySelector('#view');
  if (!view) return;
  await fetchActionsV180();

  const founder = !!civicV180.profile?.is_founder;
  const cards = civicV180.actions.length
    ? civicV180.actions.map(a => `
      <article class="executive-action-card">
        <div class="executive-action-top">
          <div>
            <div class="executive-action-id">${actionLabelV180(a)}</div>
            <h3>${escV180(a.title)}</h3>
          </div>
          <span class="pill ${a.status === 'revoked' ? 'status-revoked' : 'green'}">${a.status === 'revoked' ? 'REVOKED' : 'SIGNED'}</span>
        </div>
        <div class="executive-action-body">${escV180(a.body)}</div>
        <div class="executive-action-meta">
          <span>Signed by Founder & Head of Nation</span>
          <span>Citizen #${String(a.signed_by_citizen_no).padStart(6,'0')}</span>
          <span>${escV180(prettyDateV180(a.signed_at))}</span>
          ${a.revoked_at ? `<span>Revoked ${escV180(prettyDateV180(a.revoked_at))}</span>` : ''}
        </div>
        ${founder && a.status !== 'revoked'
          ? `<div style="margin-top:14px"><button class="btn danger" data-revoke-executive="${a.id}">Revoke</button></div>`
          : ''}
      </article>
    `).join('')
    : '<div class="card"><p class="muted">No Executive Orders or Proclamations have been signed yet.</p></div>';

  view.innerHTML = `
    <div class="executive-actions-v180-root">
      <section class="card executive-hero">
        <span class="eyebrow">OFFICE OF THE FOUNDER</span>
        <h2>Executive Actions</h2>
        <p class="muted">The official Staralia archive of Executive Orders and Proclamations signed by the Founder & Head of Nation.</p>
        <p class="executive-disclaimer">These are internal Staralia governance records. They do not create governmental or legal authority outside Staralia and remain subject to applicable real-world law.</p>
      </section>

      ${founder ? `
      <section class="card executive-admin">
        <span class="eyebrow">FOUNDER AUTHORITY</span>
        <h3>Sign an Executive Action</h3>
        <p class="muted">Only Citizen #000001 — the Founder & Head of Nation — is authorized by the database to sign these records.</p>
        <form class="admin-form" id="executiveActionForm">
          <label>Action type
            <select class="auth-input" id="executiveActionType">
              <option value="executive_order">Executive Order</option>
              <option value="proclamation">Proclamation</option>
            </select>
          </label>
          <label>Title
            <input class="auth-input" id="executiveActionTitle" maxlength="200" required placeholder="Title of the action" />
          </label>
          <label>Official text
            <textarea class="auth-input" id="executiveActionBody" maxlength="12000" required placeholder="Write the full official text here…"></textarea>
          </label>
          <p class="executive-disclaimer">Once signed, the text becomes an immutable official record. It can be revoked, but the signed text cannot be silently edited.</p>
          <p class="auth-message" id="executiveActionMessage"></p>
          <button class="btn primary" type="submit">Sign official action</button>
        </form>
      </section>` : ''}

      <section class="card">
        <div class="section-row"><h3>Official archive</h3><span class="pill blue">${civicV180.actions.length} RECORD${civicV180.actions.length === 1 ? '' : 'S'}</span></div>
        <div class="executive-actions-list">${cards}</div>
      </section>
    </div>
  `;

  view.querySelector('#executiveActionForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const form = e.currentTarget;
    const message = form.querySelector('#executiveActionMessage');
    const button = form.querySelector('button[type="submit"]');
    const action_type = form.querySelector('#executiveActionType').value;
    const title = form.querySelector('#executiveActionTitle').value.trim();
    const body = form.querySelector('#executiveActionBody').value.trim();
    if (!title || body.length < 10) return;

    if (!confirm(`Sign this ${action_type === 'executive_order' ? 'Executive Order' : 'Proclamation'} as an official Staralia record?`)) return;

    button.disabled = true;
    message.className = 'auth-message';
    message.textContent = 'Signing official record…';

    const { error } = await dbV180.from('executive_actions').insert({ action_type, title, body });
    if (error) {
      message.className = 'auth-message error';
      message.textContent = error.message;
      button.disabled = false;
      return;
    }
    toastV180('Executive action signed.');
    await renderExecutiveActionsV180();
  });

  view.querySelectorAll('[data-revoke-executive]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Revoke this executive action? The signed record will remain in the archive.')) return;
      btn.disabled = true;
      const { error } = await dbV180
        .from('executive_actions')
        .update({ status:'revoked' })
        .eq('id', Number(btn.dataset.revokeExecutive));
      if (error) {
        toastV180(error.message);
        btn.disabled = false;
        return;
      }
      toastV180('Executive action revoked.');
      await renderExecutiveActionsV180();
    });
  });

  window.scrollTo({top:0,behavior:'smooth'});
}

function ensureMoreLegalTileV180() {
  if (document.querySelector('#sectionTitle')?.textContent !== 'More') return;
  const grid = document.querySelector('#view .more-grid');
  if (!grid || grid.querySelector('[data-staralia-terms-tile]')) return;
  const tile = document.createElement('button');
  tile.className = 'more-tile terms-more-tile';
  tile.dataset.staraliaTermsTile = '1';
  tile.innerHTML = '<span>§</span><strong>User Agreement</strong><small>Terms of Use and 18+ account rules</small>';
  tile.addEventListener('click', () => {
    if (typeof window.staraliaOpenTerms === 'function') window.staraliaOpenTerms();
  });
  grid.appendChild(tile);
}

async function syncV180(forceGovernment = false) {
  syncAccountPhotoV180();
  ensureMoreLegalTileV180();
  const title = document.querySelector('#sectionTitle')?.textContent || '';
  const view = document.querySelector('#view');
  if (title === 'Government' && (forceGovernment || !view?.querySelector('.executive-actions-v180-root'))) {
    await renderExecutiveActionsV180();
  }
}

injectV180Styles();
await fetchIdentityV180();
syncAccountPhotoV180();
await syncV180(true);

let v180Timer = null;
const observerV180 = new MutationObserver(() => {
  clearTimeout(v180Timer);
  v180Timer = setTimeout(() => syncV180(false), 35);
});
observerV180.observe(document.querySelector('#view'), {childList:true,subtree:true});

dbV180.auth.onAuthStateChange(async (_event, session) => {
  civicV180.user = session?.user || null;
  await fetchIdentityV180();
  await syncV180(true);
});

dbV180.channel('staralia-v180-civic')
  .on('postgres_changes', {event:'*',schema:'public',table:'profiles'}, async payload => {
    if (civicV180.profile && Number(payload.new?.citizen_no || payload.old?.citizen_no) === Number(civicV180.profile.citizen_no)) {
      await fetchIdentityV180();
      syncAccountPhotoV180();
    }
  })
  .on('postgres_changes', {event:'*',schema:'public',table:'executive_actions'}, async () => {
    await fetchActionsV180();
    if (document.querySelector('#sectionTitle')?.textContent === 'Government') {
      await renderExecutiveActionsV180();
    }
  })
  .subscribe();
