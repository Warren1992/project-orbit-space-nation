const APP_NAME = 'Staralia';
const state = {
  route: 'home',
  population: 1247,
  founder: { name: 'Warren', title: 'Founder & Head of Nation', citizen: '000001' },
  vote: localStorage.getItem('orbit_vote') || null,
  posts: JSON.parse(localStorage.getItem('orbit_posts') || '[]')
};

const routes = [
  ['home','⌂','Home'],['citizens','◎','Citizens'],['elections','✓','Elections'],['senate','🏛','Senate'],
  ['constitution','▤','Constitution'],['treasury','◈','Treasury'],['government','⚖','Government'],['space','🚀','Space Program'],
  ['events','◫','Events'],['world','✦','World'],['profile','●','Founder Profile'],['more','☰','More']
];
const routeMeta = Object.fromEntries(routes.map(([id,icon,label])=>[id,{icon,label}]));
const mainMobile = ['home','citizens','elections','senate','more'];

const view = document.querySelector('#view');
const sectionTitle = document.querySelector('#sectionTitle');
const sectionKicker = document.querySelector('#sectionKicker');
const sideNav = document.querySelector('#sideNav');
const bottomNav = document.querySelector('#bottomNav');
const drawerLinks = document.querySelector('#drawerLinks');
const drawer = document.querySelector('#drawer');
const drawerBackdrop = document.querySelector('#drawerBackdrop');
const toast = document.querySelector('#toast');

function navButton(id, mobile=false){
  const m = routeMeta[id];
  if(mobile) return `<button class="bottom-link ${state.route===id?'active':''}" data-route="${id}"><span class="nav-icon">${m.icon}</span><span>${m.label}</span></button>`;
  return `<button class="nav-link ${state.route===id?'active':''}" data-route="${id}"><span class="nav-icon">${m.icon}</span><span class="nav-label">${m.label}</span></button>`;
}
function renderNav(){
  sideNav.innerHTML = routes.filter(r=>!['more'].includes(r[0])).map(r=>navButton(r[0])).join('');
  bottomNav.innerHTML = mainMobile.map(id=>navButton(id,true)).join('');
  drawerLinks.innerHTML = routes.filter(r=>!mainMobile.includes(r[0])).map(r=>navButton(r[0])).join('');
}
function showToast(msg){toast.textContent=msg;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),1800)}
function setRoute(route){
  if(!routeMeta[route]) route='home';
  state.route=route;
  location.hash=route;
  sectionTitle.textContent=routeMeta[route].label;
  sectionKicker.textContent=APP_NAME;
  renderNav();
  renderRoute();
  closeDrawer();
  window.scrollTo({top:0,behavior:'smooth'});
}
function esc(s=''){return s.replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}

function feedCard(p){return `
  <article class="card post-card">
    <div class="post-body">
      <div class="post-head">
        <button class="avatar founder-avatar" data-route="profile">W</button>
        <div><strong>${esc(p.author||'Warren')} ${p.official?'✓':''}</strong><small>${esc(p.meta||'Founder & Head of Nation · just now')}</small></div>
      </div>
      <p class="post-copy">${esc(p.text)}</p>
    </div>
    ${p.media?'<div class="post-media"></div>':''}
    <div class="post-actions"><button>♡ ${p.likes||0}</button><button>◯ ${p.comments||0}</button><button>↗ Share</button><button>⌑ Save</button></div>
  </article>`}

function renderHome(){
  view.innerHTML=document.querySelector('#homeTemplate').innerHTML;
  const defaultPosts=[
    {author:'Warren',official:true,meta:'Founder & Head of Nation · 2h ago',text:'Construction has officially begun on our first national digital institutions. Our goal is simple: build a civilization people can join, shape, and eventually explore.',media:true,likes:'1.2K',comments:143},
    {author:'Ava Chen',meta:'Citizen #000842 · 4h ago',text:'Just voted in my first national referendum. The fact that citizens can directly shape the nation is what made me join.',likes:284,comments:31}
  ];
  document.querySelector('#feedList').innerHTML=[...state.posts,...defaultPosts].map(feedCard).join('');
  document.querySelector('#postBtn').addEventListener('click',()=>{
    const ta=document.querySelector('#postText'); const text=ta.value.trim();
    if(!text) return showToast('Write something first.');
    state.posts.unshift({author:'Warren',official:true,meta:'Founder & Head of Nation · now',text,likes:0,comments:0});
    localStorage.setItem('orbit_posts',JSON.stringify(state.posts));
    renderHome();showToast('Posted to the national feed.');
  });
}

const citizens=[
  ['000001','Warren','Founder & Head of Nation','🇺🇸'],['000214','Maya Torres','Founding Citizen','🇲🇽'],['000386','Elias Hart','Senate Candidate','🇬🇧'],['000512','Nia Okafor','Citizen','🇳🇬'],['000777','Kenji Mori','Citizen','🇯🇵'],['001041','Amara Singh','Citizen','🇮🇳'],['001247','You','Founding Citizen','🌐']
];
function renderCitizens(){
  view.innerHTML=`<div class="stack">
    <div class="grid-3">
      <div class="card metric"><span>Citizens</span><strong>1,247</strong><small>+83 this month</small></div>
      <div class="card metric"><span>Countries</span><strong>31</strong><small>Global founding community</small></div>
      <div class="card metric"><span>New today</span><strong>19</strong><small>Welcome aboard</small></div>
    </div>
    <div class="card"><input id="citizenSearch" class="search" placeholder="Search citizens by name, role, or number..." /><div id="citizenList"></div></div>
  </div>`;
  const list=document.querySelector('#citizenList');
  function draw(q=''){list.innerHTML=citizens.filter(c=>c.join(' ').toLowerCase().includes(q.toLowerCase())).map((c,i)=>`<div class="citizen-row"><div class="identity"><span class="rank">${i+1}</span><span class="flag">${c[3]}</span><div class="identity-meta"><strong>${c[1]}</strong><small>${c[2]}</small></div></div><span class="citizen-number">#${c[0]}</span></div>`).join('')||'<p class="muted">No citizens found.</p>'}
  draw();document.querySelector('#citizenSearch').addEventListener('input',e=>draw(e.target.value));
}
function renderElections(){
  const v=state.vote;
  view.innerHTML=`<div class="stack">
    <div class="card vote-card"><span class="pill green">ACTIVE REFERENDUM</span><h3>Should the nation prioritize its first lunar archive mission?</h3><p class="muted">Approve an initial national project to place a digital founding archive on a future commercial lunar mission.</p><div class="vote-buttons"><button class="btn primary ${v==='yes'?'selected':''}" data-vote="yes">Vote Yes</button><button class="btn danger ${v==='no'?'selected':''}" data-vote="no">Vote No</button></div><div class="results-bar"><span class="yes"></span><span class="no"></span></div><div class="section-row"><small>72% Yes</small><small>28% No · 4 days left</small></div></div>
    <div class="grid-2"><div class="card"><span class="eyebrow">Recent result</span><h3>National Currency Name</h3><p class="muted">Passed with 68% approval.</p><span class="status passed">PASSED</span></div><div class="card"><span class="eyebrow">Upcoming</span><h3>First Senate Election</h3><p class="muted">Candidate registration opens next week.</p><span class="status pending">UPCOMING</span></div></div>
  </div>`;
  document.querySelectorAll('[data-vote]').forEach(b=>b.addEventListener('click',()=>{state.vote=b.dataset.vote;localStorage.setItem('orbit_vote',state.vote);renderElections();showToast(`Vote recorded: ${state.vote.toUpperCase()}`)}));
}
function renderSenate(){
  view.innerHTML=`<div class="stack"><div class="senate-visual"></div><div class="grid-3"><div class="card metric"><span>Seats</span><strong>150</strong><small>First election pending</small></div><div class="card metric"><span>Active bills</span><strong>4</strong><small>Open for debate</small></div><div class="card metric"><span>Next session</span><strong>Oct 24</strong><small>19:00 UTC</small></div></div><div class="card"><div class="section-row"><h3>Current bills</h3><span class="pill blue">FOUNDING SESSION</span></div>${[
    ['B-001','Founding Institutions Act','Defines the first ministries and Senate procedures.','open'],['B-002','Citizen Rights Charter','Codifies member rights, appeals, and privacy principles.','open'],['B-003','Lunar Archive Authorization','Creates the first official space-program project.','pending']
  ].map(b=>`<div class="bill-row"><div class="bill-title"><strong>${b[0]} · ${b[1]}</strong><small>${b[2]}</small></div><span class="status ${b[3]}">${b[3].toUpperCase()}</span></div>`).join('')}</div></div>`;
}
function renderConstitution(){
  const arts=[
    ['Preamble','We establish this digital nation as a voluntary civic community dedicated to peaceful exploration, science, creativity, human rights, and the long-term future of humanity beyond Earth.'],
    ['Article I — Citizenship','Citizenship is voluntary. Every citizen receives a unique national citizen number and equal access to civic participation under this Constitution.'],
    ['Article II — Founder & Head of Nation','The Founder serves as the permanent Head of Nation and guardian of the founding mission. The office is ceremonial and strategic except where specific constitutional powers are granted.'],
    ['Article III — The Senate','Legislative authority is exercised by an elected Senate. Senators debate, propose, amend, and vote on national laws and budgets.'],
    ['Article IV — Elections & Referendums','Citizens may elect representatives and participate in referendums through secure digital voting.'],
    ['Article V — Citizen Rights','Citizens retain freedom of expression, association, privacy, due process within the platform, and the right to leave the nation at any time.'],
    ['Article VI — Amendments','Amendments may be proposed by the Senate or by citizen petition and ratified according to the voting thresholds established by law.']
  ];
  view.innerHTML=`<div class="card constitution"><span class="pill gold">DRAFT v0.1</span><h2>Constitution of ${APP_NAME}</h2><p class="muted">Prototype text for Version 1. This is a private digital community constitution, not a claim of internationally recognized sovereignty.</p>${arts.map(a=>`<article><h3>${a[0]}</h3><p>${a[1]}</p></article>`).join('')}<button class="btn secondary" id="copyConst">Copy draft text</button></div>`;
  document.querySelector('#copyConst').addEventListener('click',()=>{navigator.clipboard?.writeText(arts.map(a=>`${a[0]}\n${a[1]}`).join('\n\n'));showToast('Constitution copied.');});
}
function renderTreasury(){
  view.innerHTML=`<div class="stack"><div class="card treasury-balance"><span class="eyebrow">Your balance</span><strong>12,450 ORB</strong><p class="muted">Prototype non-transferable in-platform credits. No cash value.</p><div class="quick-actions"><button><span>＋</span>Earn</button><button><span>◈</span>Spend</button><button><span>♙</span>Projects</button><button><span>⌁</span>History</button></div></div><div class="grid-2"><div class="card metric"><span>National Treasury</span><strong>5.32M ORB</strong><small>In-platform balance</small></div><div class="card metric"><span>Lunar Project Fund</span><strong>43%</strong><small>Prototype progress</small></div></div><div class="card"><h3>Recent activity</h3>${[['+250 ORB','Founding citizen achievement'],['-500 ORB','Virtual apartment reservation'],['+100 ORB','Participated in referendum']].map(x=>`<div class="wallet-row"><span>${x[1]}</span><strong>${x[0]}</strong></div>`).join('')}</div></div>`;
}
function renderGovernment(){
  view.innerHTML=`<div class="stack"><div class="government-visual"></div><div class="card"><h3>National institutions</h3>${[['Founder & Head of Nation','Warren · permanent founding office'],['Senate','150 elected seats · first election pending'],['Ministry of Space','Space missions, science, and research'],['Ministry of Civic Affairs','Citizenship, elections, and community'],['National Treasury','Budgets, credits, and project funding'],['Constitutional Council','Rules, appeals, and constitutional review']].map(x=>`<div class="bill-row"><div class="bill-title"><strong>${x[0]}</strong><small>${x[1]}</small></div><span>›</span></div>`).join('')}</div></div>`;
}
function renderSpace(){
  view.innerHTML=`<div class="stack"><div class="space-visual"></div><div class="grid-3"><div class="card metric"><span>Mission 01</span><strong>Lunar</strong><small>Digital founding archive</small></div><div class="card metric"><span>Mission 02</span><strong>Rover</strong><small>Robotic lunar scout concept</small></div><div class="card metric"><span>Long-term</span><strong>Venus</strong><small>Atmospheric probe concept</small></div></div><div class="card"><div class="section-row"><h3>Lunar Archive Mission</h3><span class="status open">PLANNING</span></div><p class="muted">A public project page for future fundraising, engineering updates, mission milestones, and citizen votes.</p><div class="progress blue"><span style="width:43%"></span></div><small>$21,500 / $50,000 demonstration goal</small></div></div>`;
}
function renderEvents(){
  const events=[['Oct 22 · 19:00 UTC','National Address','Founder speech from the digital Senate chamber'],['Oct 24 · 17:00 UTC','Lunar Mission Q&A','Discussion of the first archive mission'],['Oct 31 · 18:00 UTC','Citizen Meetup','Open virtual community gathering'],['Nov 3 · 18:00 UTC','Senate Debate','Founding Institutions Act']];
  view.innerHTML=`<div class="card"><h3>Upcoming national events</h3>${events.map(e=>`<div class="event-row"><div class="event-copy"><strong>${e[1]}</strong><small>${e[0]} · ${e[2]}</small></div><button class="btn secondary remind-btn">Remind me</button></div>`).join('')}</div>`;document.querySelectorAll('.remind-btn').forEach(b=>b.addEventListener('click',()=>showToast('Saved to your in-app reminders.')));
}
function renderWorld(){
  view.innerHTML=`<div class="stack"><div class="world-visual"></div><div class="card lock-card"><div class="lock">✦</div><h3>The Virtual Capital is under construction</h3><p>Later, this tab can launch a browser-based world where citizens walk through the capital, visit the Senate, attend speeches, own virtual spaces, and meet other citizens. Your account, citizen number, roles, and credits can carry into the world.</p><button class="btn primary" id="joinWorldWaitlist">Join early-access list</button></div></div>`;
  document.querySelector('#joinWorldWaitlist').addEventListener('click',()=>showToast('You joined the virtual world early-access list.'));
}
function renderProfile(){
  view.innerHTML=`<div class="stack"><div class="card founder-profile"><div class="profile-banner"></div><div class="profile-main"><button class="avatar founder-avatar">W</button><h2>Warren ✓</h2><div class="profile-meta">Founder & Head of Nation · Citizen #000001</div><div class="profile-badges"><span class="pill gold">FOUNDER</span><span class="pill blue">HEAD OF STATE</span><span class="pill green">OFFICIAL ACCOUNT</span></div><p>Building a digital civilization around community, exploration, science, and real space projects.</p><div class="notice">∞ Automatically followed by every citizen. This official account cannot be unfollowed, but citizens may mute ordinary posts. Critical national notices remain visible.</div><div class="founder-stats"><div><strong>1</strong><span>Following</span></div><div><strong>1,247</strong><span>Followers</span></div><div><strong>${2+state.posts.length}</strong><span>Posts</span></div></div></div></div><div class="card"><h3>Official powers in this prototype</h3><p class="muted">Deliver national addresses, publish official notices, propose national projects, appoint founding administrators, and serve as permanent Founder & Head of Nation under the Constitution.</p></div></div>`;
}
function renderMore(){
  const tiles=['constitution','treasury','government','space','events','world','profile'];
  view.innerHTML=`<div class="more-grid">${tiles.map(id=>`<button class="more-tile" data-route="${id}"><span>${routeMeta[id].icon}</span><strong>${routeMeta[id].label}</strong><small>${({constitution:'National charter and citizen rights',treasury:'Credits, budgets, and project funds',government:'Institutions and ministries',space:'Real-world mission roadmap',events:'Speeches, sessions, and meetups',world:'Future explorable virtual capital',profile:'Founder & Head of Nation'})[id]}</small></button>`).join('')}</div>`;
}
function renderRoute(){
  ({home:renderHome,citizens:renderCitizens,elections:renderElections,senate:renderSenate,constitution:renderConstitution,treasury:renderTreasury,government:renderGovernment,space:renderSpace,events:renderEvents,world:renderWorld,profile:renderProfile,more:renderMore}[state.route]||renderHome)();
}

function openDrawer(){drawer.classList.add('open');drawerBackdrop.classList.add('open')}
function closeDrawer(){drawer.classList.remove('open');drawerBackdrop.classList.remove('open')}

document.addEventListener('click',e=>{
  const el=e.target.closest('[data-route]'); if(el) setRoute(el.dataset.route);
});
document.querySelector('#menuBtn').addEventListener('click',openDrawer);
document.querySelector('#closeDrawer').addEventListener('click',closeDrawer);
drawerBackdrop.addEventListener('click',closeDrawer);
document.querySelector('#searchBtn').addEventListener('click',()=>{setRoute('citizens');setTimeout(()=>document.querySelector('#citizenSearch')?.focus(),50)});
window.addEventListener('hashchange',()=>setRoute(location.hash.replace('#','')||'home'));

setRoute(location.hash.replace('#','')||'home');
