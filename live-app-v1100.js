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
  commentLikes: [],
  myCommentLikes: new Set(),
  myLikes: new Set(),
  propositions: [],
  propositionTallies: [],
  propositionVotes: [],
  followStats: [],
  myFollowing: new Set(),
  notifications: [],
  preferences: null,
  senateMembers: [],
  houseMembers: [],
  bills: [],
  billVotes: [],
  billTallies: [],
  houseBillVotes: [],
  houseBillTallies: [],
  billOverrideVotes: [],
  billOverrideTallies: [],
  houseBillOverrideVotes: [],
  houseBillOverrideTallies: [],
  billComments: [],
  postMedia: [],
  events: [],
  eventReminders: [],
  senateElections: [],
  senateCandidates: [],
  senateElectionVotes: [],
  senateCandidateTallies: [],
  houseElections: [],
  houseCandidates: [],
  houseElectionVotes: [],
  houseCandidateTallies: [],
  pendingMediaFiles: [],
  feedMode: 'following',
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
const commentLikeCount = id => orbit.commentLikes.filter(x => Number(x.comment_id) === Number(id)).length;
const commentLikedByMe = id => orbit.myCommentLikes.has(Number(id));
const mediaByPost = id => orbit.postMedia.filter(m => Number(m.post_id) === Number(id)).sort((a,b) => a.position-b.position);
const postImageUrl = path => db.storage.from('post-media').getPublicUrl(path).data.publicUrl;

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
    .profile-post-mini .post-gallery{margin-top:12px;border-radius:14px;overflow:hidden}
    .profile-post-mini .post-gallery.one img,.profile-post-mini .post-gallery.one video{max-height:520px}
    .profile-post-stats{display:flex;gap:16px;color:#8798ad;font-size:12px;margin-top:10px}
    .my-profile-quick-card{border-color:rgba(244,185,66,.28);background:linear-gradient(135deg,rgba(244,185,66,.09),rgba(13,24,40,.96))}
    .comment-list{display:grid;gap:12px;margin:15px 0;max-height:46vh;overflow:auto}
    .comment-row{border:1px solid rgba(255,255,255,.08);border-radius:13px;padding:12px;background:rgba(255,255,255,.03)}
    .comment-head{display:flex;align-items:center;gap:10px}
    .comment-head .avatar{width:36px;height:36px;font-size:13px;flex:0 0 36px}
    .comment-head small{display:block;color:#8798ad}
    .comment-body{margin:9px 0 0;white-space:pre-wrap;line-height:1.5}
    .comment-like-row{display:flex;gap:10px;align-items:center;margin-top:8px}.comment-like-btn{border:0;background:transparent;color:#8fa1b8;padding:0;font-weight:800;font-size:12px}.comment-like-btn.liked{color:#ff8aa2}.comment-like-btn:disabled{opacity:.55}
    .account-search-results{display:grid;gap:8px;margin-top:14px;max-height:52vh;overflow:auto}.account-search-result{width:100%;display:grid;grid-template-columns:44px 1fr auto;gap:10px;align-items:center;text-align:left;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:rgba(255,255,255,.035);color:white;padding:10px}.account-search-result .avatar{width:44px;height:44px;font-size:14px}.account-search-result small{display:block;color:#8193aa;margin-top:2px}.account-search-number{color:#ffd978;font-weight:900;font-size:12px}
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

    .post-media-picker{display:grid;gap:10px;padding:12px 0 4px}.post-media-picker-row{display:flex;gap:9px;align-items:center;flex-wrap:wrap}.photo-pick-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.11);border-radius:12px;padding:9px 12px;background:rgba(255,255,255,.04);color:#d8e2ef;font-weight:800;cursor:pointer}.photo-pick-btn input{display:none}.photo-previews{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.photo-preview{position:relative;aspect-ratio:1;border-radius:12px;overflow:hidden;background:#111d30}.photo-preview img,.photo-preview video{width:100%;height:100%;object-fit:cover}.photo-preview video{background:#000}.photo-preview button{position:absolute;right:5px;top:5px;border:0;border-radius:50%;width:27px;height:27px;background:rgba(0,0,0,.72);color:white;font-weight:900}
    .post-gallery{display:grid;gap:3px;background:#07111f}.post-gallery.one{grid-template-columns:1fr}.post-gallery.two{grid-template-columns:1fr 1fr}.post-gallery.three,.post-gallery.four{grid-template-columns:1fr 1fr}.post-gallery img,.post-gallery video{width:100%;height:100%;object-fit:cover;display:block;max-height:540px}.post-gallery video{background:#000}.post-gallery.two img,.post-gallery.three img,.post-gallery.four img,.post-gallery.two video,.post-gallery.three video,.post-gallery.four video{aspect-ratio:1}.post-gallery.three img:first-child{grid-row:span 2;aspect-ratio:auto}
    .event-card{display:grid;gap:12px}.event-date{font-size:13px;font-weight:900;color:#ffd978}.event-actions{display:flex;gap:9px;flex-wrap:wrap}.reminder-set{color:#7be0b8;font-weight:850}.events-admin{border-color:rgba(244,185,66,.3)}
    .bill-discussion{margin-top:14px;border-top:1px solid rgba(255,255,255,.08);padding-top:12px}.bill-comment{display:grid;grid-template-columns:34px 1fr auto;gap:9px;margin:10px 0}.bill-comment .avatar{width:34px;height:34px;font-size:11px}.bill-comment-copy{background:rgba(255,255,255,.04);border-radius:11px;padding:9px}.bill-comment-copy small{display:block;color:#8193aa;margin-top:2px}.bill-comment-copy p{margin:6px 0 0;white-space:pre-wrap}.bill-comment-form{display:flex;gap:8px;margin-top:10px}.bill-comment-form input{flex:1;min-width:0;border:1px solid rgba(255,255,255,.1);background:#07111f;color:#fff;border-radius:11px;padding:10px}
    .senate-election-card{border-color:rgba(75,163,255,.22)} .congress-chambers{display:grid;grid-template-columns:1fr 1fr;gap:12px}.candidate-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07)}.candidate-row:last-child{border-bottom:0}.candidate-actions{display:flex;gap:8px;align-items:center}.senate-election-admin{display:flex;gap:8px;flex-wrap:wrap}.member-admin-btn{font-size:12px}
    @media(max-width:760px){.congress-chambers{grid-template-columns:1fr}
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
    db.from('comments').select('id,post_id,author_citizen_no,body,created_at').order('created_at', { ascending: true }).limit(500),
    db.from('post_media').select('id,post_id,owner_citizen_no,storage_path,media_type,position,created_at').order('position'),
    db.from('comment_likes').select('comment_id,citizen_no,created_at')
  ];
  if (orbit.user) jobs.push(db.from('post_likes').select('post_id'));
  const results = await Promise.all(jobs);
  orbit.posts = results[0].data || [];
  orbit.stats = results[1].data || [];
  orbit.comments = results[2].data || [];
  orbit.postMedia = results[3].data || [];
  orbit.commentLikes = results[4].data || [];
  orbit.myCommentLikes = new Set(
    (orbit.commentLikes || [])
      .filter(x => orbit.profile && Number(x.citizen_no) === Number(orbit.profile.citizen_no))
      .map(x => Number(x.comment_id))
  );
  orbit.myLikes = new Set((results[5]?.data || []).map(x => Number(x.post_id)));
}

async function fetchElections() {
  const [props,tallies] = await Promise.all([
    db.from('propositions').select('id,proposition_number,title,description,status,opens_at,closes_at,decided_at,created_at').order('proposition_number',{ascending:false}),
    db.from('proposition_tallies').select('proposition_id,yes_count,no_count')
  ]);
  orbit.propositions = props.data || [];
  orbit.propositionTallies = tallies.data || [];
  if (orbit.user) {
    const v = await db.from('proposition_votes').select('proposition_id,vote,created_at');
    orbit.propositionVotes = v.data || [];
  } else orbit.propositionVotes = [];
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
    db.from('notifications').select('id,recipient_citizen_no,actor_citizen_no,kind,post_id,comment_id,bill_id,event_id,election_id,message,read_at,created_at').order('created_at', { ascending: false }).limit(100),
    db.from('notification_preferences').select('citizen_no,likes,comments,follows,senate,updated_at').maybeSingle()
  ]);

  orbit.myFollowing = new Set((follows.data || []).map(x => Number(x.following_citizen_no)));
  orbit.notifications = notifications.data || [];
  orbit.preferences = prefs.data || { likes: true, comments: true, follows: true, senate: true };
}

async function fetchSenate() {
  const [senateMembers,houseMembers,bills,senateVotes,senateTallies,houseVotes,houseTallies,senateOverrideVotes,senateOverrideTallies,houseOverrideVotes,houseOverrideTallies,comments] = await Promise.all([
    db.from('senate_members').select('citizen_no,seat_no,title,voting_member,active,joined_at').order('seat_no',{ascending:true,nullsFirst:false}),
    db.from('house_members').select('citizen_no,seat_no,title,voting_member,active,joined_at').order('seat_no',{ascending:true}),
    db.from('bills').select('id,title,summary,body,status,sponsor_citizen_no,opens_at,closes_at,created_at,origin_chamber,senate_result,house_result,senate_opens_at,senate_closes_at,house_opens_at,house_closes_at,senate_passed_at,house_passed_at,presented_to_executive_at,executive_action,executive_action_at,law_number,override_closes_at,override_result').order('created_at',{ascending:false}),
    db.from('bill_votes').select('bill_id,citizen_no,vote,created_at'),
    db.from('bill_tallies').select('bill_id,yes_count,no_count,abstain_count'),
    db.from('house_bill_votes').select('bill_id,citizen_no,vote,created_at'),
    db.from('house_bill_tallies').select('bill_id,yes_count,no_count,abstain_count'),
    db.from('bill_override_votes').select('bill_id,citizen_no,vote,created_at'),
    db.from('bill_override_tallies').select('bill_id,yes_count,no_count'),
    db.from('house_bill_override_votes').select('bill_id,citizen_no,vote,created_at'),
    db.from('house_bill_override_tallies').select('bill_id,yes_count,no_count'),
    db.from('bill_comments').select('id,bill_id,author_citizen_no,body,created_at').order('created_at',{ascending:true}).limit(1000)
  ]);
  orbit.senateMembers=senateMembers.data||[];
  orbit.houseMembers=houseMembers.data||[];
  orbit.bills=bills.data||[];
  orbit.billVotes=senateVotes.data||[];
  orbit.billTallies=senateTallies.data||[];
  orbit.houseBillVotes=houseVotes.data||[];
  orbit.houseBillTallies=houseTallies.data||[];
  orbit.billOverrideVotes=senateOverrideVotes.data||[];
  orbit.billOverrideTallies=senateOverrideTallies.data||[];
  orbit.houseBillOverrideVotes=houseOverrideVotes.data||[];
  orbit.houseBillOverrideTallies=houseOverrideTallies.data||[];
  orbit.billComments=comments.data||[];
}

async function fetchEvents() {
  const events = await db.from('events').select('id,title,description,starts_at,ends_at,location_label,status,created_by_citizen_no,created_at').order('starts_at');
  orbit.events = events.data || [];
  if (orbit.user) {
    const reminders = await db.from('event_reminders').select('event_id,citizen_no,remind_at,notified_at,created_at');
    orbit.eventReminders = reminders.data || [];
  } else orbit.eventReminders = [];
}

async function fetchSenateElections() {
  const [senateElections,senateCandidates,senateTallies,houseElections,houseCandidates,houseTallies] = await Promise.all([
    db.from('senate_elections').select('id,title,description,seat_no,status,opens_at,closes_at,winner_citizen_no,created_at').order('created_at',{ascending:false}),
    db.from('senate_candidates').select('election_id,citizen_no,statement,created_at').order('created_at'),
    db.from('senate_candidate_tallies').select('election_id,candidate_citizen_no,vote_count'),
    db.from('house_elections').select('id,title,description,seat_no,status,opens_at,closes_at,winner_citizen_no,created_at').order('created_at',{ascending:false}),
    db.from('house_candidates').select('election_id,citizen_no,statement,created_at').order('created_at'),
    db.from('house_candidate_tallies').select('election_id,candidate_citizen_no,vote_count')
  ]);
  orbit.senateElections=senateElections.data||[];
  orbit.senateCandidates=senateCandidates.data||[];
  orbit.senateCandidateTallies=senateTallies.data||[];
  orbit.houseElections=houseElections.data||[];
  orbit.houseCandidates=houseCandidates.data||[];
  orbit.houseCandidateTallies=houseTallies.data||[];

  if (orbit.user) {
    const [senateVotes,houseVotes]=await Promise.all([
      db.from('senate_election_votes').select('election_id,voter_citizen_no,candidate_citizen_no,created_at'),
      db.from('house_election_votes').select('election_id,voter_citizen_no,candidate_citizen_no,created_at')
    ]);
    orbit.senateElectionVotes=senateVotes.data||[];
    orbit.houseElectionVotes=houseVotes.data||[];
  } else {
    orbit.senateElectionVotes=[];
    orbit.houseElectionVotes=[];
  }
}

async function refreshAll(render = true) {
  await fetchSessionProfile();
  await Promise.all([fetchCitizens(), fetchSocial(), fetchElections(), fetchNetworkAndSettings(), fetchSenate(), fetchEvents(), fetchSenateElections()]);
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

  // Home is a true following feed: only the signed-in citizen's own posts
  // plus posts from citizens they explicitly/automatically follow.
  let posts = orbit.posts;
  if (orbit.profile) {
    posts = posts.filter(p =>
      Number(p.author_citizen_no) === Number(orbit.profile.citizen_no) ||
      orbit.myFollowing.has(Number(p.author_citizen_no))
    );
  } else {
    posts = [];
  }

  if (!posts.length) {
    list.innerHTML = `<div class="card" style="text-align:center"><h3>Your following feed is empty</h3><p class="muted">Follow citizens from the Citizens page to see their posts here.</p><button class="btn primary" data-route="citizens">Find citizens</button></div>`;
    return;
  }

  list.innerHTML = posts.map(post => {
    const author = citizenByNo(post.author_citizen_no) || { citizen_no: post.author_citizen_no, display_name: 'Citizen', role: 'Citizen', is_founder: false };
    const stats = statByPost(post.id);
    const own = orbit.profile && Number(orbit.profile.citizen_no) === Number(post.author_citizen_no);
    const liked = orbit.myLikes.has(Number(post.id));
    const expanded = orbit.expandedComments.has(Number(post.id));
    const comments = orbit.comments.filter(c => Number(c.post_id) === Number(post.id));
    const media = mediaByPost(post.id);
    const galleryClass = ['', 'one', 'two', 'three', 'four'][Math.min(media.length, 4)] || 'four';
    const gallery = media.length ? '<div class="post-gallery ' + galleryClass + '">' + media.slice(0,4).map(m => {
      const url = safeUrl(postImageUrl(m.storage_path));
      const isVideo = m.media_type === 'video' || /\.(mp4|webm|mov|m4v)$/i.test(String(m.storage_path || ''));
      if (isVideo) {
        return '<video src="' + esc(url) + '" controls playsinline preload="metadata"></video>';
      }
      return '<button data-post-image="' + esc(url) + '" style="border:0;padding:0;background:none;min-width:0"><img src="' + esc(url) + '" alt="Post image" loading="lazy" /></button>';
    }).join('') + '</div>' : '';

    const commentsHtml = expanded ? `<div class="inline-comments">
      ${comments.length ? comments.slice(-20).map(comment => {
        const cAuthor = citizenByNo(comment.author_citizen_no) || { display_name: 'Citizen' };
        const commentOwn = orbit.profile && Number(orbit.profile.citizen_no) === Number(comment.author_citizen_no);
        return `<div class="inline-comment">
          <button data-citizen-profile="${comment.author_citizen_no}" style="border:0;background:none;padding:0">${avatarMarkup(cAuthor)}</button>
          <div class="inline-comment-copy"><strong>${esc(cAuthor.display_name)} ${cAuthor.is_founder ? '✓' : ''}</strong><small>Citizen #${padCitizen(comment.author_citizen_no)} · ${relativeTime(comment.created_at)}</small><p>${esc(comment.body)}</p><div class="comment-like-row"><button class="comment-like-btn ${commentLikedByMe(comment.id) ? 'liked' : ''}" data-like-comment="${comment.id}" data-comment-post-id="${post.id}">${commentLikedByMe(comment.id) ? '♥ Liked' : '♡ Like'} · ${commentLikeCount(comment.id)}</button></div></div>
          ${commentOwn ? `<button class="comment-delete" data-inline-delete-comment="${comment.id}" data-post-id="${post.id}">×</button>` : ''}
        </div>`;
      }).join('') : '<p class="muted" style="margin:12px 0 0">No comments yet.</p>'}
      ${orbit.user ? `<form class="inline-comment-form" data-inline-comment-form="${post.id}"><input maxlength="500" placeholder="Write a comment…" required /><button class="btn secondary" type="submit">Send</button></form>` : '<button class="btn secondary" data-login-comments>Log in to comment</button>'}
    </div>` : '';

    return `<article class="card post-card">
      <div class="post-body"><div class="post-head"><button class="profile-link-btn" data-citizen-profile="${post.author_citizen_no}" style="border:0;background:none;padding:0">${avatarMarkup(author)}</button>
        <div class="post-meta-flex"><div><button data-citizen-profile="${post.author_citizen_no}" style="border:0;background:none;color:white;padding:0;font:inherit;text-align:left"><strong>${esc(author.display_name)} ${author.is_founder ? '✓' : ''}</strong></button><small>${esc(author.role)} · Citizen #${padCitizen(post.author_citizen_no)} · ${relativeTime(post.created_at)}</small></div>${own ? `<button class="text-btn post-delete-live" data-delete-post="${post.id}">Delete</button>` : ''}</div></div>
        <p class="post-copy">${esc(post.body)}</p></div>
      ${gallery}
      <div class="post-actions"><button class="${liked ? 'liked' : ''}" data-like-post="${post.id}">${liked ? '♥' : '♡'} ${Number(stats.like_count || 0)}</button><button data-toggle-comments="${post.id}">◯ ${Number(stats.comment_count || 0)}</button><button data-share-post="${post.id}">↗ Share</button></div>
      ${commentsHtml}
    </article>`;
  }).join('');

  list.querySelectorAll('[data-post-image]').forEach(btn => btn.addEventListener('click', () => {
    const src=btn.dataset.postImage; if(!src)return;
    modal(`<div class="auth-modal-head"><div><span class="eyebrow">POST IMAGE</span></div><button class="icon-btn" data-close-v13>×</button></div><img src="${esc(src)}" alt="Post image" style="width:100%;max-height:75vh;object-fit:contain;border-radius:14px" />`, 'orbitPostImageModal');
  }));

  list.querySelectorAll('[data-delete-post]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this post and its images?')) return;
    btn.disabled = true;
    const postId=Number(btn.dataset.deletePost); const media=mediaByPost(postId);
    if(media.length) await db.storage.from('post-media').remove(media.map(m=>m.storage_path));
    const { error } = await db.from('posts').delete().eq('id', postId);
    if (error) { toast(error.message); btn.disabled = false; return; }
    await fetchSocial(); renderPosts(); toast('Post deleted.');
  }));

  list.querySelectorAll('[data-like-post]').forEach(btn => btn.addEventListener('click', async () => {
    if (!orbit.user || !orbit.profile) { document.querySelector('#accountBtn')?.click(); return; }
    const postId = Number(btn.dataset.likePost); btn.disabled = true; let error;
    if (orbit.myLikes.has(postId)) ({ error } = await db.from('post_likes').delete().eq('post_id', postId));
    else ({ error } = await db.from('post_likes').insert({ post_id: postId }));
    if (error) toast(error.message);
    await Promise.all([fetchSocial(), fetchNetworkAndSettings()]); renderPosts(); wireNotificationButton();
  }));

  list.querySelectorAll('[data-toggle-comments]').forEach(btn => btn.addEventListener('click', () => {
    const id = Number(btn.dataset.toggleComments); if (orbit.expandedComments.has(id)) orbit.expandedComments.delete(id); else orbit.expandedComments.add(id); renderPosts();
  }));

  list.querySelectorAll('[data-inline-comment-form]').forEach(form => form.addEventListener('submit', async e => {
    e.preventDefault(); const postId = Number(form.dataset.inlineCommentForm); const input = form.querySelector('input'); const body = input.value.trim(); if (!body) return;
    const button = form.querySelector('button'); button.disabled = true;
    const { error } = await db.from('comments').insert({ post_id: postId, body });
    if (error) { toast(error.message); button.disabled = false; return; }
    await Promise.all([fetchSocial(), fetchNetworkAndSettings()]); orbit.expandedComments.add(postId); renderPosts(); wireNotificationButton();
  }));

  list.querySelectorAll('[data-like-comment]').forEach(btn => btn.addEventListener('click', async () => {
    if (!orbit.user || !orbit.profile) return;
    const commentId = Number(btn.dataset.likeComment);
    const postId = Number(btn.dataset.commentPostId);
    btn.disabled = true;
    let error;
    if (orbit.myCommentLikes.has(commentId)) ({ error } = await db.from('comment_likes').delete().eq('comment_id', commentId));
    else ({ error } = await db.from('comment_likes').insert({ comment_id: commentId }));
    if (error) { toast(error.message); btn.disabled = false; return; }
    await Promise.all([fetchSocial(), fetchNetworkAndSettings()]);
    orbit.expandedComments.add(postId);
    renderPosts();
    wireNotificationButton();
  }));

  list.querySelectorAll('[data-inline-delete-comment]').forEach(btn => btn.addEventListener('click', async () => {
    if (!confirm('Delete this comment?')) return; const { error } = await db.from('comments').delete().eq('id', Number(btn.dataset.inlineDeleteComment)); if (error) return toast(error.message);
    await fetchSocial(); orbit.expandedComments.add(Number(btn.dataset.postId)); renderPosts();
  }));
  list.querySelectorAll('[data-login-comments]').forEach(btn => btn.addEventListener('click', () => document.querySelector('#accountBtn')?.click()));
  list.querySelectorAll('[data-share-post]').forEach(btn => btn.addEventListener('click', async () => {
    const post = orbit.posts.find(p => Number(p.id) === Number(btn.dataset.sharePost)); if (!post) return;
    if (navigator.share) { try { await navigator.share({ title: 'Staralia', text: post.body, url: location.href }); } catch {} }
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

  composer.querySelector('#postMediaPicker')?.remove();

  if (!Array.isArray(orbit.pendingMediaFiles)) orbit.pendingMediaFiles = [];
  const selectedFiles = orbit.pendingMediaFiles;

  const picker = document.createElement('div');
  picker.id = 'postMediaPicker';
  picker.className = 'post-media-picker';
  picker.innerHTML =
    '<div class="post-media-picker-row">' +
      '<label class="photo-pick-btn">▣ Add photos or video' +
        '<input id="postImageInput" type="file" accept="image/*,video/mp4,video/webm,video/quicktime" multiple />' +
      '</label>' +
      '<small class="muted">Up to 4 items · photos 5 MB · video 50 MB</small>' +
    '</div>' +
    '<small class="muted" id="postMediaStatus">No media selected.</small>' +
    '<div class="photo-previews" id="postPhotoPreviews"></div>';
  composer.querySelector('.composer-actions')?.before(picker);

  const input = picker.querySelector('#postImageInput');
  const previews = picker.querySelector('#postPhotoPreviews');
  const status = picker.querySelector('#postMediaStatus');

  const extensionForMime = mime => {
    const map = {
      'image/jpeg':'jpg',
      'image/jpg':'jpg',
      'image/png':'png',
      'image/webp':'webp',
      'image/gif':'gif',
      'image/heic':'heic',
      'image/heif':'heif',
      'video/mp4':'mp4',
      'video/webm':'webm',
      'video/quicktime':'mov'
    };
    return map[mime] || '';
  };

  const classifyFile = async file => {
    const mime = String(file.type || '').toLowerCase();
    const name = String(file.name || '').toLowerCase();
    const extMatch = name.match(/\.([a-z0-9]{2,6})$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : '';

    if (mime.startsWith('image/')) {
      return { file, kind:'image', mime, ext: extensionForMime(mime) || ext || 'img' };
    }
    if (mime === 'video/mp4' || mime === 'video/webm' || mime === 'video/quicktime') {
      return { file, kind:'video', mime, ext: extensionForMime(mime) || ext || 'mp4' };
    }

    if (['jpg','jpeg','png','webp','gif','heic','heif'].includes(ext)) {
      const guessed = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' :
        ext === 'png' ? 'image/png' :
        ext === 'webp' ? 'image/webp' :
        ext === 'gif' ? 'image/gif' :
        ext === 'heif' ? 'image/heif' : 'image/heic';
      return { file, kind:'image', mime:guessed, ext: ext === 'jpeg' ? 'jpg' : ext };
    }
    if (['mp4','webm','mov','m4v'].includes(ext)) {
      const guessed = ext === 'webm' ? 'video/webm' : ext === 'mov' ? 'video/quicktime' : 'video/mp4';
      return { file, kind:'video', mime:guessed, ext: ext === 'm4v' ? 'mp4' : ext };
    }

    try {
      const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
      const ascii = Array.from(bytes).map(b => String.fromCharCode(b)).join('');
      if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { file, kind:'image', mime:'image/jpeg', ext:'jpg' };
      if (bytes[0] === 0x89 && ascii.slice(1,4) === 'PNG') return { file, kind:'image', mime:'image/png', ext:'png' };
      if (ascii.slice(0,4) === 'GIF8') return { file, kind:'image', mime:'image/gif', ext:'gif' };
      if (ascii.slice(0,4) === 'RIFF' && ascii.slice(8,12) === 'WEBP') return { file, kind:'image', mime:'image/webp', ext:'webp' };
      if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) return { file, kind:'video', mime:'video/webm', ext:'webm' };
      if (ascii.slice(4,8) === 'ftyp') {
        const brand = ascii.slice(8,16).toLowerCase();
        if (brand.includes('heic') || brand.includes('heix') || brand.includes('hevc') || brand.includes('mif1') || brand.includes('msf1')) {
          return { file, kind:'image', mime:'image/heic', ext:'heic' };
        }
        return { file, kind:'video', mime:'video/mp4', ext:'mp4' };
      }
    } catch {}

    return null;
  };

  const drawPreviews = () => {
    const photos = selectedFiles.filter(x => x.kind === 'image').length;
    const videos = selectedFiles.filter(x => x.kind === 'video').length;
    const totalMB = selectedFiles.reduce((sum, x) => sum + Number(x.file?.size || 0), 0) / 1048576;

    if (!selectedFiles.length) status.textContent = 'No media selected.';
    else {
      const parts = [];
      if (photos) parts.push(photos + ' photo' + (photos === 1 ? '' : 's'));
      if (videos) parts.push(videos + ' video' + (videos === 1 ? '' : 's'));
      status.textContent = parts.join(' · ') + ' selected · ' + totalMB.toFixed(1) + ' MB';
    }

    previews.innerHTML = selectedFiles.map((item, i) => {
      const src = URL.createObjectURL(item.file);
      const media = item.kind === 'video'
        ? '<video src="' + esc(src) + '" muted playsinline preload="metadata"></video>'
        : '<img src="' + esc(src) + '" alt="Selected photo" />';
      return '<div class="photo-preview">' + media + '<button type="button" data-remove-photo="' + i + '">×</button></div>';
    }).join('');

    previews.querySelectorAll('[data-remove-photo]').forEach(b => b.addEventListener('click', () => {
      selectedFiles.splice(Number(b.dataset.removePhoto), 1);
      drawPreviews();
    }));
  };

  input.addEventListener('change', async () => {
    const incoming = Array.from(input.files || []);
    if (!incoming.length) {
      toast('No media file was selected.');
      return;
    }

    for (const file of incoming) {
      if (selectedFiles.length >= 4) {
        toast('A post can contain at most 4 media items.');
        break;
      }

      const item = await classifyFile(file);
      if (!item) {
        toast((file.name || 'That file') + ' is not a supported photo or video.');
        continue;
      }

      const max = item.kind === 'video' ? 50 * 1024 * 1024 : 5 * 1024 * 1024;
      if (file.size > max) {
        toast((file.name || (item.kind === 'video' ? 'Video' : 'Photo')) + ' is too large.');
        continue;
      }

      const total = selectedFiles.reduce((sum, x) => sum + Number(x.file?.size || 0), 0);
      if (total + file.size > 50 * 1024 * 1024) {
        toast('Total media for one post must stay under 50 MB.');
        continue;
      }

      const duplicate = selectedFiles.some(x =>
        x.file?.name === file.name &&
        x.file?.size === file.size &&
        x.file?.lastModified === file.lastModified
      );
      if (!duplicate) selectedFiles.push(item);
    }

    drawPreviews();

    if (selectedFiles.length) {
      toast(selectedFiles.length + ' media item' + (selectedFiles.length === 1 ? '' : 's') + ' selected.');
    }
  });

  drawPreviews();

  if (orbit.user && orbit.profile) {
    if (head) {
      head.innerHTML = avatarMarkup(orbit.profile) +
        '<div><strong>' + esc(orbit.profile.display_name) + '</strong><small>' +
        esc(orbit.profile.role) + ' · Citizen #' + padCitizen(orbit.profile.citizen_no) + '</small></div>';
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
      if (!body) return toast('Write a caption first.');

      const pending = selectedFiles.slice();
      button.disabled = true;
      button.textContent = pending.length ? 'Uploading media…' : 'Posting…';

      const created = await db.from('posts').insert({ body }).select('id').single();
      const post = created.data;
      const error = created.error;

      if (error || !post) {
        toast(error?.message || 'Could not create post.');
        button.disabled = false;
        button.textContent = 'Post';
        return;
      }

      const uploaded = [];
      try {
        for (let i = 0; i < pending.length; i++) {
          const item = pending[i];
          const key = crypto.randomUUID?.() || (Date.now() + '-' + i);
          const path = orbit.user.id + '/' + post.id + '/' + key + '.' + item.ext;

          const up = await db.storage.from('post-media').upload(path, item.file, {
            contentType: item.mime,
            cacheControl: '3600',
            upsert: false
          });

          if (up.error) throw up.error;
          uploaded.push(path);

          const row = await db.from('post_media').insert({
            post_id: post.id,
            storage_path: path,
            media_type: item.kind,
            position: i + 1
          });

          if (row.error) throw row.error;
        }
      } catch (err) {
        if (uploaded.length) await db.storage.from('post-media').remove(uploaded);
        const cleanup = await db.from('posts').delete().eq('id', post.id);
        console.error('Staralia media upload failed', err, cleanup.error || '');
        toast('Media upload failed: ' + (err?.message || 'unknown error'));
        button.disabled = false;
        button.textContent = 'Post';
        return;
      }

      const hadMedia = pending.length > 0;
      textarea.value = '';
      selectedFiles.splice(0, selectedFiles.length);
      input.value = '';
      drawPreviews();
      await fetchSocial();
      renderPosts();
      button.disabled = false;
      button.textContent = 'Post';
      toast(hadMedia ? 'Posted with media.' : 'Posted to the national feed.');
    });
  } else {
    textarea.value = '';
    textarea.disabled = true;
    textarea.placeholder = 'Become a citizen to post.';
    picker.style.display = 'none';
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
          <div class="comment-like-row"><button class="comment-like-btn ${commentLikedByMe(comment.id) ? 'liked' : ''}" data-modal-like-comment="${comment.id}">${commentLikedByMe(comment.id) ? '♥ Liked' : '♡ Like'} · ${commentLikeCount(comment.id)}</button></div>
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

  wrap.querySelectorAll('[data-modal-like-comment]').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!orbit.user || !orbit.profile) return;
      const commentId = Number(btn.dataset.modalLikeComment);
      btn.disabled = true;
      let error;
      if (orbit.myCommentLikes.has(commentId)) ({ error } = await db.from('comment_likes').delete().eq('comment_id', commentId));
      else ({ error } = await db.from('comment_likes').insert({ comment_id: commentId }));
      if (error) { toast(error.message); btn.disabled = false; return; }
      await Promise.all([fetchSocial(), fetchNetworkAndSettings()]);
      wrap.remove();
      await openComments(postId);
      wireNotificationButton();
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

function updateHomeProposition() {
  const prop = orbit.propositions.find(p => propositionStatus(p) === 'open') || orbit.propositions[0];
  if (!prop) return;

  const cards = [...document.querySelectorAll('.rail .card')];
  const card = cards.find(c => /Current proposition/i.test(c.querySelector('h3')?.textContent || ''));
  if (!card) return;

  const tally = propositionTallyFor(prop.id);
  const yes=Number(tally.yes_count||0), no=Number(tally.no_count||0), total=yes+no;
  const pct=total?Math.round(yes/total*100):0;

  const question=card.querySelector('.question');
  const bar=card.querySelector('.progress span');
  const small=card.querySelector('small');
  if(question) question.textContent=`Proposition ${prop.proposition_number}: ${prop.title}`;
  if(bar) bar.style.width=`${pct}%`;
  if(small) small.textContent=total?`${pct}% Yes · ${timeRemaining(prop.closes_at)}`:`No votes yet · ${timeRemaining(prop.closes_at)}`;
}

function enhanceHome() {
  wireComposer();
  renderPosts();
  updateHomeProposition();
}
/* =========================
   CITIZENS / PROFILE PAGES/* =========================
   CITIZENS / PROFILE PAGES
   ========================= */

function citizenSearchText(citizen) {
  return [
    citizen.display_name,
    citizen.role,
    citizen.country,
    citizen.citizen_no,
    padCitizen(citizen.citizen_no),
    `#${padCitizen(citizen.citizen_no)}`
  ].filter(Boolean).join(' ').toLowerCase();
}

function renderCitizenDirectory(query = '') {
  const list = document.querySelector('#citizenList');
  if (!list) return;
  const q = String(query || '').trim().toLowerCase();
  const matches = orbit.citizens
    .filter(c => !q || citizenSearchText(c).includes(q))
    .sort((a,b) => Number(a.citizen_no) - Number(b.citizen_no));

  list.innerHTML = matches.length ? matches.map((c, i) => `
    <div class="citizen-row" data-citizen-profile="${c.citizen_no}">
      <div class="identity">
        <span class="rank">${i + 1}</span>
        <span class="flag">${c.is_founder ? '✦' : '◎'}</span>
        <div class="identity-meta">
          <strong>${esc(c.display_name)} ${c.is_founder ? '✓' : ''}</strong>
          <small>${esc(c.role || 'Citizen')}${c.country ? ` · ${esc(c.country)}` : ''}</small>
        </div>
      </div>
      <span class="citizen-number">#${padCitizen(c.citizen_no)}</span>
    </div>`).join('') : `<p class="muted" style="padding:14px 0">No citizen accounts match “${esc(query)}”.</p>`;

  bindCitizenProfileLinks(list);
}

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

  const input = document.querySelector('#citizenSearch');
  const list = document.querySelector('#citizenList');
  if (!list) return;

  renderCitizenDirectory(input?.value || '');

  if (input && !input.dataset.liveSearchBound) {
    input.dataset.liveSearchBound = '1';
    input.addEventListener('input', e => renderCitizenDirectory(e.target.value));
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
  const title = citizenNo === 1 ? 'President Profile' : 'Citizen Profile';
  const current = document.querySelector('#sectionTitle')?.textContent || '';
  if (!['Citizens','Citizen Profile','President Profile'].includes(current)) return;
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

  sectionKicker.textContent = 'STARALIA';
  sectionTitle.textContent = options.title || (citizen.is_founder ? 'President Profile' : 'Citizen Profile');

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
        <div class="profile-page-name"><h2>${esc(citizen.display_name)} ${citizen.is_founder ? '✓' : ''}</h2>${citizen.is_founder ? '<span class="pill gold">PRESIDENT</span><span class="pill green">OFFICIAL</span>' : ''}</div>
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
    <div class="card"><h3>Recent posts</h3>${citizenPosts.length ? citizenPosts.slice(0, 8).map(p => {
      const media = mediaByPost(p.id);
      const galleryClass = ['', 'one', 'two', 'three', 'four'][Math.min(media.length, 4)] || 'four';
      const gallery = media.length ? '<div class="post-gallery ' + galleryClass + '">' + media.slice(0,4).map(m => {
        const mediaUrl = safeUrl(postImageUrl(m.storage_path));
        const isVideo = m.media_type === 'video' || /\.(mp4|webm|mov|m4v)$/i.test(String(m.storage_path || ''));
        if (isVideo) return '<video src="' + esc(mediaUrl) + '" controls playsinline preload="metadata"></video>';
        return '<button data-profile-post-image="' + esc(mediaUrl) + '" style="border:0;padding:0;background:none;min-width:0"><img src="' + esc(mediaUrl) + '" alt="Post image" loading="lazy" /></button>';
      }).join('') + '</div>' : '';
      const stats = statByPost(p.id);
      return `<div class="profile-post-mini"><small>${relativeTime(p.created_at)}</small><p>${esc(p.body)}</p>${gallery}<div class="profile-post-stats"><span>♡ ${Number(stats.like_count || 0)}</span><span>◯ ${Number(stats.comment_count || 0)}</span></div></div>`;
    }).join('') : '<p class="muted">No posts yet.</p>'}</div>
  </div>`;

  viewRootSeen = view.firstElementChild;
  view.querySelectorAll('[data-profile-post-image]').forEach(btn => btn.addEventListener('click', () => {
    const src = btn.dataset.profilePostImage;
    if (!src) return;
    modal(`<div class="auth-modal-head"><div><span class="eyebrow">POST IMAGE</span></div><button class="icon-btn" data-close-v13>×</button></div><img src="${esc(src)}" alt="Post image" style="width:100%;max-height:75vh;object-fit:contain;border-radius:14px" />`, 'orbitProfilePostImageModal');
  }));
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
    if (navigator.share) { try { await navigator.share({ title: `${citizen.display_name} · Staralia`, url }); } catch {} }
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
    const actor = citizenByNo(n.actor_citizen_no) || { display_name: 'Staralia' };
    return `<div class="notification-row ${n.read_at ? 'read' : 'unread'}" data-notification-id="${n.id}" data-notification-kind="${n.kind}" data-notification-actor="${n.actor_citizen_no || ''}">
      ${avatarMarkup(actor)}<div class="notification-copy"><strong>${esc(actor.display_name)} ${esc(n.message || n.kind)}</strong><small>${relativeTime(n.created_at)}</small></div>${n.read_at ? '' : '<span class="pill green">NEW</span>'}
    </div>`;
  }).join('') || '<p class="muted">No notifications yet.</p>';

  const wrap = modal(`<div class="auth-modal-head"><div><span class="eyebrow">STARALIA</span><h2>Notifications</h2></div><button class="icon-btn" data-close-v13>×</button></div>
    <div class="section-row"><small>${orbit.notifications.filter(n => !n.read_at).length} unread</small><button class="text-btn" id="markAllRead">Mark all read</button></div><div>${rows}</div>`, 'orbitNotificationsModal');

  wrap.querySelector('#markAllRead')?.addEventListener('click', async () => {
    const ids = orbit.notifications.filter(n => !n.read_at).map(n => n.id);
    if (ids.length) await db.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids);
    await fetchNetworkAndSettings(); wireNotificationButton(); wrap.remove(); openNotifications();
  });

  wrap.querySelectorAll('[data-notification-id]').forEach(row => row.addEventListener('click', async () => {
    await markNotificationRead(Number(row.dataset.notificationId));
    const kind = row.dataset.notificationKind; const actor = Number(row.dataset.notificationActor); wrap.remove();
    if (kind === 'follow' && actor) showCitizenProfile(actor);
    else if (kind === 'senate' || kind === 'election') { clearCitizenFromUrl(); location.hash = 'senate'; }
    else if (kind === 'event') { clearCitizenFromUrl(); location.hash = 'events'; }
    else { clearCitizenFromUrl(); location.hash = 'home'; }
  }));
}

function enhanceMore() {
  const grid = document.querySelector('.more-grid');
  if (!grid) return;
  if (!grid.querySelector('[data-orbit-notifications]')) {
    const notifications = document.createElement('button');
    notifications.className='more-tile'; notifications.dataset.orbitNotifications='1';
    notifications.innerHTML='<span>◉</span><strong>Notifications</strong><small>Likes, comments, events, elections, and Senate alerts</small>';
    grid.appendChild(notifications); notifications.addEventListener('click',()=>orbit.user?openNotifications():document.querySelector('#accountBtn')?.click());
  }
  if (!grid.querySelector('[data-orbit-settings]')) {
    const button = document.createElement('button'); button.className = 'more-tile'; button.dataset.orbitSettings = '1';
    button.innerHTML = '<span>⚙</span><strong>Settings</strong><small>Account, notifications, and security</small>';
    grid.appendChild(button); button.addEventListener('click', renderSettings);
  }
}

function renderSettings() {
  clearCitizenFromUrl();
  const view = document.querySelector('#view');
  document.querySelector('#sectionKicker').textContent = 'STARALIA';
  document.querySelector('#sectionTitle').textContent = 'Settings';

  if (!orbit.user || !orbit.profile) {
    view.innerHTML = '<div class="card"><h3>Account settings</h3><p class="muted">Log in to manage your Staralia account.</p><button class="btn primary" id="settingsLogin">Log in</button></div>';
    view.querySelector('#settingsLogin').addEventListener('click', () => document.querySelector('#accountBtn')?.click());
    viewRootSeen = view.firstElementChild; return;
  }

  const p = orbit.preferences || { likes:true, comments:true, follows:true, senate:true };
  view.innerHTML = `<div class="settings-stack">
    <div class="card"><div class="section-row"><div><span class="eyebrow">ACCOUNT</span><h3 style="margin:6px 0">${esc(orbit.profile.display_name)}</h3></div>${avatarMarkup(orbit.profile)}</div><p class="muted">${esc(orbit.user.email || '')} · Citizen #${padCitizen(orbit.profile.citizen_no)}</p><div class="profile-actions"><button class="btn primary" id="settingsEditProfile">Edit profile</button><button class="btn secondary" id="settingsPublicProfile">Public profile</button><button class="btn secondary" data-route="more">← More</button></div></div>
    <div class="card"><h3>In-app notifications</h3>${[['likes','Likes','Notify me when someone likes my post'],['comments','Comments','Notify me when someone comments on my post'],['follows','New followers','Notify me when someone follows me'],['senate','Senate activity','Notify me about new Senate bills and elections']].map(([key,title,desc]) => `<div class="setting-row"><div><strong>${title}</strong><small>${desc}</small></div><label class="switch"><input type="checkbox" data-pref="${key}" ${p[key] ? 'checked' : ''}><span></span></label></div>`).join('')}</div>
    <div class="card"><h3>Security</h3><form class="admin-form" id="changePasswordForm"><label>New password<input id="newPassword" type="password" minlength="8" placeholder="At least 8 characters" required /></label><p class="admin-note">Changing your password updates your Supabase login. Your citizen number and profile stay the same.</p><button class="btn secondary" type="submit">Change password</button></form></div>
    <div class="card"><h3>Profile visibility</h3><p class="muted">Citizen number, display name, role, bio, avatar, country, follower counts, and public posts are part of the public citizen profile. Your email and notification settings are private.</p></div>
    <div class="card"><button class="btn danger full" id="settingsSignOut">Sign out</button></div>
  </div>`;
  viewRootSeen = view.firstElementChild;

  view.querySelector('#settingsEditProfile').addEventListener('click', openProfileEditor);
  view.querySelector('#settingsPublicProfile').addEventListener('click', () => showCitizenProfile(orbit.profile.citizen_no, { title: orbit.profile.is_founder ? 'President Profile' : 'Citizen Profile', backRoute: 'more' }));
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

function eventStatus(event) {
  if (event.status !== 'active') return event.status;
  return Date.now() >= new Date(event.starts_at).getTime() ? 'completed' : 'active';
}

function renderEventsLive() {
  clearCitizenFromUrl();
  const view=document.querySelector('#view');
  const sorted=[...orbit.events].sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
  const cards=sorted.map(event=>{
    const status=eventStatus(event); const reminder=orbit.eventReminders.find(r=>Number(r.event_id)===Number(event.id));
    const date=new Date(event.starts_at); const when=date.toLocaleString(undefined,{weekday:'short',month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'});
    return `<section class="card event-card"><div class="section-row"><span class="event-date">${esc(when)}</span><span class="status ${status==='active'?'active':'closed'}">${esc(status.toUpperCase())}</span></div><h3>${esc(event.title)}</h3><p class="muted">${esc(event.description||'')}</p>${event.location_label?`<small>⌖ ${esc(event.location_label)}</small>`:''}<div class="event-actions">
      ${status==='active' ? (!orbit.user?'<button class="btn primary" data-event-login>Log in to set reminder</button>':reminder?`<button class="btn secondary" data-remove-reminder="${event.id}">✓ Reminder set · ${new Date(reminder.remind_at).toLocaleString()}</button>`:`<button class="btn primary" data-set-reminder="${event.id}">Remind me</button>`) : ''}
      ${orbit.profile?.is_founder && status==='active'?`<button class="btn danger" data-cancel-event="${event.id}">Cancel event</button>`:''}
    </div></section>`;
  }).join('')||'<div class="card"><p class="muted">No national events scheduled.</p></div>';
  view.innerHTML=`<div class="stack events-live-root">${orbit.profile?.is_founder?'<div class="card events-admin"><span class="eyebrow">PRESIDENTIAL ADMINISTRATION</span><h3>National events</h3><p class="muted">Create events and let citizens set persistent in-app reminders.</p><button class="btn primary" id="createEventBtn">Create event</button></div>':''}${cards}</div>`;
  viewRootSeen=view.firstElementChild;
  view.querySelector('#createEventBtn')?.addEventListener('click',openCreateEvent);
  view.querySelectorAll('[data-event-login]').forEach(b=>b.addEventListener('click',()=>document.querySelector('#accountBtn')?.click()));
  view.querySelectorAll('[data-set-reminder]').forEach(b=>b.addEventListener('click',()=>openEventReminder(Number(b.dataset.setReminder))));
  view.querySelectorAll('[data-remove-reminder]').forEach(b=>b.addEventListener('click',async()=>{const {error}=await db.from('event_reminders').delete().eq('event_id',Number(b.dataset.removeReminder));if(error)toast(error.message);else toast('Reminder removed.');await fetchEvents();renderEventsLive();}));
  view.querySelectorAll('[data-cancel-event]').forEach(b=>b.addEventListener('click',async()=>{if(!confirm('Cancel this national event?'))return;const {error}=await db.from('events').update({status:'cancelled'}).eq('id',Number(b.dataset.cancelEvent));if(error)toast(error.message);else toast('Event cancelled.');await fetchEvents();renderEventsLive();}));
}

function openEventReminder(eventId) {
  const event=orbit.events.find(e=>Number(e.id)===Number(eventId)); if(!event)return;
  const wrap=modal(`<div class="auth-modal-head"><div><span class="eyebrow">EVENT REMINDER</span><h2>${esc(event.title)}</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="eventReminderForm"><label>Remind me<select id="eventReminderOffset" class="auth-input"><option value="15">15 minutes before</option><option value="60" selected>1 hour before</option><option value="1440">1 day before</option></select></label><p class="admin-note">This reminder is stored in Supabase. A scheduled database job will place it in your notifications inbox when it becomes due.</p><p class="auth-message" id="eventReminderMessage"></p><button class="btn primary full" type="submit">Set reminder</button></form>`, 'orbitEventReminderModal');
  wrap.querySelector('#eventReminderForm').addEventListener('submit',async e=>{e.preventDefault();const offset=Number(wrap.querySelector('#eventReminderOffset').value);const start=new Date(event.starts_at).getTime();let at=start-offset*60000;if(at<=Date.now())at=Date.now()+60000;if(at>=start){wrap.querySelector('#eventReminderMessage').textContent='This event starts too soon for that reminder.';wrap.querySelector('#eventReminderMessage').className='auth-message error';return;}const existing=orbit.eventReminders.find(r=>Number(r.event_id)===eventId);let result;if(existing)result=await db.from('event_reminders').update({remind_at:new Date(at).toISOString(),notified_at:null}).eq('event_id',eventId);else result=await db.from('event_reminders').insert({event_id:eventId,remind_at:new Date(at).toISOString()});if(result.error){toast(result.error.message);return;}wrap.remove();await fetchEvents();renderEventsLive();toast('Persistent event reminder set.');});
}

function openCreateEvent() {
  if(!orbit.profile?.is_founder)return;
  const wrap=modal(`<div class="auth-modal-head"><div><span class="eyebrow">PRESIDENTIAL ADMINISTRATION</span><h2>Create national event</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="createEventForm"><label>Title<input id="eventTitle" maxlength="200" required /></label><label>Description<textarea id="eventDescription" maxlength="1500"></textarea></label><label>Starts<input id="eventStarts" type="datetime-local" required /></label><label>Location / venue<input id="eventLocation" maxlength="120" placeholder="Digital Senate Chamber" /></label><p class="auth-message" id="eventCreateMessage"></p><button class="btn primary full" type="submit">Publish event</button></form>`, 'orbitCreateEventModal');
  wrap.querySelector('#createEventForm').addEventListener('submit',async e=>{e.preventDefault();const raw=wrap.querySelector('#eventStarts').value;const starts=new Date(raw);if(!raw||Number.isNaN(starts.getTime())||starts.getTime()<=Date.now()){wrap.querySelector('#eventCreateMessage').textContent='Choose a future start time.';wrap.querySelector('#eventCreateMessage').className='auth-message error';return;}const button=e.currentTarget.querySelector('button');button.disabled=true;const {error}=await db.from('events').insert({title:wrap.querySelector('#eventTitle').value.trim(),description:wrap.querySelector('#eventDescription').value.trim()||null,starts_at:starts.toISOString(),location_label:wrap.querySelector('#eventLocation').value.trim()||null,status:'active'});if(error){wrap.querySelector('#eventCreateMessage').textContent=error.message;wrap.querySelector('#eventCreateMessage').className='auth-message error';button.disabled=false;return;}wrap.remove();await fetchEvents();renderEventsLive();toast('National event published.');});
}


function senateBillTallyFor(id){return orbit.billTallies.find(t=>Number(t.bill_id)===Number(id))||{yes_count:0,no_count:0,abstain_count:0};}
function houseBillTallyFor(id){return orbit.houseBillTallies.find(t=>Number(t.bill_id)===Number(id))||{yes_count:0,no_count:0,abstain_count:0};}
function senateOverrideTallyFor(id){return orbit.billOverrideTallies.find(t=>Number(t.bill_id)===Number(id))||{yes_count:0,no_count:0};}
function houseOverrideTallyFor(id){return orbit.houseBillOverrideTallies.find(t=>Number(t.bill_id)===Number(id))||{yes_count:0,no_count:0};}
function propositionTallyFor(id){return orbit.propositionTallies.find(t=>Number(t.proposition_id)===Number(id))||{yes_count:0,no_count:0};}
function chamberElectionStatus(e){if(e.status!=='open')return e.status;return Date.now()>=new Date(e.closes_at).getTime()?'expired':'open';}
function propositionStatus(p){if(p.status!=='open')return p.status;return Date.now()>=new Date(p.closes_at).getTime()?'closing':'open';}
function billStageStatus(b){
  if(b.status==='open_senate'&&b.senate_closes_at&&Date.now()>=new Date(b.senate_closes_at).getTime())return 'closing_senate';
  if(b.status==='open_house'&&b.house_closes_at&&Date.now()>=new Date(b.house_closes_at).getTime())return 'closing_house';
  return b.status;
}
function prettyFederalStatus(status){
  const labels={
    open_senate:'SENATE VOTE',closing_senate:'SENATE FINALIZING',
    open_house:'HOUSE VOTE',closing_house:'HOUSE FINALIZING',
    awaiting_signature:'AWAITING PRESIDENT',law:'LAW',
    vetoed:'PRESIDENTIAL VETO — OVERRIDE OPEN',veto_sustained:'VETO SUSTAINED',
    rejected:'REJECTED',tied:'TIED',closed:'CLOSED'
  };
  return labels[status]||String(status||'').replaceAll('_',' ').toUpperCase();
}
function chamberMember(chamber){
  if(!orbit.profile)return null;
  const list=chamber==='senate'?orbit.senateMembers:orbit.houseMembers;
  return list.find(m=>Number(m.citizen_no)===Number(orbit.profile.citizen_no)&&m.active&&m.voting_member)||null;
}
function chamberElectionData(chamber){
  return chamber==='senate'
    ? {label:'Senate',memberLabel:'Senator',elections:orbit.senateElections,candidates:orbit.senateCandidates,votes:orbit.senateElectionVotes,tallies:orbit.senateCandidateTallies}
    : {label:'House of Representatives',memberLabel:'Representative',elections:orbit.houseElections,candidates:orbit.houseCandidates,votes:orbit.houseElectionVotes,tallies:orbit.houseCandidateTallies};
}

function renderChamberElectionCard(chamber,election){
  const d=chamberElectionData(chamber),status=chamberElectionStatus(election);
  const candidates=d.candidates.filter(c=>Number(c.election_id)===Number(election.id));
  const myCandidate=orbit.profile&&candidates.find(c=>Number(c.citizen_no)===Number(orbit.profile.citizen_no));
  const myBallot=orbit.profile&&d.votes.find(v=>Number(v.election_id)===Number(election.id)&&Number(v.voter_citizen_no)===Number(orbit.profile.citizen_no));
  const winner=citizenByNo(election.winner_citizen_no);
  const rows=candidates.map(cand=>{
    const person=citizenByNo(cand.citizen_no)||{display_name:'Citizen'};
    const tally=d.tallies.find(t=>Number(t.election_id)===Number(election.id)&&Number(t.candidate_citizen_no)===Number(cand.citizen_no));
    const selected=Number(myBallot?.candidate_citizen_no)===Number(cand.citizen_no);
    return `<div class="candidate-row"><div><strong>${esc(person.display_name)} ${person.is_founder?'✓':''}</strong><small>Citizen #${padCitizen(cand.citizen_no)} · ${esc(cand.statement||'No campaign statement.')}</small></div><div class="candidate-actions"><strong>${Number(tally?.vote_count||0)}</strong>${status==='open'&&orbit.user&&!myBallot?`<button class="btn secondary" data-chamber-election-vote="${chamber}:${election.id}:${cand.citizen_no}">Vote</button>`:selected?'<span class="pill green">YOUR VOTE</span>':''}</div></div>`;
  }).join('')||'<p class="muted">No candidates registered yet.</p>';
  const canRun=status==='open'&&orbit.user&&!myCandidate&&!orbit.profile?.is_founder;
  return `<section class="card senate-election-card">
    <div class="section-row"><div><span class="senate-badge">${esc(d.label.toUpperCase())} · SEAT ${election.seat_no} / 100</span><h3 style="margin:8px 0">${esc(election.title)}</h3></div><span class="status ${status==='open'?'active':'closed'}">${esc(status.toUpperCase())}</span></div>
    <p class="muted">${esc(election.description||'')}</p><small>Closes ${new Date(election.closes_at).toLocaleString()}</small>
    <div style="margin-top:12px">${rows}</div>
    ${winner?`<div class="live-vote-status"><strong>Winner:</strong> ${esc(winner.display_name)} · Citizen #${padCitizen(winner.citizen_no)}</div>`:''}
    <div class="senate-election-admin">
      ${canRun?`<button class="btn primary" data-register-chamber-candidate="${chamber}:${election.id}">Run for this seat</button>`:''}
      ${status==='open'&&myCandidate?`<button class="btn secondary" data-withdraw-chamber-candidate="${chamber}:${election.id}">Withdraw candidacy</button>`:''}
      ${orbit.profile?.is_founder&&status==='open'?`<button class="btn danger" data-close-chamber-election="${chamber}:${election.id}">Close election</button>`:''}
    </div>
  </section>`;
}

function renderElections(){
  const view=document.querySelector('#view');if(!view)return;
  const presidentialAdmin=orbit.profile?.is_founder?`<section class="card founder-admin">
    <span class="eyebrow">PRESIDENTIAL ADMINISTRATION</span>
    <h3>Election administration</h3>
    <p class="muted">Open House or Senate seat elections and place a numbered Proposition on the citizen ballot. Ordinary legislation is voted on only by elected members of Congress.</p>
    <div class="founder-admin-actions">
      <button class="btn primary" id="createHouseElectionBtn">Open House election</button>
      <button class="btn primary" id="createSenateElectionBtn">Open Senate election</button>
      <button class="btn secondary" id="createPropositionBtn">Create Proposition</button>
    </div>
  </section>`:'';

  const propositionCards=orbit.propositions.map(prop=>{
    const status=propositionStatus(prop),t=propositionTallyFor(prop.id),yes=Number(t.yes_count||0),no=Number(t.no_count||0),total=yes+no;
    const mine=orbit.propositionVotes.find(v=>Number(v.proposition_id)===Number(prop.id));
    const yesPct=total?Math.round(yes/total*100):0,noPct=total?Math.round(no/total*100):0;
    const open=status==='open';
    return `<section class="card live-ref">
      <div class="section-row"><span class="status ${open?'active':'closed'}">${open?'OPEN':esc(status.toUpperCase())}</span><span class="senate-badge">PROPOSITION ${prop.proposition_number}</span></div>
      <h3>${esc(prop.title)}</h3><p class="muted">${esc(prop.description||'')}</p>
      <div class="live-options">
        <button class="live-option ${mine?.vote==='yes'?'selected':''}" data-proposition-vote="${prop.id}:yes" ${mine||!open?'disabled':''}><span>Yes</span><span>${mine?.vote==='yes'?'✓ Your vote':'Vote'}</span></button>
        <button class="live-option ${mine?.vote==='no'?'selected':''}" data-proposition-vote="${prop.id}:no" ${mine||!open?'disabled':''}><span>No</span><span>${mine?.vote==='no'?'✓ Your vote':'Vote'}</span></button>
      </div>
      <div class="live-result"><span>Yes</span><div class="live-track"><div class="live-fill" style="width:${yesPct}%"></div></div><strong>${yesPct}%</strong></div>
      <div class="live-result"><span>No</span><div class="live-track"><div class="live-fill" style="width:${noPct}%"></div></div><strong>${noPct}%</strong></div>
      <div class="live-ref-meta"><small>${total} vote${total===1?'':'s'} cast</small><small>${open?timeRemaining(prop.closes_at):'Voting closed'}</small></div>
      ${mine?`<div class="live-vote-status">Your Proposition vote: <strong>${esc(mine.vote.toUpperCase())}</strong>. Your individual ballot is private.</div>`:open?'<div class="live-vote-status">Citizens may vote directly on Propositions. Your ballot is final once submitted.</div>':''}
    </section>`;
  }).join('')||'<div class="card"><p class="muted">No Propositions are on the ballot.</p></div>';

  const houseElections=orbit.houseElections.map(e=>renderChamberElectionCard('house',e)).join('')||'<div class="card"><p class="muted">No House elections are open yet.</p></div>';
  const senateElections=orbit.senateElections.map(e=>renderChamberElectionCard('senate',e)).join('')||'<div class="card"><p class="muted">No Senate elections are open yet.</p></div>';

  view.innerHTML=`<div class="live-election-stack">
    ${presidentialAdmin}
    <section class="card"><span class="eyebrow">CITIZEN BALLOT</span><h2 style="margin:7px 0">Elections & Propositions</h2><p class="muted">Citizens elect the 100 Representatives and 100 Senators who vote on legislation. Citizens may also vote directly on numbered Propositions.</p></section>
    <section class="card"><h3>Propositions</h3><p class="muted">Direct citizen votes on specific national ballot questions.</p></section>${propositionCards}
    <section class="card"><h3>House of Representatives elections</h3><p class="muted">Each election fills one of 100 Representative seats.</p></section>${houseElections}
    <section class="card"><h3>Senate elections</h3><p class="muted">Each election fills one of 100 Senate seats.</p></section>${senateElections}
  </div>`;
  viewRootSeen=view.firstElementChild;

  view.querySelector('#createHouseElectionBtn')?.addEventListener('click',()=>openCreateChamberElection('house'));
  view.querySelector('#createSenateElectionBtn')?.addEventListener('click',()=>openCreateChamberElection('senate'));
  view.querySelector('#createPropositionBtn')?.addEventListener('click',openCreateProposition);

  view.querySelectorAll('[data-proposition-vote]').forEach(btn=>btn.addEventListener('click',async()=>{
    if(!orbit.user||!orbit.profile)return document.querySelector('#accountBtn')?.click();
    const [id,vote]=btn.dataset.propositionVote.split(':');
    if(!confirm(`Cast your final Proposition vote: ${vote.toUpperCase()}?`))return;
    const {error}=await db.from('proposition_votes').insert({proposition_id:Number(id),vote});
    if(error)toast(error.code==='23505'?'You already voted on this Proposition.':error.message);
    else toast('Proposition ballot recorded.');
    await fetchElections();renderElections();
  }));

  view.querySelectorAll('[data-chamber-election-vote]').forEach(btn=>btn.addEventListener('click',async()=>{
    const [chamber,electionId,candidateNo]=btn.dataset.chamberElectionVote.split(':');
    const person=citizenByNo(Number(candidateNo));
    if(!confirm(`Cast your final ${chamber==='senate'?'Senate':'House'} election vote for ${person?.display_name||'this candidate'}?`))return;
    const table=chamber==='senate'?'senate_election_votes':'house_election_votes';
    const {error}=await db.from(table).insert({election_id:Number(electionId),candidate_citizen_no:Number(candidateNo)});
    if(error)toast(error.message);else toast('Election ballot recorded.');
    await fetchSenateElections();renderElections();
  }));

  view.querySelectorAll('[data-register-chamber-candidate]').forEach(btn=>btn.addEventListener('click',()=>{
    const [chamber,id]=btn.dataset.registerChamberCandidate.split(':');openCandidateRegistration(chamber,Number(id));
  }));
  view.querySelectorAll('[data-withdraw-chamber-candidate]').forEach(btn=>btn.addEventListener('click',async()=>{
    const [chamber,id]=btn.dataset.withdrawChamberCandidate.split(':');
    if(!confirm('Withdraw your candidacy?'))return;
    const table=chamber==='senate'?'senate_candidates':'house_candidates';
    const {error}=await db.from(table).delete().eq('election_id',Number(id));
    if(error)toast(error.message);else toast('Candidacy withdrawn.');
    await fetchSenateElections();renderElections();
  }));
  view.querySelectorAll('[data-close-chamber-election]').forEach(btn=>btn.addEventListener('click',async()=>{
    const [chamber,id]=btn.dataset.closeChamberElection.split(':');
    if(!confirm(`Close this ${chamber==='senate'?'Senate':'House'} election and seat the clear winner?`))return;
    const rpc=chamber==='senate'?'president_close_senate_election':'president_close_house_election';
    const arg=chamber==='senate'?{p_election_id:Number(id)}:{p_election_id:Number(id)};
    const {data,error}=await db.rpc(rpc,arg);
    if(error)toast(error.message);else toast(`Election closed: ${String(data).replaceAll('_',' ')}`);
    await Promise.all([fetchSenate(),fetchSenateElections(),fetchNetworkAndSettings()]);renderElections();
  }));
}

function openCreateProposition(){
  if(!orbit.profile?.is_founder)return;
  const wrap=modal(`<div class="auth-modal-head"><div><span class="eyebrow">PRESIDENTIAL ADMINISTRATION</span><h2>Create Proposition</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="newPropForm"><label>Title<input id="propTitle" maxlength="250" required placeholder="Example: Lunar Infrastructure Funding" /></label><label>Ballot description<textarea id="propDescription" maxlength="1500" placeholder="Explain what a Yes or No vote would authorize."></textarea></label><label>Voting period (days)<input id="propDays" type="number" min="1" max="30" value="7" required /></label><p class="admin-note">The next Proposition number is assigned automatically. Citizens vote Yes or No; individual ballots remain private.</p><p class="auth-message" id="propMessage"></p><button class="btn primary full" type="submit">Place Proposition on ballot</button></form>`,'orbitPropositionModal');
  wrap.querySelector('#newPropForm').addEventListener('submit',async e=>{
    e.preventDefault();const days=Math.max(1,Math.min(30,Number(wrap.querySelector('#propDays').value)||7));const button=e.currentTarget.querySelector('button');button.disabled=true;
    const {error}=await db.rpc('president_create_proposition',{p_title:wrap.querySelector('#propTitle').value.trim(),p_description:wrap.querySelector('#propDescription').value.trim()||null,p_closes_at:new Date(Date.now()+days*86400000).toISOString()});
    if(error){wrap.querySelector('#propMessage').textContent=error.message;wrap.querySelector('#propMessage').className='auth-message error';button.disabled=false;return;}
    wrap.remove();await fetchElections();renderElections();toast('Proposition added to the citizen ballot.');
  });
}

function openCreateChamberElection(chamber){
  if(!orbit.profile?.is_founder)return;
  const label=chamber==='senate'?'Senate':'House';
  const wrap=modal(`<div class="auth-modal-head"><div><span class="eyebrow">PRESIDENTIAL ADMINISTRATION</span><h2>Open ${label} seat election</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="chamberElectionForm"><label>Election title<input id="chamberElectionTitle" maxlength="200" value="${label} Seat Election" required /></label><label>Description<textarea id="chamberElectionDescription" maxlength="1500" placeholder="Citizens elect one member of Congress."></textarea></label><label>Election period (days)<input id="chamberElectionDays" type="number" min="1" max="30" value="7" required /></label><p class="admin-note">The system assigns the next available ${label} seat number from 1–100.</p><p class="auth-message" id="chamberElectionMessage"></p><button class="btn primary full" type="submit">Open election</button></form>`,'orbitChamberElectionModal');
  wrap.querySelector('#chamberElectionForm').addEventListener('submit',async e=>{
    e.preventDefault();const days=Math.max(1,Math.min(30,Number(wrap.querySelector('#chamberElectionDays').value)||7));const button=e.currentTarget.querySelector('button');button.disabled=true;
    const rpc=chamber==='senate'?'president_create_senate_election':'president_create_house_election';
    const {error}=await db.rpc(rpc,{p_title:wrap.querySelector('#chamberElectionTitle').value.trim(),p_description:wrap.querySelector('#chamberElectionDescription').value.trim()||null,p_closes_at:new Date(Date.now()+days*86400000).toISOString()});
    if(error){wrap.querySelector('#chamberElectionMessage').textContent=error.message;wrap.querySelector('#chamberElectionMessage').className='auth-message error';button.disabled=false;return;}
    wrap.remove();await fetchSenateElections();renderElections();toast(`${label} seat election opened.`);
  });
}

function openCandidateRegistration(chamber,electionId){
  if(!orbit.user)return document.querySelector('#accountBtn')?.click();
  const label=chamber==='senate'?'Senate':'House';
  const wrap=modal(`<div class="auth-modal-head"><div><span class="eyebrow">${label.toUpperCase()} ELECTION</span><h2>Register candidacy</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="candidateForm"><label>Campaign statement<textarea id="candidateStatement" maxlength="1000" placeholder="Why should citizens elect you?"></textarea></label><p class="auth-message" id="candidateMessage"></p><button class="btn primary full" type="submit">Become a candidate</button></form>`,'orbitCandidateModal');
  wrap.querySelector('#candidateForm').addEventListener('submit',async e=>{
    e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;
    const table=chamber==='senate'?'senate_candidates':'house_candidates';
    const {error}=await db.from(table).insert({election_id:electionId,statement:wrap.querySelector('#candidateStatement').value.trim()||null});
    if(error){wrap.querySelector('#candidateMessage').textContent=error.message;wrap.querySelector('#candidateMessage').className='auth-message error';button.disabled=false;return;}
    wrap.remove();await fetchSenateElections();renderElections();toast(`You are now a ${label} candidate.`);
  });
}

function renderCongressLive(){
  clearCitizenFromUrl();
  const view=document.querySelector('#view');
  const senator=chamberMember('senate'),representative=chamberMember('house');
  const activeSenators=orbit.senateMembers.filter(m=>m.active);
  const activeRepresentatives=orbit.houseMembers.filter(m=>m.active);
  const activeBills=orbit.bills.filter(b=>['open_senate','open_house','closing_senate','closing_house'].includes(billStageStatus(b)));

  const senateMembersHtml=activeSenators.map(m=>{const c=citizenByNo(m.citizen_no)||{display_name:'Citizen'};return `<div class="senate-member-row"><span>${esc(c.display_name)} · #${padCitizen(m.citizen_no)} · Seat ${m.seat_no}</span><strong>Senator</strong></div>`;}).join('')||'<p class="muted">No elected Senators are seated yet.</p>';
  const houseMembersHtml=activeRepresentatives.map(m=>{const c=citizenByNo(m.citizen_no)||{display_name:'Citizen'};return `<div class="senate-member-row"><span>${esc(c.display_name)} · #${padCitizen(m.citizen_no)} · Seat ${m.seat_no}</span><strong>Representative</strong></div>`;}).join('')||'<p class="muted">No elected Representatives are seated yet.</p>';

  const billsHtml=orbit.bills.map(bill=>{
    const sT=senateBillTallyFor(bill.id),hT=houseBillTallyFor(bill.id);
    const sy=Number(sT.yes_count||0),sn=Number(sT.no_count||0),sa=Number(sT.abstain_count||0);
    const hy=Number(hT.yes_count||0),hn=Number(hT.no_count||0),ha=Number(hT.abstain_count||0);
    const mySenateVote=orbit.profile?orbit.billVotes.find(v=>Number(v.bill_id)===Number(bill.id)&&Number(v.citizen_no)===Number(orbit.profile.citizen_no)):null;
    const myHouseVote=orbit.profile?orbit.houseBillVotes.find(v=>Number(v.bill_id)===Number(bill.id)&&Number(v.citizen_no)===Number(orbit.profile.citizen_no)):null;
    const sponsor=citizenByNo(bill.sponsor_citizen_no)||{display_name:'Citizen'};
    const status=billStageStatus(bill);
    const comments=orbit.billComments.filter(c=>Number(c.bill_id)===Number(bill.id));
    const discussion=comments.map(c=>{const author=citizenByNo(c.author_citizen_no)||{display_name:'Citizen'};const own=orbit.profile&&Number(orbit.profile.citizen_no)===Number(c.author_citizen_no);return `<div class="bill-comment">${avatarMarkup(author)}<div class="bill-comment-copy"><strong>${esc(author.display_name)} ${author.is_founder?'✓':''}</strong><small>#${padCitizen(c.author_citizen_no)} · ${relativeTime(c.created_at)}</small><p>${esc(c.body)}</p></div>${own?`<button class="comment-delete" data-delete-bill-comment="${c.id}">×</button>`:''}</div>`;}).join('')||'<p class="muted">No bill discussion yet.</p>';

    const senateRoll=orbit.billVotes.filter(v=>Number(v.bill_id)===Number(bill.id)).map(v=>{const c=citizenByNo(v.citizen_no)||{display_name:'Citizen'};return `<div class="rollcall-row"><span>${esc(c.display_name)} · Senator #${padCitizen(v.citizen_no)}</span><strong>${esc(v.vote.toUpperCase())}</strong></div>`;}).join('');
    const houseRoll=orbit.houseBillVotes.filter(v=>Number(v.bill_id)===Number(bill.id)).map(v=>{const c=citizenByNo(v.citizen_no)||{display_name:'Citizen'};return `<div class="rollcall-row"><span>${esc(c.display_name)} · Representative #${padCitizen(v.citizen_no)}</span><strong>${esc(v.vote.toUpperCase())}</strong></div>`;}).join('');

    const sO=senateOverrideTallyFor(bill.id),hO=houseOverrideTallyFor(bill.id);
    const soY=Number(sO.yes_count||0),soN=Number(sO.no_count||0),hoY=Number(hO.yes_count||0),hoN=Number(hO.no_count||0);
    const mySO=orbit.profile?orbit.billOverrideVotes.find(v=>Number(v.bill_id)===Number(bill.id)&&Number(v.citizen_no)===Number(orbit.profile.citizen_no)):null;
    const myHO=orbit.profile?orbit.houseBillOverrideVotes.find(v=>Number(v.bill_id)===Number(bill.id)&&Number(v.citizen_no)===Number(orbit.profile.citizen_no)):null;
    const overrideOpen=status==='vetoed'&&bill.override_closes_at&&Date.now()<new Date(bill.override_closes_at).getTime();

    let note='';
    if(status==='awaiting_signature')note='<div class="live-vote-status"><strong>Passed by both chambers.</strong> This bill is awaiting action by the President of Staralia.</div>';
    else if(status==='law')note=`<div class="live-vote-status"><strong>Enacted law${bill.law_number?` · S.L. ${String(bill.law_number).padStart(3,'0')}`:''}</strong>${bill.executive_action==='overridden'?' · Presidential veto overridden by two-thirds in both chambers.':' · Signed by the President.'}</div>`;
    else if(status==='vetoed')note=`<div class="live-vote-status"><strong>Presidential veto.</strong> A two-thirds vote in both the House and Senate is required to override before ${bill.override_closes_at?new Date(bill.override_closes_at).toLocaleString():'the deadline'}.<div style="margin-top:8px">Senate override: YES ${soY} · NO ${soN}<br/>House override: YES ${hoY} · NO ${hoN}</div>${senator&&overrideOpen&&!mySO?`<div class="bill-vote-buttons" style="grid-template-columns:1fr 1fr"><button class="btn primary" data-congress-override="senate:${bill.id}:yes">Senate: Override</button><button class="btn secondary" data-congress-override="senate:${bill.id}:no">Senate: Sustain</button></div>`:''}${representative&&overrideOpen&&!myHO?`<div class="bill-vote-buttons" style="grid-template-columns:1fr 1fr"><button class="btn primary" data-congress-override="house:${bill.id}:yes">House: Override</button><button class="btn secondary" data-congress-override="house:${bill.id}:no">House: Sustain</button></div>`:''}</div>`;
    else if(status==='veto_sustained')note='<div class="live-vote-status"><strong>Veto sustained.</strong> Both chambers did not reach the required two-thirds override.</div>';

    const voteControls=status==='open_senate'&&senator&&!mySenateVote?`<div class="bill-vote-buttons"><button class="btn primary" data-congress-bill-vote="senate:${bill.id}:yes">Yes</button><button class="btn danger" data-congress-bill-vote="senate:${bill.id}:no">No</button><button class="btn secondary" data-congress-bill-vote="senate:${bill.id}:abstain">Abstain</button></div>`
      :status==='open_house'&&representative&&!myHouseVote?`<div class="bill-vote-buttons"><button class="btn primary" data-congress-bill-vote="house:${bill.id}:yes">Yes</button><button class="btn danger" data-congress-bill-vote="house:${bill.id}:no">No</button><button class="btn secondary" data-congress-bill-vote="house:${bill.id}:abstain">Abstain</button></div>`:'';

    return `<section class="card bill-card">
      <div class="section-row"><span class="senate-badge">B-${String(bill.id).padStart(3,'0')} · ${esc((bill.origin_chamber||'senate').toUpperCase())} ORIGIN</span><span class="status ${status==='law'?'passed':status.startsWith('open_')?'active':'closed'}">${esc(prettyFederalStatus(status))}</span></div>
      <h3>${esc(bill.title)}</h3><p class="muted">${esc(bill.summary)}</p><small>Sponsored by ${esc(sponsor.display_name)}</small>
      ${bill.body?`<details style="margin-top:12px"><summary>Read bill text</summary><p style="line-height:1.6;white-space:pre-wrap">${esc(bill.body)}</p></details>`:''}
      <div class="grid-2" style="margin-top:14px">
        <div class="card" style="padding:13px"><strong>House</strong><small style="display:block;color:#8193aa;margin:5px 0">${esc((bill.house_result||'pending').toUpperCase())}</small><div>Yes ${hy} · No ${hn} · Abstain ${ha}</div></div>
        <div class="card" style="padding:13px"><strong>Senate</strong><small style="display:block;color:#8193aa;margin:5px 0">${esc((bill.senate_result||'pending').toUpperCase())}</small><div>Yes ${sy} · No ${sn} · Abstain ${sa}</div></div>
      </div>
      ${voteControls}
      ${mySenateVote?`<div class="live-vote-status">Your Senate vote: <strong>${esc(mySenateVote.vote.toUpperCase())}</strong></div>`:''}
      ${myHouseVote?`<div class="live-vote-status">Your House vote: <strong>${esc(myHouseVote.vote.toUpperCase())}</strong></div>`:''}
      ${note}
      ${(senateRoll||houseRoll)?`<details style="margin-top:12px"><summary>Congressional roll calls</summary>${houseRoll?`<h4>House</h4>${houseRoll}`:''}${senateRoll?`<h4>Senate</h4>${senateRoll}`:''}</details>`:'<p class="muted" style="margin-top:12px">No congressional votes yet.</p>'}
      <details class="bill-discussion"><summary>Public discussion (${comments.length})</summary>${discussion}${orbit.user?`<form class="bill-comment-form" data-bill-comment-form="${bill.id}"><input maxlength="1000" placeholder="Discuss this bill…" required /><button class="btn secondary" type="submit">Post</button></form>`:'<p class="muted">Log in to join the discussion.</p>'}</details>
    </section>`;
  }).join('')||'<div class="card"><p class="muted">No bills have been introduced yet.</p></div>';

  const statusLabel=orbit.profile?.is_founder?'President':representative?'Representative':senator?'Senator':'Citizen';

  view.innerHTML=`<div class="stack senate-live-root">
    <div class="senate-visual"></div>
    <div class="card"><span class="eyebrow">LEGISLATIVE BRANCH</span><h2 style="margin:7px 0">Congress of Staralia</h2><p class="muted">Congress has two chambers. A bill must pass both the 100-seat House of Representatives and the 100-seat Senate before it can reach the President.</p></div>
    <div class="grid-3"><div class="card metric"><span>Representatives</span><strong>${activeRepresentatives.length}</strong><small>100 House seats</small></div><div class="card metric"><span>Senators</span><strong>${activeSenators.length}</strong><small>100 Senate seats</small></div><div class="card metric"><span>Your status</span><strong>${statusLabel}</strong><small>${orbit.profile?.is_founder?'Executive Branch · no congressional vote':representative?`House Seat ${representative.seat_no}`:senator?`Senate Seat ${senator.seat_no}`:'Vote for your Representatives and Senators'}</small></div></div>
    <div class="grid-2">
      <section class="card"><div class="section-row"><h3>House of Representatives</h3>${representative?'<button class="btn primary" id="createHouseBillBtn">Introduce bill</button>':''}</div><p class="muted">100 elected Representatives.</p>${houseMembersHtml}</section>
      <section class="card"><div class="section-row"><h3>Senate</h3>${senator?'<button class="btn primary" id="createSenateBillBtn">Introduce bill</button>':''}</div><p class="muted">100 elected Senators. The Senate also confirms Supreme Court nominees.</p>${senateMembersHtml}</section>
    </div>
    <section class="card"><div class="section-row"><h3>Congressional legislation</h3><button class="btn secondary" data-route="elections">Congressional elections</button></div><p class="muted">Citizens do not vote directly on bills. Representatives and Senators cast the legislative votes.</p></section>
    ${billsHtml}
  </div>`;
  viewRootSeen=view.firstElementChild;

  view.querySelector('#createHouseBillBtn')?.addEventListener('click',()=>openCreateBill('house'));
  view.querySelector('#createSenateBillBtn')?.addEventListener('click',()=>openCreateBill('senate'));

  view.querySelectorAll('[data-congress-bill-vote]').forEach(btn=>btn.addEventListener('click',async()=>{
    const [chamber,id,vote]=btn.dataset.congressBillVote.split(':');
    if(!confirm(`Cast your final ${chamber==='senate'?'Senate':'House'} vote: ${vote.toUpperCase()}?`))return;
    const table=chamber==='senate'?'bill_votes':'house_bill_votes';
    const {error}=await db.from(table).insert({bill_id:Number(id),vote});
    if(error)toast(error.message);else toast(`${chamber==='senate'?'Senate':'House'} vote recorded.`);
    await fetchSenate();renderCongressLive();
  }));

  view.querySelectorAll('[data-congress-override]').forEach(btn=>btn.addEventListener('click',async()=>{
    const [chamber,id,vote]=btn.dataset.congressOverride.split(':');
    if(!confirm(`${vote==='yes'?'Vote to override':'Vote to sustain'} the Presidential veto in the ${chamber==='senate'?'Senate':'House'}?`))return;
    const table=chamber==='senate'?'bill_override_votes':'house_bill_override_votes';
    const {error}=await db.from(table).insert({bill_id:Number(id),vote});
    if(error)toast(error.message);else toast('Veto-override vote recorded.');
    await fetchSenate();renderCongressLive();
  }));

  view.querySelectorAll('[data-bill-comment-form]').forEach(form=>form.addEventListener('submit',async e=>{e.preventDefault();const input=form.querySelector('input');const body=input.value.trim();if(!body)return;const button=form.querySelector('button');button.disabled=true;const {error}=await db.from('bill_comments').insert({bill_id:Number(form.dataset.billCommentForm),body});if(error)toast(error.message);else toast('Added to bill discussion.');await fetchSenate();renderCongressLive();}));
  view.querySelectorAll('[data-delete-bill-comment]').forEach(btn=>btn.addEventListener('click',async()=>{if(!confirm('Delete this bill comment?'))return;const {error}=await db.from('bill_comments').delete().eq('id',Number(btn.dataset.deleteBillComment));if(error)toast(error.message);await fetchSenate();renderCongressLive();}));
}

function openCreateBill(chamber){
  const label=chamber==='senate'?'Senate':'House';
  const wrap=modal(`<div class="auth-modal-head"><div><span class="eyebrow">${label.toUpperCase()}</span><h2>Introduce bill</h2></div><button class="icon-btn" data-close-v13>×</button></div><form class="admin-form" id="newBillForm"><label>Bill title<input id="billTitle" maxlength="250" required /></label><label>Summary<textarea id="billSummary" maxlength="1000" required></textarea></label><label>Bill text<textarea id="billBody" maxlength="10000" placeholder="Optional full bill text"></textarea></label><label>Voting period in originating chamber (days)<input id="billDays" type="number" min="1" max="30" value="7" required /></label><p class="admin-note">If this chamber passes the bill, the same text automatically moves to the other chamber for a separate vote.</p><p class="auth-message" id="billMessage"></p><button class="btn primary full" type="submit">Introduce bill</button></form>`,'orbitBillModal');
  wrap.querySelector('#newBillForm').addEventListener('submit',async e=>{
    e.preventDefault();const button=e.currentTarget.querySelector('button');button.disabled=true;const days=Math.max(1,Math.min(30,Number(wrap.querySelector('#billDays').value)||7));
    const rpc=chamber==='senate'?'senate_create_bill':'house_create_bill';
    const {error}=await db.rpc(rpc,{p_title:wrap.querySelector('#billTitle').value.trim(),p_summary:wrap.querySelector('#billSummary').value.trim(),p_body:wrap.querySelector('#billBody').value.trim()||null,p_closes_at:new Date(Date.now()+days*86400000).toISOString()});
    if(error){wrap.querySelector('#billMessage').textContent=error.message;wrap.querySelector('#billMessage').className='auth-message error';button.disabled=false;return;}
    wrap.remove();await fetchSenate();renderCongressLive();toast(`Bill introduced in the ${label}.`);
  });
}

/* =========================
   DIRECTORY SEARCH
   ========================= */

function openGlobalAccountSearch() {
  const wrap = modal(`
    <div class="auth-modal-head">
      <div><span class="eyebrow">CITIZEN DIRECTORY</span><h2>Find an account</h2></div>
      <button class="icon-btn" data-close-v13 aria-label="Close">×</button>
    </div>
    <input class="auth-input" id="globalAccountSearchInput" autocomplete="off" placeholder="Type an account name…" />
    <div class="account-search-results" id="globalAccountSearchResults"></div>
  `, 'orbitAccountSearchModal');

  const input = wrap.querySelector('#globalAccountSearchInput');
  const results = wrap.querySelector('#globalAccountSearchResults');

  const draw = value => {
    const q = String(value || '').trim().toLowerCase();
    const matches = orbit.citizens
      .filter(c => !q || citizenSearchText(c).includes(q))
      .sort((a,b) => Number(a.citizen_no) - Number(b.citizen_no))
      .slice(0, 30);

    results.innerHTML = matches.length ? matches.map(c => `
      <button class="account-search-result" data-global-citizen="${c.citizen_no}">
        ${avatarMarkup(c)}
        <span><strong>${esc(c.display_name)} ${c.is_founder ? '✓' : ''}</strong><small>${esc(c.role || 'Citizen')}${c.country ? ` · ${esc(c.country)}` : ''}</small></span>
        <span class="account-search-number">#${padCitizen(c.citizen_no)}</span>
      </button>`).join('') : '<p class="muted">No accounts found.</p>';

    results.querySelectorAll('[data-global-citizen]').forEach(btn => btn.addEventListener('click', () => {
      const citizenNo = Number(btn.dataset.globalCitizen);
      wrap.remove();
      showCitizenProfile(citizenNo, { title: citizenByNo(citizenNo)?.is_founder ? 'President Profile' : 'Citizen Profile', backRoute: 'home' });
    }));
  };

  input.addEventListener('input', e => draw(e.target.value));
  draw('');
  setTimeout(() => input.focus(), 50);
}

function wireGlobalAccountSearch() {
  const button = document.querySelector('#searchBtn');
  if (!button || button.dataset.globalSearchBound) return;
  button.dataset.globalSearchBound = '1';
  button.title = 'Search citizen accounts';
  button.setAttribute('aria-label', 'Search citizen accounts');
  button.addEventListener('click', event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    openGlobalAccountSearch();
  }, true);
}

function wireMyProfileShortcuts() {
  if (!orbit.user || !orbit.profile) return;

  const citizenNo = Number(orbit.profile.citizen_no);
  const profileTitle = orbit.profile.is_founder ? 'President Profile' : 'Citizen Profile';

  const openMine = event => {
    if (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    showCitizenProfile(citizenNo, { title: profileTitle, backRoute: 'home' });
  };

  const account = document.querySelector('#accountBtn');
  if (account) {
    account.title = 'View my profile';
    account.setAttribute('aria-label', 'View my profile');
    if (!account.dataset.myProfileBound) {
      account.dataset.myProfileBound = '1';
      account.addEventListener('click', openMine, true);
    }
  }

  const homeAccount = document.querySelector('#homeAccountBtn');
  if (homeAccount) {
    if (homeAccount.textContent !== 'View my profile') homeAccount.textContent = 'View my profile';
    if (!homeAccount.dataset.myProfileBound) {
      homeAccount.dataset.myProfileBound = '1';
      homeAccount.addEventListener('click', openMine, true);
    }
  }

  document.querySelectorAll('[data-route="profile"]').forEach(el => {
    const label = el.querySelector('.nav-label') || el.querySelector('strong');
    if (label && label.textContent !== 'My Profile') label.textContent = 'My Profile';
    const detail = el.querySelector('small');
    if (detail && /Founder|President/i.test(detail.textContent || '') && detail.textContent !== 'View your citizen profile') detail.textContent = 'View your citizen profile';
    el.title = 'My Profile';
    if (!el.dataset.myProfileBound) {
      el.dataset.myProfileBound = '1';
      el.addEventListener('click', openMine, true);
    }
  });

  const section = document.querySelector('#sectionTitle')?.textContent || '';
  const view = document.querySelector('#view');
  if (section === 'More' && view && !view.querySelector('#myProfileQuickCard')) {
    const card = document.createElement('div');
    card.id = 'myProfileQuickCard';
    card.className = 'card my-profile-quick-card';
    card.innerHTML = `<span class="eyebrow">MY CITIZENSHIP</span><h3 style="margin:7px 0 5px">${esc(orbit.profile.display_name)}</h3><p class="muted">Citizen #${padCitizen(citizenNo)} · ${esc(orbit.profile.role)}</p><button class="btn primary" id="myProfileQuickBtn">View my profile</button>`;
    view.prepend(card);
    card.querySelector('#myProfileQuickBtn')?.addEventListener('click', openMine, true);
  }
}

/* =========================
   ROUTE ENHANCEMENT
   ========================= */

function enhanceCurrentView(force = false) {
  wireMyProfileShortcuts();
  wireGlobalAccountSearch();
  const view = document.querySelector('#view');
  const root = view?.firstElementChild;
  const title = document.querySelector('#sectionTitle')?.textContent || '';

  if (title === 'Elections') { if (force || root !== viewRootSeen || !root?.classList.contains('live-election-stack')) renderElections(); return; }
  if (title === 'Congress') { if (force || root !== viewRootSeen || !root?.classList?.contains('senate-live-root')) renderCongressLive(); return; }
  if (title === 'Events') { if (force || root !== viewRootSeen || !root?.classList?.contains('events-live-root')) renderEventsLive(); return; }
  if (title === 'President Profile') { if (force || !root?.querySelector?.('.profile-page')) showCitizenProfile(1, { title: 'President Profile', backRoute: 'more', updateUrl: false }); return; }
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
    else if (kind === 'senate') await Promise.all([fetchSenate(), fetchSenateElections(), fetchNetworkAndSettings()]);
    else if (kind === 'events') await Promise.all([fetchEvents(), fetchNetworkAndSettings()]);
    else await Promise.all([fetchCitizens(), fetchSocial(), fetchElections(), fetchNetworkAndSettings(), fetchSenate(), fetchEvents(), fetchSenateElections()]);
    wireNotificationButton();
    enhanceCurrentView(true);
  }, 250);
}

injectStyles();
wireGlobalAccountSearch();

const viewObserver = new MutationObserver(() => {
  clearTimeout(viewObserver._timer);
  viewObserver._timer = setTimeout(() => enhanceCurrentView(false), 35);
});

const myProfileShortcutObserver = new MutationObserver(() => {
  clearTimeout(myProfileShortcutObserver._timer);
  myProfileShortcutObserver._timer = setTimeout(wireMyProfileShortcuts, 30);
});
myProfileShortcutObserver.observe(document.body, { childList: true, subtree: true });
viewObserver.observe(document.querySelector('#view'), { childList: true, subtree: false });

db.channel('staralia-v170')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => scheduleRefresh('citizens'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'post_media' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'post_stats' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'comment_likes' }, () => scheduleRefresh('social'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follow_stats' }, () => scheduleRefresh('network'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'follows' }, () => scheduleRefresh('network'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, () => scheduleRefresh('network'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => scheduleRefresh('events'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'event_reminders' }, () => scheduleRefresh('events'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'propositions' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'proposition_votes' }, () => scheduleRefresh('elections'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_members' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_bill_votes' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_bill_tallies' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_bill_override_votes' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_elections' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_candidates' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'house_candidate_tallies' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'senate_members' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bills' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_votes' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_override_votes' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_tallies' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'bill_comments' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'senate_elections' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'senate_candidates' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'senate_election_votes' }, () => scheduleRefresh('senate'))
  .on('postgres_changes', { event: '*', schema: 'public', table: 'senate_candidate_tallies' }, () => scheduleRefresh('senate'))
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
