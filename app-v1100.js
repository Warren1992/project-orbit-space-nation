const APP_NAME = 'Staralia';
const state = {
  route: 'home',
  population: 1247,
  founder: { name: 'Warren', title: 'President of Staralia', citizen: '000001' },
  vote: localStorage.getItem('orbit_vote') || null,
  posts: JSON.parse(localStorage.getItem('orbit_posts') || '[]')
};

const routes = [
  ['home','⌂','Home'],['citizens','◎','Citizens'],['messages','✉','Messages'],['elections','✓','Elections'],['senate','🏛','Congress'],['judiciary','⚖','Supreme Court'],
  ['residency','◆','Residency'],['constitution','▤','Constitution'],['treasury','◈','Treasury'],['government','⚖','Government'],['space','🚀','Space Program'],
  ['events','◫','Events'],['world','✦','World'],['profile','●','President Profile'],['more','☰','More']
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
  const nextHash = `#${route}`;
  state.route=route;
  if(location.hash !== nextHash) location.hash=route;
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
        <div><strong>${esc(p.author||'Warren')} ${p.official?'✓':''}</strong><small>${esc(p.meta||'President of Staralia · just now')}</small></div>
      </div>
      <p class="post-copy">${esc(p.text)}</p>
    </div>
    ${p.media?'<div class="post-media"></div>':''}
    <div class="post-actions"><button>♡ ${p.likes||0}</button><button>◯ ${p.comments||0}</button><button>↗ Share</button><button>⌑ Save</button></div>
  </article>`}

function renderHome(){
  view.innerHTML=document.querySelector('#homeTemplate').innerHTML;
  const defaultPosts=[
    {author:'Warren',official:true,meta:'President of Staralia · 2h ago',text:'Construction has officially begun on our first national digital institutions. Our goal is simple: build a civilization people can join, shape, and eventually explore.',media:true,likes:'1.2K',comments:143},
    {author:'Ava Chen',meta:'Citizen #000842 · 4h ago',text:'Just voted on my first Staralia proposition. Citizens elect Congress and can also decide propositions directly.',likes:284,comments:31}
  ];
  document.querySelector('#feedList').innerHTML=[...state.posts,...defaultPosts].map(feedCard).join('');
  document.querySelector('#postBtn').addEventListener('click',()=>{
    const ta=document.querySelector('#postText'); const text=ta.value.trim();
    if(!text) return showToast('Write something first.');
    state.posts.unshift({author:'Warren',official:true,meta:'President of Staralia · now',text,likes:0,comments:0});
    localStorage.setItem('orbit_posts',JSON.stringify(state.posts));
    renderHome();showToast('Posted to the national feed.');
  });
}

const citizens=[
  ['000001','Warren','President of Staralia','🇺🇸'],['000214','Maya Torres','Founding Citizen','🇲🇽'],['000386','Elias Hart','Senate Candidate','🇬🇧'],['000512','Nia Okafor','Citizen','🇳🇬'],['000777','Kenji Mori','Citizen','🇯🇵'],['001041','Amara Singh','Citizen','🇮🇳'],['001247','You','Founding Citizen','🌐']
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
  view.innerHTML=`<div class="card"><span class="eyebrow">STARALIA ELECTIONS</span><h3>Loading congressional elections and propositions…</h3><p class="muted">Citizens elect Representatives and Senators and may vote directly on national Propositions.</p></div>`;
}
function renderSenate(){
  view.innerHTML=`<div class="stack"><div class="senate-visual"></div><div class="card"><span class="eyebrow">LEGISLATIVE BRANCH</span><h2>Congress of Staralia</h2><p class="muted">A bicameral legislature with a 100-seat House of Representatives and a 100-seat Senate.</p></div><div class="grid-2"><div class="card metric"><span>House</span><strong>100</strong><small>Elected Representatives</small></div><div class="card metric"><span>Senate</span><strong>100</strong><small>Elected Senators</small></div></div></div>`;
}
function renderConstitution(){
  const arts=[
    ['Preamble','We establish Staralia as a voluntary digital civic nation dedicated to peaceful exploration, science, creativity, equal citizenship, constitutional government, and humanity’s future beyond Earth.'],
    ['Article I — Legislative Branch','Federal legislative power is vested in the Congress of Staralia. Congress has two chambers: a House of Representatives with 100 elected Representatives and a Senate with 100 elected Senators. A bill must pass both chambers before it can be presented to the President.'],
    ['Article II — Executive Branch','Executive power is vested in the President of Staralia. The President faithfully administers enacted laws, may sign or veto bills passed by both chambers of Congress, may issue Executive Orders and Proclamations within constitutional limits, and nominates Supreme Court justices.'],
    ['Article III — Judicial Branch','Judicial power is vested in the Supreme Court of Staralia, consisting of nine seats: one Chief Justice and eight Associate Justices. Justices are nominated by the President and confirmed by the Senate. The Court decides constitutional cases and may find Staralia laws or executive actions unconstitutional within Staralia.'],
    ['Article IV — Checks & Balances','A congressional bill becomes law after passing both the House and Senate and receiving the President’s signature. A Presidential veto may be overridden only by a two-thirds vote in both chambers. Supreme Court appointments require Senate confirmation. No person may simultaneously serve as President, a member of Congress, and a Supreme Court justice.'],
    ['Article V — Elections & Representation','Citizens elect Representatives to the 100-seat House and Senators to the 100-seat Senate. Citizens do not vote directly on ordinary legislation. Citizens may vote directly on numbered national Propositions placed on the ballot under Staralia law.'],
    ['Article VI — Citizen Rights','Citizens retain freedom of expression and association, privacy protections, equal civic status, due process within the platform, and the right to leave Staralia at any time.'],
    ['Article VII — Amendments','Constitutional amendments may be proposed and ratified under procedures established by constitutional law. No branch may unilaterally amend this Constitution.']
  ];
  view.innerHTML=`<div class="card constitution"><span class="pill gold">FEDERAL DRAFT v1.1</span><h2>Constitution of ${APP_NAME}</h2><p class="muted">Staralia uses a three-branch federal structure with a bicameral Congress: 100 Representatives and 100 Senators. Staralia remains a private digital civic community and does not claim internationally recognized governmental sovereignty.</p>${arts.map(a=>`<article><h3>${a[0]}</h3><p>${a[1]}</p></article>`).join('')}<button class="btn secondary" id="copyConst">Copy draft text</button></div>`;
  document.querySelector('#copyConst').addEventListener('click',()=>{navigator.clipboard?.writeText(arts.map(a=>`${a[0]}\n${a[1]}`).join('\n\n'));showToast('Constitution copied.');});
}
function renderTreasury(){
  view.innerHTML=`<div class="stack"><div class="card treasury-balance"><span class="eyebrow">Your balance</span><strong>12,450 ORB</strong><p class="muted">Prototype non-transferable in-platform credits. No cash value.</p><div class="quick-actions"><button><span>＋</span>Earn</button><button><span>◈</span>Spend</button><button><span>♙</span>Projects</button><button><span>⌁</span>History</button></div></div><div class="grid-2"><div class="card metric"><span>National Treasury</span><strong>5.32M ORB</strong><small>In-platform balance</small></div><div class="card metric"><span>Lunar Project Fund</span><strong>43%</strong><small>Prototype progress</small></div></div><div class="card"><h3>Recent activity</h3>${[['+250 ORB','Founding citizen achievement'],['-500 ORB','Virtual apartment reservation'],['+100 ORB','Voted on a proposition']].map(x=>`<div class="wallet-row"><span>${x[1]}</span><strong>${x[0]}</strong></div>`).join('')}</div></div>`;
}
function renderGovernment(){
  view.innerHTML=`<div class="stack federal-government-placeholder">
    <div class="government-visual"></div>
    <div class="card"><span class="eyebrow">FEDERAL GOVERNMENT</span><h2>Three Branches of Government</h2><p class="muted">Staralia separates federal power among the Legislative, Executive, and Judicial branches.</p></div>
    <div class="grid-3">
      <button class="card more-tile" data-route="senate"><span>🏛</span><strong>Legislative</strong><small>Congress · 100 Representatives + 100 Senators</small></button>
      <button class="card more-tile" data-route="government"><span>✦</span><strong>Executive</strong><small>President of Staralia</small></button>
      <button class="card more-tile" data-route="judiciary"><span>⚖</span><strong>Judicial</strong><small>9-seat Supreme Court</small></button>
    </div>
  </div>`;
}
function renderJudiciary(){
  view.innerHTML=`<div class="card"><span class="eyebrow">JUDICIAL BRANCH</span><h3>Loading Supreme Court…</h3><p class="muted">Preparing the Staralia judicial docket.</p></div>`;
}
function renderSpace(){
  view.innerHTML=`<div class="stack"><div class="space-visual"></div><div class="grid-3"><div class="card metric"><span>Mission 01</span><strong>Lunar</strong><small>Digital founding archive</small></div><div class="card metric"><span>Mission 02</span><strong>Rover</strong><small>Robotic lunar scout concept</small></div><div class="card metric"><span>Long-term</span><strong>Venus</strong><small>Atmospheric probe concept</small></div></div><div class="card"><div class="section-row"><h3>Lunar Archive Mission</h3><span class="status open">PLANNING</span></div><p class="muted">A public project page for future fundraising, engineering updates, mission milestones, and citizen votes.</p><div class="progress blue"><span style="width:43%"></span></div><small>$21,500 / $50,000 demonstration goal</small></div></div>`;
}
function renderEvents(){
  const events=[['Oct 22 · 19:00 UTC','National Address','Presidential address from the digital Congress chamber'],['Oct 24 · 17:00 UTC','Lunar Mission Q&A','Discussion of the first archive mission'],['Oct 31 · 18:00 UTC','Citizen Meetup','Open virtual community gathering'],['Nov 3 · 18:00 UTC','Congressional Debate','Founding Institutions Act']];
  view.innerHTML=`<div class="card"><h3>Upcoming national events</h3>${events.map(e=>`<div class="event-row"><div class="event-copy"><strong>${e[1]}</strong><small>${e[0]} · ${e[2]}</small></div><button class="btn secondary remind-btn">Remind me</button></div>`).join('')}</div>`;document.querySelectorAll('.remind-btn').forEach(b=>b.addEventListener('click',()=>showToast('Saved to your in-app reminders.')));
}
function renderWorld(){
  view.innerHTML=`<div class="stack"><div class="world-visual"></div><div class="card lock-card"><div class="lock">✦</div><h3>The Virtual Capital is under construction</h3><p>Later, this tab can launch a browser-based world where citizens walk through the capital, visit Congress, attend speeches, own virtual spaces, and meet other citizens. Your account, citizen number, roles, and credits can carry into the world.</p><button class="btn primary" id="joinWorldWaitlist">Join early-access list</button></div></div>`;
  document.querySelector('#joinWorldWaitlist').addEventListener('click',()=>showToast('You joined the virtual world early-access list.'));
}
function renderProfile(){
  view.innerHTML=`<div class="stack"><div class="card founder-profile"><div class="profile-banner"></div><div class="profile-main"><button class="avatar founder-avatar">W</button><h2>Warren ✓</h2><div class="profile-meta">President of Staralia · Citizen #000001</div><div class="profile-badges"><span class="pill gold">FOUNDING PRESIDENT</span><span class="pill blue">EXECUTIVE BRANCH</span><span class="pill green">OFFICIAL ACCOUNT</span></div><p>Building a digital civilization around community, exploration, science, and real space projects.</p><div class="notice">∞ This is Staralia’s official Presidential account.</div></div></div><div class="card"><h3>Presidential powers in this prototype</h3><p class="muted">Serve as chief executive, sign or veto bills passed by both chambers of Congress, issue Executive Orders and Proclamations within constitutional limits, nominate Supreme Court justices, and administer enacted laws.</p></div></div>`;
}
function renderMessagesRoute(){
  view.innerHTML=`<div class="card"><span class="eyebrow">PRIVATE CITIZEN MESSAGING</span><h3>Loading messages…</h3><p class="muted">Preparing your private Staralia inbox.</p></div>`;
}
function renderResidencyRoute(){
  view.innerHTML=`<div class="card"><span class="eyebrow">STARALIA RESIDENCY</span><h3>Loading residency…</h3><p class="muted">Preparing your residency status.</p></div>`;
}

function renderMore(){
  const tiles=['constitution','treasury','government','judiciary','space','events','world','profile'];
  view.innerHTML=`<div class="more-grid">${tiles.map(id=>`<button class="more-tile" data-route="${id}"><span>${routeMeta[id].icon}</span><strong>${routeMeta[id].label}</strong><small>${({constitution:'National charter and citizen rights',treasury:'Credits, budgets, and project funds',government:'Three branches and Presidential office',judiciary:'Supreme Court and constitutional cases',space:'Real-world mission roadmap',events:'Speeches, sessions, and meetups',world:'Future explorable virtual capital',profile:'President of Staralia'})[id]}</small></button>`).join('')}</div>`;
}
function renderRoute(){
  ({home:renderHome,citizens:renderCitizens,messages:renderMessagesRoute,elections:renderElections,senate:renderSenate,judiciary:renderJudiciary,residency:renderResidencyRoute,constitution:renderConstitution,treasury:renderTreasury,government:renderGovernment,space:renderSpace,events:renderEvents,world:renderWorld,profile:renderProfile,more:renderMore}[state.route]||renderHome)();
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
window.addEventListener('hashchange',()=>{const route=location.hash.replace('#','')||'home';if(route!==state.route)setRoute(route);});

setRoute(location.hash.replace('#','')||'home');
