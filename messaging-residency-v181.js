const waitForDbV182 = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Starvalla database client did not initialize');
};

const dbV182 = await waitForDbV182();

const dmState = {
  user: null,
  profile: null,
  citizens: [],
  messages: [],
  activeCitizenNo: null
};

const escV182 = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[c]));

const padCitizenV182 = n => String(n ?? '').padStart(6, '0');
const citizenV182 = n => dmState.citizens.find(c => Number(c.citizen_no) === Number(n));
const myNoV182 = () => Number(dmState.profile?.citizen_no || 0);

function toastV182(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function avatarV182(citizen, size = '') {
  const initial = escV182((citizen?.display_name || 'C').trim().charAt(0).toUpperCase());
  const url = citizen?.avatar_url ? String(citizen.avatar_url) : '';

  if (url && /^https?:\/\//i.test(url)) {
    return `<span class="avatar avatar-live ${citizen?.is_founder ? 'founder-avatar' : ''} ${size}">
      <img src="${escV182(url)}" alt="${escV182(citizen?.display_name || 'Citizen')} avatar" />
    </span>`;
  }

  return `<span class="avatar ${citizen?.is_founder ? 'founder-avatar' : ''} ${size}">${initial}</span>`;
}

function relTimeV182(iso) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const m = Math.floor(seconds / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function injectV182Styles() {
  if (document.querySelector('#starvallaV182MessagingStyles')) return;

  const style = document.createElement('style');
  style.id = 'starvallaV182MessagingStyles';
  style.textContent = `
    .dm-page{display:grid;gap:16px}
    .dm-card{overflow:hidden}
    .dm-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}

    .dm-search{
      width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.11);
      border-radius:13px;background:#07111f;color:white;padding:12px 13px;
      font:inherit;outline:none
    }
    .dm-search:focus{
      border-color:rgba(159,92,246,.75);
      box-shadow:0 0 0 3px rgba(159,92,246,.09)
    }

    .dm-results{display:grid;gap:8px;margin-top:10px}

    .dm-search-result,.dm-conversation{
      width:100%;display:grid;grid-template-columns:48px 1fr auto;gap:11px;
      align-items:center;text-align:left;border:1px solid rgba(255,255,255,.08);
      border-radius:14px;background:rgba(255,255,255,.035);color:white;padding:11px
    }

    .dm-search-result .avatar,.dm-conversation .avatar{
      width:48px;height:48px;font-size:15px
    }

    .dm-search-result small,.dm-conversation small{
      display:block;color:#8395aa;margin-top:3px
    }

    .dm-preview{
      white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56vw
    }

    .dm-unread{
      min-width:24px;height:24px;border-radius:999px;background:#ff5d73;color:white;
      display:grid;place-items:center;font-size:11px;font-weight:900;padding:0 7px
    }

    .dm-thread-head{display:flex;align-items:center;gap:11px}
    .dm-thread-head .avatar{width:52px;height:52px}

    .dm-thread{
      display:grid;gap:10px;max-height:58vh;overflow:auto;padding:8px 2px 16px
    }

    .dm-bubble-row{display:flex}
    .dm-bubble-row.mine{justify-content:flex-end}

    .dm-bubble{
      max-width:min(78%,560px);border:1px solid rgba(255,255,255,.09);
      border-radius:17px;padding:10px 12px;background:rgba(255,255,255,.045)
    }

    .dm-bubble-row.mine .dm-bubble{
      background:linear-gradient(135deg,rgba(99,66,210,.32),rgba(123,67,214,.18));
      border-color:rgba(159,92,246,.32)
    }

    .dm-bubble p{margin:0;white-space:pre-wrap;line-height:1.45}
    .dm-bubble small{
      display:block;color:#7f91a7;margin-top:6px;font-size:11px
    }

    .dm-send{display:flex;gap:9px;align-items:flex-end}

    .dm-send textarea{
      flex:1;min-height:54px;max-height:140px;resize:vertical;
      border:1px solid rgba(255,255,255,.11);border-radius:13px;
      background:#07111f;color:white;padding:11px 12px;font:inherit
    }

    .dm-privacy-note{
      font-size:12px;line-height:1.5;color:#8293a8
    }

    .more-tile .dm-tile-count{
      display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;
      border-radius:999px;background:#ff5d73;color:white;font-size:11px;margin-left:5px
    }

    @media(max-width:700px){
      .dm-bubble{max-width:88%}
    }
  `;

  document.head.appendChild(style);
}

async function loadV182() {
  const { data: { session } } = await dbV182.auth.getSession();
  dmState.user = session?.user || null;

  if (!dmState.user) {
    dmState.profile = null;
    dmState.citizens = [];
    dmState.messages = [];
    return;
  }

  const [profile, citizens, messages] = await Promise.all([
    dbV182.rpc('my_profile'),
    dbV182
      .from('profiles')
      .select('citizen_no,display_name,country,avatar_url,bio,role,is_founder,account_type,joined_at')
      .order('citizen_no'),
    dbV182
      .from('direct_messages')
      .select('id,sender_citizen_no,recipient_citizen_no,body,created_at,read_at')
      .order('created_at', { ascending: true })
      .limit(2000)
  ]);

  dmState.profile = profile.data?.[0] || null;
  dmState.citizens = citizens.data || [];
  dmState.messages = messages.data || [];
}

async function refreshMessagesV182() {
  if (!dmState.user) return;

  const { data } = await dbV182
    .from('direct_messages')
    .select('id,sender_citizen_no,recipient_citizen_no,body,created_at,read_at')
    .order('created_at', { ascending: true })
    .limit(2000);

  dmState.messages = data || [];
  decorateV182();
}

function unreadCountV182() {
  const me = myNoV182();
  return dmState.messages.filter(
    m => Number(m.recipient_citizen_no) === me && !m.read_at
  ).length;
}

function conversationsV182() {
  const me = myNoV182();
  const map = new Map();

  for (const m of dmState.messages) {
    const other = Number(m.sender_citizen_no) === me
      ? Number(m.recipient_citizen_no)
      : Number(m.sender_citizen_no);

    const prev = map.get(other);
    if (!prev || new Date(m.created_at) > new Date(prev.last.created_at)) {
      map.set(other, { other, last: m, unread: 0 });
    }
  }

  for (const m of dmState.messages) {
    if (Number(m.recipient_citizen_no) !== me || m.read_at) continue;
    const other = Number(m.sender_citizen_no);
    if (map.has(other)) map.get(other).unread++;
  }

  return [...map.values()].sort(
    (a, b) => new Date(b.last.created_at) - new Date(a.last.created_at)
  );
}

async function openThreadV182(citizenNo) {
  dmState.activeCitizenNo = Number(citizenNo);
  const me = myNoV182();

  await dbV182
    .from('direct_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_citizen_no', Number(citizenNo))
    .eq('recipient_citizen_no', me)
    .is('read_at', null);

  await refreshMessagesV182();
  renderMessagesV182();
}

function renderMessagesV182() {
  const view = document.querySelector('#view');
  if (!view) return;

  const kicker = document.querySelector('#sectionKicker');
  const title = document.querySelector('#sectionTitle');
  if (kicker) kicker.textContent = 'STARVALLA';
  if (title) title.textContent = 'Messages';

  if (!dmState.user || !dmState.profile) {
    view.innerHTML = `
      <div class="card">
        <h3>Private citizen messaging</h3>
        <p class="muted">Log in to send direct messages to other Starvalla citizens.</p>
        <button class="btn primary" id="dmLoginBtn">Log in</button>
      </div>`;

    view.querySelector('#dmLoginBtn')?.addEventListener(
      'click',
      () => document.querySelector('#accountBtn')?.click()
    );
    return;
  }

  const me = myNoV182();
  const otherNo = Number(dmState.activeCitizenNo || 0);
  const other = citizenV182(otherNo);

  if (other && otherNo !== me) {
    const thread = dmState.messages.filter(m => {
      const a = Number(m.sender_citizen_no);
      const b = Number(m.recipient_citizen_no);
      return (a === me && b === otherNo) || (a === otherNo && b === me);
    });

    const aiLabel = other.account_type === 'ai'
      ? ' · AI Citizen'
      : '';

    view.innerHTML = `
      <div class="dm-page">
        <div class="card dm-card">
          <div class="dm-toolbar">
            <button class="btn secondary" id="dmBackBtn">← Inbox</button>
            <button class="btn secondary" id="dmViewProfileBtn">View profile</button>
          </div>

          <div class="dm-thread-head" style="margin-top:14px">
            ${avatarV182(other)}
            <div>
              <strong style="font-size:19px">${escV182(other.display_name)} ${other.is_founder ? '✓' : ''}</strong>
              <small style="display:block;color:#8395aa;margin-top:3px">
                Citizen #${padCitizenV182(otherNo)}${aiLabel}
              </small>
            </div>
          </div>

          <div class="dm-thread" id="dmThread">
            ${thread.length ? thread.map(m => {
              const mine = Number(m.sender_citizen_no) === me;
              return `
                <div class="dm-bubble-row ${mine ? 'mine' : ''}">
                  <div class="dm-bubble">
                    <p>${escV182(m.body)}</p>
                    <small>${relTimeV182(m.created_at)}${mine ? ` · ${m.read_at ? 'Read' : 'Sent'}` : ''}</small>
                  </div>
                </div>`;
            }).join('') : '<p class="muted">No messages yet. Say hello.</p>'}
          </div>

          <form class="dm-send" id="dmSendForm">
            <textarea id="dmBody" maxlength="2000"
              placeholder="Message ${escV182(other.display_name)}…" required></textarea>
            <button class="btn primary" type="submit">Send</button>
          </form>
        </div>
      </div>`;

    view.querySelector('#dmBackBtn')?.addEventListener('click', () => {
      dmState.activeCitizenNo = null;
      renderMessagesV182();
    });

    view.querySelector('#dmViewProfileBtn')?.addEventListener(
      'click',
      () => openProfileV182(otherNo)
    );

    view.querySelector('#dmSendForm')?.addEventListener('submit', async e => {
      e.preventDefault();

      const body = view.querySelector('#dmBody')?.value.trim();
      if (!body) return;

      const btn = e.currentTarget.querySelector('button');
      if (btn) btn.disabled = true;

      const { error } = await dbV182
        .from('direct_messages')
        .insert({ recipient_citizen_no: otherNo, body });

      if (error) {
        toastV182(error.message);
        if (btn) btn.disabled = false;
        return;
      }

      const input = view.querySelector('#dmBody');
      if (input) input.value = '';

      await refreshMessagesV182();
      renderMessagesV182();
    });

    setTimeout(() => {
      const t = view.querySelector('#dmThread');
      if (t) t.scrollTop = t.scrollHeight;
    }, 0);

    return;
  }

  const convos = conversationsV182();

  view.innerHTML = `
    <div class="dm-page">
      <div class="card dm-card">
        <span class="eyebrow">PRIVATE CITIZEN MESSAGING</span>
        <h3 style="margin:7px 0">Start a conversation</h3>
        <p class="muted">Search any Starvalla citizen by account name and send a private message.</p>
        <input class="dm-search" id="dmCitizenSearch"
          placeholder="Search citizens…" autocomplete="off" />
        <div class="dm-results" id="dmSearchResults"></div>
      </div>

      <div class="card dm-card">
        <div class="section-row">
          <h3>Inbox</h3>
          <span class="pill ${unreadCountV182() ? 'gold' : 'green'}">
            ${unreadCountV182()} unread
          </span>
        </div>

        <div class="dm-results" id="dmConversationList">
          ${convos.length ? convos.map(c => {
            const person = citizenV182(c.other) || {
              display_name: 'Citizen',
              citizen_no: c.other
            };

            const mine = Number(c.last.sender_citizen_no) === me;
            const ai = person.account_type === 'ai' ? ' · AI Citizen' : '';

            return `
              <button class="dm-conversation" data-dm-citizen="${c.other}">
                ${avatarV182(person)}
                <div>
                  <strong>${escV182(person.display_name)} ${person.is_founder ? '✓' : ''}</strong>
                  <small class="dm-preview">${mine ? 'You: ' : ''}${escV182(c.last.body)}</small>
                  <small>${relTimeV182(c.last.created_at)}${ai}</small>
                </div>
                ${c.unread
                  ? `<span class="dm-unread">${c.unread}</span>`
                  : '<span>›</span>'}
              </button>`;
          }).join('') : '<p class="muted">No conversations yet.</p>'}
        </div>
      </div>

      <div class="card">
        <p class="dm-privacy-note">
          Messages are private between the sender and recipient at the database level.
          Starvalla supports one-to-one citizen messaging, including conversations with AI citizens.
        </p>
      </div>
    </div>`;

  const search = view.querySelector('#dmCitizenSearch');
  const results = view.querySelector('#dmSearchResults');

  const drawSearch = () => {
    const q = (search?.value || '').trim().toLowerCase();

    if (!q) {
      if (results) results.innerHTML = '';
      return;
    }

    const matches = dmState.citizens
      .filter(c =>
        Number(c.citizen_no) !== me &&
        [
          c.display_name,
          c.role,
          c.country,
          padCitizenV182(c.citizen_no),
          `#${padCitizenV182(c.citizen_no)}`,
          c.account_type === 'ai' ? 'ai citizen' : ''
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(q)
      )
      .slice(0, 12);

    if (!results) return;

    results.innerHTML = matches.length
      ? matches.map(c => `
        <button class="dm-search-result" data-dm-citizen="${c.citizen_no}">
          ${avatarV182(c)}
          <div>
            <strong>${escV182(c.display_name)} ${c.is_founder ? '✓' : ''}</strong>
            <small>
              ${escV182(c.role || 'Citizen')} · #${padCitizenV182(c.citizen_no)}
            </small>
          </div>
          <span>›</span>
        </button>`).join('')
      : '<p class="muted">No citizens found.</p>';

    results.querySelectorAll('[data-dm-citizen]').forEach(b =>
      b.addEventListener(
        'click',
        () => openThreadV182(Number(b.dataset.dmCitizen))
      )
    );
  };

  search?.addEventListener('input', drawSearch);

  view.querySelectorAll('#dmConversationList [data-dm-citizen]').forEach(b =>
    b.addEventListener(
      'click',
      () => openThreadV182(Number(b.dataset.dmCitizen))
    )
  );
}

function openProfileV182(citizenNo) {
  const url = new URL(location.href);
  url.searchParams.set('citizen', padCitizenV182(citizenNo));
  url.hash = 'citizens';
  location.href = url.toString();
}

function decorateProfileV182() {
  const root = document.querySelector('#view .profile-page');
  if (!root) return;

  const meta = root.querySelector('.profile-meta')?.textContent || '';
  const m = meta.match(/Citizen\s*#(\d+)/i);
  if (!m) return;

  const no = Number(m[1]);
  const own = no === myNoV182();
  const actions = root.querySelector('.profile-actions');

  // Remove any old Residency controls if an older cached render left them behind.
  root.querySelectorAll(
    '[data-my-residency],[data-resident-badge],[data-residency-pending]'
  ).forEach(el => el.remove());

  if (actions && !own && !actions.querySelector('[data-message-citizen]')) {
    const b = document.createElement('button');
    b.className = 'btn primary';
    b.dataset.messageCitizen = String(no);
    b.textContent = 'Message';

    const share = actions.querySelector('#shareProfileBtn');
    actions.insertBefore(b, share || null);

    b.addEventListener('click', () => {
      dmState.activeCitizenNo = no;
      location.hash = 'messages';
    });
  }
}

function decorateDirectoryV182() {
  // Remove residency badges that may still exist from an older cached render.
  document.querySelectorAll(
    '[data-dir-resident],[data-resident-badge],[data-residency-pending]'
  ).forEach(el => el.remove());
}

function decorateMoreV182() {
  const grid = document.querySelector('.more-grid');
  if (!grid) return;

  // Residency has been removed from the app.
  grid.querySelectorAll('[data-route="residency"]').forEach(el => el.remove());

  if (!grid.querySelector('[data-route="messages"]')) {
    const b = document.createElement('button');
    b.className = 'more-tile';
    b.dataset.route = 'messages';
    b.dataset.unreadCount = String(unreadCountV182());
    b.innerHTML = `
      <span>✉</span>
      <strong>
        Messages${unreadCountV182()
          ? ` <span class="dm-tile-count">${unreadCountV182()}</span>`
          : ''}
      </strong>
      <small>Private citizen-to-citizen conversations</small>`;

    grid.appendChild(b);
  } else {
    const b = grid.querySelector('[data-route="messages"]');
    const count = unreadCountV182();

    if (b.dataset.unreadCount !== String(count)) {
      const strong = b.querySelector('strong');
      if (strong) {
        strong.innerHTML = `Messages${count
          ? ` <span class="dm-tile-count">${count}</span>`
          : ''}`;
      }
      b.dataset.unreadCount = String(count);
    }
  }
}

function removeResidencyUiV182() {
  document.querySelectorAll(
    '[data-route="residency"],[data-my-residency],[data-resident-badge],' +
    '[data-residency-pending],.residency-root,.resident-card'
  ).forEach(el => el.remove());

  if (location.hash.replace(/^#/, '').toLowerCase() === 'residency') {
    location.hash = 'more';
  }
}

function decorateV182() {
  removeResidencyUiV182();
  decorateProfileV182();
  decorateDirectoryV182();
  decorateMoreV182();

  const title = document.querySelector('#sectionTitle')?.textContent || '';

  if (title === 'Messages' && !document.querySelector('#view .dm-page')) {
    renderMessagesV182();
  }
}

injectV182Styles();
removeResidencyUiV182();
await loadV182();
decorateV182();

const observerV182 = new MutationObserver(() => {
  clearTimeout(observerV182._t);

  observerV182._t = setTimeout(() => {
    removeResidencyUiV182();

    const title = document.querySelector('#sectionTitle')?.textContent || '';

    if (title === 'Messages') {
      if (!document.querySelector('#view .dm-page')) {
        renderMessagesV182();
      } else {
        decorateMoreV182();
      }
    } else {
      decorateV182();
    }
  }, 45);
});

const observedViewV182 = document.querySelector('#view');
if (observedViewV182) {
  observerV182.observe(observedViewV182, {
    childList: true,
    subtree: true
  });
}

let refreshDmTimerV182 = null;

dbV182
  .channel('starvalla-v182-private-social')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'direct_messages' },
    () => {
      clearTimeout(refreshDmTimerV182);
      refreshDmTimerV182 = setTimeout(async () => {
        await refreshMessagesV182();

        if (document.querySelector('#sectionTitle')?.textContent === 'Messages') {
          renderMessagesV182();
        }
      }, 150);
    }
  )
  .subscribe();

dbV182.auth.onAuthStateChange(async (_event, session) => {
  dmState.user = session?.user || null;
  await loadV182();
  decorateV182();
});

window.addEventListener('hashchange', removeResidencyUiV182);
