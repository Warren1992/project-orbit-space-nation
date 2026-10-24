const waitForStaraliaDbV190 = async () => {
  for (let i = 0; i < 120; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error('Staralia database client did not initialize.');
};

const dbV190 = await waitForStaraliaDbV190();
const fed = {
  user:null, profile:null, citizens:[], actions:[], bills:[], senators:[], representatives:[],
  justices:[], nominations:[], nominationVotes:[], nominationTallies:[],
  cases:[], caseVotes:[]
};

const esc190 = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'
}[c]));
const pad190 = n => String(n ?? '').padStart(6,'0');
const pretty190 = iso => iso ? new Date(iso).toLocaleString(undefined,{year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : '—';
const citizen190 = n => fed.citizens.find(c=>Number(c.citizen_no)===Number(n));
const safeUrl190 = value => {
  if(!value) return '';
  try { const u=new URL(String(value),location.origin); return ['http:','https:'].includes(u.protocol)?u.href:''; }
  catch { return ''; }
};
function toast190(message){const el=document.querySelector('#toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400);}
function avatar190(c, cls=''){
  const url=safeUrl190(c?.avatar_url), initial=esc190((c?.display_name||'C').trim().charAt(0).toUpperCase());
  return url?`<span class="avatar avatar-live ${c?.is_founder?'founder-avatar':''} ${cls}"><img src="${esc190(url)}" alt="${esc190(c?.display_name||'Citizen')} avatar" /></span>`:`<span class="avatar ${c?.is_founder?'founder-avatar':''} ${cls}">${initial}</span>`;
}

function injectFederalStyles(){
  if(document.querySelector('#staraliaFederalV190Styles'))return;
  const style=document.createElement('style');style.id='staraliaFederalV190Styles';style.textContent=`
    .federal-root{display:grid;gap:18px}.federal-hero{border-color:rgba(244,185,66,.25)!important;background:linear-gradient(145deg,rgba(244,185,66,.07),rgba(6,16,30,.97))!important}
    .federal-hero h2,.court-hero h2{font-size:31px;margin:7px 0 10px}.branch-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}
    .branch-card{border:1px solid rgba(255,255,255,.09);border-radius:18px;padding:18px;background:rgba(255,255,255,.025);text-align:left;color:white;cursor:pointer}
    .branch-card .branch-icon{font-size:30px;display:block;margin-bottom:10px}.branch-card strong{display:block;font-size:18px}.branch-card small{display:block;color:#8798ad;margin-top:6px;line-height:1.45}
    .branch-card.active{border-color:rgba(244,185,66,.38);background:rgba(244,185,66,.07)}
    .federal-process{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;align-items:stretch}.federal-step{padding:12px;border:1px solid rgba(255,255,255,.08);border-radius:14px;text-align:center;background:rgba(255,255,255,.025)}.federal-step strong{display:block;color:#ffd978}.federal-step small{display:block;color:#8193aa;margin-top:5px}
    .executive-bill{border:1px solid rgba(244,185,66,.18);border-radius:16px;padding:15px;margin-top:12px}.executive-bill h4{margin:5px 0}.executive-bill-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    .federal-stat-row{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.federal-stat{text-align:center}.federal-stat strong{font-size:31px;display:block}.federal-stat span{color:#8798ad}
    .executive-action-card{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:15px;margin-top:10px}.executive-action-id{font-size:11px;font-weight:950;letter-spacing:.09em;color:#ffd978}.executive-action-body{white-space:pre-wrap;color:#c0cede;line-height:1.6}.executive-action-meta{font-size:12px;color:#8193aa;margin-top:9px;display:flex;gap:8px;flex-wrap:wrap}
    .court-seat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.court-seat{padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025)}.court-seat.empty{opacity:.7}.court-seat strong{display:block}.court-seat small{display:block;color:#8193aa;margin-top:4px}
    .nomination-card,.case-card{border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:16px;margin-top:12px}.nomination-votes,.case-votes{display:flex;gap:10px;flex-wrap:wrap;margin-top:10px}.nomination-votes span,.case-votes span{color:#9eb0c4}.case-question{padding:12px;border-left:3px solid rgba(159,92,246,.55);background:rgba(159,92,246,.05);border-radius:0 10px 10px 0;color:#cbd6e4}.federal-note{font-size:12px;color:#7f91a7;line-height:1.55}
    .federal-form{display:grid;gap:12px}.federal-form label{display:grid;gap:6px;color:#b9c5d4;font-size:13px;font-weight:800}.federal-form input,.federal-form textarea,.federal-form select{width:100%;border:1px solid rgba(255,255,255,.11);background:#07111f;color:white;border-radius:12px;padding:12px}.federal-form textarea{min-height:130px;resize:vertical}
    #accountBtn.staralia-account-photo-v190{overflow:hidden!important;padding:0!important;color:transparent!important;background-position:center!important;background-size:cover!important;background-repeat:no-repeat!important}
    @media(max-width:760px){.branch-grid,.federal-stat-row,.court-seat-grid{grid-template-columns:1fr}.federal-process{grid-template-columns:1fr}.federal-hero h2,.court-hero h2{font-size:27px}}
  `;document.head.appendChild(style);
}

async function loadIdentity190(){
  const {data:{session}}=await dbV190.auth.getSession();fed.user=session?.user||null;fed.profile=null;
  if(fed.user){const {data}=await dbV190.rpc('my_profile');fed.profile=data?.[0]||null;}
}
async function loadFederal190(){
  if(!fed.user){fed.citizens=[];fed.actions=[];fed.bills=[];fed.senators=[];fed.representatives=[];fed.justices=[];fed.nominations=[];fed.nominationVotes=[];fed.nominationTallies=[];fed.cases=[];fed.caseVotes=[];return;}
  const [citizens,actions,bills,senators,representatives,justices,noms,nomVotes,nomTallies,cases,caseVotes]=await Promise.all([
    dbV190.from('profiles').select('citizen_no,display_name,country,avatar_url,bio,role,is_founder,joined_at').order('citizen_no'),
    dbV190.from('executive_actions').select('id,action_type,action_number,title,body,signed_by_citizen_no,signed_at,status,revoked_at').order('signed_at',{ascending:false}),
    dbV190.from('bills').select('id,title,summary,status,sponsor_citizen_no,origin_chamber,senate_result,house_result,senate_passed_at,house_passed_at,presented_to_executive_at,executive_action,executive_action_at,law_number,override_closes_at,override_result,created_at').order('created_at',{ascending:false}),
    dbV190.from('senate_members').select('citizen_no,seat_no,title,voting_member,active,joined_at').order('seat_no'),
    dbV190.from('house_members').select('citizen_no,seat_no,title,voting_member,active,joined_at').order('seat_no'),
    dbV190.from('supreme_court_justices').select('seat_no,citizen_no,title,active,confirmed_at,created_at').order('seat_no'),
    dbV190.from('judicial_nominations').select('id,citizen_no,seat_no,office_title,status,nominated_by_citizen_no,opens_at,closes_at,decided_at,created_at').order('created_at',{ascending:false}),
    dbV190.from('judicial_nomination_votes').select('nomination_id,citizen_no,vote,created_at'),
    dbV190.from('judicial_nomination_tallies').select('nomination_id,yes_count,no_count'),
    dbV190.from('judicial_cases').select('id,filer_citizen_no,title,constitutional_question,details,challenged_kind,challenged_reference,status,decision_result,decision_summary,decided_at,created_at').order('created_at',{ascending:false}),
    dbV190.from('judicial_case_votes').select('case_id,citizen_no,vote,opinion_text,created_at')
  ]);
  fed.citizens=citizens.data||[];fed.actions=actions.data||[];fed.bills=bills.data||[];fed.senators=senators.data||[];fed.representatives=representatives.data||[];fed.justices=justices.data||[];fed.nominations=noms.data||[];fed.nominationVotes=nomVotes.data||[];fed.nominationTallies=nomTallies.data||[];fed.cases=cases.data||[];fed.caseVotes=caseVotes.data||[];
}
const isSenator190=()=>!!fed.profile&&fed.senators.some(s=>Number(s.citizen_no)===Number(fed.profile.citizen_no)&&s.active&&s.voting_member);
const isJustice190=()=>!!fed.profile&&fed.justices.some(j=>Number(j.citizen_no)===Number(fed.profile.citizen_no)&&j.active);

function syncAccountPhoto190(){
  const btn=document.querySelector('#accountBtn');if(!btn||!fed.user||!fed.profile)return;
  const url=safeUrl190(fed.profile.avatar_url);
  if(url){btn.classList.add('staralia-account-photo-v190');btn.style.backgroundImage=`url("${url.replaceAll('"','%22')}")`;btn.textContent='';}
  else{btn.classList.remove('staralia-account-photo-v190');btn.style.backgroundImage='';btn.textContent=(fed.profile.display_name||'C').trim().charAt(0).toUpperCase();}
  btn.title=`View my profile · Citizen #${pad190(fed.profile.citizen_no)}`;
}

function actionLabel190(a){return a.action_type==='executive_order'?`EO-${String(a.action_number).padStart(3,'0')}`:`P-${String(a.action_number).padStart(3,'0')}`;}
function billStatusText190(b){const map={open_senate:'Senate vote',open_house:'House vote',awaiting_signature:'Awaiting President',law:'Law',vetoed:'Presidential veto — override open',veto_sustained:'Veto sustained',rejected:'Rejected',tied:'Tied',closed:'Closed'};return map[b.status]||String(b.status||'').replaceAll('_',' ');}

function executiveActionsHtml190(){
  const founder=!!fed.profile?.is_founder;
  const archive=fed.actions.length?fed.actions.slice(0,12).map(a=>`<article class="executive-action-card"><div class="section-row"><span class="executive-action-id">${actionLabel190(a)} · ${esc190(a.action_type==='executive_order'?'EXECUTIVE ORDER':'PROCLAMATION')}</span><span class="pill ${a.status==='revoked'?'status-revoked':'green'}">${esc190(a.status.toUpperCase())}</span></div><h3>${esc190(a.title)}</h3><div class="executive-action-body">${esc190(a.body)}</div><div class="executive-action-meta"><span>${pretty190(a.signed_at)}</span>${a.revoked_at?`<span>Revoked ${pretty190(a.revoked_at)}</span>`:''}</div>${founder&&a.status!=='revoked'?`<button class="btn danger" style="margin-top:10px" data-revoke-action="${a.id}">Revoke</button>`:''}</article>`).join(''):'<p class="muted">No Executive Orders or Proclamations have been signed yet.</p>';
  return `${founder?`<section class="card"><span class="eyebrow">PRESIDENTIAL AUTHORITY</span><h3>Issue Executive Order or Proclamation</h3><form class="federal-form" id="executiveActionForm190"><label>Type<select id="execType190"><option value="executive_order">Executive Order</option><option value="proclamation">Proclamation</option></select></label><label>Title<input id="execTitle190" maxlength="200" required /></label><label>Official text<textarea id="execBody190" maxlength="12000" required></textarea></label><p class="federal-note">Presidential executive actions cannot override enacted law or a controlling Supreme Court decision within Staralia.</p><button class="btn primary" type="submit">Sign Presidential action</button></form></section>`:''}<section class="card"><div class="section-row"><h3>Executive Actions</h3><span class="pill blue">${fed.actions.length} RECORD${fed.actions.length===1?'':'S'}</span></div>${archive}</section>`;
}

function renderGovernment190(){
  const view=document.querySelector('#view');if(!view)return;
  const activeSenators=fed.senators.filter(s=>s.active).length;
  const activeRepresentatives=fed.representatives.filter(r=>r.active).length;
  const activeJustices=fed.justices.filter(j=>j.active).length;
  const awaiting=fed.bills.filter(b=>b.status==='awaiting_signature');
  const laws=fed.bills.filter(b=>b.status==='law');
  const billCards=awaiting.length?awaiting.map(b=>`<div class="executive-bill"><span class="eyebrow">PASSED BY BOTH CHAMBERS</span><h4>${esc190(b.title)}</h4><p class="muted">${esc190(b.summary)}</p><small>House: ${esc190((b.house_result||'passed').toUpperCase())} · Senate: ${esc190((b.senate_result||'passed').toUpperCase())}</small>${fed.profile?.is_founder?`<div class="executive-bill-actions"><button class="btn primary" data-exec-bill="${b.id}:sign">Sign into law</button><button class="btn danger" data-exec-bill="${b.id}:veto">Veto</button></div>`:'<div class="federal-note" style="margin-top:8px">Awaiting action by the President of Staralia.</div>'}</div>`).join(''):'<p class="muted">No bills passed by both chambers are currently awaiting Presidential action.</p>';
  view.innerHTML=`<div class="federal-root executive-actions-v180-root">
    <section class="card federal-hero"><span class="eyebrow">FEDERAL GOVERNMENT</span><h2>Three Branches of Staralia</h2><p class="muted">Federal power is divided among separate Legislative, Executive, and Judicial branches. Congress itself is bicameral.</p></section>
    <div class="branch-grid">
      <button class="branch-card" data-route="senate"><span class="branch-icon">🏛</span><strong>Legislative Branch</strong><small>Congress · 100 Representatives + 100 Senators</small></button>
      <button class="branch-card active" data-route="government"><span class="branch-icon">✦</span><strong>Executive Branch</strong><small>President of Staralia · signs or vetoes Congress-passed bills</small></button>
      <button class="branch-card" data-route="judiciary"><span class="branch-icon">⚖</span><strong>Judicial Branch</strong><small>Supreme Court · 9 seats · constitutional review</small></button>
    </div>
    <section class="card"><h3>Checks & balances</h3><div class="federal-process">
      <div class="federal-step"><strong>1</strong><small>Bill begins in House or Senate</small></div>
      <div class="federal-step"><strong>2</strong><small>Both chambers must pass it</small></div>
      <div class="federal-step"><strong>3</strong><small>President signs or vetoes</small></div>
      <div class="federal-step"><strong>4</strong><small>2/3 of both chambers may override</small></div>
      <div class="federal-step"><strong>5</strong><small>Supreme Court may review constitutionality</small></div>
    </div></section>
    <div class="federal-stat-row"><div class="card federal-stat"><strong>${activeRepresentatives}</strong><span>Representatives / 100</span></div><div class="card federal-stat"><strong>${activeSenators}</strong><span>Senators / 100</span></div><div class="card federal-stat"><strong>${activeJustices}</strong><span>Supreme Court justices / 9</span></div></div>
    <section class="card"><span class="eyebrow">EXECUTIVE BRANCH</span><h3>Office of the President of Staralia</h3><p class="muted">Citizen #000001 serves as President and chief executive. The President is separate from Congress and holds no House or Senate vote.</p><p class="federal-note">Presidential powers include administering enacted law, signing or vetoing bills passed by both chambers, issuing Executive Orders and Proclamations within constitutional limits, and nominating Supreme Court justices subject to Senate confirmation.</p></section>
    <section class="card"><div class="section-row"><h3>Bills awaiting Presidential action</h3><span class="pill gold">${awaiting.length}</span></div>${billCards}</section>
    ${executiveActionsHtml190()}
  </div>`;
  wireGovernment190();window.scrollTo({top:0,behavior:'smooth'});
}

function wireGovernment190(){
  const view=document.querySelector('#view');
  view?.querySelectorAll('[data-exec-bill]').forEach(btn=>btn.addEventListener('click',async()=>{const [id,action]=btn.dataset.execBill.split(':');if(!confirm(`${action==='sign'?'Sign this Congress-passed bill into law':'Veto this Congress-passed bill'}?`))return;btn.disabled=true;const {data,error}=await dbV190.rpc('president_act_on_bill',{p_bill_id:Number(id),p_action:action});if(error)toast190(error.message);else toast190(String(data).replaceAll('_',' '));await loadFederal190();renderGovernment190();}));
  view?.querySelector('#executiveActionForm190')?.addEventListener('submit',async e=>{e.preventDefault();const form=e.currentTarget,button=form.querySelector('button[type="submit"]');const action_type=form.querySelector('#execType190').value,title=form.querySelector('#execTitle190').value.trim(),body=form.querySelector('#execBody190').value.trim();if(!title||body.length<10)return;if(!confirm('Sign this as an official Staralia executive record?'))return;button.disabled=true;const {error}=await dbV190.from('executive_actions').insert({action_type,title,body});if(error){toast190(error.message);button.disabled=false;return;}await loadFederal190();renderGovernment190();toast190('Executive action signed.');});
  view?.querySelectorAll('[data-revoke-action]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('Revoke this executive action? The historical record will remain.'))return;btn.disabled=true;const {error}=await dbV190.from('executive_actions').update({status:'revoked'}).eq('id',Number(btn.dataset.revokeAction));if(error)toast190(error.message);await loadFederal190();renderGovernment190();}));
}

function nominationCard190(n){
  const person=citizen190(n.citizen_no)||{display_name:'Citizen'};const tally=fed.nominationTallies.find(t=>Number(t.nomination_id)===Number(n.id))||{yes_count:0,no_count:0};const myVote=fed.profile&&fed.nominationVotes.find(v=>Number(v.nomination_id)===Number(n.id)&&Number(v.citizen_no)===Number(fed.profile.citizen_no));const open=n.status==='pending'&&Date.now()<new Date(n.closes_at).getTime();
  return `<div class="nomination-card"><div class="section-row"><div><span class="eyebrow">SEAT ${n.seat_no} · ${esc190(n.office_title)}</span><h3 style="margin:6px 0">${esc190(person.display_name)}</h3></div><span class="pill ${n.status==='confirmed'?'green':n.status==='pending'?'gold':'blue'}">${esc190(n.status.toUpperCase())}</span></div><p class="muted">Citizen #${pad190(n.citizen_no)} · confirmation closes ${pretty190(n.closes_at)}</p><div class="nomination-votes"><span>YES ${Number(tally.yes_count||0)}</span><span>NO ${Number(tally.no_count||0)}</span></div>${isSenator190()&&open&&!myVote?`<div class="executive-bill-actions"><button class="btn primary" data-confirm-vote="${n.id}:yes">Confirm</button><button class="btn danger" data-confirm-vote="${n.id}:no">Reject</button></div>`:''}${myVote?`<div class="federal-note">Your Senate confirmation vote: ${esc190(myVote.vote.toUpperCase())}</div>`:''}</div>`;
}
function caseCard190(c){
  const filer=citizen190(c.filer_citizen_no)||{display_name:'Citizen'};const votes=fed.caseVotes.filter(v=>Number(v.case_id)===Number(c.id));const myVote=fed.profile&&votes.find(v=>Number(v.citizen_no)===Number(fed.profile.citizen_no));const counts={uphold:0,strike:0,dismiss:0};votes.forEach(v=>counts[v.vote]=(counts[v.vote]||0)+1);
  return `<div class="case-card"><div class="section-row"><div><span class="eyebrow">CASE C-${String(c.id).padStart(3,'0')}</span><h3 style="margin:6px 0">${esc190(c.title)}</h3></div><span class="pill ${c.status==='decided'?'green':c.status==='dismissed'?'blue':'gold'}">${esc190(c.status.toUpperCase())}</span></div><p class="case-question">${esc190(c.constitutional_question)}</p><p class="muted">Filed by ${esc190(filer.display_name)} · #${pad190(c.filer_citizen_no)} · challenges ${esc190(String(c.challenged_kind).replaceAll('_',' '))}${c.challenged_reference?` · ${esc190(c.challenged_reference)}`:''}</p>${c.details?`<details><summary>Case details</summary><p style="white-space:pre-wrap;line-height:1.6">${esc190(c.details)}</p></details>`:''}<div class="case-votes"><span>UPHOLD ${counts.uphold}</span><span>STRIKE ${counts.strike}</span><span>DISMISS ${counts.dismiss}</span></div>${c.decision_result?`<div class="live-vote-status"><strong>Decision: ${esc190(c.decision_result.toUpperCase())}</strong><br>${esc190(c.decision_summary||'')}</div>`:''}${isJustice190()&&c.status==='filed'&&!myVote?`<form class="federal-form" data-case-vote-form="${c.id}" style="margin-top:12px"><label>Your judicial vote<select data-case-vote><option value="uphold">Uphold challenged action</option><option value="strike">Find unconstitutional</option><option value="dismiss">Dismiss case</option></select></label><label>Opinion / reasoning (optional)<textarea data-case-opinion maxlength="10000"></textarea></label><button class="btn primary" type="submit">Cast judicial vote</button></form>`:''}${myVote?`<div class="federal-note">Your judicial vote: ${esc190(myVote.vote.toUpperCase())}</div>`:''}${isJustice190()&&c.status==='filed'?`<button class="btn secondary" style="margin-top:10px" data-finalize-case="${c.id}">Attempt to issue Court decision</button>`:''}</div>`;
}

function renderJudiciary190(){
  const view=document.querySelector('#view');if(!view)return;
  const active=fed.justices.filter(j=>j.active);const pending=fed.nominations.filter(n=>n.status==='pending');
  const seats=Array.from({length:9},(_,i)=>i+1).map(seat=>{const j=active.find(x=>Number(x.seat_no)===seat);if(!j)return `<div class="court-seat empty"><strong>Seat ${seat}</strong><small>${seat===1?'Chief Justice':'Associate Justice'} · VACANT</small></div>`;const p=citizen190(j.citizen_no)||{display_name:'Citizen'};return `<div class="court-seat"><div style="display:flex;gap:9px;align-items:center">${avatar190(p)}<div><strong>${esc190(p.display_name)}</strong><small>Seat ${seat} · ${esc190(j.title)}</small></div></div><small>Confirmed ${pretty190(j.confirmed_at)}</small></div>`;}).join('');
  const founderForm=fed.profile?.is_founder?`<section class="card"><span class="eyebrow">PRESIDENTIAL NOMINATION</span><h3>Nominate a Supreme Court Justice</h3><p class="muted">A nomination does not seat the justice. The Senate must confirm the nominee by majority vote.</p><form class="federal-form" id="justiceNominationForm190"><label>Citizen<select id="justiceCitizen190">${fed.citizens.filter(c=>!c.is_founder).map(c=>`<option value="${c.citizen_no}">${esc190(c.display_name)} · #${pad190(c.citizen_no)}</option>`).join('')}</select></label><label>Supreme Court seat<select id="justiceSeat190">${Array.from({length:9},(_,i)=>i+1).map(n=>`<option value="${n}">Seat ${n} · ${n===1?'Chief Justice':'Associate Justice'}</option>`).join('')}</select></label><label>Confirmation period (days)<input id="justiceDays190" type="number" min="1" max="30" value="7" required /></label><button class="btn primary" type="submit">Send nomination to Senate</button></form></section>`:'';
  view.innerHTML=`<div class="federal-root court-root"><section class="card court-hero federal-hero"><span class="eyebrow">JUDICIAL BRANCH</span><h2>Supreme Court of Staralia</h2><p class="muted">Nine seats: one Chief Justice and eight Associate Justices. The Court interprets Staralia’s Constitution and adjudicates constitutional disputes within the digital nation.</p><p class="federal-note">Staralia Court decisions govern only Staralia’s internal platform and civic system; they are not judgments of a real-world court.</p></section><div class="branch-grid"><button class="branch-card" data-route="senate"><span class="branch-icon">🏛</span><strong>Legislative</strong><small>100 Representatives + 100 Senators</small></button><button class="branch-card" data-route="government"><span class="branch-icon">✦</span><strong>Executive</strong><small>President of Staralia</small></button><button class="branch-card active" data-route="judiciary"><span class="branch-icon">⚖</span><strong>Judicial</strong><small>9-seat Supreme Court</small></button></div><section class="card"><div class="section-row"><h3>The Court</h3><span class="pill blue">${active.length} / 9 SEATED</span></div><div class="court-seat-grid">${seats}</div></section>${founderForm}<section class="card"><div class="section-row"><h3>Judicial nominations</h3><span class="pill gold">${pending.length} PENDING</span></div>${fed.nominations.length?fed.nominations.map(nominationCard190).join(''):'<p class="muted">No Supreme Court nominations yet.</p>'}</section><section class="card"><span class="eyebrow">ACCESS TO THE COURT</span><h3>File a constitutional-review case</h3><p class="muted">Any citizen may ask the Supreme Court to review a Staralia law, Executive action, or other Staralia government action.</p><form class="federal-form" id="fileCaseForm190"><label>Case title<input id="caseTitle190" maxlength="250" required /></label><label>What constitutional question should the Court decide?<textarea id="caseQuestion190" maxlength="1500" required></textarea></label><label>Challenged action<select id="caseKind190"><option value="law">Staralia law</option><option value="executive_action">Executive Order / action</option><option value="government_action">Other government action</option><option value="other">Other</option></select></label><label>Reference (optional)<input id="caseRef190" maxlength="200" placeholder="Example: S.L. 001 or EO-001" /></label><label>Facts / argument (optional)<textarea id="caseDetails190" maxlength="10000"></textarea></label><button class="btn primary" type="submit">File case</button></form></section><section class="card"><div class="section-row"><h3>Supreme Court docket</h3><span class="pill blue">${fed.cases.length} CASE${fed.cases.length===1?'':'S'}</span></div>${fed.cases.length?fed.cases.map(caseCard190).join(''):'<p class="muted">No constitutional cases have been filed yet.</p>'}</section></div>`;
  wireJudiciary190();window.scrollTo({top:0,behavior:'smooth'});
}

function wireJudiciary190(){
  const view=document.querySelector('#view');
  view?.querySelector('#justiceNominationForm190')?.addEventListener('submit',async e=>{e.preventDefault();const days=Math.max(1,Math.min(30,Number(view.querySelector('#justiceDays190').value)||7));const button=e.currentTarget.querySelector('button');button.disabled=true;const {error}=await dbV190.rpc('president_nominate_justice',{p_citizen_no:Number(view.querySelector('#justiceCitizen190').value),p_seat_no:Number(view.querySelector('#justiceSeat190').value),p_closes_at:new Date(Date.now()+days*86400000).toISOString()});if(error){toast190(error.message);button.disabled=false;return;}await loadFederal190();renderJudiciary190();toast190('Supreme Court nomination sent to the Senate.');});
  view?.querySelectorAll('[data-confirm-vote]').forEach(btn=>btn.addEventListener('click',async()=>{const [id,vote]=btn.dataset.confirmVote.split(':');if(!confirm(`Cast your final Senate confirmation vote: ${vote.toUpperCase()}?`))return;const {error}=await dbV190.from('judicial_nomination_votes').insert({nomination_id:Number(id),vote});if(error)toast190(error.message);else toast190('Confirmation vote recorded.');await loadFederal190();renderJudiciary190();}));
  view?.querySelector('#fileCaseForm190')?.addEventListener('submit',async e=>{e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;const payload={title:view.querySelector('#caseTitle190').value.trim(),constitutional_question:view.querySelector('#caseQuestion190').value.trim(),details:view.querySelector('#caseDetails190').value.trim()||null,challenged_kind:view.querySelector('#caseKind190').value,challenged_reference:view.querySelector('#caseRef190').value.trim()||null};const {error}=await dbV190.from('judicial_cases').insert(payload);if(error){toast190(error.message);button.disabled=false;return;}await loadFederal190();renderJudiciary190();toast190('Constitutional case filed with the Supreme Court.');});
  view?.querySelectorAll('[data-case-vote-form]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;const {error}=await dbV190.from('judicial_case_votes').insert({case_id:Number(form.dataset.caseVoteForm),vote:form.querySelector('[data-case-vote]').value,opinion_text:form.querySelector('[data-case-opinion]').value.trim()||null});if(error){toast190(error.message);button.disabled=false;return;}await loadFederal190();renderJudiciary190();toast190('Judicial vote recorded.');}));
  view?.querySelectorAll('[data-finalize-case]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('Attempt to issue the Supreme Court decision? A majority of active justices must have voted.'))return;btn.disabled=true;const {data,error}=await dbV190.rpc('supreme_court_finalize_case',{p_case_id:Number(btn.dataset.finalizeCase)});if(error)toast190(error.message);else toast190(`Court decision: ${String(data).toUpperCase()}`);await loadFederal190();renderJudiciary190();}));
}

function ensureMoreFederalTiles190(){
  if(document.querySelector('#sectionTitle')?.textContent!=='More')return;const grid=document.querySelector('#view .more-grid');if(!grid)return;
  if(!grid.querySelector('[data-route="judiciary"]')){const b=document.createElement('button');b.className='more-tile';b.dataset.route='judiciary';b.innerHTML='<span>⚖</span><strong>Supreme Court</strong><small>Judicial branch and constitutional docket</small>';grid.appendChild(b);}
  if(!grid.querySelector('[data-staralia-terms-tile]')){const b=document.createElement('button');b.className='more-tile';b.dataset.staraliaTermsTile='1';b.innerHTML='<span>§</span><strong>User Agreement</strong><small>Terms of Use and 18+ account rules</small>';b.addEventListener('click',()=>window.staraliaOpenTerms?.());grid.appendChild(b);}
}

async function syncFederal190(force=false){
  syncAccountPhoto190();ensureMoreFederalTiles190();
  const title=document.querySelector('#sectionTitle')?.textContent||'';
  if(title==='Government'&&(force||!document.querySelector('#view .federal-root')))renderGovernment190();
  if(title==='Supreme Court'&&(force||!document.querySelector('#view .court-root')))renderJudiciary190();
}

injectFederalStyles();await loadIdentity190();await loadFederal190();syncAccountPhoto190();await syncFederal190(true);
let federalTimer=null;const federalObserver=new MutationObserver(()=>{clearTimeout(federalTimer);federalTimer=setTimeout(()=>syncFederal190(false),45);});const federalView=document.querySelector('#view');if(federalView)federalObserver.observe(federalView,{childList:true,subtree:false});

dbV190.auth.onAuthStateChange(async(_event,session)=>{fed.user=session?.user||null;await loadIdentity190();await loadFederal190();await syncFederal190(true);});
let federalRefreshTimer=null;const scheduleFederalRefresh=()=>{clearTimeout(federalRefreshTimer);federalRefreshTimer=setTimeout(async()=>{await loadFederal190();await syncFederal190(true);},180);};
dbV190.channel('staralia-federal-v190')
  .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'senate_members'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'house_members'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'bills'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'executive_actions'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'supreme_court_justices'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'judicial_nominations'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'judicial_nomination_votes'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'judicial_cases'},scheduleFederalRefresh)
  .on('postgres_changes',{event:'*',schema:'public',table:'judicial_case_votes'},scheduleFederalRefresh)
  .subscribe();
