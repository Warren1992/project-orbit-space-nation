(() => {
  let installPrompt = null;

  const isStandalone = () =>
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

  const toast = message => {
    const el = document.querySelector('#toast');
    if (el) {
      el.textContent = message;
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2600);
    } else {
      alert(message);
    }
  };

  const fallbackInstallHelp = () => {
    const ua = navigator.userAgent || '';
    if (/SamsungBrowser/i.test(ua)) {
      alert('To install Project Orbit in Samsung Internet: tap the browser menu (☰ or ⋮), choose Add page to, then Home screen. If an Install app option appears, choose that instead.');
      return;
    }
    if (/Android/i.test(ua)) {
      alert('Open your browser menu (⋮), then choose Install app or Add to Home screen.');
      return;
    }
    if (/iPhone|iPad|iPod/i.test(ua)) {
      alert('In Safari, tap Share, then Add to Home Screen.');
      return;
    }
    alert('Open your browser menu and choose Install app or Add to Home screen.');
  };

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
    document.documentElement.classList.add('orbit-install-ready');
  });

  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    document.documentElement.classList.remove('orbit-install-ready');
    toast('Project Orbit installed.');
  });

  window.projectOrbitInstallApp = async () => {
    if (isStandalone()) {
      toast('Project Orbit is already running as an installed app.');
      return;
    }
    if (!installPrompt) {
      fallbackInstallHelp();
      return;
    }

    installPrompt.prompt();
    try {
      await installPrompt.userChoice;
    } finally {
      installPrompt = null;
      document.documentElement.classList.remove('orbit-install-ready');
    }
  };

  const injectInstallCard = () => {
    if (isStandalone()) return;
    const title = document.querySelector('#sectionTitle')?.textContent || '';
    if (!['Settings', 'More'].includes(title)) return;
    const view = document.querySelector('#view');
    if (!view || view.querySelector('#orbitInstallCard')) return;

    const card = document.createElement('section');
    card.id = 'orbitInstallCard';
    card.className = 'card';
    card.innerHTML = `
      <span class="eyebrow">PHONE APP</span>
      <h3>Install Project Orbit</h3>
      <p class="muted">Add Project Orbit to your phone so it launches from its own icon in a standalone app window.</p>
      <button class="btn primary" id="orbitInstallBtn">Install app</button>
    `;
    card.querySelector('#orbitInstallBtn').addEventListener('click', () => window.projectOrbitInstallApp());
    view.prepend(card);
  };

  const observer = new MutationObserver(() => setTimeout(injectInstallCard, 30));
  const view = document.querySelector('#view');
  if (view) observer.observe(view, { childList: true, subtree: false });
  setTimeout(injectInstallCard, 1000);

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw-v16.js', { scope: './' })
        .catch(error => console.error('Project Orbit service worker registration failed', error));
    });
  }
})();
