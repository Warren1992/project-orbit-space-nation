(() => {
  'use strict';

  const EMBLEM_SRC = 'national-emblem.png';
  const STYLE_ID = 'projectOrbitNationalEmblemStyles';
  let syncTimer = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .topbar-title.orbit-brand-title{display:flex;align-items:center;gap:11px;min-width:0}
      .national-emblem-topmark{width:39px;height:39px;object-fit:contain;flex:0 0 39px;filter:drop-shadow(0 0 10px rgba(137,75,255,.22))}
      .national-emblem-topcopy{min-width:0}
      .national-emblem-topcopy .eyebrow{display:block}
      .national-emblem-topcopy h1{margin-top:2px}
      .brand-mark.national-emblem-brandmark{overflow:hidden;background:#050b14!important;padding:0!important}
      .brand-mark.national-emblem-brandmark img{width:100%;height:100%;object-fit:contain;display:block}
      .national-emblem-nav-icon{width:24px;height:24px;object-fit:contain;display:block;filter:drop-shadow(0 0 7px rgba(137,75,255,.23))}
      .national-emblem-more-icon{width:52px;height:52px;object-fit:contain;display:block;margin-bottom:12px;filter:drop-shadow(0 0 10px rgba(137,75,255,.2))}
      .national-emblem-page{display:grid;gap:20px}
      .national-emblem-hero{overflow:hidden;padding:0!important;border-color:rgba(139,92,246,.26)!important}
      .national-emblem-visual{padding:26px;background:radial-gradient(circle at 50% 42%,rgba(102,51,204,.15),transparent 47%),#03070d;display:grid;place-items:center}
      .national-emblem-visual img{width:min(100%,660px);height:auto;display:block;object-fit:contain}
      .national-emblem-copy{padding:24px}
      .national-emblem-copy h2{font-size:30px;line-height:1.08;margin:6px 0 10px}
      .national-emblem-copy>p{line-height:1.65;color:#c8d3e0;max-width:820px}
      .national-emblem-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
      .national-emblem-symbols{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
      .national-emblem-symbol{padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:16px;background:rgba(255,255,255,.025)}
      .national-emblem-symbol strong{display:block;color:#fff;font-size:16px;margin-bottom:6px}
      .national-emblem-symbol p{margin:0;color:#96a7bc;line-height:1.55;font-size:14px}
      .national-emblem-motto{border-color:rgba(139,92,246,.26)!important;background:linear-gradient(135deg,rgba(124,58,237,.09),rgba(13,24,40,.96))!important}
      .national-emblem-motto blockquote{margin:12px 0 0;font-size:24px;font-weight:900;color:#e4d8ff;line-height:1.3}
      @media(max-width:760px){
        .national-emblem-topmark{width:33px;height:33px;flex-basis:33px}
        .topbar-title.orbit-brand-title{gap:8px}
        .national-emblem-symbols{grid-template-columns:1fr}
        .national-emblem-visual{padding:16px}
        .national-emblem-copy{padding:19px}
        .national-emblem-copy h2{font-size:26px}
      }
      @media(max-width:420px){
        .national-emblem-topmark{width:29px;height:29px;flex-basis:29px}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureTopbarEmblem() {
    const title = document.querySelector('.topbar-title');
    if (!title || title.querySelector('.national-emblem-topmark')) return;

    const copy = document.createElement('div');
    copy.className = 'national-emblem-topcopy';
    while (title.firstChild) copy.appendChild(title.firstChild);

    const img = document.createElement('img');
    img.className = 'national-emblem-topmark';
    img.src = EMBLEM_SRC;
    img.alt = 'Staralia national emblem';

    title.classList.add('orbit-brand-title');
    title.append(img, copy);
  }

  function ensureSidebarEmblem() {
    const mark = document.querySelector('.brand-mark');
    if (!mark || mark.classList.contains('national-emblem-brandmark')) return;
    mark.classList.add('national-emblem-brandmark');
    mark.innerHTML = `<img src="${EMBLEM_SRC}" alt="" aria-hidden="true" />`;
  }

  function makeNavButton(kind) {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.nationalEmblem = '1';
    if (kind === 'side') {
      button.className = 'nav-link';
      button.innerHTML = `<span class="nav-icon"><img class="national-emblem-nav-icon" src="${EMBLEM_SRC}" alt="" /></span><span class="nav-label">National Emblem</span>`;
    } else {
      button.className = 'nav-link';
      button.innerHTML = `<span class="nav-icon"><img class="national-emblem-nav-icon" src="${EMBLEM_SRC}" alt="" /></span><span class="nav-label">National Emblem</span>`;
    }
    return button;
  }

  function ensureNavigationLinks() {
    const side = document.querySelector('#sideNav');
    if (side && !side.querySelector('[data-national-emblem]')) {
      side.appendChild(makeNavButton('side'));
    }

    const drawer = document.querySelector('#drawerLinks');
    if (drawer && !drawer.querySelector('[data-national-emblem]')) {
      drawer.appendChild(makeNavButton('drawer'));
    }
  }

  function ensureMoreTile() {
    const title = document.querySelector('#sectionTitle');
    if (!title || title.textContent.trim() !== 'More') return;
    const grid = document.querySelector('#view .more-grid');
    if (!grid || grid.querySelector('[data-national-emblem]')) return;

    const tile = document.createElement('button');
    tile.type = 'button';
    tile.className = 'more-tile';
    tile.dataset.nationalEmblem = '1';
    tile.innerHTML = `
      <img class="national-emblem-more-icon" src="${EMBLEM_SRC}" alt="" />
      <strong>National Emblem</strong>
      <small>Official symbolism and meaning</small>
    `;
    grid.appendChild(tile);
  }

  function closeNavigation() {
    document.querySelector('#drawer')?.classList.remove('open');
    document.querySelector('#drawerBackdrop')?.classList.remove('open');
  }

  function renderEmblemPage() {
    const view = document.querySelector('#view');
    const title = document.querySelector('#sectionTitle');
    const kicker = document.querySelector('#sectionKicker');
    if (!view) return;

    if (title) title.textContent = 'National Emblem';
    if (kicker) kicker.textContent = 'STARALIA';
    closeNavigation();

    view.innerHTML = `
      <div class="national-emblem-page">
        <section class="card national-emblem-hero">
          <div class="national-emblem-visual">
            <img src="${EMBLEM_SRC}" alt="Official national emblem of Staralia: a luminous cosmic manta ray within a silver and purple celestial ring" />
          </div>
          <div class="national-emblem-copy">
            <span class="eyebrow">OFFICIAL NATIONAL SYMBOL</span>
            <h2>The National Emblem of Staralia</h2>
            <p>The national emblem represents conscious life reaching beyond Earth into the wider universe. Its central cosmic manta ray symbolizes intelligence, adaptability, graceful exploration, and life moving confidently through an unfamiliar frontier. The surrounding celestial geometry represents a civilization united by a shared future in space.</p>
            <div class="national-emblem-actions">
              <a class="btn primary" href="${EMBLEM_SRC}" download="staralia-national-emblem.png">Download emblem</a>
              <a class="btn secondary" href="${EMBLEM_SRC}" target="_blank" rel="noopener">View full size</a>
            </div>
          </div>
        </section>

        <section class="card national-emblem-motto">
          <span class="eyebrow">NATIONAL MOTTO</span>
          <blockquote>“Consciousness in Outer Space”</blockquote>
          <p class="muted">The symbolic glyph ring surrounding the manta ray represents this idea in Staralia's original science-fiction visual script: conscious civilization expanding beyond its birthplace and into the cosmos.</p>
        </section>

        <section class="card">
          <div class="section-row"><h3>Symbolism</h3><span class="pill blue">FOUNDING ERA</span></div>
          <div class="national-emblem-symbols">
            <div class="national-emblem-symbol"><strong>Cosmic manta ray</strong><p>Represents intelligent life, adaptability, freedom of movement, and exploration. Its spacecraft-like form connects living consciousness with the future of spaceflight.</p></div>
            <div class="national-emblem-symbol"><strong>Circular celestial frame</strong><p>Represents unity among citizens, continuity across generations, and a civilization whose horizon extends beyond any single planet.</p></div>
            <div class="national-emblem-symbol"><strong>Four-point star</strong><p>Represents navigation, discovery, and Staralia's commitment to moving toward new frontiers rather than remaining fixed to one world.</p></div>
            <div class="national-emblem-symbol"><strong>Purple</strong><p>Represents imagination, ambition, mystery, and the unexplored universe—the frontier toward which Staralia looks.</p></div>
            <div class="national-emblem-symbol"><strong>Silver and white</strong><p>Represent knowledge, technological achievement, peaceful purpose, and the clarity needed to build a durable civilization.</p></div>
            <div class="national-emblem-symbol"><strong>Black field</strong><p>Represents outer space itself: vast, largely unknown, and open to discovery by future generations of citizens.</p></div>
            <div class="national-emblem-symbol"><strong>Purple planetary horizon</strong><p>Represents worlds beyond Earth and the long-term possibility of communities living throughout the Solar System and beyond.</p></div>
            <div class="national-emblem-symbol"><strong>Lower violet orb</strong><p>Represents a shared civic home—the nation as a point of unity even as its citizens and ambitions extend outward into space.</p></div>
          </div>
        </section>
      </div>
    `;

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function sync() {
    injectStyles();
    ensureTopbarEmblem();
    ensureSidebarEmblem();
    ensureNavigationLinks();
    ensureMoreTile();
  }

  document.addEventListener('click', event => {
    const trigger = event.target.closest('[data-national-emblem]');
    if (!trigger) return;
    event.preventDefault();
    event.stopPropagation();
    renderEmblemPage();
  }, true);

  const observer = new MutationObserver(() => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(sync, 25);
  });

  const start = () => {
    sync();
    observer.observe(document.body, { childList: true, subtree: true });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
