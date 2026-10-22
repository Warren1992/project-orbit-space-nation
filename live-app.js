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
  myLikes: new Set(),
  refs: [],
  opts: [],
  tallies: [],
  votes: []
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
  if (document.querySelector('#orbitV13Styles')) return;
  const style = document.createElement('style');
  style.id = 'orbitV13Styles';
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
    db.from('post_stats').select('post_id,like_count,comment_count')
  ];
  if (orbit.user) jobs.push(db.from('post_likes').select('post_id'));
  const results = await Promise.all(jobs);
  orbit.posts = results[0].data || [];
  orbit.stats = results[1].data || [];
  orbit.myLikes = new Set((results[2]?.data || []).map(x => Number(x.post_id)));
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

async function refreshAll(render = true) {
  await fetchSessionProfile();
  await Promise.all([fetchCitizens(), fetchSocial(), fetchElections()]);
  if (render) enhanceCurrentView(true);
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

  if (!orbit.posts.length) {
    list.innerHTML = '<div class="card" style="text-align:center">No national posts yet.</div>';
    return;
  }

  list.innerHTML = orbit.posts.map(post => {
    const author = citizenByNo(post.author_citizen_no) || {
      citizen_no: post.author_citizen_no,
      display_name: 'Citizen',
      role: 'Citizen',
      is_founder: false
    };
    const stats = statByPost(post.id);
    const own = orbit.profile && Number(orbit.profile.citizen_no) === Number(post.author_citizen_no);
    const liked = orbit.myLikes.has(Number(post.id));

    return `<article class="card post-card">
      <div class="post-body">
        <div class="post-head">
          <button class="profile-link-btn" data-citizen-profile="${post.author_citizen_no}" style="border:0;background:none;padding:0">
            ${avatarMarkup(author)}
          </button>
          <div class="post-meta-flex">
            <div>
              <button data-citizen-profile="${post.author_citizen_no}" style="border:0;background:none;color:white;padding:0;font:inherit;text-align:left">
                <strong>${esc(author.display_name)} ${author.is_founder ? '✓' : ''}</strong>
              </button>
              <small>${esc(author.role)} · Citizen #${padCitizen(post.author_citizen_no)} · ${relativeTime(post.created_at)}</small>
            </div>
            ${own ? `<button class="text-btn post-delete-live" data-delete-post="${post.id}">Delete</button>` : ''}
          </div>
        </div>
        <p class="post-copy">${esc(post.body)}</p>
      </div>
      <div class="post-actions">
        <button class="${liked ? 'liked' : ''}" data-like-post="${post.id}">${liked ? '♥' : '♡'} ${Number(stats.like_count || 0)}</button>
        <button data-comments-post="${post.id}">◯ ${Number(stats.comment_count || 0)}</button>
        <button data-share-post="${post.id}">↗ Share</button>
      </div>
    </article>`;
  }).join('');

  list.querySelectorAll('[data-delete-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this post?')) return;
      btn.disabled = true;
      const { error } = await db.from('posts').delete().eq('id', Number(btn.dataset.deletePost));
      if (error) {
        toast(error.message);
        btn.disabled = false;
        return;
      }
      await fetchSocial();
      renderPosts();
      toast('Post deleted.');
    });
  });

  list.querySelectorAll('[data-like-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!orbit.user || !orbit.profile) {
        document.querySelector('#accountBtn')?.click();
        return;
      }
      const postId = Number(btn.dataset.likePost);
      btn.disabled = true;
      let error;
      if (orbit.myLikes.has(postId)) {
        ({ error } = await db.from('post_likes').delete().eq('post_id', postId));
      } else {
        ({ error } = await db.from('post_likes').insert({ post_id: postId }));
      }
      if (error) toast(error.message);
      await fetchSocial();
      renderPosts();
    });
  });

  list.querySelectorAll('[data-comments-post]').forEach(btn => {
    btn.addEventListener('click', () => openComments(Number(btn.dataset.commentsPost)));
  });

  list.querySelectorAll('[data-share-post]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const post = orbit.posts.find(p => Number(p.id) === Number(btn.dataset.sharePost));
      if (!post) return;
      if (navigator.share) {
        try {
          await navigator.share({ title: 'Project Orbit', text: post.body, url: location.href });
        } catch {}
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(`${post.body}\n\n${location.href}`);
        toast('Post copied.');
      }
    });
  });

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

function showCitizenProfile(citizenNo, options = {}) {
  const citizen = citizenByNo(citizenNo);
  if (!citizen) return toast('Citizen profile not found.');

  const view = document.querySelector('#view');
  const sectionTitle = document.querySelector('#sectionTitle');
  const sectionKicker = document.querySelector('#sectionKicker');
  if (!view) return;

  sectionKicker.textContent = 'PROJECT ORBIT';
  sectionTitle.textContent = options.title || 'Citizen Profile';

  const own = orbit.profile && Number(orbit.profile.citizen_no) === Number(citizenNo);
  const citizenPosts = orbit.posts.filter(p => Number(p.author_citizen_no) === Number(citizenNo));
  const likesReceived = citizenPosts.reduce((sum, p) => sum + Number(statByPost(p.id).like_count || 0), 0);
  const joined = new Date(citizen.joined_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  view.innerHTML = `<div class="stack">
    <div class="card profile-page">
      <div class="profile-page-banner"></div>
      <div class="profile-page-main">
        <div class="profile-page-avatar">${avatarMarkup(citizen)}</div>
        <div class="profile-page-name">
          <h2>${esc(citizen.display_name)} ${citizen.is_founder ? '✓' : ''}</h2>
          ${citizen.is_founder ? '<span class="pill gold">FOUNDER</span><span class="pill green">OFFICIAL</span>' : ''}
        </div>
        <div class="profile-meta">${esc(citizen.role)} · Citizen #${padCitizen(citizen.citizen_no)}${citizen.country ? ` · ${esc(citizen.country)}` : ''}</div>
        <p class="profile-page-bio">${esc(citizen.bio || (citizen.is_founder ? 'Building a digital civilization around community, exploration, science, and real space projects.' : 'This citizen has not added a bio yet.'))}</p>
        <div class="profile-actions">
          <button class="btn secondary" data-route="${options.backRoute || 'citizens'}">← Back</button>
          ${own ? '<button class="btn primary" id="editProfileBtn">Edit profile</button>' : ''}
        </div>
        <div class="profile-page-stats">
          <div><strong>${citizenPosts.length}</strong><span>Posts</span></div>
          <div><strong>${likesReceived}</strong><span>Likes received</span></div>
          <div><strong>${esc(citizen.country || '—')}</strong><span>Country</span></div>
        </div>
        <p class="muted" style="margin-top:14px">Joined ${esc(joined)}</p>
      </div>
    </div>
    <div class="card">
      <h3>Recent posts</h3>
      ${citizenPosts.length ? citizenPosts.slice(0, 8).map(p => `<div class="profile-post-mini"><small>${relativeTime(p.created_at)}</small><p>${esc(p.body)}</p></div>`).join('') : '<p class="muted">No posts yet.</p>'}
    </div>
  </div>`;

  viewRootSeen = view.firstElementChild;
  view.querySelector('#editProfileBtn')?.addEventListener('click', openProfileEditor);
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

  if (title === 'Founder Profile') {
    showCitizenProfile(1, { title: 'Founder Profile', backRoute: 'more' });
    return;
  }

  if (!force && root === viewRootSeen) return;
  viewRootSeen = root;

  if (title === 'Home') enhanceHome();
  if (title === 'Citizens') enhanceCitizens();
}

function scheduleRefresh(kind) {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    if (kind === 'citizens') await fetchCitizens();
    else if (kind === 'social') await fetchSocial();
    else if (kind === 'elections') await fetchElections();
    else await Promise.all([fetchCitizens(), fetchSocial(), fetchElections()]);
    enhanceCurrentView(true);
  }, 250);
}

injectStyles();

const viewObserver = new MutationObserver(() => {
  clearTimeout(viewObserver._timer);
  viewObserver._timer = setTimeout(() => enhanceCurrentView(false), 35);
});
viewObserver.observe(document.querySelector('#view'), { childList: true, subtree: false });

db.channel('project-orbit-v13')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => scheduleRefresh('citizens'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'post_stats' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'referendums' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'referendum_options' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'referendum_option_tallies' }, () => scheduleRefresh('elections'))
  .subscribe();

db.auth.onAuthStateChange((_event, session) => {
  orbit.user = session?.user || null;
  setTimeout(() => refreshAll(true), 0);
});

await refreshAll(true);
