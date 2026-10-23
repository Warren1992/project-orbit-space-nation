(() => {
  'use strict';

  const TRANSPARENT_EMBLEM = 'national-emblem-transparent-v172.png';
  const STYLE_ID = 'staraliaHeaderV172Styles';
  let syncTimer = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      /* v1.7.2: a single national brand header on every route. */
      .topbar-title.orbit-brand-title{
        display:flex!important;
        align-items:center!important;
        gap:10px!important;
        min-width:0!important;
      }
      .national-emblem-topmark{
        width:44px!important;
        height:44px!important;
        flex:0 0 44px!important;
        object-fit:contain!important;
        background:transparent!important;
        border:0!important;
        box-shadow:none!important;
        filter:drop-shadow(0 0 10px rgba(137,75,255,.28))!important;
      }
      .national-emblem-topcopy{
        display:flex!important;
        align-items:center!important;
        min-width:0!important;
      }
      #sectionKicker,
      .national-emblem-topcopy .eyebrow{
        display:block!important;
        margin:0!important;
        color:#ffd978!important;
        font-size:20px!important;
        line-height:1!important;
        font-weight:950!important;
        letter-spacing:.14em!important;
        white-space:nowrap!important;
      }
      #sectionTitle,
      .national-emblem-topcopy h1{
        display:none!important;
      }
      .brand-mark.national-emblem-brandmark,
      .brand-mark.national-emblem-brandmark img,
      .national-emblem-nav-icon,
      .national-emblem-more-icon,
      .national-emblem-visual img{
        background:transparent!important;
      }
      @media(max-width:760px){
        .national-emblem-topmark{
          width:42px!important;
          height:42px!important;
          flex-basis:42px!important;
        }
        #sectionKicker,
        .national-emblem-topcopy .eyebrow{
          font-size:18px!important;
          letter-spacing:.13em!important;
        }
      }
      @media(max-width:390px){
        .topbar-title.orbit-brand-title{gap:7px!important}
        .national-emblem-topmark{
          width:36px!important;
          height:36px!important;
          flex-basis:36px!important;
        }
        #sectionKicker,
        .national-emblem-topcopy .eyebrow{
          font-size:16px!important;
          letter-spacing:.11em!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function syncBrand() {
    injectStyles();

    // Keep route titles in the DOM for existing routing logic, but always show the national brand.
    const kicker = document.getElementById('sectionKicker');
    if (kicker && kicker.textContent !== 'STARALIA') kicker.textContent = 'STARALIA';

    // Swap every national-emblem use from the old square-backed file to the transparent asset.
    document.querySelectorAll('img').forEach(img => {
      const raw = img.getAttribute('src') || '';
      if (raw.includes('national-emblem.png') || img.classList.contains('national-emblem-topmark') ||
          img.classList.contains('national-emblem-nav-icon') || img.classList.contains('national-emblem-more-icon')) {
        if (raw !== TRANSPARENT_EMBLEM) img.setAttribute('src', TRANSPARENT_EMBLEM);
      }
    });

    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href') || '';
      if (href.includes('national-emblem.png')) {
        link.setAttribute('href', TRANSPARENT_EMBLEM);
        if (link.hasAttribute('download')) link.setAttribute('download', 'staralia-national-emblem-transparent.png');
      }
    });
  }

  const observer = new MutationObserver(() => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncBrand, 20);
  });

  function start() {
    syncBrand();
    observer.observe(document.body, { childList:true, subtree:true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
