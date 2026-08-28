(function(){
  async function init(){
    await NeedsGrowState.load();
    NeedsGrowTheme.applyDarkMode();
    NeedsGrowTheme.applyColorTheme();
    NeedsGrowI18n.applyToDom();
    NeedsGrowHabits.render();
    NeedsGrowNav.goToTab('habits');

    // dagwissel op de achtergrond opvangen (zie §4.2): elke minuut checken of
    // de datum inmiddels is doorgeschoven, en zo ja opnieuw renderen.
    let lastSeenDate = new Date().toDateString();
    setInterval(() => {
      const now = new Date().toDateString();
      if(now !== lastSeenDate){ lastSeenDate = now; NeedsGrowHabits.render(); }
    }, 60 * 1000);
    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState === 'visible') NeedsGrowHabits.render();
    });
  }
  init();
})();
