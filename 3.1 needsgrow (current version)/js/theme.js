/*
  Thema-systeem: dark mode + uitbreidbaar kleurenthema (§3 "Uiterlijk").
  Nieuwe thema's toevoegen kan later door een branch toe te voegen aan
  applyColorTheme() en een optie in de instellingenlijst (volgt in de
  volgende bouwstap).
*/
(function(global){
  const html = document.documentElement;
  const darkMedia = window.matchMedia('(prefers-color-scheme: dark)');

  function isDarkActive(){
    const s = NeedsGrowState.get().settings;
    return s.darkMode === null ? darkMedia.matches : !!s.darkMode;
  }

  function applyDarkMode(){
    html.classList.toggle('dark', isDarkActive());
    const logo = document.getElementById('topbar-logo');
    if(logo){
      // simpel logo: zwart in light mode, wit in dark mode (voor voldoende contrast)
      logo.src = isDarkActive()
        ? 'assets/icons/grow/grow-logo-white.png'
        : 'assets/icons/grow/grow-logo-black.png';
    }
    const themeColorMeta = document.querySelector('meta[name=theme-color]');
    if(themeColorMeta) themeColorMeta.setAttribute('content', getComputedStyle(html).getPropertyValue('--bg').trim());
  }

  function randomHex(){
    return '#' + Math.floor(Math.random()*0xffffff).toString(16).padStart(6,'0');
  }
  function lighten(hex, amount){
    const n = parseInt(hex.slice(1), 16);
    const r = Math.min(255, (n>>16) + amount);
    const g = Math.min(255, ((n>>8)&0xff) + amount);
    const b = Math.min(255, (n&0xff) + amount);
    return '#' + [r,g,b].map(v => Math.max(0,v).toString(16).padStart(2,'0')).join('');
  }

  function applyColorTheme(){
    const s = NeedsGrowState.get().settings;
    html.classList.toggle('theme-random', s.colorTheme === 'random');
    if(s.colorTheme === 'random'){
      if(!s.randomThemeColors){
        const accent = randomHex();
        s.randomThemeColors = {
          accent,
          accentSoft: lighten(accent, 60),
          accentTint: lighten(accent, 140),
          challenge: randomHex()
        };
        NeedsGrowState.save();
      }
      const c = s.randomThemeColors;
      html.style.setProperty('--accent', c.accent);
      html.style.setProperty('--accent-soft', c.accentSoft);
      html.style.setProperty('--accent-tint', c.accentTint);
      html.style.setProperty('--challenge-habit-color', c.challenge);
    } else {
      // terug naar de vaste Grow-kleuren uit variables.css
      html.style.removeProperty('--accent');
      html.style.removeProperty('--accent-soft');
      html.style.removeProperty('--accent-tint');
      html.style.removeProperty('--challenge-habit-color');
    }
  }

  function setDarkMode(value){ // true | false | null (=volg systeem)
    NeedsGrowState.get().settings.darkMode = value;
    NeedsGrowState.save();
    applyDarkMode();
  }
  function setColorTheme(theme){ // 'standaard' | 'random'
    NeedsGrowState.get().settings.colorTheme = theme;
    NeedsGrowState.save();
    applyColorTheme();
  }
  function getProfileColor(){
    const s = NeedsGrowState.get().settings;
    if(!s.profileColor){ s.profileColor = randomHex(); NeedsGrowState.save(); }
    return s.profileColor;
  }

  darkMedia.addEventListener('change', () => { if(NeedsGrowState.get().settings.darkMode === null) applyDarkMode(); });

  global.NeedsGrowTheme = { applyDarkMode, applyColorTheme, setDarkMode, setColorTheme, isDarkActive, getProfileColor };
})(window);
