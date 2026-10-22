(() => {
  const FLAG_SRC = 'national-flag.png';
  const FLAG_FILENAME = 'Staralia-National-Flag.png';

  const style = document.createElement('style');
  style.id = 'projectOrbitFlagStyles';
  style.textContent = `
    .national-flag-page{display:grid;gap:18px;max-width:1050px;margin:0 auto}
    .national-flag-hero{padding:0;overflow:hidden}
    .national-flag-image-wrap{background:#000;display:grid;place-items:center;border-bottom:1px solid var(--line)}
    .national-flag-image{display:block;width:100%;height:auto;max-height:680px;object-fit:contain;background:#000}
    .national-flag-copy{padding:22px}
    .national-flag-copy h2{margin:7px 0 10px;font-size:clamp(28px,5vw,42px)}
    .national-flag-copy p{line-height:1.65;color:#c8d2df}
    .flag-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
    .flag-symbolism{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin-top:16px}
    .flag-symbol{border:1px solid var(--line);background:rgba(255,255,255,.025);border-radius:14px;padding:15px}
    .flag-symbol strong{display:block;margin-bottom:5px;color:#fff}
    .flag-symbol span{color:var(--muted);line-height:1.5;font-size:14px}
    .flag-official-note{border:1px solid rgba(126,86,255,.32);background:rgba(126,86,255,.08);border-radius:15px;padding:15px;color:#d9d0ff;line-height:1.55}
    .flag-download-status{margin-top:10px;min-height:20px;color:var(--muted);font-size:13px}
    @media(max-width:760px){.flag-symbolism{grid-template-columns:1fr}.national-flag-copy{padding:18px}.national-flag-image{max-height:none}}
  `;
  document.head.appendChild(style);

  function currentTitle() {
    return document.querySelector('#sectionTitle')?.textContent?.trim() || '';
  }

  function addFlagTile() {
    if (currentTitle() !== 'More') return;
    const grid = document.querySelector('.more-grid');
    if (!grid || grid.querySelector('[data-national-flag]')) return;

    const tile = document.createElement('button');
    tile.className = 'more-tile';
    tile.dataset.nationalFlag = '1';
    tile.innerHTML = '<span>⚑</span><strong>National Flag</strong><small>Official flag, symbolism, and high-resolution download</small>';
    tile.addEventListener('click', renderFlagPage);
    grid.appendChild(tile);
  }

  async function downloadFlag(statusEl) {
    if (statusEl) statusEl.textContent = 'Preparing full-resolution flag…';
    try {
      const response = await fetch(FLAG_SRC, { cache: 'no-store' });
      if (!response.ok) throw new Error('Flag file could not be loaded.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = FLAG_FILENAME;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (statusEl) statusEl.textContent = 'Flag download started.';
    } catch (error) {
      if (statusEl) statusEl.textContent = 'Your browser opened the flag instead. Press and hold the image to save it.';
      window.open(FLAG_SRC, '_blank', 'noopener');
    }
  }

  function renderFlagPage() {
    const view = document.querySelector('#view');
    const title = document.querySelector('#sectionTitle');
    const kicker = document.querySelector('#sectionKicker');
    if (!view || !title || !kicker) return;

    kicker.textContent = 'STARALIA';
    title.textContent = 'National Flag';

    view.innerHTML = `
      <div class="national-flag-page">
        <section class="card national-flag-hero">
          <div class="national-flag-image-wrap">
            <img class="national-flag-image" src="${FLAG_SRC}" alt="National flag of Staralia: a white and silver spacecraft rising through a circular emblem over a black field with purple accents and stars." />
          </div>
          <div class="national-flag-copy">
            <span class="eyebrow">OFFICIAL NATIONAL SYMBOL</span>
            <h2>The National Flag of Staralia</h2>
            <p>The flag represents a civilization defined by exploration rather than by a single planet. A spacecraft rises at its center toward the stars, symbolizing Staralia's commitment to peaceful expansion, scientific discovery, technological progress, and humanity's future beyond Earth.</p>
            <div class="flag-actions">
              <button class="btn primary" id="downloadNationalFlag">Download flag</button>
              <a class="btn secondary" href="${FLAG_SRC}" target="_blank" rel="noopener" style="text-decoration:none">View full resolution</a>
              <button class="btn secondary" data-route="more">← More</button>
            </div>
            <div class="flag-download-status" id="flagDownloadStatus"></div>
          </div>
        </section>

        <section class="card">
          <span class="eyebrow">SYMBOLISM</span>
          <h3 style="margin:7px 0 4px">Meaning of the design</h3>
          <div class="flag-symbolism">
            <div class="flag-symbol"><strong>Black field</strong><span>The vastness of space and the unknown frontier still ahead of humanity.</span></div>
            <div class="flag-symbol"><strong>Central spacecraft</strong><span>Exploration, engineering, mobility, and the determination to move civilization beyond Earth.</span></div>
            <div class="flag-symbol"><strong>Silver and white</strong><span>Knowledge, peaceful purpose, clarity, and technological achievement.</span></div>
            <div class="flag-symbol"><strong>Purple band and propulsion</strong><span>Staralia's independent identity, imagination, ambition, and forward momentum.</span></div>
            <div class="flag-symbol"><strong>Stars</strong><span>The many destinations and discoveries that may someday become part of humanity's future.</span></div>
            <div class="flag-symbol"><strong>Open circular frame</strong><span>A civilization without a closed frontier: the nation looks outward and remains open to what lies beyond.</span></div>
          </div>
        </section>

        <section class="flag-official-note">
          This image is the official downloadable flag file used by Staralia. Citizens may save it for personal display, wallpapers, community posts, and other Staralia-related use.
        </section>
      </div>`;

    const status = view.querySelector('#flagDownloadStatus');
    view.querySelector('#downloadNationalFlag')?.addEventListener('click', () => downloadFlag(status));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const view = document.querySelector('#view');
  if (view) {
    const observer = new MutationObserver(() => setTimeout(addFlagTile, 60));
    observer.observe(view, { childList: true, subtree: false });
  }

  window.addEventListener('hashchange', () => setTimeout(addFlagTile, 120));
  document.addEventListener('click', event => {
    if (event.target.closest('[data-route="more"]')) setTimeout(addFlagTile, 120);
  });

  setTimeout(addFlagTile, 900);
})();
