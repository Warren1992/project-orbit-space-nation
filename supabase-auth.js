import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.3/+esm';

const SUPABASE_URL = 'https://unkeqcqmgewxiiwklmib.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_NaVqEVwmMmwynzIMRmfPuQ_ZRXyOQK7';

const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
window.projectOrbitDb = db;

const live = {
  user: null,
  profile: null,
  population: 0,
  citizens: []
};

const padCitizen = n => String(n ?? '').padStart(6, '0');
const safe = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));

function injectStyles(){
  if(document.querySelector('#orbitAuthStyles')) return;
  const style=document.createElement('style');
  style.id='orbitAuthStyles';
  style.textContent=`
    .auth-join-card{border-color:rgba(244,185,66,.32);background:linear-gradient(135deg,rgba(244,185,66,.11),rgba(13,24,40,.96))}
    .auth-join-card h3{margin:5px 0 8px;font-size:23px}
    .auth-join-card p{margin:0 0 15px;line-height:1.55}
    .auth-modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.72);z-index:200;display:grid;place-items:center;padding:18px}
    .auth-modal{width:min(470px,100%);max-height:90vh;overflow:auto;border:1px solid rgba(255,255,255,.12);border-radius:22px;background:#0b1625;box-shadow:0 30px 90px rgba(0,0,0,.55);padding:22px}
    .auth-modal-head{display:flex;justify-content:space-between;gap:15px;align-items:flex-start;margin-bottom:18px}
    .auth-modal h2{margin:4px 0 0}
    .auth-tabs{display:grid;grid-template-columns:1fr 1fr;background:#07111f;border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:4px;margin-bottom:17px}
    .auth-tab{border:0;border-radius:10px;padding:10px;background:transparent;color:#93a6bd;font-weight:800}
    .auth-tab.active{background:rgba(244,185,66,.14);color:#ffd978}
    .auth-form{display:grid;gap:12px}
    .auth-form label{display:grid;gap:6px;font-size:13px;font-weight:800;color:#cdd7e4}
    .auth-input{width:100%;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:#07111f;color:white;padding:12px 13px;outline:none}
    .auth-input:focus{border-color:rgba(244,185,66,.55)}
    .auth-message{min-height:20px;margin:3px 0 0;color:#99a9bc;font-size:13px;line-height:1.45}
    .auth-message.error{color:#ff9d9d}.auth-message.success{color:#7be0b8}
    .account-card{text-align:center}
    .account-number{font-size:42px;font-weight:900;color:#ffd978;margin:8px 0}
    .account-email{overflow-wrap:anywhere}
    .live-badge{display:inline-flex;align-items:center;gap:6px;color:#7be0b8;font-size:12px;font-weight:800}
    .live-badge:before{content:"";width:7px;height:7px;border-radius:50%;background:#31c48d;box-shadow:0 0 12px #31c48d}
    .country-text{font-size:18px;width:28px;text-align:center}
    .join-top-btn{border:1px solid rgba(244,185,66,.28);background:rgba(244,185,66,.1);color:#ffd978;border-radius:999px;padding:9px 12px;font-weight:850}
    @media(max-width:760px){.join-top-btn{display:none}.hero-card>div:first-child{position:relative;z-index:2;max-width:78%}.planet-orb{opacity:.55}}
  `;
  document.head.appendChild(style);
}

async function fetchProfile(){
  if(!live.user){ live.profile=null; return; }
  const {data,error}=await db.rpc('my_profile');
  if(error){ console.error('Profile load failed',error); live.profile=null; return; }
  live.profile=data?.[0] || null;
}

async function fetchCitizens(){
  const {data,error,count}=await db
    .from('profiles')
    .select('citizen_no,display_name,country,avatar_url,role,is_founder,joined_at',{count:'exact'})
    .order('citizen_no',{ascending:true})
    .limit(500);
  if(error){ console.error('Citizen directory failed',error); return; }
  live.citizens=data || [];
  live.population=count ?? live.citizens.length;
}

function updatePopulation(){
  const sidebar=document.querySelector('#sidebarPopulation');
  if(sidebar) sidebar.textContent=live.population.toLocaleString();
  const home=document.querySelector('#homePopulation');
  if(home) home.textContent=live.population.toLocaleString();
}

function setupTopbar(){
  const actions=document.querySelector('.topbar-actions');
  const account=document.querySelector('#accountBtn');
  if(!actions || !account) return;

  if(!document.querySelector('#joinTopBtn')){
    const join=document.createElement('button');
    join.id='joinTopBtn';
    join.className='join-top-btn';
    join.textContent='Become a Citizen';
    join.addEventListener('click',showAuth);
    actions.insertBefore(join,account);
  }

  const join=document.querySelector('#joinTopBtn');
  if(live.user && live.profile){
    account.textContent=(live.profile.display_name || 'C').trim().charAt(0).toUpperCase();
    account.classList.toggle('founder-avatar',!!live.profile.is_founder);
    account.title=`Citizen #${padCitizen(live.profile.citizen_no)}`;
    join.style.display='none';
  }else{
    account.textContent='?';
    account.classList.remove('founder-avatar');
    account.title='Log in or create an account';
    join.style.display='';
  }

  if(!account.dataset.authBound){
    account.dataset.authBound='1';
    account.addEventListener('click',e=>{
      e.preventDefault();
      e.stopPropagation();
      live.user ? showAccount() : showAuth();
    });
  }
}

function enhanceHome(){
  if(document.querySelector('#sectionTitle')?.textContent !== 'Home') return;
  updatePopulation();

  const welcome=document.querySelector('#citizenWelcome');
  if(welcome){
    welcome.textContent=live.profile
      ? `Welcome, Citizen #${padCitizen(live.profile.citizen_no)}`
      : 'Welcome to Project Orbit';
  }

  const stack=document.querySelector('.home-grid > .stack');
  if(!stack) return;
  document.querySelector('#authJoinCard')?.remove();

  if(!live.user){
    const card=document.createElement('div');
    card.id='authJoinCard';
    card.className='card auth-join-card';
    card.innerHTML=`
      <span class="eyebrow">REAL CITIZENSHIP IS LIVE</span>
      <h3>Become a founding citizen</h3>
      <p class="muted">Create a real Project Orbit account and receive a permanent citizen number stored in the national citizen registry.</p>
      <button class="btn primary" id="homeJoinBtn">Create citizen account</button>`;
    stack.children[1]?.before(card);
    card.querySelector('#homeJoinBtn').addEventListener('click',showAuth);
  }else if(live.profile){
    const card=document.createElement('div');
    card.id='authJoinCard';
    card.className='card auth-join-card';
    card.innerHTML=`
      <span class="live-badge">LIVE CITIZEN ACCOUNT</span>
      <h3>${safe(live.profile.display_name)}</h3>
      <p class="muted">Citizen #${padCitizen(live.profile.citizen_no)} · ${safe(live.profile.role)}</p>
      <button class="btn secondary" id="homeAccountBtn">View my account</button>`;
    stack.children[1]?.before(card);
    card.querySelector('#homeAccountBtn').addEventListener('click',showAccount);
  }
}

function enhanceCitizens(){
  if(document.querySelector('#sectionTitle')?.textContent !== 'Citizens') return;
  const metrics=document.querySelectorAll('.metric strong');
  if(metrics[0]) metrics[0].textContent=live.population.toLocaleString();
  if(metrics[1]) metrics[1].textContent=new Set(live.citizens.map(x=>x.country).filter(Boolean)).size || '—';
  if(metrics[2]) {
    const today=new Date().toISOString().slice(0,10);
    metrics[2].textContent=live.citizens.filter(x=>String(x.joined_at).slice(0,10)===today).length;
  }

  const oldInput=document.querySelector('#citizenSearch');
  const list=document.querySelector('#citizenList');
  if(!oldInput || !list) return;

  const input=oldInput.cloneNode(true);
  oldInput.replaceWith(input);

  const draw=(q='')=>{
    const term=q.trim().toLowerCase();
    const rows=live.citizens.filter(c=>{
      const hay=`${c.citizen_no} ${c.display_name||''} ${c.role||''} ${c.country||''}`.toLowerCase();
      return hay.includes(term);
    });
    list.innerHTML=rows.map((c,i)=>`
      <div class="citizen-row">
        <div class="identity">
          <span class="rank">${i+1}</span>
          <span class="country-text">${c.is_founder?'✦':'◎'}</span>
          <div class="identity-meta">
            <strong>${safe(c.display_name)}${c.is_founder?' ✓':''}</strong>
            <small>${safe(c.role)}${c.country?` · ${safe(c.country)}`:''}</small>
          </div>
        </div>
        <span class="citizen-number">#${padCitizen(c.citizen_no)}</span>
      </div>`).join('') || '<p class="muted">No citizens found.</p>';
  };
  draw();
  input.addEventListener('input',e=>draw(e.target.value));
}

function enhanceCurrentView(){
  updatePopulation();
  setupTopbar();
  enhanceHome();
  enhanceCitizens();
}

function modalShell(inner){
  const old=document.querySelector('#orbitAuthModal');
  if(old) old.remove();
  const wrap=document.createElement('div');
  wrap.id='orbitAuthModal';
  wrap.className='auth-modal-backdrop';
  wrap.innerHTML=`<div class="auth-modal">${inner}</div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click',e=>{ if(e.target===wrap) wrap.remove(); });
  wrap.querySelector('[data-close-auth]')?.addEventListener('click',()=>wrap.remove());
  return wrap;
}

function showAuth(mode='signup'){
  const wrap=modalShell(`
    <div class="auth-modal-head">
      <div><span class="eyebrow">PROJECT ORBIT CITIZENSHIP</span><h2>Join the nation</h2></div>
      <button class="icon-btn" data-close-auth aria-label="Close">×</button>
    </div>
    <div class="auth-tabs">
      <button class="auth-tab ${mode==='signup'?'active':''}" data-auth-mode="signup">Create account</button>
      <button class="auth-tab ${mode==='login'?'active':''}" data-auth-mode="login">Log in</button>
    </div>
    <form class="auth-form" id="orbitAuthForm">
      <label id="displayNameWrap" ${mode==='login'?'hidden':''}>Display name
        <input class="auth-input" id="authDisplayName" maxlength="80" autocomplete="name" placeholder="Your citizen name" />
      </label>
      <label>Email
        <input class="auth-input" id="authEmail" type="email" autocomplete="email" required placeholder="you@example.com" />
      </label>
      <label>Password
        <input class="auth-input" id="authPassword" type="password" minlength="8" autocomplete="${mode==='signup'?'new-password':'current-password'}" required placeholder="At least 8 characters" />
      </label>
      <p class="auth-message" id="authMessage"></p>
      <button class="btn primary full" id="authSubmit" type="submit">${mode==='signup'?'Create citizen account':'Log in'}</button>
    </form>
  `);

  let currentMode=mode;
  const tabs=wrap.querySelectorAll('[data-auth-mode]');
  const nameWrap=wrap.querySelector('#displayNameWrap');
  const submit=wrap.querySelector('#authSubmit');
  const message=wrap.querySelector('#authMessage');

  function setMode(next){
    currentMode=next;
    tabs.forEach(t=>t.classList.toggle('active',t.dataset.authMode===next));
    nameWrap.hidden=next==='login';
    submit.textContent=next==='signup'?'Create citizen account':'Log in';
    message.textContent='';
    message.className='auth-message';
  }
  tabs.forEach(t=>t.addEventListener('click',()=>setMode(t.dataset.authMode)));

  wrap.querySelector('#orbitAuthForm').addEventListener('submit',async e=>{
    e.preventDefault();
    submit.disabled=true;
    const email=wrap.querySelector('#authEmail').value.trim();
    const password=wrap.querySelector('#authPassword').value;
    const displayName=wrap.querySelector('#authDisplayName').value.trim();
    message.className='auth-message';
    message.textContent=currentMode==='signup'?'Creating citizenship...':'Logging in...';

    let result;
    if(currentMode==='signup'){
      if(!displayName){
        message.className='auth-message error';
        message.textContent='Enter the display name you want shown in the citizen registry.';
        submit.disabled=false;
        return;
      }
      result=await db.auth.signUp({
        email,
        password,
        options:{
          data:{display_name:displayName},
          emailRedirectTo:`${location.origin}${location.pathname}`
        }
      });
    }else{
      result=await db.auth.signInWithPassword({email,password});
    }

    if(result.error){
      message.className='auth-message error';
      message.textContent=result.error.message;
      submit.disabled=false;
      return;
    }

    if(currentMode==='signup' && !result.data.session){
      message.className='auth-message success';
      message.textContent='Account created. Check your email and tap the confirmation link to activate your citizenship.';
      submit.disabled=false;
      return;
    }

    message.className='auth-message success';
    message.textContent=currentMode==='signup'?'Citizen account created.':'Logged in successfully.';
    await refreshLiveState();
    setTimeout(()=>wrap.remove(),650);
  });
}

function showAccount(){
  if(!live.user){ showAuth('login'); return; }
  const p=live.profile;
  const wrap=modalShell(`
    <div class="auth-modal-head">
      <div><span class="eyebrow">MY CITIZENSHIP</span><h2>${safe(p?.display_name || 'Citizen')}</h2></div>
      <button class="icon-btn" data-close-auth aria-label="Close">×</button>
    </div>
    <div class="account-card">
      <span class="live-badge">AUTHENTICATED</span>
      <div class="account-number">#${padCitizen(p?.citizen_no)}</div>
      <p>${safe(p?.role || 'Citizen')}</p>
      <p class="muted account-email">${safe(live.user.email || '')}</p>
      <button class="btn secondary full" id="signOutBtn">Sign out</button>
    </div>`);
  wrap.querySelector('#signOutBtn').addEventListener('click',async()=>{
    await db.auth.signOut();
    wrap.remove();
  });
}

async function refreshLiveState(){
  const {data:{session}}=await db.auth.getSession();
  live.user=session?.user || null;
  await Promise.all([fetchProfile(),fetchCitizens()]);
  enhanceCurrentView();
}

injectStyles();

const observer=new MutationObserver(()=>{
  clearTimeout(observer._t);
  observer._t=setTimeout(enhanceCurrentView,20);
});
observer.observe(document.querySelector('#view'),{childList:true,subtree:true});

db.auth.onAuthStateChange(async (_event,session)=>{
  live.user=session?.user || null;
  await Promise.all([fetchProfile(),fetchCitizens()]);
  enhanceCurrentView();
});

await refreshLiveState();
