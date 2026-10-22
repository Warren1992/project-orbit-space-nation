const waitForDb = async () => {
  for (let i=0;i<100;i++){
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(r=>setTimeout(r,50));
  }
  throw new Error('Supabase client did not initialize');
};

const db = await waitForDb();
const live2 = { user:null, profile:null, citizens:[], posts:[], refs:[], opts:[], tallies:[], votes:[] };
let rootSeen=null, debounce=null;

const esc2=v=>String(v??'').replace(/[&<>'\"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','\"':'&quot;'}[c]));
const pad2=n=>String(n??'').padStart(6,'0');
const byCitizen=n=>live2.citizens.find(c=>Number(c.citizen_no)===Number(n));
const rel=iso=>{
  const s=Math.max(0,Math.floor((Date.now()-new Date(iso).getTime())/1000));
  if(s<45)return'just now'; const m=Math.floor(s/60); if(m<60)return m+'m ago';
  const h=Math.floor(m/60); if(h<24)return h+'h ago'; const d=Math.floor(h/24); return d<30?d+'d ago':new Date(iso).toLocaleDateString();
};
const remaining=iso=>{
  const ms=new Date(iso).getTime()-Date.now(); if(ms<=0)return'ended';
  const d=Math.floor(ms/86400000); if(d)return d+' day'+(d===1?'':'s')+' left';
  const h=Math.floor(ms/3600000); if(h)return h+' hour'+(h===1?'':'s')+' left';
  return Math.max(1,Math.floor(ms/60000))+' min left';
};
const toast2=msg=>{
  const t=document.querySelector('#toast'); if(!t)return;
  t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);
};

if(!document.querySelector('#orbitSharedStyles')){
  const s=document.createElement('style'); s.id='orbitSharedStyles';
  s.textContent=`
    .shared-live-note{font-size:12px;color:#7be0b8;font-weight:800}
    .post-meta-flex{display:flex;gap:10px;align-items:flex-start;width:100%}
    .post-delete-live{margin-left:auto!important;color:#ff9d9d!important}
    .live-election-stack{display:grid;gap:18px}
    .live-ref h3{font-size:24px;margin:9px 0}
    .live-options{display:grid;gap:10px;margin:17px 0}
    .live-option{display:flex;justify-content:space-between;gap:12px;align-items:center;width:100%;padding:13px 15px;border:1px solid rgba(255,255,255,.1);border-radius:13px;background:rgba(255,255,255,.045);color:white;font-weight:800}
    .live-option.selected{border-color:#f4b942;background:rgba(244,185,66,.12)}
    .live-option:disabled{cursor:default;opacity:.8}
    .live-result{display:grid;grid-template-columns:minmax(80px,auto) 1fr 44px;gap:10px;align-items:center;margin:10px 0}
    .live-track{height:9px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden}
    .live-fill{height:100%;border-radius:999px;background:linear-gradient(90deg,#31c48d,#7be0b8)}
    .live-vote-status{margin-top:14px;padding:12px 14px;border:1px solid rgba(75,163,255,.2);border-radius:13px;background:rgba(75,163,255,.08);color:#b9dcff}
    .live-ref-meta{display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:13px}
    .status.active{background:rgba(49,196,141,.12);color:#7be0b8}.status.closed{background:rgba(255,255,255,.08);color:#b9c2cd}.status.upcoming{background:rgba(244,185,66,.12);color:#ffd978}
  `;
  document.head.appendChild(s);
}

async function getSessionProfile(){
  const {data:{session}}=await db.auth.getSession(); live2.user=session?.user||null;
  if(live2.user){ const {data}=await db.rpc('my_profile'); live2.profile=data?.[0]||null; } else live2.profile=null;
}
async function getCitizens(){
  const {data}=await db.from('profiles').select('citizen_no,display_name,country,avatar_url,role,is_founder,joined_at').order('citizen_no');
  live2.citizens=data||[];
}
async function getPosts(){
  const {data,error}=await db.from('posts').select('id,author_citizen_no,body,created_at').order('created_at',{ascending:false}).limit(100);
  if(error)console.error(error); else live2.posts=data||[];
}
async function getElections(){
  const [r,o,t]=await Promise.all([
    db.from('referendums').select('id,title,description,status,opens_at,closes_at,created_at').order('created_at',{ascending:false}),
    db.from('referendum_options').select('id,referendum_id,label,position').order('position'),
    db.from('referendum_option_tallies').select('option_id,referendum_id,vote_count')
  ]);
  live2.refs=r.data||[];live2.opts=o.data||[];live2.tallies=t.data||[];
  if(live2.user){ const v=await db.from('votes').select('referendum_id,option_id,created_at');live2.votes=v.data||[];} else live2.votes=[];
}
async function refresh2(){
  await getSessionProfile();
  await Promise.all([getCitizens(),getPosts(),getElections()]);
  enhance2(true);
}

function renderPosts(){
  const list=document.querySelector('#feedList'); if(!list)return;
  list.innerHTML=live2.posts.length?live2.posts.map(p=>{
    const a=byCitizen(p.author_citizen_no)||{display_name:'Citizen',role:'Citizen',is_founder:false};
    const own=live2.profile&&Number(live2.profile.citizen_no)===Number(p.author_citizen_no);
    const init=(a.display_name||'C')[0].toUpperCase();
    return `<article class="card post-card">
      <div class="post-body"><div class="post-head">
        <button class="avatar ${a.is_founder?'founder-avatar':''}" ${a.is_founder?'data-route="profile"':''}>${esc2(init)}</button>
        <div class="post-meta-flex"><div><strong>${esc2(a.display_name)} ${a.is_founder?'✓':''}</strong><small>${esc2(a.role)} · Citizen #${pad2(p.author_citizen_no)} · ${rel(p.created_at)}</small></div>
        ${own?'<button class="text-btn post-delete-live" data-del-post="'+p.id+'">Delete</button>':''}</div>
      </div><p class="post-copy">${esc2(p.body)}</p></div>
      <div class="post-actions"><button data-share-post="${p.id}">↗ Share</button><button disabled>♡ Likes soon</button><button disabled>◯ Comments soon</button></div>
    </article>`;
  }).join(''):'<div class="card" style="text-align:center">No national posts yet.</div>';

  list.querySelectorAll('[data-del-post]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Delete this post?'))return;b.disabled=true;
    const {error}=await db.from('posts').delete().eq('id',Number(b.dataset.delPost));
    if(error){toast2(error.message);b.disabled=false;return;}await getPosts();renderPosts();toast2('Post deleted.');
  });
  list.querySelectorAll('[data-share-post]').forEach(b=>b.onclick=async()=>{
    const p=live2.posts.find(x=>String(x.id)===b.dataset.sharePost);if(!p)return;
    if(navigator.share){try{await navigator.share({title:'Project Orbit',text:p.body,url:location.href});}catch{}}
    else if(navigator.clipboard){await navigator.clipboard.writeText(p.body+'\n\n'+location.href);toast2('Post copied.');}
  });
}

function wireComposer(){
  const c=document.querySelector('.composer'), ta=c?.querySelector('#postText'), old=c?.querySelector('#postBtn'); if(!c||!ta||!old)return;
  const head=c.querySelector('.composer-head'), note=c.querySelector('.composer-actions .muted,.composer-actions .shared-live-note');
  const btn=old.cloneNode(true);old.replaceWith(btn);
  if(live2.user&&live2.profile){
    if(head)head.innerHTML=`<button class="avatar ${live2.profile.is_founder?'founder-avatar':''}">${esc2((live2.profile.display_name||'C')[0].toUpperCase())}</button><div><strong>${esc2(live2.profile.display_name)}</strong><small>${esc2(live2.profile.role)} · Citizen #${pad2(live2.profile.citizen_no)}</small></div>`;
    ta.disabled=false;ta.placeholder='Share an update with the nation...';
    if(note){note.textContent='Live · visible to everyone';note.className='shared-live-note';}
    btn.textContent='Post';btn.onclick=async()=>{
      const body=ta.value.trim();if(!body)return toast2('Write something first.');
      btn.disabled=true;btn.textContent='Posting…';const {error}=await db.from('posts').insert({body});
      if(error){toast2(error.message);btn.disabled=false;btn.textContent='Post';return;}
      ta.value='';await getPosts();renderPosts();btn.disabled=false;btn.textContent='Post';toast2('Posted to the national feed.');
    };
  }else{
    ta.value='';ta.disabled=true;ta.placeholder='Become a citizen to post.';
    if(note)note.textContent='Sign in required to publish';
    btn.textContent='Log in to post';btn.onclick=()=>document.querySelector('#accountBtn')?.click();
  }
}

function updateHomeVote(){
  const ref=live2.refs.find(r=>r.status==='active')||live2.refs[0];if(!ref)return;
  const cards=[...document.querySelectorAll('.rail .card')],card=cards.find(c=>c.querySelector('h3')?.textContent==='Current referendum');if(!card)return;
  const os=live2.opts.filter(o=>Number(o.referendum_id)===Number(ref.id)),total=os.reduce((s,o)=>s+Number(live2.tallies.find(t=>Number(t.option_id)===Number(o.id))?.vote_count||0),0);
  const first=os[0],count=Number(live2.tallies.find(t=>Number(t.option_id)===Number(first?.id))?.vote_count||0),pct=total?Math.round(count/total*100):0;
  const q=card.querySelector('.question'),bar=card.querySelector('.progress span'),small=card.querySelector('small');
  if(q)q.textContent=ref.title;if(bar)bar.style.width=pct+'%';if(small)small.textContent=total?pct+'% '+(first?.label||'')+' · '+remaining(ref.closes_at):'No votes yet · '+remaining(ref.closes_at);
}

function enhanceHome2(){wireComposer();renderPosts();updateHomeVote();}

function statusOf(r){const n=Date.now();if(r.status==='closed'||n>=new Date(r.closes_at).getTime())return'closed';if(r.status==='upcoming'||n<new Date(r.opens_at).getTime())return'upcoming';return'active';}
function renderElections2(){
  const v=document.querySelector('#view');if(!v)return;
  v.innerHTML=`<div class="live-election-stack">${live2.refs.map(r=>{
    const st=statusOf(r),os=live2.opts.filter(o=>Number(o.referendum_id)===Number(r.id)).sort((a,b)=>a.position-b.position),mine=live2.votes.find(x=>Number(x.referendum_id)===Number(r.id));
    const total=os.reduce((s,o)=>s+Number(live2.tallies.find(t=>Number(t.option_id)===Number(o.id))?.vote_count||0),0);
    const buttons=os.map(o=>`<button class="live-option ${Number(mine?.option_id)===Number(o.id)?'selected':''}" data-vote-live="${r.id}:${o.id}" ${mine||st!=='active'?'disabled':''}><span>${esc2(o.label)}</span><span>${Number(mine?.option_id)===Number(o.id)?'✓ Your vote':'Vote'}</span></button>`).join('');
    const rows=os.map(o=>{const c=Number(live2.tallies.find(t=>Number(t.option_id)===Number(o.id))?.vote_count||0),p=total?Math.round(c/total*100):0;return`<div class="live-result"><span>${esc2(o.label)}</span><div class="live-track"><div class="live-fill" style="width:${p}%"></div></div><strong>${p}%</strong></div>`;}).join('');
    const chosen=os.find(o=>Number(o.id)===Number(mine?.option_id));
    return`<section class="card live-ref"><span class="status ${st}">${st.toUpperCase()}</span><h3>${esc2(r.title)}</h3><p class="muted">${esc2(r.description||'')}</p><div class="live-options">${buttons}</div>${rows}<div class="live-ref-meta"><small>${total} vote${total===1?'':'s'} cast</small><small>${st==='active'?remaining(r.closes_at):st==='upcoming'?'Voting has not opened':'Voting closed'}</small></div>${mine?'<div class="live-vote-status"><strong>Your vote is recorded:</strong> '+esc2(chosen?.label||'Selected option')+'. One vote is permitted per citizen.</div>':!live2.user&&st==='active'?'<div class="live-vote-status">Log in as a citizen to vote.</div>':live2.user&&st==='active'?'<div class="live-vote-status">Your vote is final once submitted.</div>':''}</section>`;
  }).join('')}</div>`;
  rootSeen=v.firstElementChild;
  v.querySelectorAll('[data-vote-live]').forEach(b=>b.onclick=async()=>{
    if(!live2.user||!live2.profile){document.querySelector('#accountBtn')?.click();return;}
    const [rid,oid]=b.dataset.voteLive.split(':').map(Number),opt=live2.opts.find(o=>Number(o.id)===oid);
    if(!confirm('Cast your final vote for "'+(opt?.label||'this option')+'"?'))return;
    v.querySelectorAll('[data-vote-live^="'+rid+':"]').forEach(x=>x.disabled=true);
    const {error}=await db.from('votes').insert({referendum_id:rid,option_id:oid});
    if(error){toast2(error.code==='23505'?'You have already voted in this referendum.':error.message);}
    else toast2('Your vote has been recorded.');
    await getElections();renderElections2();
  });
}

function enhance2(force=false){
  const v=document.querySelector('#view'),root=v?.firstElementChild,title=document.querySelector('#sectionTitle')?.textContent||'';
  if(title==='Elections'){if(force||root!==rootSeen||!root?.classList.contains('live-election-stack'))renderElections2();return;}
  if(!force&&root===rootSeen)return;rootSeen=root;
  if(title==='Home')enhanceHome2();
}

const mo=new MutationObserver(()=>{clearTimeout(mo._t);mo._t=setTimeout(()=>enhance2(false),35);});
mo.observe(document.querySelector('#view'),{childList:true,subtree:false});

function schedule(kind){clearTimeout(debounce);debounce=setTimeout(async()=>{if(kind==='posts')await getPosts();else if(kind==='citizens')await getCitizens();else if(kind==='elections')await getElections();else await Promise.all([getCitizens(),getPosts(),getElections()]);enhance2(true);},250);}

db.channel('project-orbit-shared')
 .on('postgres_changes',{event:'*',schema:'public',table:'profiles'},()=>schedule('citizens'))
 .on('postgres_changes',{event:'*',schema:'public',table:'posts'},()=>schedule('posts'))
 .on('postgres_changes',{event:'*',schema:'public',table:'referendums'},()=>schedule('elections'))
 .on('postgres_changes',{event:'*',schema:'public',table:'referendum_options'},()=>schedule('elections'))
 .on('postgres_changes',{event:'*',schema:'public',table:'referendum_option_tallies'},()=>schedule('elections'))
 .subscribe();

db.auth.onAuthStateChange((_e,s)=>{live2.user=s?.user||null;setTimeout(refresh2,0);});
await refresh2();
