const waitForDbV171 = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Staralia database client did not initialize');
};

const dbV171 = await waitForDbV171();

const dmState = {
  user: null,
  profile: null,
  citizens: [],
  messages: [],
  residencies: [],
  activeCitizenNo: null,
  started: false
};

const escV171 = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[c]));
const padCitizenV171 = n => String(n ?? '').padStart(6, '0');
const citizenV171 = n => dmState.citizens.find(c => Number(c.citizen_no) === Number(n));
const residencyV171 = n => dmState.residencies.find(r => Number(r.citizen_no) === Number(n));
const isResidentV171 = n => residencyV171(n)?.status === 'resident';
const myNoV171 = () => Number(dmState.profile?.citizen_no || 0);

function toastV171(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function avatarV171(citizen, size = '') {
  const initial = escV171((citizen?.display_name || 'C').trim().charAt(0).toUpperCase());
  const url = citizen?.avatar_url ? String(citizen.avatar_url) : '';
  if (url && /^https?:\/\//i.test(url)) {
    return `<span class="avatar avatar-live ${citizen?.is_founder ? 'founder-avatar' : ''} ${size}"><img src="${escV171(url)}" alt="${escV171(citizen?.display_name || 'Citizen')} avatar" /></span>`;
  }
  return `<span class="avatar ${citizen?.is_founder ? 'founder-avatar' : ''} ${size}">${initial}</span>`;
}

function relTimeV171(iso) {
  if (!iso) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const m = Math.floor(seconds / 60); if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24); if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

function injectV171Styles() {
  if (document.querySelector('#staraliaV171Styles')) return;
  const style = document.createElement('style');
  style.id = 'staraliaV171Styles';
  style.textContent = `
    .resident-pill{background:rgba(159,92,246,.16)!important;color:#d9b7ff!important;border:1px solid rgba(159,92,246,.35)!important}
    .residency-pending-pill{background:rgba(244,185,66,.12)!important;color:#ffd978!important;border:1px solid rgba(244,185,66,.28)!important}
    .dm-page{display:grid;gap:16px}.dm-card{overflow:hidden}.dm-toolbar{display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap}
    .dm-search{width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:#07111f;color:white;padding:12px 13px;font:inherit;outline:none}
    .dm-search:focus{border-color:rgba(159,92,246,.75);box-shadow:0 0 0 3px rgba(159,92,246,.09)}
    .dm-results{display:grid;gap:8px;margin-top:10px}.dm-search-result,.dm-conversation{width:100%;display:grid;grid-template-columns:48px 1fr auto;gap:11px;align-items:center;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.035);color:white;padding:11px}
    .dm-search-result .avatar,.dm-conversation .avatar{width:48px;height:48px;font-size:15px}.dm-search-result small,.dm-conversation small{display:block;color:#8395aa;margin-top:3px}.dm-preview{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56vw}.dm-unread{min-width:24px;height:24px;border-radius:999px;background:#ff5d73;color:white;display:grid;place-items:center;font-size:11px;font-weight:900;padding:0 7px}
    .dm-thread-head{display:flex;align-items:center;gap:11px}.dm-thread-head .avatar{width:52px;height:52px}.dm-thread{display:grid;gap:10px;max-height:58vh;overflow:auto;padding:8px 2px 16px}.dm-bubble-row{display:flex}.dm-bubble-row.mine{justify-content:flex-end}.dm-bubble{max-width:min(78%,560px);border:1px solid rgba(255,255,255,.09);border-radius:17px;padding:10px 12px;background:rgba(255,255,255,.045)}.dm-bubble-row.mine .dm-bubble{background:linear-gradient(135deg,rgba(99,66,210,.32),rgba(123,67,214,.18));border-color:rgba(159,92,246,.32)}.dm-bubble p{margin:0;white-space:pre-wrap;line-height:1.45}.dm-bubble small{display:block;color:#7f91a7;margin-top:6px;font-size:11px}.dm-send{display:flex;gap:9px;align-items:flex-end}.dm-send textarea{flex:1;min-height:54px;max-height:140px;resize:vertical;border:1px solid rgba(255,255,255,.11);border-radius:13px;background:#07111f;color:white;padding:11px 12px;font:inherit}
    .residency-hero{background:radial-gradient(circle at 88% 12%,rgba(159,92,246,.28),transparent 28%),linear-gradient(145deg,rgba(244,185,66,.08),rgba(9,20,35,.98));border-color:rgba(159,92,246,.25)}.residency-price{font-size:48px;font-weight:950;letter-spacing:-.04em;margin:5px 0}.residency-price small{font-size:14px;color:#8fa0b5;letter-spacing:0;font-weight:700}.residency-benefits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:14px}.residency-benefit{border:1px solid rgba(255,255,255,.08);background:rgba(255,255,255,.035);border-radius:14px;padding:13px}.residency-benefit strong{display:block;margin-bottom:4px}.residency-benefit span{color:#8fa0b5;font-size:13px;line-height:1.4}.resident-card{position:relative;overflow:hidden;border:1px solid rgba(159,92,246,.36);border-radius:22px;padding:22px;background:radial-gradient(circle at 80% 15%,rgba(159,92,246,.34),transparent 28%),linear-gradient(135deg,#0a1526,#11132a 58%,#251140);box-shadow:0 24px 70px rgba(0,0,0,.32)}.resident-card:after{content:'✦';position:absolute;right:18px;bottom:6px;font-size:90px;color:rgba(255,255,255,.045)}.resident-card-top{display:flex;justify-content:space-between;gap:12px;align-items:flex-start}.resident-card-label{letter-spacing:.16em;font-size:11px;font-weight:900;color:#d9b7ff}.resident-card h3{font-size:28px;margin:16px 0 4px}.resident-card-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-top:18px}.resident-card-grid span{display:block;color:#8395aa;font-size:11px;text-transform:uppercase;letter-spacing:.08em}.resident-card-grid strong{display:block;margin-top:4px}.residency-legal{font-size:12px;line-height:1.5;color:#8293a8}.residency-check{display:flex;gap:9px;align-items:flex-start;margin:15px 0}.residency-check input{margin-top:4px}
    .more-tile .dm-tile-count{display:inline-grid;place-items:center;min-width:22px;height:22px;padding:0 6px;border-radius:999px;background:#ff5d73;color:white;font-size:11px;margin-left:5px}
    @media(max-width:700px){.residency-benefits{grid-template-columns:1fr}.dm-bubble{max-width:88%}.resident-card-grid{grid-template-columns:1fr 1fr}}
  `;
  document.head.appendChild(style);
}

async function loadV171() {
  const { data: { session } } = await dbV171.auth.getSession();
  dmState.user = session?.user || null;
  if (!dmState.user) {
    dmState.profile = null; dmState.citizens = []; dmState.messages = []; dmState.residencies = [];
    return;
  }
  const [profile, citizens, messages, residencies] = await Promise.all([
    dbV171.rpc('my_profile'),
    dbV171.from('profiles').select('citizen_no,display_name,country,avatar_url,bio,role,is_founder,joined_at').order('citizen_no'),
    dbV171.from('direct_messages').select('id,sender_citizen_no,recipient_citizen_no,body,created_at,read_at').order('created_at',{ascending:true}).limit(2000),
    dbV171.from('residencies').select('citizen_no,status,price_cents,currency,created_at,paid_at,resident_since').order('created_at',{ascending:false})
  ]);
  dmState.profile = profile.data?.[0] || null;
  dmState.citizens = citizens.data || [];
  dmState.messages = messages.data || [];
  dmState.residencies = residencies.data || [];
}

async function refreshMessagesV171() {
  if (!dmState.user) return;
  const [messages,residencies] = await Promise.all([
    dbV171.from('direct_messages').select('id,sender_citizen_no,recipient_citizen_no,body,created_at,read_at').order('created_at',{ascending:true}).limit(2000),
    dbV171.from('residencies').select('citizen_no,status,price_cents,currency,created_at,paid_at,resident_since').order('created_at',{ascending:false})
  ]);
  dmState.messages = messages.data || [];
  dmState.residencies = residencies.data || [];
  decorateV171();
}

function unreadCountV171() {
  const me = myNoV171();
  return dmState.messages.filter(m => Number(m.recipient_citizen_no) === me && !m.read_at).length;
}

function conversationsV171() {
  const me = myNoV171();
  const map = new Map();
  for (const m of dmState.messages) {
    const other = Number(m.sender_citizen_no) === me ? Number(m.recipient_citizen_no) : Number(m.sender_citizen_no);
    const prev = map.get(other);
    if (!prev || new Date(m.created_at) > new Date(prev.last.created_at)) map.set(other,{other,last:m,unread:0});
  }
  for (const m of dmState.messages) {
    if (Number(m.recipient_citizen_no) !== me || m.read_at) continue;
    const other = Number(m.sender_citizen_no);
    if (map.has(other)) map.get(other).unread++;
  }
  return [...map.values()].sort((a,b)=>new Date(b.last.created_at)-new Date(a.last.created_at));
}

async function openThreadV171(citizenNo) {
  dmState.activeCitizenNo = Number(citizenNo);
  const me = myNoV171();
  await dbV171.from('direct_messages').update({read_at:new Date().toISOString()})
    .eq('sender_citizen_no',Number(citizenNo)).eq('recipient_citizen_no',me).is('read_at',null);
  await refreshMessagesV171();
  renderMessagesV171();
}

function renderMessagesV171() {
  const view = document.querySelector('#view');
  if (!view) return;
  document.querySelector('#sectionKicker').textContent = 'STARALIA';
  document.querySelector('#sectionTitle').textContent = 'Messages';
  if (!dmState.user || !dmState.profile) {
    view.innerHTML = `<div class="card"><h3>Private citizen messaging</h3><p class="muted">Log in to send direct messages to other Staralia citizens.</p><button class="btn primary" id="dmLoginBtn">Log in</button></div>`;
    view.querySelector('#dmLoginBtn')?.addEventListener('click',()=>document.querySelector('#accountBtn')?.click());
    return;
  }
  const me = myNoV171();
  const otherNo = Number(dmState.activeCitizenNo || 0);
  const other = citizenV171(otherNo);
  if (other && otherNo !== me) {
    const thread = dmState.messages.filter(m => {
      const a=Number(m.sender_citizen_no), b=Number(m.recipient_citizen_no);
      return (a===me&&b===otherNo)||(a===otherNo&&b===me);
    });
    view.innerHTML = `<div class="dm-page">
      <div class="card dm-card">
        <div class="dm-toolbar"><button class="btn secondary" id="dmBackBtn">← Inbox</button><button class="btn secondary" id="dmViewProfileBtn">View profile</button></div>
        <div class="dm-thread-head" style="margin-top:14px">${avatarV171(other)}<div><strong style="font-size:19px">${escV171(other.display_name)} ${other.is_founder?'✓':''}</strong><small style="display:block;color:#8395aa;margin-top:3px">Citizen #${padCitizenV171(otherNo)}${isResidentV171(otherNo)?' · Resident':''}</small></div></div>
        <div class="dm-thread" id="dmThread">${thread.length?thread.map(m=>{
          const mine=Number(m.sender_citizen_no)===me;
          return `<div class="dm-bubble-row ${mine?'mine':''}"><div class="dm-bubble"><p>${escV171(m.body)}</p><small>${relTimeV171(m.created_at)}${mine?` · ${m.read_at?'Read':'Sent'}`:''}</small></div></div>`;
        }).join(''):'<p class="muted">No messages yet. Say hello.</p>'}</div>
        <form class="dm-send" id="dmSendForm"><textarea id="dmBody" maxlength="2000" placeholder="Message ${escV171(other.display_name)}…" required></textarea><button class="btn primary" type="submit">Send</button></form>
      </div>
    </div>`;
    view.querySelector('#dmBackBtn').addEventListener('click',()=>{dmState.activeCitizenNo=null;renderMessagesV171();});
    view.querySelector('#dmViewProfileBtn').addEventListener('click',()=>openProfileV171(otherNo));
    view.querySelector('#dmSendForm').addEventListener('submit',async e=>{
      e.preventDefault(); const body=view.querySelector('#dmBody').value.trim(); if(!body)return;
      const btn=e.currentTarget.querySelector('button'); btn.disabled=true;
      const {error}=await dbV171.from('direct_messages').insert({recipient_citizen_no:otherNo,body});
      if(error){toastV171(error.message);btn.disabled=false;return;}
      view.querySelector('#dmBody').value=''; await refreshMessagesV171(); renderMessagesV171();
    });
    setTimeout(()=>{const t=view.querySelector('#dmThread');if(t)t.scrollTop=t.scrollHeight;},0);
    return;
  }

  const convos = conversationsV171();
  view.innerHTML = `<div class="dm-page">
    <div class="card dm-card"><span class="eyebrow">PRIVATE CITIZEN MESSAGING</span><h3 style="margin:7px 0">Start a conversation</h3><p class="muted">Search any Staralia citizen by account name and send a private message.</p><input class="dm-search" id="dmCitizenSearch" placeholder="Search citizens…" autocomplete="off" /><div class="dm-results" id="dmSearchResults"></div></div>
    <div class="card dm-card"><div class="section-row"><h3>Inbox</h3><span class="pill ${unreadCountV171()?'gold':'green'}">${unreadCountV171()} unread</span></div><div class="dm-results" id="dmConversationList">${convos.length?convos.map(c=>{
      const person=citizenV171(c.other)||{display_name:'Citizen',citizen_no:c.other};
      const mine=Number(c.last.sender_citizen_no)===me;
      return `<button class="dm-conversation" data-dm-citizen="${c.other}">${avatarV171(person)}<div><strong>${escV171(person.display_name)} ${person.is_founder?'✓':''}</strong><small class="dm-preview">${mine?'You: ':''}${escV171(c.last.body)}</small><small>${relTimeV171(c.last.created_at)}${isResidentV171(c.other)?' · Resident':''}</small></div>${c.unread?`<span class="dm-unread">${c.unread}</span>`:'<span>›</span>'}</button>`;
    }).join(''):'<p class="muted">No conversations yet.</p>'}</div></div>
    <div class="card"><p class="residency-legal">Messages are private between the sender and recipient at the database level. Staralia currently supports one-to-one citizen messaging; blocking/reporting tools can be added in a later moderation update.</p></div>
  </div>`;

  const search=view.querySelector('#dmCitizenSearch'), results=view.querySelector('#dmSearchResults');
  const drawSearch=()=>{
    const q=(search.value||'').trim().toLowerCase();
    if(!q){results.innerHTML='';return;}
    const matches=dmState.citizens.filter(c=>Number(c.citizen_no)!==me&&[c.display_name,c.role,c.country,padCitizenV171(c.citizen_no),`#${padCitizenV171(c.citizen_no)}`].filter(Boolean).join(' ').toLowerCase().includes(q)).slice(0,12);
    results.innerHTML=matches.length?matches.map(c=>`<button class="dm-search-result" data-dm-citizen="${c.citizen_no}">${avatarV171(c)}<div><strong>${escV171(c.display_name)} ${c.is_founder?'✓':''}</strong><small>${escV171(c.role||'Citizen')} · #${padCitizenV171(c.citizen_no)}${isResidentV171(c.citizen_no)?' · Resident':''}</small></div><span>›</span></button>`).join(''):'<p class="muted">No citizens found.</p>';
    results.querySelectorAll('[data-dm-citizen]').forEach(b=>b.addEventListener('click',()=>openThreadV171(Number(b.dataset.dmCitizen))));
  };
  search.addEventListener('input',drawSearch);
  view.querySelectorAll('#dmConversationList [data-dm-citizen]').forEach(b=>b.addEventListener('click',()=>openThreadV171(Number(b.dataset.dmCitizen))));
}

function openProfileV171(citizenNo) {
  const url=new URL(location.href); url.searchParams.set('citizen',padCitizenV171(citizenNo)); url.hash='citizens'; location.href=url.toString();
}

function residentCardV171() {
  const r = residencyV171(myNoV171());
  const p = dmState.profile;
  const since = new Date(r?.resident_since || r?.paid_at || r?.created_at || Date.now()).toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  return `<div class="resident-card"><div class="resident-card-top"><div><div class="resident-card-label">STARALIA · RESIDENT IDENTIFICATION</div><h3>${escV171(p.display_name)}</h3><div class="muted">Digital Resident status</div></div>${avatarV171(p)}</div><div class="resident-card-grid"><div><span>Citizen number</span><strong>#${padCitizenV171(p.citizen_no)}</strong></div><div><span>Resident since</span><strong>${escV171(since)}</strong></div><div><span>Country</span><strong>${escV171(p.country||'Not listed')}</strong></div><div><span>Status</span><strong>Resident</strong></div></div></div>`;
}

function renderResidencyV171() {
  const view=document.querySelector('#view'); if(!view)return;
  document.querySelector('#sectionKicker').textContent='STARALIA'; document.querySelector('#sectionTitle').textContent='Residency';
  if(!dmState.user||!dmState.profile){view.innerHTML='<div class="card"><h3>Staralia Residency</h3><p class="muted">Log in to view or begin your residency upgrade.</p><button class="btn primary" id="resLoginBtn">Log in</button></div>';view.querySelector('#resLoginBtn')?.addEventListener('click',()=>document.querySelector('#accountBtn')?.click());return;}
  const r=residencyV171(myNoV171()); const resident=r?.status==='resident';
  const statusHtml = resident ? residentCardV171() : r ? `<div class="card"><span class="eyebrow">YOUR STATUS</span><h3 style="margin:7px 0">Residency checkout pending</h3><p class="muted">Your Staralia residency request is saved at the fixed price of <strong>$100 USD one-time</strong>. No payment has been taken yet.</p><button class="btn secondary" disabled>Secure checkout setup pending</button></div>` : '';
  view.innerHTML=`<div class="stack residency-root">
    <div class="card residency-hero"><span class="eyebrow">OPTIONAL DIGITAL STATUS</span><h2 style="margin:7px 0 0">${resident?'You are a Staralia Resident':'Become a Staralia Resident'}</h2>${resident?'':`<div class="residency-price">$100 <small>USD · one-time</small></div>`}<p class="muted">Residency is an optional supporter status layered on top of citizenship. It does not purchase extra votes or political power.</p><div class="residency-benefits"><div class="residency-benefit"><strong>Resident badge</strong><span>A verified Resident badge on your Staralia profile and directory listing.</span></div><div class="residency-benefit"><strong>Digital Resident ID</strong><span>A Staralia digital Resident identification card tied to your citizen number.</span></div><div class="residency-benefit"><strong>Special access</strong><span>Eligibility for future Resident-only community spaces and special events.</span></div><div class="residency-benefit"><strong>Support the nation</strong><span>Your residency fee supports Staralia's platform and future projects.</span></div></div>${!r?`<label class="residency-check"><input id="resTerms" type="checkbox" /><span>I understand that Staralia Resident is a digital membership/status and is not legal residency, immigration status, sovereign citizenship, or a government-issued identity document.</span></label><button class="btn primary" id="beginResidencyBtn">Become a Resident — $100</button>`:''}</div>
    ${statusHtml}
    <div class="card"><h3>Equal civic rights</h3><p class="muted">Citizens do not need to pay for ordinary voting rights. Resident status does not give a citizen additional votes or make their vote count more than anyone else's.</p></div>
    <div class="card"><p class="residency-legal">Payment processing is intentionally not simulated. The $100 checkout will be activated through a real payment processor, and Resident status should only be confirmed after successful payment verification.</p></div>
  </div>`;
  view.querySelector('#beginResidencyBtn')?.addEventListener('click',async()=>{
    if(!view.querySelector('#resTerms')?.checked){toastV171('Please accept the residency terms first.');return;}
    const btn=view.querySelector('#beginResidencyBtn');btn.disabled=true;
    const {error}=await dbV171.from('residencies').insert({terms_accepted:true});
    if(error){toastV171(error.message);btn.disabled=false;return;}
    await refreshMessagesV171();renderResidencyV171();toastV171('Residency request saved. Secure $100 checkout will activate after Stripe is connected.');
  });
}

function decorateProfileV171() {
  const root=document.querySelector('#view .profile-page'); if(!root)return;
  const meta=root.querySelector('.profile-meta')?.textContent||'';
  const m=meta.match(/Citizen\s*#(\d+)/i); if(!m)return;
  const no=Number(m[1]); const own=no===myNoV171();
  const nameRow=root.querySelector('.profile-page-name');
  if(nameRow&&isResidentV171(no)&&!nameRow.querySelector('[data-resident-badge]')){
    const badge=document.createElement('span');badge.className='pill resident-pill';badge.dataset.residentBadge='1';badge.textContent='RESIDENT';nameRow.appendChild(badge);
  }
  if(nameRow&&own&&residencyV171(no)?.status==='payment_required'&&!nameRow.querySelector('[data-residency-pending]')){
    const badge=document.createElement('span');badge.className='pill residency-pending-pill';badge.dataset.residencyPending='1';badge.textContent='RESIDENCY CHECKOUT PENDING';nameRow.appendChild(badge);
  }
  const actions=root.querySelector('.profile-actions');
  if(actions&&!own&&!actions.querySelector('[data-message-citizen]')){
    const b=document.createElement('button');b.className='btn primary';b.dataset.messageCitizen=String(no);b.textContent='Message';
    const share=actions.querySelector('#shareProfileBtn');actions.insertBefore(b,share||null);
    b.addEventListener('click',()=>{dmState.activeCitizenNo=no;location.hash='messages';});
  }
  if(actions&&own&&!actions.querySelector('[data-my-residency]')){
    const b=document.createElement('button');b.className='btn secondary';b.dataset.myResidency='1';b.textContent=isResidentV171(no)?'Resident card':'Residency';actions.appendChild(b);b.addEventListener('click',()=>location.hash='residency');
  }
}

function decorateDirectoryV171() {
  document.querySelectorAll('#citizenList [data-citizen-profile]').forEach(row=>{
    const no=Number(row.dataset.citizenProfile); const small=row.querySelector('.identity-meta small'); if(!small)return;
    const existing=row.querySelector('[data-dir-resident]');
    if(isResidentV171(no) && !existing){
      const s=document.createElement('span');s.dataset.dirResident='1';s.className='resident-pill';s.style.cssText='display:inline-block;margin-left:7px;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:900;vertical-align:1px';s.textContent='RESIDENT';small.after(s);
    } else if(!isResidentV171(no) && existing) existing.remove();
  });
}

function decorateMoreV171() {
  const grid=document.querySelector('.more-grid'); if(!grid)return;
  if(!grid.querySelector('[data-route="messages"]')){
    const b=document.createElement('button');b.className='more-tile';b.dataset.route='messages';b.innerHTML=`<span>✉</span><strong>Messages${unreadCountV171()?` <span class="dm-tile-count">${unreadCountV171()}</span>`:''}</strong><small>Private citizen-to-citizen conversations</small>`;b.dataset.unreadCount=String(unreadCountV171());grid.appendChild(b);
  } else {
    const b=grid.querySelector('[data-route="messages"]');
    const count=unreadCountV171();
    if(b.dataset.unreadCount!==String(count)){
      const strong=b.querySelector('strong');
      if(strong) strong.innerHTML=`Messages${count?` <span class="dm-tile-count">${count}</span>`:''}`;
      b.dataset.unreadCount=String(count);
    }
  }
  if(!grid.querySelector('[data-route="residency"]')){
    const b=document.createElement('button');b.className='more-tile';b.dataset.route='residency';b.innerHTML='<span>◆</span><strong>Residency</strong><small>Optional Resident status · $100 one-time</small>';grid.appendChild(b);
  }
}

function decorateV171() {
  decorateProfileV171(); decorateDirectoryV171(); decorateMoreV171();
  const title=document.querySelector('#sectionTitle')?.textContent||'';
  if(title==='Messages'&&!document.querySelector('#view .dm-page')) renderMessagesV171();
  if(title==='Residency'&&!document.querySelector('#view .residency-root')) renderResidencyV171();
}

injectV171Styles();
await loadV171();
decorateV171();

const observerV171=new MutationObserver(()=>{
  clearTimeout(observerV171._t);observerV171._t=setTimeout(()=>{
    const title=document.querySelector('#sectionTitle')?.textContent||'';
    if(title==='Messages') { if(!document.querySelector('#view .dm-page')) renderMessagesV171(); else decorateMoreV171(); }
    else if(title==='Residency') { if(!document.querySelector('#view .residency-root')) renderResidencyV171(); else decorateMoreV171(); }
    else decorateV171();
  },45);
});
observerV171.observe(document.querySelector('#view'),{childList:true,subtree:true});

let refreshDmTimerV171=null;
dbV171.channel('staralia-v171-private-social')
  .on('postgres_changes',{event:'*',schema:'public',table:'direct_messages'},()=>{
    clearTimeout(refreshDmTimerV171);refreshDmTimerV171=setTimeout(async()=>{await refreshMessagesV171();if(document.querySelector('#sectionTitle')?.textContent==='Messages')renderMessagesV171();},150);
  })
  .on('postgres_changes',{event:'*',schema:'public',table:'residencies'},()=>{
    clearTimeout(refreshDmTimerV171);refreshDmTimerV171=setTimeout(async()=>{await refreshMessagesV171();if(document.querySelector('#sectionTitle')?.textContent==='Residency')renderResidencyV171();},150);
  })
  .subscribe();

dbV171.auth.onAuthStateChange(async(_event,session)=>{
  dmState.user=session?.user||null; await loadV171(); decorateV171();
});
