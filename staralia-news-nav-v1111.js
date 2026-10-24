(() => {
  'use strict';

  const STYLE_ID = 'staraliaV1111Styles';
  const NEWS_ROUTE = 'news';
  const MOTTO_ROUTE = 'motto';
  const CALENDAR_ROUTE = 'calendar';
  const MOTTO = 'WE CARRY DAWN BEYOND THE SKY';
  const STARALIA_EPOCH_EARTH_YEAR = 2026;
  const STARALIA_MONTHS = [
    ['Aurelis','First light, beginnings'],
    ['Velaris','Motion and ambition'],
    ['Caelora','The heavens'],
    ['Novaris','Discovery and renewal'],
    ['Elurion','Knowledge and science'],
    ['Veylora','Community and citizenship'],
    ['Solaryn','Energy and achievement'],
    ['Astralis','Stars and cosmic identity'],
    ['Meridion','Balance, law, and government'],
    ['Nythera','Mystery and reflection'],
    ['Orivane','Journey and expansion'],
    ['Zenithar','Culmination and reaching upward']
  ];
  const PASSAGE_HOLIDAYS = [
    ['Founding Day','Remembering the founding of Staralia and the beginning of its civic era.'],
    ['Citizenship Day','Celebrating Staralia\'s citizens and participation in the nation.'],
    ['Day of Consciousness','Honoring consciousness, creativity, thought, and intelligent life.'],
    ['Exploration Day','Celebrating science, discovery, and humanity\'s expansion beyond Earth.'],
    ['Dawn Day','Closing the year beneath the motto “We Carry Dawn Beyond the Sky.”']
  ];
  let dbPromise = null;
  let newsChannel = null;

  const ICONS = {
    home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.7 12 3.5l8.5 7.2v9.8h-6v-6h-5v6h-6z"/></svg>`,
    citizens: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6.8-1.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM2.5 20.5v-2.2c0-3.3 2.8-5.9 6.5-5.9s6.5 2.6 6.5 5.9v2.2Zm13.6 0v-1.8c0-2-.7-3.7-2-5 3.9-.6 7.4 1.8 7.4 5v1.8Z"/></svg>`,
    messages: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.2 4.5h17.6v12H8l-4.8 3.2Zm2 2v9.5l2.2-1.5h11.4v-8Z"/></svg>`,
    news: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 3.5h13.5v3H21v14H5.8A2.8 2.8 0 0 1 3 17.7V4.5A1 1 0 0 1 4 3.5Zm13.5 5v9.2c0 .3.1.6.3.8H19v-10ZM5 5.5v12.2c0 .4.3.8.8.8h10a3 3 0 0 1-.3-1.3V5.5Zm2 2h6.7v2H7Zm0 4h6.7v2H7Zm0 4h4.7v2H7Z"/></svg>`,
    more: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v2H4Zm0 5h16v2H4Zm0 5h16v2H4Z"/></svg>`
  };

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* v1.11.1: icon-only mobile navigation + Staralian calendar */
      .bottom-nav .bottom-link > span:not(.nav-icon){display:none!important}
      .bottom-nav .bottom-link{
        min-width:0!important;min-height:72px!important;display:grid!important;place-items:center!important;
        padding:10px 6px!important;gap:0!important
      }
      .bottom-nav .nav-icon{display:grid!important;place-items:center!important;width:38px!important;height:38px!important;font-size:28px!important}
      .bottom-nav .nav-icon svg{width:30px!important;height:30px!important;display:block;fill:currentColor}
      .bottom-nav .bottom-link.active .nav-icon{transform:translateY(-1px)}

      /* Brand order: STARALIA first, National Emblem second. */
      .topbar-title.orbit-brand-title .national-emblem-topcopy{order:1!important}
      .topbar-title.orbit-brand-title .national-emblem-topmark{order:2!important}

      /* National News */
      .staralia-news-page{display:grid;gap:18px}
      .news-admin-card{border-color:rgba(244,185,66,.30)!important;background:linear-gradient(135deg,rgba(244,185,66,.09),rgba(13,24,40,.97))!important}
      .news-compose-grid{display:grid;gap:12px;margin-top:16px}
      .news-compose-grid input,.news-compose-grid textarea{
        width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.11);border-radius:14px;
        background:#07111f;color:#fff;padding:13px 14px;font:inherit;outline:none
      }
      .news-compose-grid textarea{min-height:120px;resize:vertical;line-height:1.55}
      .news-compose-grid textarea.news-body{min-height:220px}
      .news-compose-grid input:focus,.news-compose-grid textarea:focus{border-color:rgba(244,185,66,.65);box-shadow:0 0 0 3px rgba(244,185,66,.07)}
      .news-image-picker{display:grid;gap:7px;color:#aebdd0;font-size:13px;font-weight:800}
      .news-image-picker input{padding:10px;background:rgba(255,255,255,.035)}
      .news-list{display:grid;gap:18px}
      .news-card{overflow:hidden;padding:0!important}
      .news-image{width:100%;aspect-ratio:16/9;object-fit:cover;display:block;background:#03070d}
      .news-card-body{padding:20px}
      .news-card-head{display:flex;justify-content:space-between;gap:14px;align-items:flex-start}
      .news-card h2{font-size:25px;line-height:1.15;margin:6px 0 8px}
      .news-card .news-excerpt{margin:0;color:#b7c4d5;line-height:1.6;font-size:16px}
      .news-meta{display:flex;gap:8px;flex-wrap:wrap;color:#7f91a8;font-size:12px;margin-top:10px}
      .news-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
      .news-full-body{white-space:pre-wrap;line-height:1.72;color:#d7e0ea;margin:18px 0 0;padding-top:16px;border-top:1px solid rgba(255,255,255,.08)}
      .news-empty{text-align:center;padding:34px 22px!important}
      .news-presidential-note{margin:0;color:#99a9bd;line-height:1.55}
      .motto-page-v1110{display:grid;gap:18px}
      .motto-banner-v1110{padding:28px!important;text-align:center;border-color:rgba(244,185,66,.27)!important;background:linear-gradient(145deg,rgba(244,185,66,.10),rgba(92,45,190,.08),rgba(13,24,40,.98))!important}
      .motto-banner-v1110 blockquote{font-size:clamp(25px,5vw,42px);line-height:1.12;font-weight:950;letter-spacing:.035em;color:#ffe29a;margin:18px auto;max-width:850px}
      .motto-meaning-v1110{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .motto-meaning-v1110 div{border:1px solid rgba(255,255,255,.08);border-radius:15px;padding:17px;background:rgba(255,255,255,.025)}
      .motto-meaning-v1110 strong{display:block;margin-bottom:6px;color:#fff}
      .motto-meaning-v1110 p{margin:0;color:#95a7bc;line-height:1.55}

      /* Staralian Calendar */
      .staralia-calendar-page{display:grid;gap:18px}
      .calendar-hero{padding:26px!important;border-color:rgba(244,185,66,.28)!important;background:linear-gradient(145deg,rgba(244,185,66,.10),rgba(78,43,170,.08),rgba(13,24,40,.98))!important}
      .calendar-current-date{font-size:clamp(32px,7vw,52px);font-weight:950;letter-spacing:.025em;color:#ffe29a;margin:8px 0 5px}
      .calendar-earth-date{font-size:15px;color:#a8b7ca;margin:0}
      .calendar-rule{margin-top:16px;padding-top:15px;border-top:1px solid rgba(255,255,255,.08);color:#91a4bb;line-height:1.6}
      .calendar-month-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}
      .calendar-month{padding:16px;border:1px solid rgba(255,255,255,.08);border-radius:15px;background:rgba(255,255,255,.025)}
      .calendar-month .num{display:block;color:#ffe29a;font-size:12px;font-weight:900;letter-spacing:.14em;margin-bottom:5px}
      .calendar-month strong{display:block;font-size:18px}
      .calendar-month small{display:block;color:#8fa2b8;margin-top:5px;line-height:1.45}
      .passage-list{display:grid;gap:10px;margin-top:14px}
      .passage-day{display:grid;grid-template-columns:auto 1fr;gap:13px;align-items:start;padding:14px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.022)}
      .passage-index{width:42px;height:42px;border-radius:12px;display:grid;place-items:center;font-weight:950;color:#ffe29a;background:rgba(244,185,66,.09);border:1px solid rgba(244,185,66,.22)}
      .passage-day strong{display:block;margin-bottom:4px}
      .passage-day p{margin:0;color:#8fa2b8;line-height:1.5;font-size:14px}
      .calendar-converters{display:grid;grid-template-columns:1fr 1fr;gap:14px}
      .calendar-converter{display:grid;gap:11px}
      .calendar-converter input,.calendar-converter select{
        width:100%;box-sizing:border-box;border:1px solid rgba(255,255,255,.11);border-radius:13px;
        background:#07111f;color:#fff;padding:12px 13px;font:inherit;outline:none
      }
      .calendar-converter-row{display:grid;grid-template-columns:1fr 1.4fr .8fr;gap:9px}
      .calendar-result{min-height:58px;padding:13px 14px;border-radius:13px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);display:grid;align-content:center}
      .calendar-result strong{font-size:18px;color:#ffe29a}
      .calendar-result small{color:#8fa2b8;margin-top:3px}
      .news-date-pair{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:12px;padding-top:11px;border-top:1px solid rgba(255,255,255,.07);font-size:13px}
      .news-date-pair .star-date{color:#ffe29a;font-weight:850}
      .news-date-pair .earth-date{color:#93a4ba}
      @media(max-width:760px){
        .bottom-nav .bottom-link{min-height:70px!important}
        .bottom-nav .nav-icon svg{width:28px!important;height:28px!important}
        .news-card-body{padding:17px}.news-card h2{font-size:22px}
        .motto-meaning-v1110{grid-template-columns:1fr}
        .calendar-month-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
        .calendar-converters{grid-template-columns:1fr}
        .calendar-converter-row{grid-template-columns:.9fr 1.3fr .8fr}
      }
    `;
    document.head.appendChild(style);
  }

  function escapeHtml(value='') {
    return String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function relativeTime(iso) {
    const delta = Math.max(0, Date.now() - new Date(iso).getTime());
    const mins = Math.floor(delta / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(iso).toLocaleDateString();
  }


  function pad(value, width=2) {
    return String(value).padStart(width, '0');
  }

  function isEarthLeapYear(year) {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  }

  function earthDateParts(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return { year:d.getFullYear(), month:d.getMonth()+1, day:d.getDate() };
  }

  function earthPartsToDate(parts) {
    return new Date(parts.year, parts.month-1, parts.day, 12, 0, 0, 0);
  }

  function earthToStaralia(value) {
    const parts = value && typeof value === 'object' && 'year' in value ? value : earthDateParts(value);
    if (!parts || parts.year < STARALIA_EPOCH_EARTH_YEAR) {
      throw new Error('The Staralian calendar begins on January 1, 2026.');
    }
    const starYear = parts.year - STARALIA_EPOCH_EARTH_YEAR + 1;
    const start = Date.UTC(parts.year, 0, 1);
    const current = Date.UTC(parts.year, parts.month-1, parts.day);
    const dayOfYear = Math.floor((current-start)/86400000) + 1;
    if (dayOfYear < 1 || dayOfYear > (isEarthLeapYear(parts.year) ? 366 : 365)) {
      throw new Error('Enter a valid Earth date.');
    }
    if (dayOfYear <= 360) {
      const monthIndex = Math.floor((dayOfYear-1)/30);
      const day = ((dayOfYear-1)%30)+1;
      return {
        year:starYear,
        area:'month',
        monthIndex,
        month:STARALIA_MONTHS[monthIndex][0],
        day,
        formal:`${pad(starYear,4)} ${STARALIA_MONTHS[monthIndex][0]} ${pad(day)}`
      };
    }
    const passageDay = dayOfYear - 360;
    return {
      year:starYear,
      area:'passage',
      monthIndex:null,
      month:'Passage',
      day:passageDay,
      formal:`${pad(starYear,4)} Passage ${pad(passageDay)}`
    };
  }

  function staraliaToEarth(starYear, area, day) {
    const y = Number(starYear);
    const d = Number(day);
    if (!Number.isInteger(y) || y < 1) throw new Error('Staralian year must be 0001 or later.');
    const earthYear = STARALIA_EPOCH_EARTH_YEAR + y - 1;
    let dayOfYear;
    if (String(area).startsWith('month:')) {
      const monthIndex = Number(String(area).split(':')[1]);
      if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) throw new Error('Choose a valid Staralian month.');
      if (!Number.isInteger(d) || d < 1 || d > 30) throw new Error('Month days run from 01 through 30.');
      dayOfYear = monthIndex*30 + d;
    } else if (area === 'passage') {
      const max = isEarthLeapYear(earthYear) ? 6 : 5;
      if (!Number.isInteger(d) || d < 1 || d > max) {
        throw new Error(`Passage in ${pad(y,4)} contains ${max} days.`);
      }
      dayOfYear = 360 + d;
    } else {
      throw new Error('Choose a Staralian month or The Passage.');
    }
    return new Date(earthYear, 0, dayOfYear, 12, 0, 0, 0);
  }

  function formatEarthUS(value) {
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  }

  function formatNewsDatePair(iso) {
    const parts = earthDateParts(iso);
    if (!parts || parts.year < STARALIA_EPOCH_EARTH_YEAR) return {star:'', earth:formatEarthUS(iso)};
    const star = earthToStaralia(parts);
    return {star:star.formal, earth:formatEarthUS(earthPartsToDate(parts))};
  }

  function showLocalToast(message) {
    const el = document.querySelector('#toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    setTimeout(() => el.classList.remove('show'), 2300);
  }

  function ensureRoute(id, icon, label) {
    if (!routeMeta[id]) {
      const moreIndex = routes.findIndex(r => r[0] === 'more');
      const entry = [id, icon, label];
      if (moreIndex >= 0) routes.splice(moreIndex, 0, entry);
      else routes.push(entry);
      routeMeta[id] = { icon, label };
    } else {
      routeMeta[id].icon = icon;
      routeMeta[id].label = label;
    }
  }

  function patchNavigation() {
    injectStyles();

    routeMeta.home.icon = ICONS.home;
    routeMeta.citizens.icon = ICONS.citizens;
    routeMeta.messages.icon = ICONS.messages;
    routeMeta.more.icon = ICONS.more;
    ensureRoute(NEWS_ROUTE, ICONS.news, 'News');
    ensureRoute(MOTTO_ROUTE, '✦', 'National Motto');
    ensureRoute(CALENDAR_ROUTE, '◷', 'Calendar');

    mainMobile.splice(0, mainMobile.length, 'home', 'citizens', 'messages', 'news', 'more');

    const originalNavButton = navButton;
    navButton = function(id, mobile=false) {
      const m = routeMeta[id];
      if (mobile) {
        const accessible = id === 'messages' ? 'Direct Messaging' : m.label;
        return `<button class="bottom-link ${state.route===id?'active':''}" data-route="${id}" aria-label="${escapeHtml(accessible)}" title="${escapeHtml(accessible)}"><span class="nav-icon">${m.icon}</span></button>`;
      }
      return originalNavButton(id, false);
    };

    renderMore = function() {
      const tiles = ['elections','senate','calendar','constitution','treasury','government','judiciary','space','events','world','residency','motto','profile'];
      const descriptions = {
        elections:'House elections, Senate elections, and Propositions',
        senate:'100 Representatives + 100 Senators',
        constitution:'National charter and citizen rights',
        treasury:'Credits, budgets, and project funds',
        government:'Three branches and Presidential office',
        judiciary:'Supreme Court and constitutional cases',
        space:'Real-world mission roadmap',
        events:'Speeches, sessions, and meetups',
        world:'Future explorable virtual capital',
        residency:'Optional Resident status',
        calendar:'Staralian dates, months, Passage holidays, and converter',
        motto:'Official national motto and meaning',
        profile:'President of Staralia'
      };
      view.innerHTML = `<div class="more-grid">
        <span data-route="messages" hidden aria-hidden="true"></span>
        ${tiles.filter(id=>routeMeta[id]).map(id=>`<button class="more-tile" data-route="${id}"><span>${routeMeta[id].icon}</span><strong>${escapeHtml(routeMeta[id].label)}</strong><small>${escapeHtml(descriptions[id]||'')}</small></button>`).join('')}
      </div>`;
    };

    const originalRenderRoute = renderRoute;
    renderRoute = function() {
      if (state.route === NEWS_ROUTE) return renderNews();
      if (state.route === MOTTO_ROUTE) return renderMotto();
      if (state.route === CALENDAR_ROUTE) return renderCalendar();
      return originalRenderRoute();
    };

    renderNav();
  }

  function renderMotto() {
    document.querySelector('#sectionKicker').textContent = 'STARALIA';
    document.querySelector('#sectionTitle').textContent = 'National Motto';
    view.innerHTML = `<div class="motto-page-v1110">
      <section class="card motto-banner-v1110">
        <span class="eyebrow">NATIONAL MOTTO</span>
        <blockquote>${MOTTO}</blockquote>
        <p class="muted">Staralia's motto expresses a civilization that carries human possibility outward rather than waiting for the future to arrive.</p>
      </section>
      <section class="motto-meaning-v1110">
        <div><strong>Dawn</strong><p>A new beginning: the founding of institutions, culture, exploration, and a civilization still being built.</p></div>
        <div><strong>Carry</strong><p>Citizens are participants. Staralia's future is something its people actively build and carry forward together.</p></div>
        <div><strong>Beyond the sky</strong><p>The nation looks beyond Earth toward exploration, settlement, science, and humanity's long-term future in space.</p></div>
      </section>
    </div>`;
  }


  function renderCalendar() {
    document.querySelector('#sectionKicker').textContent = 'STARALIA';
    document.querySelector('#sectionTitle').textContent = 'Calendar';

    const today = new Date();
    let currentStar;
    try { currentStar = earthToStaralia(today); }
    catch { currentStar = {formal:'Calendar begins January 1, 2026'}; }

    const months = STARALIA_MONTHS.map((m,i)=>`<div class="calendar-month">
      <span class="num">MONTH ${pad(i+1)}</span>
      <strong>${escapeHtml(m[0])}</strong>
      <small>30 days · ${escapeHtml(m[1])}</small>
    </div>`).join('');

    const passage = PASSAGE_HOLIDAYS.map((h,i)=>`<div class="passage-day">
      <span class="passage-index">${pad(i+1)}</span>
      <div><strong>${escapeHtml(h[0])}</strong><p>${escapeHtml(h[1])}</p></div>
    </div>`).join('');

    const monthOptions = STARALIA_MONTHS.map((m,i)=>`<option value="month:${i}">${pad(i+1)} · ${escapeHtml(m[0])}</option>`).join('');

    view.innerHTML = `<div class="staralia-calendar-page">
      <section class="card calendar-hero">
        <span class="eyebrow">CURRENT STARALIAN DATE</span>
        <div class="calendar-current-date">${escapeHtml(currentStar.formal)}</div>
        <p class="calendar-earth-date">${escapeHtml(formatEarthUS(today))} · Earth date</p>
        <div class="calendar-rule"><strong>Epoch:</strong> 0001 Aurelis 01 = January 1, 2026. Staralian dates are written largest-to-smallest: <strong>Year · Month · Day</strong>.</div>
      </section>

      <section class="card">
        <span class="eyebrow">THE 12 MONTHS</span>
        <h2 style="margin:7px 0 6px">360 days of the Staralian year</h2>
        <p class="muted">Every month contains exactly 30 days.</p>
        <div class="calendar-month-grid" style="margin-top:16px">${months}</div>
      </section>

      <section class="card">
        <span class="eyebrow">THE PASSAGE</span>
        <h2 style="margin:7px 0 6px">Five national holidays outside the months</h2>
        <p class="muted">The Passage closes each Staralian year. Leap years add Passage 06 — <strong>Continuance Day</strong>.</p>
        <div class="passage-list">${passage}
          <div class="passage-day">
            <span class="passage-index">06</span>
            <div><strong>Continuance Day</strong><p>Observed only in Earth leap years so 000X Aurelis 01 always remains aligned with January 1.</p></div>
          </div>
        </div>
      </section>

      <section class="card">
        <span class="eyebrow">DATE CONVERTER</span>
        <h2 style="margin:7px 0 6px">Earth ↔ Staralia</h2>
        <p class="muted">Convert dates in either direction using the official epoch and calendar rules.</p>
        <div class="calendar-converters" style="margin-top:16px">
          <form class="calendar-converter" id="earthToStarForm">
            <strong>Earth → Staralia</strong>
            <input type="date" id="earthCalendarInput" min="2026-01-01" required />
            <button class="btn primary" type="submit">Convert to Staralia</button>
            <div class="calendar-result" id="earthToStarResult"><small>Select an Earth date.</small></div>
          </form>
          <form class="calendar-converter" id="starToEarthForm">
            <strong>Staralia → Earth</strong>
            <div class="calendar-converter-row">
              <input type="number" id="starYearInput" min="1" step="1" value="${Math.max(1,today.getFullYear()-STARALIA_EPOCH_EARTH_YEAR+1)}" aria-label="Staralian year" />
              <select id="starAreaInput" aria-label="Staralian month">
                ${monthOptions}
                <option value="passage">Passage</option>
              </select>
              <input type="number" id="starDayInput" min="1" max="30" step="1" value="1" aria-label="Staralian day" />
            </div>
            <button class="btn primary" type="submit">Convert to Earth</button>
            <div class="calendar-result" id="starToEarthResult"><small>Enter a Staralian date.</small></div>
          </form>
        </div>
      </section>
    </div>`;

    const earthInput = view.querySelector('#earthCalendarInput');
    const todayY = today.getFullYear();
    const todayM = pad(today.getMonth()+1);
    const todayD = pad(today.getDate());
    if (todayY >= STARALIA_EPOCH_EARTH_YEAR) earthInput.value = `${todayY}-${todayM}-${todayD}`;

    const earthForm = view.querySelector('#earthToStarForm');
    const starForm = view.querySelector('#starToEarthForm');
    const areaInput = view.querySelector('#starAreaInput');
    const starDay = view.querySelector('#starDayInput');

    function convertEarth() {
      const raw = earthInput.value;
      if (!raw) return;
      const [y,m,d] = raw.split('-').map(Number);
      const result = view.querySelector('#earthToStarResult');
      try {
        const star = earthToStaralia({year:y,month:m,day:d});
        result.innerHTML = `<strong>${escapeHtml(star.formal)}</strong><small>${escapeHtml(formatEarthUS(new Date(y,m-1,d,12)))} Earth</small>`;
      } catch (err) {
        result.innerHTML = `<small>${escapeHtml(err.message)}</small>`;
      }
    }

    function convertStar() {
      const result = view.querySelector('#starToEarthResult');
      try {
        const year = Number(view.querySelector('#starYearInput').value);
        const area = areaInput.value;
        const day = Number(starDay.value);
        const earth = staraliaToEarth(year,area,day);
        const star = earthToStaralia(earth);
        result.innerHTML = `<strong>${escapeHtml(formatEarthUS(earth))}</strong><small>${escapeHtml(star.formal)}</small>`;
      } catch (err) {
        result.innerHTML = `<small>${escapeHtml(err.message)}</small>`;
      }
    }

    earthForm.addEventListener('submit', e=>{e.preventDefault();convertEarth();});
    starForm.addEventListener('submit', e=>{e.preventDefault();convertStar();});
    areaInput.addEventListener('change', ()=>{
      const year = Number(view.querySelector('#starYearInput').value)||1;
      if (areaInput.value==='passage') {
        starDay.max = isEarthLeapYear(STARALIA_EPOCH_EARTH_YEAR+year-1) ? '6' : '5';
        if (Number(starDay.value)>Number(starDay.max)) starDay.value=starDay.max;
      } else {
        starDay.max='30';
      }
    });

    convertEarth();
  }

  async function waitForDb() {
    if (dbPromise) return dbPromise;
    dbPromise = (async () => {
      for (let i=0;i<120;i++) {
        if (window.projectOrbitDb) return window.projectOrbitDb;
        await new Promise(r=>setTimeout(r,50));
      }
      throw new Error('Supabase client did not initialize');
    })();
    return dbPromise;
  }

  async function currentProfile(db) {
    const { data, error } = await db.rpc('my_profile');
    if (error) throw error;
    return data?.[0] || null;
  }

  function newsImageUrl(db, path) {
    if (!path) return '';
    return db.storage.from('post-media').getPublicUrl(path).data.publicUrl || '';
  }

  async function renderNews() {
    document.querySelector('#sectionKicker').textContent = 'STARALIA';
    document.querySelector('#sectionTitle').textContent = 'News';
    view.innerHTML = `<div class="card"><span class="eyebrow">STARALIA NEWS</span><h3>Loading national news…</h3><p class="muted">Official stories from the President of Staralia.</p></div>`;

    try {
      const db = await waitForDb();
      const [profileResult, articlesResult] = await Promise.all([
        currentProfile(db),
        db.from('news_articles').select('id,title,excerpt,body,image_path,author_citizen_no,published_at,created_at').order('published_at',{ascending:false}).limit(100)
      ]);
      if (state.route !== NEWS_ROUTE) return;
      if (articlesResult.error) throw articlesResult.error;
      const profile = profileResult;
      const isPresident = !!profile?.is_founder;
      const articles = articlesResult.data || [];

      const admin = isPresident ? `<section class="card news-admin-card">
        <span class="eyebrow">PRESIDENTIAL NEWS DESK</span>
        <h2 style="margin:7px 0 6px">Publish a national news story</h2>
        <p class="news-presidential-note">Only the authenticated President of Staralia can publish to this official News page.</p>
        <form id="staraliaNewsForm" class="news-compose-grid">
          <input id="newsTitle" maxlength="220" placeholder="Headline" required />
          <textarea id="newsExcerpt" maxlength="600" placeholder="Short summary (optional)"></textarea>
          <textarea id="newsBody" class="news-body" maxlength="20000" placeholder="Full news story" required></textarea>
          <label class="news-image-picker">Optional story image
            <input id="newsImage" type="file" accept="image/jpeg,image/png,image/webp,image/gif" />
          </label>
          <button class="btn primary" type="submit">Publish news</button>
          <small id="newsPublishStatus" class="muted"></small>
        </form>
      </section>` : '';

      const cards = articles.length ? articles.map(article => {
        const image = newsImageUrl(db, article.image_path);
        const summary = article.excerpt || article.body.slice(0,240) + (article.body.length>240?'…':'');
        const dates = formatNewsDatePair(article.published_at);
        return `<article class="card news-card" data-news-card="${article.id}">
          ${image?`<img class="news-image" src="${escapeHtml(image)}" alt="${escapeHtml(article.title)}" loading="lazy" />`:''}
          <div class="news-card-body">
            <div class="news-card-head"><div><span class="eyebrow">OFFICIAL STARALIA NEWS</span><h2>${escapeHtml(article.title)}</h2></div>${isPresident?`<button class="text-btn" data-delete-news="${article.id}" data-image-path="${escapeHtml(article.image_path||'')}" style="color:#ff9d9d">Delete</button>`:''}</div>
            <p class="news-excerpt">${escapeHtml(summary)}</p>
            <div class="news-meta"><span>President of Staralia</span><span>•</span><span>${escapeHtml(relativeTime(article.published_at))}</span></div>
            <div class="news-date-pair"><span class="star-date">Staralia · ${escapeHtml(dates.star)}</span><span class="earth-date">Earth (U.S.) · ${escapeHtml(dates.earth)}</span></div>
            <div class="news-actions"><button class="btn secondary" data-toggle-news="${article.id}">Read story</button></div>
            <div class="news-full-body" data-news-body="${article.id}" hidden>${escapeHtml(article.body)}</div>
          </div>
        </article>`;
      }).join('') : `<div class="card news-empty"><span class="eyebrow">STARALIA NEWS</span><h2>No national stories yet</h2><p class="muted">Official news published by the President will appear here for all citizens.</p></div>`;

      view.innerHTML = `<div class="staralia-news-page">${admin}<section class="news-list">${cards}</section></div>`;
      bindNews(db, profile);
    } catch (err) {
      if (state.route !== NEWS_ROUTE) return;
      view.innerHTML = `<div class="card"><h3>News couldn't load</h3><p class="muted">${escapeHtml(err?.message || 'Please try again.')}</p></div>`;
    }
  }

  function bindNews(db, profile) {
    view.querySelectorAll('[data-toggle-news]').forEach(btn => btn.addEventListener('click', () => {
      const id = btn.dataset.toggleNews;
      const body = view.querySelector(`[data-news-body="${id}"]`);
      if (!body) return;
      body.hidden = !body.hidden;
      btn.textContent = body.hidden ? 'Read story' : 'Hide story';
    }));

    view.querySelectorAll('[data-delete-news]').forEach(btn => btn.addEventListener('click', async () => {
      if (!confirm('Delete this national news story?')) return;
      btn.disabled = true;
      const id = Number(btn.dataset.deleteNews);
      const imagePath = btn.dataset.imagePath || '';
      const { error } = await db.from('news_articles').delete().eq('id', id);
      if (error) { showLocalToast(error.message); btn.disabled=false; return; }
      if (imagePath) await db.storage.from('post-media').remove([imagePath]);
      showLocalToast('News story deleted.');
      await renderNews();
    }));

    const form = view.querySelector('#staraliaNewsForm');
    if (!form || !profile?.is_founder) return;

    form.addEventListener('submit', async e => {
      e.preventDefault();
      const submit = form.querySelector('button[type="submit"]');
      const status = form.querySelector('#newsPublishStatus');
      const title = form.querySelector('#newsTitle').value.trim();
      const excerpt = form.querySelector('#newsExcerpt').value.trim();
      const body = form.querySelector('#newsBody').value.trim();
      const file = form.querySelector('#newsImage').files?.[0] || null;
      if (!title || !body) return;

      submit.disabled = true;
      status.textContent = 'Publishing…';
      let imagePath = null;

      try {
        if (file) {
          if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type) || file.size > 10*1024*1024) {
            throw new Error('Choose a JPEG, PNG, WebP, or GIF image no larger than 10 MB.');
          }
          const { data: { user } } = await db.auth.getUser();
          if (!user) throw new Error('Your login session expired. Please sign in again.');
          const ext = (file.name.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase() || 'jpg';
          imagePath = `${user.id}/news/${Date.now()}-${Math.random().toString(36).slice(2,9)}.${ext}`;
          const upload = await db.storage.from('post-media').upload(imagePath, file, {
            cacheControl:'3600', upsert:false, contentType:file.type
          });
          if (upload.error) throw upload.error;
        }

        const { error } = await db.from('news_articles').insert({
          title, excerpt: excerpt || null, body, image_path: imagePath
        });
        if (error) throw error;
        showLocalToast('National news published.');
        await renderNews();
      } catch (err) {
        if (imagePath) await db.storage.from('post-media').remove([imagePath]);
        status.textContent = err?.message || 'Publishing failed.';
        submit.disabled = false;
      }
    });
  }

  async function startNewsRealtime() {
    try {
      const db = await waitForDb();
      if (newsChannel) return;
      newsChannel = db.channel('staralia-national-news-v1111')
        .on('postgres_changes',{event:'*',schema:'public',table:'news_articles'},()=>{
          if (location.hash.replace('#','') === NEWS_ROUTE) renderNews();
        })
        .subscribe();
    } catch (err) {
      console.warn('Staralia News realtime unavailable', err);
    }
  }

  function enforceMoreLayout() {
    if (state.route !== 'more') return;
    const grid = document.querySelector('#view .more-grid');
    if (!grid) return;
    // Messaging belongs in the primary bottom bar now; keep the hidden sentinel so the legacy module does not re-add its More tile.
    grid.querySelectorAll('.more-tile[data-route="messages"]').forEach(el => el.remove());
    if (!grid.querySelector('[data-route="messages"][hidden]')) {
      const sentinel = document.createElement('span');
      sentinel.dataset.route = 'messages'; sentinel.hidden = true; sentinel.setAttribute('aria-hidden','true');
      grid.prepend(sentinel);
    }
  }

  function startObserver() {
    const root = document.querySelector('#view');
    if (!root) return;
    const observer = new MutationObserver(() => {
      if (state.route === 'more') setTimeout(enforceMoreLayout, 15);
    });
    observer.observe(root,{childList:true,subtree:true});
  }

  function init() {
    try {
      patchNavigation();
      startObserver();
      startNewsRealtime();
      if ((location.hash.replace('#','')||'home') === NEWS_ROUTE) setRoute(NEWS_ROUTE);
    } catch (err) {
      console.error('Staralia v1.11.1 initialization failed', err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
