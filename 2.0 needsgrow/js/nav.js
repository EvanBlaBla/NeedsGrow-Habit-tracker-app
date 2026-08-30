(function(global){
  const panes = document.querySelectorAll('.tab-pane');
  const navBtns = document.querySelectorAll('.nav-btn[data-tab]');
  const fab = document.getElementById('btn-add-habit');

  function goToTab(tabName){
    panes.forEach(p => p.hidden = (p.dataset.tab !== tabName));
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tabName));
    fab.hidden = (tabName !== 'habits'); // fase 2 van de bouw voegt een eigen FAB-gedrag toe voor Challenges
    global.NeedsGrowNav.currentTab = tabName;
  }

  navBtns.forEach(btn => btn.addEventListener('click', () => {
    if(btn.dataset.tab === 'feedback') return; // nog geen functie, zie spec §2.2
    goToTab(btn.dataset.tab);
  }));

  // ---- generieke fullscreen-overlay helpers ----
  function openOverlay(id){ document.getElementById(id).classList.add('open'); }
  function closeOverlay(id){ document.getElementById(id).classList.remove('open'); }
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
  });

  // ---- popovers (bv. detail 3-puntjes-menu) sluiten bij klik erbuiten ----
  document.addEventListener('click', (e) => {
    document.querySelectorAll('.popover').forEach(pop => {
      if(pop.hidden) return;
      if(!pop.contains(e.target) && e.target.id !== 'btn-detail-menu'){ pop.hidden = true; }
    });
  });

  // ---- tijdelijke testknoppen (Instellingenscherm volgt in volgende bouwstap) ----
  document.getElementById('btn-quick-dark-toggle').addEventListener('click', () => {
    NeedsGrowTheme.setDarkMode(!NeedsGrowTheme.isDarkActive());
  });
  document.getElementById('btn-quick-random-theme').addEventListener('click', () => {
    const cur = NeedsGrowState.get().settings.colorTheme;
    NeedsGrowTheme.setColorTheme(cur === 'standaard' ? 'random' : 'standaard');
    NeedsGrowHabits.render();
  });

  global.NeedsGrowNav = { goToTab, openOverlay, closeOverlay, currentTab: 'habits' };
})(window);
