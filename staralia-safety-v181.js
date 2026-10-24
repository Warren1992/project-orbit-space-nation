const waitForStaraliaDbV181 = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Staralia safety tools could not initialize.');
};

const dbV181 = await waitForStaraliaDbV181();
const safetyV181 = { user:null, profile:null, blocks:[], citizens:[], moreIntentUntil:0 };
const escV181 = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const padV181 = n => String(n ?? '').padStart(6,'0');

function toastV181(message){
  const el=document.querySelector('#toast');
  if(!el){ alert(message); return; }
  el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2600);
}

function injectSafetyStylesV181(){
  if(document.querySelector('#staraliaSafetyV181Styles')) return;
  const s=document.createElement('style');
  s.id='staraliaSafetyV181Styles';
  s.textContent=`
    #accountBtn.staralia-account-photo-bg{overflow:hidden!important;background-color:#111827!important;background-size:cover!important;background-position:center!important;background-repeat:no-repeat!important}
    .block-btn-v181{border-color:rgba(255,93,115,.32)!important;color:#ffb0bb!important}
    .unblock-btn-v181{border-color:rgba(123,224,184,.32)!important;color:#8ce8c4!important}
    .blocked-message-v181{border:1px solid rgba(255,93,115,.23);background:rgba(255,93,115,.07);padding:13px;border-radius:13px;color:#ffb0bb;font-size:13px;line-height:1.5}
    .blocked-list-v181{display:grid;gap:9px;margin-top:12px}.blocked-row-v181{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.025)}
    .blocked-row-v181 small{display:block;color:#8395aa;margin-top:3px}.safety-note-v181{font-size:12px;color:#8193aa;line-height:1.55}
  `;
  document.head.appendChild(s);
}

async function loadSafetyV181(){
  const {data:{session}}=await dbV181.auth.getSession();
  safetyV181.user=session?.user||null; safetyV181.profile=null; safetyV181.blocks=[]; safetyV181.citizens=[];
  if(!safetyV181.user) return;
  const [p,b,c]=await Promise.all([
    dbV181.rpc('my_profile'),
    dbV181.from('user_blocks').select('blocker_citizen_no,blocked_citizen_no,created_at').order('created_at',{ascending:false}),
    dbV181.from('profiles').select('citizen_no,display_name,avatar_url,role,country,is_founder').order('citizen_no')
  ]);
  safetyV181.profile=p.data?.[0]||null;
  safetyV181.blocks=b.data||[];
  safetyV181.citizens=c.data||[];
}

const myNoV181=()=>Number(safetyV181.profile?.citizen_no||0);
const blockedByMeV181=n=>safetyV181.blocks.some(b=>Number(b.blocked_citizen_no)===Number(n));
const citizenV181=n=>safetyV181.citizens.find(c=>Number(c.citizen_no)===Number(n));

function syncAvatarV181(){
  const btn=document.querySelector('#accountBtn'); const p=safetyV181.profile;
  if(!btn||!p) return;
  const url=String(p.avatar_url||'').trim();
  const initial=String(p.display_name||'C').trim().charAt(0).toUpperCase();
  if(btn.textContent.trim()!==initial) btn.textContent=initial;
  if(/^https?:\/\//i.test(url)){
    btn.classList.add('staralia-account-photo-bg');
    btn.style.backgroundImage=`url("${url.replace(/"/g,'%22')}")`;
    btn.style.backgroundSize='cover'; btn.style.backgroundPosition='center'; btn.style.backgroundRepeat='no-repeat';
    btn.style.color='transparent'; btn.style.fontSize='0';
  }else{
    btn.classList.remove('staralia-account-photo-bg'); btn.style.backgroundImage=''; btn.style.color=''; btn.style.fontSize='';
  }
}

function profileCitizenNoV181(){
  const root=document.querySelector('#view .profile-page'); if(!root) return 0;
  const meta=root.querySelector('.profile-meta')?.textContent||'';
  const m=meta.match(/Citizen\s*#(\d+)/i); return m?Number(m[1]):0;
}

async function setBlockedV181(targetNo, shouldBlock){
  if(!safetyV181.user||!safetyV181.profile||!targetNo||targetNo===myNoV181()) return;
  if(shouldBlock){
    const person=citizenV181(targetNo);
    if(!confirm(`Block ${person?.display_name||'this citizen'}? They will no longer be able to view your profile/posts or exchange direct messages with you.`)) return;
    const {error}=await dbV181.from('user_blocks').insert({blocked_citizen_no:Number(targetNo)});
    if(error){toastV181(error.message);return;}
    toastV181('Citizen blocked.');
  }else{
    const {error}=await dbV181.from('user_blocks').delete().eq('blocked_citizen_no',Number(targetNo));
    if(error){toastV181(error.message);return;}
    toastV181('Citizen unblocked.');
  }
  await loadSafetyV181();
  setTimeout(()=>location.reload(),250);
}

function decorateProfileBlocksV181(){
  const root=document.querySelector('#view .profile-page'); if(!root||!safetyV181.profile) return;
  const no=profileCitizenNoV181(); if(!no||no===myNoV181()) return;
  const actions=root.querySelector('.profile-actions'); if(!actions) return;
  const mine=blockedByMeV181(no);
  let b=actions.querySelector('[data-block-v181]');
  if(!b){
    b=document.createElement('button'); b.type='button'; b.dataset.blockV181=String(no);
    b.addEventListener('click',()=>setBlockedV181(no,!blockedByMeV181(no))); actions.appendChild(b);
  }
  const desiredClass=`btn secondary ${mine?'unblock-btn-v181':'block-btn-v181'}`;
  if(b.className!==desiredClass) b.className=desiredClass;
  const desiredText=mine?'Unblock':'Block'; if(b.textContent!==desiredText) b.textContent=desiredText;
  const message=actions.querySelector('[data-message-citizen]');
  if(mine && message) message.remove();
}

function decorateDmBlocksV181(){
  const head=document.querySelector('#view .dm-thread-head'); if(!head||!safetyV181.profile) return;
  const small=head.querySelector('small')?.textContent||''; const m=small.match(/Citizen\s*#(\d+)/i); if(!m) return;
  const no=Number(m[1]); if(!no||no===myNoV181()) return;
  const toolbar=document.querySelector('#view .dm-toolbar'); if(!toolbar) return;
  const mine=blockedByMeV181(no);
  if(!toolbar.querySelector('[data-block-v181]')){
    const b=document.createElement('button'); b.type='button'; b.dataset.blockV181=String(no);
    b.className=`btn secondary ${mine?'unblock-btn-v181':'block-btn-v181'}`; b.textContent=mine?'Unblock':'Block';
    b.addEventListener('click',()=>setBlockedV181(no,!mine)); toolbar.appendChild(b);
  }
  if(mine){
    const form=document.querySelector('#view #dmSendForm');
    if(form){form.replaceWith(Object.assign(document.createElement('div'),{className:'blocked-message-v181',textContent:'You blocked this citizen. Direct messaging is disabled until you unblock them.'}));}
  }
}

function removeBlockedSearchResultsV181(){
  document.querySelectorAll('#view [data-dm-citizen]').forEach(el=>{
    const no=Number(el.dataset.dmCitizen); if(blockedByMeV181(no)) el.remove();
  });
}

function openBlockedManagerV181(){
  document.querySelector('#blockedManagerV181')?.remove();
  const wrap=document.createElement('div'); wrap.id='blockedManagerV181'; wrap.className='auth-modal-backdrop';
  const rows=safetyV181.blocks.length?safetyV181.blocks.map(b=>{
    const c=citizenV181(b.blocked_citizen_no)||{};
    return `<div class="blocked-row-v181"><div><strong>${escV181(c.display_name||`Citizen #${padV181(b.blocked_citizen_no)}`)}</strong><small>Citizen #${padV181(b.blocked_citizen_no)}</small></div><button class="btn secondary unblock-btn-v181" data-unblock-v181="${b.blocked_citizen_no}">Unblock</button></div>`;
  }).join(''):'<p class="muted">You have not blocked any citizens.</p>';
  wrap.innerHTML=`<div class="auth-modal"><div class="auth-modal-head"><div><span class="eyebrow">PRIVACY & SAFETY</span><h2>Blocked citizens</h2></div><button class="icon-btn" data-close-v181>×</button></div><p class="safety-note-v181">Blocked citizens cannot view your profile/posts or exchange direct messages with you. You can unblock them here at any time.</p><div class="blocked-list-v181">${rows}</div></div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click',e=>{if(e.target===wrap||e.target.closest('[data-close-v181]'))wrap.remove();});
  wrap.querySelectorAll('[data-unblock-v181]').forEach(b=>b.addEventListener('click',()=>setBlockedV181(Number(b.dataset.unblockV181),false)));
}

function decorateMoreSafetyV181(){
  const title=document.querySelector('#sectionTitle')?.textContent||''; if(title!=='More') return;
  const grid=document.querySelector('#view .more-grid'); if(!grid||grid.querySelector('[data-blocked-manager-v181]')) return;
  const b=document.createElement('button'); b.type='button'; b.className='more-tile'; b.dataset.blockedManagerV181='1';
  b.innerHTML='<span>⊘</span><strong>Blocked Citizens</strong><small>Manage who can contact or view you</small>';
  b.addEventListener('click',openBlockedManagerV181); grid.appendChild(b);
}

const commonBlockedWordsV181=[
  'fuck','fucking','fucker','shit','bullshit','bitch','cunt','asshole','motherfucker','whore','slut'
];
const threateningPhrasesV181=[
  'kill you','shoot you','stab you','hurt you','beat you','attack you','rape you','you should die','i know where you live','i will find you'
];
function clientDmViolationV181(body){
  const clean=String(body||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const tokens=new Set(clean.split(' '));
  if(commonBlockedWordsV181.some(w=>tokens.has(w))) return true;
  if(threateningPhrasesV181.some(p=>clean.includes(p))) return true;
  return false;
}

document.addEventListener('submit',e=>{
  if(e.target?.id!=='dmSendForm') return;
  const body=e.target.querySelector('#dmBody')?.value||'';
  if(clientDmViolationV181(body)){
    e.preventDefault(); e.stopImmediatePropagation(); toastV181('Message blocked. Remove profanity, vulgar, hateful, offensive, or threatening language and try again.');
  }
},true);

function stabilizeMoreV181(){
  if(Date.now()>safetyV181.moreIntentUntil) return;
  if(location.hash!=='#more') return;
  const title=document.querySelector('#sectionTitle')?.textContent||'';
  if(title==='Settings'||title==='National Emblem'||title==='National Flag') return;
  if(title!=='More'||!document.querySelector('#view .more-grid')){
    try{ if(typeof window.setRoute==='function') window.setRoute('more'); }catch{}
  }
}

document.addEventListener('click',e=>{
  if(e.target.closest('[data-route="more"]')){
    safetyV181.moreIntentUntil=Date.now()+1200;
    [40,180,500,900].forEach(ms=>setTimeout(stabilizeMoreV181,ms));
  }
},true);

function decorateSafetyV181(){
  syncAvatarV181(); decorateProfileBlocksV181(); decorateDmBlocksV181(); removeBlockedSearchResultsV181(); decorateMoreSafetyV181();
}

injectSafetyStylesV181();
await loadSafetyV181();
decorateSafetyV181();

let observerTimerV181=null;
const viewTargetV181=document.querySelector('#view');
const obsV181=new MutationObserver(()=>{clearTimeout(observerTimerV181);observerTimerV181=setTimeout(decorateSafetyV181,35);});
if(viewTargetV181) obsV181.observe(viewTargetV181,{childList:true,subtree:true});

const topbarV181=document.querySelector('.topbar-actions');
const topObsV181=new MutationObserver(()=>{clearTimeout(topObsV181._t);topObsV181._t=setTimeout(syncAvatarV181,20);});
if(topbarV181) topObsV181.observe(topbarV181,{childList:true,subtree:true,characterData:true});

dbV181.channel('staralia-v181-safety')
  .on('postgres_changes',{event:'*',schema:'public',table:'user_blocks'},async()=>{await loadSafetyV181();decorateSafetyV181();})
  .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},async payload=>{
    const n=Number(payload.new?.citizen_no||payload.old?.citizen_no||0);
    if(n===myNoV181()){await loadSafetyV181();syncAvatarV181();}
  })
  .subscribe();

dbV181.auth.onAuthStateChange(async(_event,session)=>{
  safetyV181.user=session?.user||null; await loadSafetyV181(); decorateSafetyV181();
});
