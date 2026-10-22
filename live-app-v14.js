const waitForDb = async () => {
  for (let i = 0; i < 100; i++) {
    if (window.projectOrbitDb) return window.projectOrbitDb;
    await new Promise(r => setTimeout(r, 50));
  }
  throw new Error('Supabase client did not initialize');
};

const db = await waitForDb();

const orbit = {
  user: null,
  profile: null,
  citizens: [],
  posts: [],
  stats: [],
  comments: [],
  myLikes: new Set(),
  refs: [],
  opts: [],
  tallies: [],
  votes: [],
  followStats: [],
  myFollowing: new Set(),
  notifications: [],
  preferences: null,
  senateMembers: [],
  bills: [],
  billVotes: [],
  billTallies: [],
  feedMode: 'all',
  expandedComments: new Set()
};

let viewRootSeen = null;
let refreshTimer = null;

const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[c]));

const padCitizen = n => String(n ?? '').padStart(6, '0');

const safeUrl = value => {
  if (!value) return '';
  try {
    const u = new URL(String(value), location.origin);
    return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
  } catch {
    return '';
  }
};

const citizenByNo = n => orbit.citizens.find(c => Number(c.citizen_no) === Number(n));
const statByPost = id => orbit.stats.find(s => Number(s.post_id) === Number(id)) || { like_count: 0, comment_count: 0 };

const relativeTime = iso => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
};

const timeRemaining = iso => {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return 'ended';
  const days = Math.floor(ms / 86400000);
  if (days) return `${days} day${days === 1 ? '' : 's'} left`;
  const hours = Math.floor(ms / 3600000);
  if (hours) return `${hours} hour${hours === 1 ? '' : 's'} left`;
  return `${Math.max(1, Math.floor(ms / 60000))} min left`;
};

function toast(message) {
  const el = document.querySelector('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function avatarMarkup(citizen, extra = '') {
  const url = safeUrl(citizen?.avatar_url);
  const initial = esc((citizen?.display_name || 'C').trim().charAt(0).toUpperCase());
  if (url) {
    return `<span class="avatar avatar-live ${citizen?.is_founder ? 'founder-avatar' : ''} ${extra}">
      <img src="${esc(url)}" alt="${esc(citizen?.display_name || 'Citizen')} avatar" />
    </span>`;
  }
  return `<span class="avatar ${citizen?.is_founder ? 'founder-avatar' : ''} ${extra}">${initial}</span>`;
}

function injectStyles() {
  if (document.querySelector('#orbitV14Styles')) return;
  const style = document.createElement('style');
  style.id = 'orbitV14Styles';
  style.textContent = `
    .avatar-live{overflow:hidden;padding:0!important}
    .avatar-live img{width:100%;height:100%;object-fit:cover;display:block}
    .shared-live-note{font-size:12px;color:#7be0b8;font-weight:800}
    .post-meta-flex{display:flex;gap:10px;align-items:flex-start;width:100%}
    .post-delete-live{margin-left:auto!important;color:#ff9d9d!important}
    .post-actions button.liked{color:#ff8aa2}
    .post-actions button:disabled{opacity:.65}
    .citizen-row{cursor:pointer}
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
    .status.active{background:rgba(49,196,141,.12);color:#7be0b8}
    .status.closed{background:rgba(255,255,255,.08);color:#b9c2cd}
    .status.upcoming{background:rgba(244,185,66,.12);color:#ffd978}
    .founder-admin{border-color:rgba(244,185,66,.32);background:linear-gradient(135deg,rgba(244,185,66,.10),rgba(13,24,40,.96))}
    .founder-admin-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px}
    .profile-page{overflow:hidden;padding:0}
    .profile-page-banner{height:150px;background:radial-gradient(circle at 72% 28%,rgba(244,185,66,.32),transparent 22%),linear-gradient(135deg,#14345d,#0a1422 55%,#302411)}
    .profile-page-main{padding:0 22px 24px}
    .profile-page-avatar{width:96px!important;height:96px!important;font-size:30px!important;margin-top:-48px;position:relative;border:5px solid #0d1828}
    .profile-page-name{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:12px 0 4px}
    .profile-page-name h2{margin:0}
    .profile-page-bio{color:#d2dbe6;line-height:1.6;white-space:pre-wrap}
    .profile-page-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}
    .profile-page-stats div{background:rgba(255,255,255,.035);border-radius:13px;padding:13px;text-align:center}
    .profile-page-stats strong{display:block;font-size:22px}
    .profile-page-stats span{color:#8798ad;font-size:12px}
    .profile-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
    .profile-post-mini{padding:15px 0;border-bottom:1px solid rgba(255,255,255,.08)}
    .profile-post-mini:last-child{border-bottom:0}
    .comment-list{display:grid;gap:12px;margin:15px 0;max-height:46vh;overflow:auto}
    .comment-row{border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:12px;background:rgba(255,255,255,.03)}
    .comment-head{display:flex;align-items:center;gap:10px}
    .comment-head .avatar{width:36px;height:36px;font-size:13px;flex:0 0 36px}
    .comment-head small{display:block;color:#8798ad}
    .comment-body{margin:9px 0 0;white-space:pre-wrap;line-height:1.5}
    .comment-delete{margin-left:auto;color:#ff9d9d;background:transparent;border:0;font-weight:800}
    .comment-compose{display:grid;gap:10px;margin-top:14px}
    .comment-compose textarea{min-height:82px}
    .profile-edit-grid{display:grid;gap:12px}
    .profile-edit-grid label{display:grid;gap:6px;color:#cdd7e4;font-size:13px;font-weight:800}
    .profile-edit-grid input,.profile-edit-grid textarea,.admin-form input,.admin-form textarea{width:100%;border:1px solid rgba(255,255,255,.11);border-radius:12px;background:#07111f;color:white;padding:12px 13px;outline:none}
    .profile-edit-grid textarea,.admin-form textarea{min-height:105px;resize:vertical}
    .avatar-preview{display:flex;align-items:center;gap:12px}
    .avatar-preview .avatar{width:68px;height:68px;font-size:22px}
    .admin-form{display:grid;gap:12px}
    .admin-form label{display:grid;gap:6px;color:#cdd7e4;font-size:13px;font-weight:800}
    .admin-note{font-size:12px;color:#8798ad;line-height:1.45}
    .profile-page-banner{height:110px!important}
    .profile-page-avatar{width:112px!important;height:112px!important;margin-top:-56px!important;border-radius:50%;overflow:hidden;background:#111d30;display:grid;place-items:center}
    .profile-page-avatar>.avatar{width:100%!important;height:100%!important;font-size:34px!important;border:0!important}
    .feed-mode-bar{display:flex;gap:8px;margin-bottom:12px}
    .feed-mode-btn{flex:1;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.035);color:#94a6bb;padding:10px 12px;border-radius:12px;font-weight:850}
    .feed-mode-btn.active{background:rgba(244,185,66,.13);border-color:rgba(244,185,66,.35);color:#ffd978}
    .inline-comments{border-top:1px solid rgba(255,255,255,.08);padding:0 18px 16px;display:grid;gap:10px}
    .inline-comment{display:grid;grid-template-columns:36px 1fr auto;gap:9px;align-items:start;padding-top:12px}
    .inline-comment .avatar{width:36px;height:36px;font-size:12px}
    .inline-comment-copy{background:rgba(255,255,255,.04);border-radius:12px;padding:9px 11px;min-width:0}
    .inline-comment-copy strong{font-size:13px}.inline-comment-copy small{display:block;color:#7f90a5;margin-top:2px}.inline-comment-copy p{margin:6px 0 0;line-height:1.45;white-space:pre-wrap}
    .inline-comment-form{display:flex;gap:8px;padding-top:8px}.inline-comment-form input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;border-radius:12px;padding:10px 12px}.inline-comment-form button{white-space:nowrap}
    .profile-social-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:18px}.profile-social-stats button,.profile-social-stats div{background:rgba(255,255,255,.035);border:0;border-radius:13px;padding:13px;text-align:center;color:white}.profile-social-stats strong{display:block;font-size:22px}.profile-social-stats span{color:#8798ad;font-size:12px}
    .follow-btn.following{background:rgba(75,163,255,.12);border-color:rgba(75,163,255,.28);color:#b9dcff}
    .notification-count{position:absolute;top:-5px;right:-5px;min-width:20px;height:20px;border-radius:999px;background:#ff5d73;color:white;display:grid;place-items:center;font-size:11px;font-weight:900;padding:0 5px;border:2px solid #07111f}
    .notification-row{display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:start;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.08);cursor:pointer}.notification-row:last-child{border-bottom:0}.notification-row.unread strong{color:#fff}.notification-row.read{opacity:.68}.notification-row .avatar{width:42px;height:42px;font-size:13px}.notification-copy small{display:block;color:#8193aa;margin-top:3px}.notification-dot{position:relative}
    .settings-stack{display:grid;gap:16px}.setting-row{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:13px 0;border-bottom:1px solid rgba(255,255,255,.08)}.setting-row:last-child{border-bottom:0}.setting-row small{display:block;color:#8193aa;margin-top:3px;line-height:1.4}.switch{position:relative;width:50px;height:28px;flex:0 0 50px}.switch input{opacity:0;width:0;height:0}.switch span{position:absolute;inset:0;background:#26354a;border-radius:999px;transition:.2s}.switch span:before{content:'';position:absolute;width:22px;height:22px;left:3px;top:3px;background:white;border-radius:50%;transition:.2s}.switch input:checked+span{background:#31c48d}.switch input:checked+span:before{transform:translateX(22px)}
    .senate-member-row,.rollcall-row{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.07)}.senate-member-row:last-child,.rollcall-row:last-child{border-bottom:0}.bill-card h3{margin:8px 0}.bill-vote-buttons{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:14px 0}.bill-vote-buttons button{padding:11px 8px}.bill-tally{display:grid;grid-template-columns:72px 1fr 36px;gap:9px;align-items:center;margin:8px 0}.bill-admin-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.senate-badge{display:inline-flex;padding:5px 9px;border-radius:999px;background:rgba(75,163,255,.1);color:#b9dcff;font-size:11px;font-weight:900}
    .public-link-box{display:flex;gap:8px;align-items:center;margin-top:12px}.public-link-box input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.09);background:#07111f;color:#95a6b9;border-radius:11px;padding:10px}
    @media(max-width:760px){
      .profile-page-stats{grid-template-columns:1fr 1fr 1fr}
      .live-result{grid-template-columns:70px 1fr 42px}
    }
  `;
  document.head.appendChild(style);
}

async function fetchSessionProfile() {
  const { data: { session } } = await db.auth.getSession();
  orbit.user = session?.user || null;
  if (!orbit.user) {
    orbit.profile = null;
    return;
  }
  const { data, error } = await db.rpc('my_profile');
  if (error) console.error(error);
  orbit.profile = data?.[0] || null;
}

async function fetchCitizens() {
  const { data, error } = await db
    .from('profiles')
    .select('citizen_no,display_name,country,avatar_url,bio,role,is_founder,joined_at')
    .order('citizen_no');
  if (error) console.error(error);
  else orbit.citizens = data || [];
}

async function fetchSocial() {
  const jobs = [
    db.from('posts').select('id,author_citizen_no,body,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('post_stats').select('post_id,like_count,comment_count'),
    db.from('comments').select('id,post_id,author_citizen_no,body,created_at').order('created_at', { ascending: true }).limit(500)
  ];
  if (orbit.user) jobs.push(db.from('post_likes').select('post_id'));
  const results = await Promise.all(jobs);
  orbit.posts = results[0].data || [];
  orbit.stats = results[1].data || [];
  orbit.comments = results[2].data || [];
  orbit.myLikes = new Set((results[3]?.data || []).map(x => Number(x.post_id)));
}

async function fetchElections() {
  const [r, o, t] = await Promise.all([
    db.from('referendums').select('id,title,description,status,opens_at,closes_at,created_at').order('created_at', { ascending: false }),
    db.from('referendum_options').select('id,referendum_id,label,position').order('position'),
    db.from('referendum_option_tallies').select('option_id,referendum_id,vote_count')
  ]);
  orbit.refs = r.data || [];
  orbit.opts = o.data || [];
  orbit.tallies = t.data || [];
  if (orbit.user) {
    const v = await db.from('votes').select('referendum_id,option_id,created_at');
    orbit.votes = v.data || [];
  } else {
    orbit.votes = [];
  }
}

async function fetchNetworkAndSettings() {
  const followStats = await db.from('follow_stats').select('citizen_no,follower_count,following_count');
  orbit.followStats = followStats.data || [];

  if (!orbit.user || !orbit.profile) {
    orbit.myFollowing = new Set();
    orbit.notifications = [];
    orbit.preferences = null;
    return;
  }

  const [follows, notifications, prefs] = await Promise.all([
    db.from('follows').select('following_citizen_no,automatic'),
    db.from('notifications').select('id,recipient_citizen_no,actor_citizen_no,kind,post_id,comment_id,bill_id,message,read_at,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('notification_preferences').select('citizen_no,likes,comments,follows,senate,updated_at').maybeSingle()
  ]);

  orbit.myFollowing = new Set((follows.data || []).map(x => Number(x.following_citizen_no)));
  orbit.notifications = notifications.data || [];
  orbit.preferences = prefs.data || { likes: true, comments: true, follows: true, senate: true };
}

async function fetchSenate() {
  const [members, bills, votes, tallies] = await Promise.all([
    db.from('senate_members').select('citizen_no,seat_no,title,voting_member,active,joined_at').order('joined_at'),
    db.from('bills').select('id,title,summary,body,status,sponsor_citizen_no,opens_at,closes_at,created_at').order('created_at', { ascending: false }),
    db.from('bill_votes').select('bill_id,citizen_no,vote,created_at'),
    db.from('bill_tallies').select('bill_id,yes_count,no_count,abstain_count')
  ]);
  orbit.senateMembers = members.data || [];
  orbit.bills = bills.data || [];
  orbit.billVotes = votes.data || [];
  orbit.billTallies = tallies.data || [];
}

async function refreshAll(render = true) {
  await fetchSessionProfile();
  await Promise.all([fetchCitizens(), fetchSocial(), fetchElections(), fetchNetworkAndSettings(), fetchSenate()]);
  wireNotificationButton();
  if (render) enhanceCurrentView(true);
  openProfileFromUrl();
}

function modal(inner, id = 'orbitV13Modal') {
  document.querySelector(`#${id}`)?.remove();
  const wrap = document.createElement('div');
  wrap.id = id;
  wrap.className = 'auth-modal-backdrop';
  wrap.innerHTML = `<div class="auth-modal">${inner}</div>`;
  document.body.appendChild(wrap);
  wrap.addEventListener('click', e => {
    if (e.target === wrap) wrap.remove();
  });
  wrap.querySelector('[data-close-v13]')?.addEventListener('click', () => wrap.remove());
  return wrap;
}

/* =========================
   HOME / SHARED FEED
   ========================= */

function renderPosts() {
  const list = document.querySelector('#feedList');
  if (!list) return;

  document.querySelector('#feedModeBar')?.remove();
  const bar = document.createElement('div');
  bar.id = 'feedModeBar';
  bar.className = 'feed-mode-bar';
  bar.innerHTML = `<button class="feed-mode-btn ${orbit.feedMode === 'all' ? 'active' : ''}" data-feed-mode="all">Nation</button>
    <button class="feed-mode-btn ${orbit.feedMode === 'following' ? 'active' : ''}" data-feed-mode="following">Following</button>`;
  list.parentElement?.insertBefore(bar, list);
  bar.querySelectorAll('[data-feed-mode]').forEach(btn => btn.addEventListener('click', () => {
    if (btn.dataset.feedMode === 'following' && !orbit.user) {
      document.querySelector('#accountBtn')?.click();
      return;
    }
    orbit.feedMode = btn.dataset.feedMode;
    renderPosts();
  }));

  let posts = orbit.posts;
  if (orbit.feedMode === 'following' && orbit.profile) {
    posts = posts.filter(p => orbit.myFollowing.has(Number(p.author_citizen_no)) || Number(p.author_citizen_no) === Number(orbit.profile.citizen_no));
  }

  if (!posts.length) {
    list.innerHTML = `<div class="card" style="text-align:center"><p class="muted">${orbit.feedMode === 'following' ? 'No posts from citizens you follow yet.' : 'No national posts yet.'}</p></div>`;
    return;
  }

  list.innerHTML = posts.map(post => {
    const author = citizenByNo(post.author_citizen_no) || { citizen_no: post.author_citizen_no, display_name: 'Citizen', role: 'Citizen', is_founder: false };
    const stats = statByPost(post.id);
    const own = orbit.profile && Number(orbit.profile.citizen_no) === Number(post.author_citizen_no);
    const liked = orbit.myLikes.has(Number(post.id));
    const expanded = orbit.expandedComments.has(Number(post.id));
    const comments = orbit.comments.filter(c => Number(c.post_id) === Number(post.id));

    const commentsHtml = expanded ? `<div class="inline-comments">
      ${comments.length ? comments.slice(-20).map(comment => {
        const cAuthor = citizenByNo(comment.author_citizen_no) || { display_name: 'Citizen' };
        const commentOwn = orbit.profile && Number(orbit.profile.citizen_no) === Number(comment.author_citizen_no);
        return `<div class="inline-comment">
          <button data-citizen-profile="${comment.author_citizen_no}" style="border:0;background:none;padding:0">${avatarMarkup(cAuthor)}</button>
          <div class="inline-comment-copy"><strong>${esc(cAuthor.display_name)} ${cAuthor.is_founder ? '✓' : ''}</strong><small>Citizen #${padCitizen(comment.author_citizen_no)} · ${relativeTime(comment.created_at)}</small><p>${esc(comment.body)}</p></div>
          ${commentOwn ? `<button class="comment-delete" data-inline-delete-comment="${comment.id}" data-post-id="${post.id}">×</button>` : ''}
        </div>`;
      }).join('') : '<p class="muted" style="margin:12px 0 0">No comments yet.</p>'}
      ${orbit.user ? `<form class="inline-comment-form" data-inline-comment-form="${post.id}"><input maxlength="500" placeholder="Write a comment…" required /><button class="btn secondary" type="submit">Send</button></form>` : '<button class="btn secondary" data-login-comments>Log in to comment</button>'}
    </div>` : '';

    return `<article class="card post-card">
      <div class="post-body">
        <div class="post-head">
          <button class="profile-link-btn" data-citizen-profile="${post.author_citizen_no}" style="border:0;background:none;padding:0">${avatarMarkup(author)}</button>
          <div class="post-meta-flex"><div><button data-citizen-profile="${post.author_citizen_no}" style="border:0;background:none;color:white;padding:0;font:inherit;text-align:left"><strong>${esc(author.display_name)} ${author.is_founder ? '✓' : ''}</strong></button><small>${esc(author.role)} · Citizen #${padCitizen(post.author_citizen_no)} · ${relativeTime(post.created_at)}</small></div>
          ${own ? `<button class="text-btn post-delete-live" data-delete-post="${post.id}">Delete</button>` : ''}</div>
        </div>
        <p class="post-copy">${esc(post.body)}</p>
      </div>
      <div class="post-actions">
        <button class="${liked ? 'liked' : ''}" data-like-post="${post.id}">${liked ? '♥' : '♡'} ${Number(stats.like_count || 0)}</button>
        <button data-toggle-comments="${post.id}">◯ ${Number(stats.comment_count || 0)}</button>
        <button data-share-post="${post.id}">↗ Share</button>
      </div>
      ${commentsHtml}
    </article>`;
  }).join('');

  list.querySelectorAll('[data-delete-post]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this post?')) return;
    btn.disabled = true;
    const { error } = await db.from('posts').delete().eq('id', Number(btn.dataset.deletePost));
    if (error) { toast(error.message); btn.disabled = false; return; }
    await fetchSocial(); renderPosts(); toast('Post deleted.');
  }));

  list.querySelectorAll('[data-like-post]').forEach(btn => btn.addEventListener('click', async () => {
    if (!orbit.user || !orbit.profile) { document.querySelector('#accountBtn')?.click(); return; }
    const postId = Number(btn.dataset.likePost);
    btn.disabled = true;
    let error;
    if (orbit.myLikes.has(postId)) ({ error } = await db.from('post_likes').delete().eq('post_id', postId));
    else ({ error } = await db.from('post_likes').insert({ post_id: postId }));
    if (error) toast(error.message);
    await Promise.all([fetchSocial(), fetchNetworkAndSettings()]);
    renderPosts(); wireNotificationButton();
  }));

  list.querySelectorAll('[data-toggle-comments]').forEach(btn => btn.addEventListener('click', () => {
    const id = Number(btn.dataset.toggleComments);
    if (orbit.expandedComments.has(id)) orbit.expandedComments.delete(id); else orbit.expandedComments.add(id);
    renderPosts();
  }));

  list.querySelectorAll('[data-inline-comment-form]').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault();
    const postId = Number(form.dataset.inlineCommentForm);
    const input = form.querySelector('input');
    const body = input.value.trim();
    if (!body) return;
    const button = form.querySelector('button'); button.disabled = true;
    const { error } = await db.from('comments').insert({ post_id: postId, body });
    if (error) { toast(error.message); button.disabled = false; return; }
    await Promise.all([fetchSocial(), fetchNetworkAndSettings()]);
    orbit.expandedComments.add(postId); renderPosts(); wireNotificationButton();
  }));

  list.querySelectorAll('[data-inline-delete-comment]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this comment?')) return;
    const { error } = await db.from('comments').delete().eq('id', Number(btn.dataset.inlineDeleteComment));
    if (error) return toast(error.message);
    await fetchSocial(); orbit.expandedComments.add(Number(btn.dataset.postId)); renderPosts();
  }));

  list.querySelectorAll('[data-login-comments]').forEach(btn => btn.addEventListener('click', () => document.querySelector('#accountBtn')?.click()));

  list.querySelectorAll('[data-share-post]').forEach(btn => btn.addEventListener('click', async () => {
    const post = orbit.posts.find(p => Number(p.id) === Number(btn.dataset.sharePost));
    if (!post) return;
    if (navigator.share) { try { await navigator.share({ title: 'Project Orbit', text: post.body, url: location.href }); } catch {} }
    else if (navigator.clipboard) { await navigator.clipboard.writeText(`${post.body}\n\n${location.href}`); toast('Post copied.'); }
  }));

  bindCitizenProfileLinks(list);
}

function wireComposer() {
  const composer = document.querySelector('.composer');
  const textarea = composer?.querySelector('#postText');
  const oldButton = composer?.querySelector('#postBtn');
  if (!composer || !textarea || !oldButton) return;

  const head = composer.querySelector('.composer-head');
  const note = composer.querySelector('.composer-actions .muted, .composer-actions .shared-live-note');
  const button = oldButton.cloneNode(true);
  oldButton.replaceWith(button);

  if (orbit.user && orbit.profile) {
    if (head) {
      head.innerHTML = `${avatarMarkup(orbit.profile)}<div><strong>${esc(orbit.profile.display_name)}</strong><small>${esc(orbit.profile.role)} · Citizen #${padCitizen(orbit.profile.citizen_no)}</small></div>`;
    }
    textarea.disabled = false;
    textarea.placeholder = 'Share an update with the nation...';
    if (note) {
      note.textContent = 'Live · visible to everyone';
      note.className = 'shared-live-note';
    }
    button.textContent = 'Post';
    button.addEventListener('click', async () => {
      const body = textarea.value.trim();
      if (!body) return toast('Write something first.');
      button.disabled = true;
      button.textContent = 'Posting…';
      const { error } = await db.from('posts').insert({ body });
      if (error) {
        toast(error.message);
        button.disabled = false;
        button.textContent = 'Post';
        return;
      }
      textarea.value = '';
      await fetchSocial();
      renderPosts();
      button.disabled = false;
      button.textContent = 'Post';
      toast('Posted to the national feed.');
    });
  } else {
    textarea.value = '';
    textarea.disabled = true;
    textarea.placeholder = 'Become a citizen to post.';
    if (note) note.textContent = 'Sign in required to publish';
    button.textContent = 'Log in to post';
    button.addEventListener('click', () => document.querySelector('#accountBtn')?.click());
  }
}

async function openComments(postId) {
  const post = orbit.posts.find(p => Number(p.id) === Number(postId));
  if (!post) return;
  const { data, error } = await db
    .from('comments')
    .select('id,post_id,author_citizen_no,body,created_at')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) return toast(error.message);
  const comments = data || [];

  const wrap = modal(`
    <div class="auth-modal-head">
      <div><span class="eyebrow">NATIONAL FEED</span><h2>Comments</h2></div>
      <button class="icon-btn" data-close-v13 aria-label="Close">×</button>
    </div>
    <p class="muted">${esc(post.body)}</p>
    <div class="comment-list">
      ${comments.length ? comments.map(comment => {
        const author = citizenByNo(comment.author_citizen_no) || { display_name: 'Citizen', role: 'Citizen' };
        const own = orbit.profile && Number(orbit.profile.citizen_no) === Number(comment.author_citizen_no);
        return `<div class="comment-row">
          <div class="comment-head">
            <button data-comment-profile="${comment.author_citizen_no}" style="border:0;background:none;padding:0">${avatarMarkup(author)}</button>
            <div><strong>${esc(author.display_name)} ${author.is_founder ? '✓' : ''}</strong><small>Citizen #${padCitizen(comment.author_citizen_no)} · ${relativeTime(comment.created_at)}</small></div>
            ${own ? `<button class="comment-delete" data-delete-comment="${comment.id}">Delete</button>` : ''}
          </div>
          <p class="comment-body">${esc(comment.body)}</p>
        </div>`;
      }).join('') : '<p class="muted">No comments yet. Start the discussion.</p>'}
    </div>
    ${orbit.user ? `<form class="comment-compose" id="commentForm">
      <textarea class="auth-input" id="commentBody" maxlength="500" placeholder="Write a comment…" required></textarea>
      <button class="btn primary" type="submit">Comment</button>
    </form>` : '<button class="btn primary full" id="commentLogin">Log in to comment</button>'}
  `, 'orbitCommentModal');

  wrap.querySelectorAll('[data-comment-profile]').forEach(btn => {
    btn.addEventListener('click', () => {
      wrap.remove();
      showCitizenProfile(Number(btn.dataset.commentProfile));
    });
  });

  wrap.querySelectorAll('[data-delete-comment]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this comment?')) return;
      const { error } = await db.from('comments').delete().eq('id', Number(btn.dataset.deleteComment));
      if (error) return toast(error.message);
      await fetchSocial();
      wrap.remove();
      await openComments(postId);
    });
  });

  wrap.querySelector('#commentLogin')?.addEventListener('click', () => {
    wrap.remove();
    document.querySelector('#accountBtn')?.click();
  });

  wrap.querySelector('#commentForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const body = wrap.querySelector('#commentBody').value.trim();
    if (!body) return;
    const submit = e.currentTarget.querySelector('button[type="submit"]');
    submit.disabled = true;
    const { error } = await db.from('comments').insert({ post_id: postId, body });
    if (error) {
      toast(error.message);
      submit.disabled = false;
      return;
    }
    await fetchSocial();
    wrap.remove();
    await openComments(postId);
  });
}

function updateHomeReferendum() {
  const ref = orbit.refs.find(r => referendumStatus(r) === 'active') || orbit.refs[0];
  if (!ref) return;

  const cards = [...document.querySelectorAll('.rail .card')];
  const card = cards.find(c => c.querySelector('h3')?.textContent === 'Current referendum');
  if (!card) return;

  const options = orbit.opts.filter(o => Number(o.referendum_id) === Number(ref.id));
  const total = options.reduce((sum, o) => sum + Number(orbit.tallies.find(t => Number(t.option_id) === Number(o.id))?.vote_count || 0), 0);
  const first = options[0];
  const count = Number(orbit.tallies.find(t => Number(t.option_id) === Number(first?.id))?.vote_count || 0);
  const pct = total ? Math.round(count / total * 100) : 0;

  const question = card.querySelector('.question');
  const bar = card.querySelector('.progress span');
  const small = card.querySelector('small');
  if (question) question.textContent = ref.title;
  if (bar) bar.style.width = `${pct}%`;
  if (small) small.textContent = total ? `${pct}% ${first?.label || ''} · ${timeRemaining(ref.closes_at)}` : `No votes yet · ${timeRemaining(ref.closes_at)}`;
}

function enhanceHome() {
  wireComposer();
  renderPosts();
  updateHomeReferendum();
}

/* =========================
   CITIZENS / PROFILE PAGES
   ========================= */

function enhanceCitizens() {
  const metrics = document.querySelectorAll('.metric');
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const month = now.toISOString().slice(0, 7);
  const monthCount = orbit.citizens.filter(c => String(c.joined_at).slice(0, 7) === month).length;
  const todayCount = orbit.citizens.filter(c => String(c.joined_at).slice(0, 10) === today).length;
  const countries = new Set(orbit.citizens.map(c => c.country?.trim()).filter(Boolean)).size;

  if (metrics[0]) {
    metrics[0].querySelector('strong').textContent = orbit.citizens.length.toLocaleString();
    metrics[0].querySelector('small').textContent = `+${monthCount} this month`;
  }
  if (metrics[1]) {
    metrics[1].querySelector('strong').textContent = countries.toLocaleString();
    metrics[1].querySelector('small').textContent = countries ? 'Countries represented' : 'Add your country in your profile';
  }
  if (metrics[2]) {
    metrics[2].querySelector('strong').textContent = todayCount.toLocaleString();
    metrics[2].querySelector('small').textContent = todayCount === 1 ? 'New citizen today' : 'New citizens today';
  }

  const list = document.querySelector('#citizenList');
  if (!list) return;
  if (!list.dataset.profileBound) {
    list.dataset.profileBound = '1';
    list.addEventListener('click', e => {
      const row = e.target.closest('.citizen-row');
      if (!row) return;
      const text = row.querySelector('.citizen-number')?.textContent || '';
      const n = Number(text.replace(/\D/g, ''));
      if (n) showCitizenProfile(n);
    });
  }
}

function profileUrl(citizenNo) {
  const url = new URL(location.href);
  url.searchParams.set('citizen', padCitizen(citizenNo));
  url.hash = 'citizens';
  return url.toString();
}

function followStatFor(citizenNo) {
  return orbit.followStats.find(x => Number(x.citizen_no) === Number(citizenNo)) || { follower_count: 0, following_count: 0 };
}

function openProfileFromUrl() {
  const raw = new URL(location.href).searchParams.get('citizen');
  const citizenNo = Number(String(raw || '').replace(/\D/g, ''));
  if (!citizenNo || !citizenByNo(citizenNo)) return;
  const title = citizenNo === 1 ? 'Founder Profile' : 'Citizen Profile';
  const current = document.querySelector('#sectionTitle')?.textContent || '';
  if (!['Citizens','Citizen Profile','Founder Profile'].includes(current)) return;
  showCitizenProfile(citizenNo, { title, backRoute: 'citizens', updateUrl: false });
}

function clearCitizenFromUrl() {
  const url = new URL(location.href);
  if (!url.searchParams.has('citizen')) return;
  url.searchParams.delete('citizen');
  history.replaceState({}, '', url);
}

function showCitizenProfile(citizenNo, options = {}) {
  const citizen = citizenByNo(citizenNo);
  if (!citizen) return toast('Citizen profile not found.');

  const view = document.querySelector('#view');
  const sectionTitle = document.querySelector('#sectionTitle');
  const sectionKicker = document.querySelector('#sectionKicker');
  if (!view) return;

  sectionKicker.textContent = 'PROJECT ORBIT';
  sectionTitle.textContent = options.title || (citizen.is_founder ? 'Founder Profile' : 'Citizen Profile');

  if (options.updateUrl !== false) {
    const url = new URL(profileUrl(citizenNo));
    history.pushState({ citizen: citizenNo }, '', url);
  }

  const own = orbit.profile && Number(orbit.profile.citizen_no) === Number(citizenNo);
  const following = orbit.myFollowing.has(Number(citizenNo));
  const social = followStatFor(citizenNo);
  const citizenPosts = orbit.posts.filter(p => Number(p.author_citizen_no) === Number(citizenNo));
  const likesReceived = citizenPosts.reduce((sum, p) => sum + Number(statByPost(p.id).like_count || 0), 0);
  const joined = new Date(citizen.joined_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const url = profileUrl(citizenNo);

  let followAction = '';
  if (!own) {
    if (!orbit.user) followAction = '<button class="btn primary" id="profileLoginFollow">Log in to follow</button>';
    else if (citizenNo === 1 && following) followAction = '<button class="btn secondary following" disabled>Following · required</button>';
    else followAction = `<button class="btn ${following ? 'secondary following' : 'primary'}" id="followCitizenBtn">${following ? 'Following' : 'Follow'}</button>`;
  }

  view.innerHTML = `<div class="stack">
    <div class="card profile-page">
      <div class="profile-page-banner"></div>
      <div class="profile-page-main">
        <div class="profile-page-avatar">${avatarMarkup(citizen)}</div>
        <div class="profile-page-name"><h2>${esc(citizen.display_name)} ${citizen.is_founder ? '✓' : ''}</h2>${citizen.is_founder ? '<span class="pill gold">FOUNDER</span><span class="pill green">OFFICIAL</span>' : ''}</div>
        <div class="profile-meta">${esc(citizen.role)} · Citizen #${padCitizen(citizen.citizen_no)}${citizen.country ? ` · ${esc(citizen.country)}` : ''}</div>
        <p class="profile-page-bio">${esc(citizen.bio || (citizen.is_founder ? 'Building a digital civilization around community, exploration, science, and real space projects.' : 'This citizen has not added a bio yet.'))}</p>
        <div class="profile-actions">
          <button class="btn secondary" id="profileBackBtn" data-route="${options.backRoute || 'citizens'}">← Back</button>
          ${followAction}
          ${own ? '<button class="btn primary" id="editProfileBtn">Edit profile</button><button class="btn secondary" id="profileSettingsBtn">Settings</button>' : ''}
          <button class="btn secondary" id="shareProfileBtn">Share profile</button>
        </div>
        <div class="profile-social-stats">
          <div><strong>${Number(social.follower_count || 0)}</strong><span>Followers</span></div>
          <div><strong>${Number(social.following_count || 0)}</strong><span>Following</span></div>
          <div><strong>${citizenPosts.length}</strong><span>Posts</span></div>
        </div>
        <p class="muted" style="margin-top:14px">${likesReceived} like${likesReceived === 1 ? '' : 's'} received · Joined ${esc(joined)}</p>
        <div class="public-link-box"><input value="${esc(url)}" readonly /><button class="btn secondary" id="copyProfileUrl">Copy</button></div>
      </div>
    </div>
    <div class="card"><h3>Recent posts</h3>${citizenPosts.length ? citizenPosts.slice(0, 8).map(p => `<div class="profile-post-mini"><small>${relativeTime(p.created_at)}</small><p>${esc(p.body)}</p></div>`).join('') : '<p class="muted">No posts yet.</p>'}</div>
  </div>`;

  viewRootSeen = view.firstElementChild;
  view.querySelector('#editProfileBtn')?.addEventListener('click', openProfileEditor);
  view.querySelector('#profileSettingsBtn')?.addEventListener('click', renderSettings);
  view.querySelector('#profileLoginFollow')?.addEventListener('click', () => document.querySelector('#accountBtn')?.click());
  view.querySelector('#followCitizenBtn')?.addEventListener('click', async e => {
    const btn = e.currentTarget; btn.disabled = true;
    let error;
    if (orbit.myFollowing.has(Number(citizenNo))) ({ error } = await db.from('follows').delete().eq('following_citizen_no', citizenNo));
    else ({ error } = await db.from('follows').insert({ following_citizen_no: citizenNo }));
    if (error) { toast(error.message); btn.disabled = false; return; }
    await fetchNetworkAndSettings();
    showCitizenProfile(citizenNo, { ...options, updateUrl: false });
  });
  view.querySelector('#profileBackBtn')?.addEventListener('click', clearCitizenFromUrl);
  view.querySelector('#copyProfileUrl')?.addEventListener('click', async () => { await navigator.clipboard?.writeText(url); toast('Profile link copied.'); });
  view.querySelector('#shareProfileBtn')?.addEventListener('click', async () => {
    if (navigator.share) { try { await navigator.share({ title: `${citizen.display_name} · Project Orbit`, url }); } catch {} }
    else { await navigator.clipboard?.writeText(url); toast('Profile link copied.'); }
  });
}

function bindCitizenProfileLinks(root = document) {
  root.querySelectorAll('[data-citizen-profile]').forEach(btn => {
    if (btn.dataset.profileLinkBound) return;
    btn.dataset.profileLinkBound = '1';
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      showCitizenProfile(Number(btn.dataset.citizenProfile));
    });
  });
}

function openProfileEditor() {
  if (!orbit.user || !orbit.profile) return;
  const p = orbit.profile;
  const wrap = modal(`
    <div class="auth-modal-head">
      <div><span class="eyebrow">MY CITIZEN PROFILE</span><h2>Edit profile</h2></div>
      <button class="icon-btn" data-close-v13 aria-label="Close">×</button>
    </div>
    <form class="profile-edit-grid" id="profileEditForm">
      <div class="avatar-preview">${avatarMarkup(p)}<div><strong>Profile image</strong><p class="muted" style="margin:3px 0">JPEG, PNG, or WebP · max 2 MB</p></div></div>
      <label>Avatar image
        <input class="auth-input" id="profileAvatar" type="file" accept="image/jpeg,image/png,image/webp" />
      </label>
      <label>Display name
        <input id="profileName" maxlength="80" value="${esc(p.display_name || '')}" required />
      </label>
      <label>Country
        <input id="profileCountry" maxlength="80" value="${esc(p.country || '')}" placeholder="United States" />
      </label>
      <label>Bio
        <textarea id="profileBio" maxlength="500" placeholder="Tell the nation about yourself…">${esc(p.bio || '')}</textarea>
      </label>
      <p class="auth-message" id="profileEditMessage"></p>
      <button class="btn primary full" type="submit">Save profile</button>
    </form>
  `, 'orbitProfileModal');

  wrap.querySelector('#profileEditForm').addEventListener('submit', async e => {
    e.preventDefault();
    const submit = e.currentTarget.querySelector('button[type="submit"]');
    const message = wrap.querySelector('#profileEditMessage');
    const file = wrap.querySelector('#profileAvatar').files?.[0] || null;
    const display_name = wrap.querySelector('#profileName').value.trim();
    const country = wrap.querySelector('#profileCountry').value.trim() || null;
    const bio = wrap.querySelector('#profileBio').value.trim() || null;

    if (!display_name) {
      message.className = 'auth-message error';
      message.textContent = 'Display name is required.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Saving…';

    let avatar_url = p.avatar_url || null;

    if (file) {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (!allowed.includes(file.type) || file.size > 2097152) {
        message.className = 'auth-message error';
        message.textContent = 'Choose a JPEG, PNG, or WebP image no larger than 2 MB.';
        submit.disabled = false;
        submit.textContent = 'Save profile';
        return;
      }

      const path = `${orbit.user.id}/avatar`;
      const upload = await db.storage.from('avatars').upload(path, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: '3600'
      });

      if (upload.error) {
        message.className = 'auth-message error';
        message.textContent = upload.error.message;
        submit.disabled = false;
        submit.textContent = 'Save profile';
        return;
      }

      const publicData = db.storage.from('avatars').getPublicUrl(path);
      avatar_url = `${publicData.data.publicUrl}?v=${Date.now()}`;
    }

    const { error } = await db
      .from('profiles')
      .update({ display_name, country, bio, avatar_url })
      .eq('citizen_no', p.citizen_no);

    if (error) {
      message.className = 'auth-message error';
      message.textContent = error.message;
      submit.disabled = false;
      submit.textContent = 'Save profile';
      return;
    }

    await fetchSessionProfile();
    await Promise.all([fetchCitizens(), fetchSocial()]);
    wrap.remove();
    showCitizenProfile(p.citizen_no);
    toast('Profile updated.');
  });
}

/* =========================
   NOTIFICATIONS / SETTINGS / SENATE
   ========================= */

function wireNotificationButton() {
  const btn = document.querySelector('.notification-dot');
  if (!btn) return;
  const unread = orbit.notifications.filter(n => !n.read_at).length;
  btn.innerHTML = `◉${unread ? `<span class="notification-count">${unread > 99 ? '99+' : unread}</span>` : ''}`;
  if (!btn.dataset.notificationsBound) {
    btn.dataset.notificationsBound = '1';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); orbit.user ? openNotifications() : document.querySelector('#accountBtn')?.click(); });
  }
}

async function markNotificationRead(id) {
  if (!orbit.user) return;
  await db.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  await fetchNetworkAndSettings(); wireNotificationButton();
}

function openNotifications() {
  if (!orbit.user) return document.querySelector('#accountBtn')?.click();
  const rows = orbit.notifications.map(n => {
    const actor = citizenByNo(n.actor_citizen_no) || { display_name: 'Project Orbit' };
    return `<div class="notification-row ${n.read_at ? 'read' : 'unread'}" data-notification-id="${n.id}" data-notification-kind="${n.kind}" data-notification-actor="${n.actor_citizen_no || ''}">
      ${avatarMarkup(actor)}<div class="notification-copy"><strong>${esc(actor.display_name)} ${esc(n.message || n.kind)}</strong><small>${relativeTime(n.created_at)}</small></div>${n.read_at ? '' : '<span class="pill green">NEW</span>'}
    </div>`;
  }).join('') || '<p class="muted">No notifications yet.</p>';

  const wrap = modal(`<div class="auth-modal-head"><div><span class="eyebrow">PROJECT ORBIT</span><h2>Notifications</h2></div><button class="icon-btn" data-close-v13>×</button></div>
    <div class="section-row"><small>${orbit.notifications.filter(n => !n.read_at).length} unread</small><button class="text-btn" id="markAllRead">Mark all read</button></div><div>${rows}</div>`, 'orbitNotificationsModal');

  wrap.querySelector('#markAllRead')?.addEventListener('click', async () => {
    const ids = orbit.notifications.filter(n => !n.read_at).map(n => n.id);
    if (ids.length) await db.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    await fetchNetworkAndSettings(); wireNotificationButton(); wrap.remove(); openNotifications();
  });

  wrap.querySelectorAll('[data-notification-id]').forEach(row => row.addEventListener('click', async () => {
    await markNotificationRead(Number(row.dataset.notificationId));
    const kind = row.dataset.notificationKind;
    const actor = Number(row.dataset.notificationActor);
    wrap.remove();
    if (kind === 'follow' && actor) showCitizenProfile(actor);
    else if (kind === 'senate') { clearCitizenFromUrl(); location.hash = 'senate'; }
    else { clearCitizenFromUrl(); location.hash = 'home'; }
  }));
}

function enhanceMore() {
  const grid = document.querySelector('.more-grid');
  if (!grid || grid.querySelector('[data-orbit-settings]')) return;
  const button = document.createElement('button');
  button.className = 'more-tile';
  button.dataset.orbitSettings = '1';
  button.innerHTML = '<span>⚙</span><strong>Settings</strong><small>Account, notifications, and security</small>';
  grid.appendChild(button);
  button.addEventListener('click', renderSettings);
}

function renderSettings() {
  clearCitizenFromUrl();
  const view = document.querySelector('#view');
  document.querySelector('#sectionKicker').textContent = 'PROJECT ORBIT';
  document.querySelector('#sectionTitle').textContent = 'Settings';

  if (!orbit.user || !orbit.profile) {
    view.innerHTML = '<div class="card"><h3>Account settings</h3><p class="muted">Log in to manage your Project Orbit account.</p><button class="btn primary" id="settingsLogin">Log in</button></div>';
    view.querySelector('#settingsLogin').addEventListener('click', () => document.querySelector('#accountBtn')?.click());
    viewRootSeen = view.firstElementChild; return;
  }

  const p = orbit.preferences || { likes:true, comments:true, follows:true, senate:true };
  view.innerHTML = `<div class="settings-stack">
    <div class="card"><div class="section-row"><div><span class="eyebrow">ACCOUNT</span><h3 style="margin:6px 0">${esc(orbit.profile.display_name)}</h3></div>${avatarMarkup(orbit.profile)}</div><p class="muted">${esc(orbit.user.email || '')} · Citizen #${padCitizen(orbit.profile.citizen_no)}</p><div class="profile-actions"><button class="btn primary" id="settingsEditProfile">Edit profile</button><button class="btn secondary" id="settingsPublicProfile">Public profile</button><button class="btn secondary" data-route="more">← More</button></div></div>
    <div class="card"><h3>In-app notifications</h3>${[['likes','Likes','Notify me when someone likes my post'],['comments','Comments','Notify me when someone comments on my post'],['follows','New followers','Notify me when someone follows me'],['senate','Senate activity','Notify me about new Senate bills']].map(([key,title,desc]) => `<div class="setting-row"><div><strong>${title}</strong><small>${desc}</small></div><label class="switch"><input type="checkbox" data-pref="${key}" ${p[key] ? 'checked' : ''}><span></span></label></div>`).join('')}</div>
    <div class="card"><h3>Security</h3><form class="admin-form" id="changePasswordForm"><label>New password<input id="newPassword" type="password" minlength="8" placeholder="At least 8 characters" required /></label><p class="admin-note">Changing your password updates your Supabase login. Your citizen number and profile stay the same.</p><button class="btn secondary" type="submit">Change password</button></form></div>
    <div class="card"><h3>Profile visibility</h3><p class="muted">Citizen number, display name, role, bio, avatar, country, follower counts, and public posts are part of the public citizen profile. Your email and notification settings are private.</p></div>
    <div class="card"><button class="btn danger full" id="settingsSignOut">Sign out</button></div>
  </div>`;
  viewRootSeen = view.firstElementChild;

  view.querySelector('#settingsEditProfile').addEventListener('click', openProfileEditor);
  view.querySelector('#settingsPublicProfile').addEventListener('click', () => showCitizenProfile(orbit.profile.citizen_no, { title: orbit.profile.is_founder ? 'Founder Profile' : 'Citizen Profile', backRoute: 'more' }));
  view.querySelectorAll('[data-pref]').forEach(input => input.addEventListener('change', async () => {
    const key = input.dataset.pref;
    const patch = { [key]: input.checked, updated_at: new Date().toISOString() };
    const { error } = await db.from('notification_preferences').update(patch).eq('citizen_no', orbit.profile.citizen_no);
    if (error) { toast(error.message); input.checked = !input.checked; return; }
    orbit.preferences = { ...(orbit.preferences || {}), [key]: input.checked }; toast('Notification setting saved.');
  }));
  view.querySelector('#changePasswordForm').addEventListener('submit', async e => {
    e.preventDefault(); const password = view.querySelector('#newPassword').value;
    const button = e.currentTarget.querySelector('button'); button.disabled = true;
    const { error } = await db.auth.updateUser({ password });
    if (error) { toast(error.message); button.disabled = false; return; }
    view.querySelector('#newPassword').value = ''; button.disabled = false; toast('Password updated.');
  });
  view.querySelector('#settingsSignOut').addEventListener('click', async () => { await db.auth.signOut(); location.hash = 'home'; });
}

function billTallyFor(id) { return orbit.billTallies.find(t => Number(t.bill_id) === Number(id)) || { yes_count:0, no_count:0, abstain_count:0 }; }
function billStatus(bill) { if (bill.status !== 'open') return bill.status; return Date.now() >= new Date(bill.closes_at).getTime() ? 'closed' : 'open'; }

function renderSenateLive() {
  clearCitizenFromUrl();
  const view = document.querySelector('#view');
  const currentMember = orbit.profile ? orbit.senateMembers.find(m => Number(m.citizen_no) === Number(orbit.profile.citizen_no) && m.active) : null;
  const activeMembers = orbit.senateMembers.filter(m => m.active);
  const activeBills = orbit.bills.filter(b => billStatus(b) === 'open');

  const billsHtml = orbit.bills.map(bill => {
    const tally = billTallyFor(bill.id); const yes=Number(tally.yes_count||0), no=Number(tally.no_count||0), abstain=Number(tally.abstain_count||0), total=yes+no+abstain;
    const myVote = orbit.profile ? orbit.billVotes.find(v => Number(v.bill_id) === Number(bill.id) && Number(v.citizen_no) === Number(orbit.profile.citizen_no)) : null;
    const sponsor = citizenByNo(bill.sponsor_citizen_no) || { display_name:'Citizen' }; const status=billStatus(bill);
    const pct = n => total ? Math.round(n/total*100) : 0;
    const roll = orbit.billVotes.filter(v => Number(v.bill_id) === Number(bill.id)).map(v => { const c=citizenByNo(v.citizen_no)||{display_name:'Citizen'}; return `<div class="rollcall-row"><span>${esc(c.display_name)} · #${padCitizen(v.citizen_no)}</span><strong>${esc(v.vote.toUpperCase())}</strong></div>`; }).join('');
    return `<section class="card bill-card"><div class="section-row"><span class="senate-badge">B-${String(bill.id).padStart(3,'0')}</span><span class="status ${status === 'open' ? 'active' : 'closed'}">${esc(status.toUpperCase())}</span></div><h3>${esc(bill.title)}</h3><p class="muted">${esc(bill.summary)}</p><small>Sponsored by ${esc(sponsor.display_name)} · closes ${new Date(bill.closes_at).toLocaleDateString()}</small>
      ${bill.body ? `<details style="margin-top:12px"><summary>Read bill text</summary><p style="line-height:1.6;white-space:pre-wrap">${esc(bill.body)}</p></details>` : ''}
      <div style="margin-top:15px"><div class="bill-tally"><span>Yes</span><div class="live-track"><div class="live-fill" style="width:${pct(yes)}%"></div></div><strong>${yes}</strong></div><div class="bill-tally"><span>No</span><div class="live-track"><div class="live-fill" style="width:${pct(no)}%"></div></div><strong>${no}</strong></div><div class="bill-tally"><span>Abstain</span><div class="live-track"><div class="live-fill" style="width:${pct(abstain)}%"></div></div><strong>${abstain}</strong></div></div>
      ${currentMember && currentMember.voting_member && status === 'open' && !myVote ? `<div class="bill-vote-buttons"><button class="btn primary" data-bill-vote="${bill.id}:yes">Yes</button><button class="btn danger" data-bill-vote="${bill.id}:no">No</button><button class="btn secondary" data-bill-vote="${bill.id}:abstain">Abstain</button></div>` : ''}
      ${myVote ? `<div class="live-vote-status">Your final Senate vote: <strong>${esc(myVote.vote.toUpperCase())}</strong></div>` : ''}
      ${orbit.profile?.is_founder && status === 'open' ? `<div class="bill-admin-row"><button class="text-btn" style="color:#ff9d9d" data-close-bill="${bill.id}">Close & tally bill</button></div>` : ''}
      ${roll ? `<details style="margin-top:12px"><summary>Public roll call (${total})</summary>${roll}</details>` : '<p class="muted" style="margin-top:12px">No Senate votes yet.</p>'}
    </section>`;
  }).join('');

  view.innerHTML = `<div class="stack senate-live-root"><div class="senate-visual"></div><div class="grid-3"><div class="card metric"><span>Active members</span><strong>${activeMembers.length}</strong><small>150 seats planned</small></div><div class="card metric"><span>Open bills</span><strong>${activeBills.length}</strong><small>Database-backed</small></div><div class="card metric"><span>Your status</span><strong>${currentMember ? 'Member' : 'Citizen'}</strong><small>${currentMember ? esc(currentMember.title) : 'No Senate seat'}</small></div></div>
    <div class="card"><div class="section-row"><h3>Founding Senate</h3>${currentMember ? '<button class="btn primary" id="createBillBtn">Introduce bill</button>' : '<span class="pill blue">ELECTION PENDING</span>'}</div>${activeMembers.map(m => { const c=citizenByNo(m.citizen_no)||{display_name:'Citizen'}; return `<div class="senate-member-row"><span>${esc(c.display_name)} · #${padCitizen(m.citizen_no)}</span><strong>${esc(m.title)}</strong></div>`; }).join('')}</div>${billsHtml}</div>`;
  viewRootSeen = view.firstElementChild;

  view.querySelector('#createBillBtn')?.addEventListener('click', openCreateBill);
  view.querySelectorAll('[data-bill-vote]').forEach(btn => btn.addEventListener('click', async () => { const [id,vote]=btn.dataset.billVote.split(':'); if(!confirm(`Cast your final Senate vote: ${vote.toUpperCase()}?`))return; const {error}=await db.from('bill_votes').insert({bill_id:Number(id),vote}); if(error)toast(error.message); else toast('Senate vote recorded.'); await fetchSenate(); renderSenateLive(); }));
  view.querySelectorAll('[data-close-bill]').forEach(btn => btn.addEventListener('click', async () => { if(!confirm('Close this bill and calculate the result now?'))return; const {data,error}=await db.rpc('founder_close_bill',{p_bill_id:Number(btn.dataset.closeBill)}); if(error)toast(error.message); else toast(`Bill closed: ${String(data).toUpperCase()}`); await fetchSenate(); renderSenateLive(); }));
}

function openCreateBill() {
  const wrap = modal(`<div class="auth-modal-head"><div><span class="eyebrow">FOUNDING SENATE</span><h2>Introduce bill</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="newBillForm"><label>Bill title<input id="billTitle" maxlength="250" required /></label><label>Summary<textarea id="billSummary" maxlength="1000" required></textarea></label><label>Bill text<textarea id="billBody" maxlength="10000" placeholder="Optional full bill text"></textarea></label><label>Voting period (days)<input id="billDays" type="number" min="1" max="30" value="7" required /></label><p class="auth-message" id="billMessage"></p><button class="btn primary full" type="submit">Introduce bill</button></form>`, 'orbitBillModal');
  wrap.querySelector('#newBillForm').addEventListener('submit', async e => { e.preventDefault(); const button=e.currentTarget.querySelector('button'); button.disabled=true; const days=Math.max(1,Math.min(30,Number(wrap.querySelector('#billDays').value)||7)); const {error}=await db.rpc('senate_create_bill',{p_title:wrap.querySelector('#billTitle').value.trim(),p_summary:wrap.querySelector('#billSummary').value.trim(),p_body:wrap.querySelector('#billBody').value.trim()||null,p_closes_at:new Date(Date.now()+days*86400000).toISOString()}); if(error){wrap.querySelector('#billMessage').textContent=error.message;wrap.querySelector('#billMessage').className='auth-message error';button.disabled=false;return;} wrap.remove(); await fetchSenate(); renderSenateLive(); toast('Bill introduced to the Senate.'); });
}

/* =========================
   ELECTIONS + FOUNDER ADMIN
   ========================= */

function referendumStatus(ref) {
  const now = Date.now();
  if (ref.status === 'closed' || now >= new Date(ref.closes_at).getTime()) return 'closed';
  if (ref.status === 'upcoming' || now < new Date(ref.opens_at).getTime()) return 'upcoming';
  return 'active';
}

function renderElections() {
  const view = document.querySelector('#view');
  if (!view) return;

  const admin = orbit.profile?.is_founder ? `<section class="card founder-admin">
    <span class="eyebrow">FOUNDER ADMINISTRATION</span>
    <h3>Referendum controls</h3>
    <p class="muted">Create a new national referendum or close an active one. These controls are authorized by your Founder citizen record in Supabase—not by browser metadata.</p>
    <div class="founder-admin-actions"><button class="btn primary" id="createRefBtn">Create referendum</button></div>
  </section>` : '';

  const cards = orbit.refs.map(ref => {
    const status = referendumStatus(ref);
    const options = orbit.opts
      .filter(o => Number(o.referendum_id) === Number(ref.id))
      .sort((a, b) => a.position - b.position);
    const mine = orbit.votes.find(v => Number(v.referendum_id) === Number(ref.id));
    const total = options.reduce((sum, o) => sum + Number(orbit.tallies.find(t => Number(t.option_id) === Number(o.id))?.vote_count || 0), 0);

    const buttons = options.map(o => `<button class="live-option ${Number(mine?.option_id) === Number(o.id) ? 'selected' : ''}" data-vote-live="${ref.id}:${o.id}" ${mine || status !== 'active' ? 'disabled' : ''}>
      <span>${esc(o.label)}</span><span>${Number(mine?.option_id) === Number(o.id) ? '✓ Your vote' : 'Vote'}</span>
    </button>`).join('');

    const results = options.map(o => {
      const count = Number(orbit.tallies.find(t => Number(t.option_id) === Number(o.id))?.vote_count || 0);
      const pct = total ? Math.round(count / total * 100) : 0;
      return `<div class="live-result"><span>${esc(o.label)}</span><div class="live-track"><div class="live-fill" style="width:${pct}%"></div></div><strong>${pct}%</strong></div>`;
    }).join('');

    const chosen = options.find(o => Number(o.id) === Number(mine?.option_id));

    return `<section class="card live-ref">
      <div class="section-row">
        <span class="status ${status}">${status.toUpperCase()}</span>
        ${orbit.profile?.is_founder && status !== 'closed' ? `<button class="text-btn" data-close-ref="${ref.id}" style="color:#ff9d9d">Close referendum</button>` : ''}
      </div>
      <h3>${esc(ref.title)}</h3>
      <p class="muted">${esc(ref.description || '')}</p>
      <div class="live-options">${buttons}</div>
      ${results}
      <div class="live-ref-meta"><small>${total} vote${total === 1 ? '' : 's'} cast</small><small>${status === 'active' ? timeRemaining(ref.closes_at) : status === 'upcoming' ? 'Voting has not opened' : 'Voting closed'}</small></div>
      ${mine ? `<div class="live-vote-status"><strong>Your vote is recorded:</strong> ${esc(chosen?.label || 'Selected option')}. One vote is permitted per citizen.</div>` :
        !orbit.user && status === 'active' ? '<div class="live-vote-status">Log in as a citizen to vote.</div>' :
        orbit.user && status === 'active' ? '<div class="live-vote-status">Your vote is final once submitted. Individual ballots are private; aggregate totals are public.</div>' : ''}
    </section>`;
  }).join('');

  view.innerHTML = `<div class="live-election-stack">${admin}${cards || '<div class="card"><p class="muted">No referendums yet.</p></div>'}</div>`;
  viewRootSeen = view.firstElementChild;

  view.querySelector('#createRefBtn')?.addEventListener('click', openCreateReferendum);

  view.querySelectorAll('[data-close-ref]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Close this referendum now? Citizens will no longer be able to vote.')) return;
      btn.disabled = true;
      const { error } = await db.rpc('founder_close_referendum', {
        p_referendum_id: Number(btn.dataset.closeRef)
      });
      if (error) toast(error.message);
      else toast('Referendum closed.');
      await fetchElections();
      renderElections();
    });
  });

  view.querySelectorAll('[data-vote-live]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!orbit.user || !orbit.profile) {
        document.querySelector('#accountBtn')?.click();
        return;
      }
      const [refId, optionId] = btn.dataset.voteLive.split(':').map(Number);
      const option = orbit.opts.find(o => Number(o.id) === optionId);
      if (!confirm(`Cast your final vote for "${option?.label || 'this option'}"?`)) return;

      view.querySelectorAll(`[data-vote-live^="${refId}:"]`).forEach(x => x.disabled = true);
      const { error } = await db.from('votes').insert({
        referendum_id: refId,
        option_id: optionId
      });

      if (error) toast(error.code === '23505' ? 'You have already voted in this referendum.' : error.message);
      else toast('Your vote has been recorded.');

      await fetchElections();
      renderElections();
    });
  });
}

function openCreateReferendum() {
  if (!orbit.profile?.is_founder) return;
  const wrap = modal(`
    <div class="auth-modal-head">
      <div><span class="eyebrow">FOUNDER ADMINISTRATION</span><h2>Create referendum</h2></div>
      <button class="icon-btn" data-close-v13 aria-label="Close">×</button>
    </div>
    <form class="admin-form" id="newRefForm">
      <label>Question / title
        <input id="refTitle" maxlength="250" required placeholder="Should Project Orbit…?" />
      </label>
      <label>Description
        <textarea id="refDescription" maxlength="1500" placeholder="Explain what citizens are voting on."></textarea>
      </label>
      <label>Voting period (days)
        <input id="refDays" type="number" min="1" max="30" value="7" required />
      </label>
      <label>Options — one per line
        <textarea id="refOptions" required>Yes
No</textarea>
      </label>
      <p class="admin-note">2–6 unique options. The referendum opens immediately and automatically stops accepting votes at the closing time. You can also close it early.</p>
      <p class="auth-message" id="refMessage"></p>
      <button class="btn primary full" type="submit">Publish referendum</button>
    </form>
  `, 'orbitRefModal');

  wrap.querySelector('#newRefForm').addEventListener('submit', async e => {
    e.preventDefault();
    const title = wrap.querySelector('#refTitle').value.trim();
    const description = wrap.querySelector('#refDescription').value.trim();
    const days = Number(wrap.querySelector('#refDays').value);
    const options = [...new Set(wrap.querySelector('#refOptions').value.split('\n').map(x => x.trim()).filter(Boolean))];
    const message = wrap.querySelector('#refMessage');
    const submit = e.currentTarget.querySelector('button[type="submit"]');

    if (options.length < 2 || options.length > 6) {
      message.className = 'auth-message error';
      message.textContent = 'Enter between 2 and 6 unique options.';
      return;
    }

    const closesAt = new Date(Date.now() + Math.max(1, Math.min(30, days)) * 86400000).toISOString();
    submit.disabled = true;
    submit.textContent = 'Publishing…';

    const { error } = await db.rpc('founder_create_referendum', {
      p_title: title,
      p_description: description || null,
      p_closes_at: closesAt,
      p_options: options
    });

    if (error) {
      message.className = 'auth-message error';
      message.textContent = error.message;
      submit.disabled = false;
      submit.textContent = 'Publish referendum';
      return;
    }

    wrap.remove();
    await fetchElections();
    renderElections();
    toast('Referendum published.');
  });
}

/* =========================
   ROUTE ENHANCEMENT
   ========================= */

function enhanceCurrentView(force = false) {
  const view = document.querySelector('#view');
  const root = view?.firstElementChild;
  const title = document.querySelector('#sectionTitle')?.textContent || '';

  if (title === 'Elections') {
    if (force || root !== viewRootSeen || !root?.classList.contains('live-election-stack')) renderElections();
    return;
  }
  if (title === 'Senate') { if (force || root !== viewRootSeen || !root?.classList?.contains('senate-live-root')) renderSenateLive(); return; }
  if (title === 'Founder Profile') { if (force || !root?.querySelector?.('.profile-page')) showCitizenProfile(1, { title: 'Founder Profile', backRoute: 'more', updateUrl: false }); return; }
  if (title === 'Citizen Profile') { const raw = new URL(location.href).searchParams.get('citizen'); const n = Number(String(raw || '').replace(/\D/g, '')); if (n && (force || !root?.querySelector?.('.profile-page'))) showCitizenProfile(n, { title: 'Citizen Profile', backRoute: 'citizens', updateUrl: false }); return; }
  if (title === 'Settings') return;

  if (!force && root === viewRootSeen) return;
  viewRootSeen = root;
  if (title === 'Home') enhanceHome();
  if (title === 'Citizens') enhanceCitizens();
  if (title === 'More') enhanceMore();
}

function scheduleRefresh(kind) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    if (kind === 'citizens') await Promise.all([fetchCitizens(), fetchNetworkAndSettings()]);
    else if (kind === 'social') await Promise.all([fetchSocial(), fetchNetworkAndSettings()]);
    else if (kind === 'elections') await fetchElections();
    else if (kind === 'network') await fetchNetworkAndSettings();
    else if (kind === 'senate') await Promise.all([fetchSenate(), fetchNetworkAndSettings()]);
    else await Promise.all([fetchCitizens(), fetchSocial(), fetchElections(), fetchNetworkAndSettings(), fetchSenate()]);
    wireNotificationButton();
    enhanceCurrentView(true);
  }, 250);
}

injectStyles();

const viewObserver = new MutationObserver(() => {
  clearTimeout(viewObserver._timer);
  viewObserver._timer = setTimeout(() => enhanceCurrentView(false), 35);
});
viewObserver.observe(document.querySelector('#view'), { childList: true, subtree: false });

db.channel('project-orbit-v14')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => scheduleRefresh('citizens'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'post_stats' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_stats' }, () => scheduleRefresh('network'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => scheduleRefresh('network'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => scheduleRefresh('network'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'referendums' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'referendum_options' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'referendum_option_tallies' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'senate_members' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_votes' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_tallies' }, () => scheduleRefresh('senate'))
  .subscribe();

document.addEventListener('click', e => {
  const route = e.target.closest('[data-route]')?.dataset.route;
  if (route && route !== 'citizens') clearCitizenFromUrl();
});

window.addEventListener('popstate', () => setTimeout(() => { if (new URL(location.href).searchParams.get('citizen')) openProfileFromUrl(); }, 0));

db.auth.onAuthStateChange((_event, session) => {
  orbit.user = session?.user || null;
  setTimeout(() => refreshAll(true), 0);
});

await refreshAll(true);
