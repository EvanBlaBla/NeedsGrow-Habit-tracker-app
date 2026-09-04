/*
  State & opslag.
  Fase 1: alles lokaal op het apparaat (window.storage indien beschikbaar,
  anders localStorage). De opslag zit achter `Storage.get/set` zodat dit in
  fase 2 vervangen kan worden door een echte backend-call zonder dat de rest
  van de app hoeft te veranderen.

  BELANGRIJKE WIJZIGING t.o.v. de oude kasboek-app:
  - Geen geld/beloningen meer, geen stappenplannen.
  - `checks` wordt nu bijgehouden per kalenderdatum (ISO "YYYY-MM-DD"), niet
    meer per weekdag-index met wekelijkse reset. Dat is nodig voor de
    maandkalender, streaks en totalen uit §4.5 van de spec.
*/
(function(global){
  const STORAGE_KEY = 'needsgrow-state';

  const hasClaudeStorage = (typeof window !== 'undefined' && !!window.storage && typeof window.storage.get === 'function');
  const Storage = {
    async get(key){
      if(hasClaudeStorage){
        try{ const r = await window.storage.get(key, false); return r ? r.value : null; }
        catch(e){ return null; }
      }
      return localStorage.getItem(key);
    },
    async set(key, value){
      if(hasClaudeStorage){
        try{ await window.storage.set(key, value, false); return true; }
        catch(e){ console.error('Opslaan (Claude storage) mislukt', e); }
      }
      try{ localStorage.setItem(key, value); return true; }
      catch(e){ console.error('Opslaan (localStorage) mislukt', e); return false; }
    }
  };

  function defaultState(){
    return {
      settings: {
        firstDayOfWeek: 0,        // 0 = maandag ... 6 = zondag (index in DAY_ORDER)
        language: null,           // null = volg systeemtaal; anders 'nl' | 'en'
        darkMode: null,           // null = volg systeeminstelling; anders true/false
        colorTheme: 'standaard',  // 'standaard' | 'random'
        randomThemeColors: null,  // { accent, accentSoft, accentTint, challenge } eenmalig bepaald
        profileColor: null        // eenmalig bepaalde kleur voor profielfoto-placeholder
      },
      habits: [],
      challenges: []
    };
  }

  let state = defaultState();
  let saveTimer = null;

  function scheduleSave(){
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const ok = await Storage.set(STORAGE_KEY, JSON.stringify(state));
      if(!ok) console.error('Opslaan is volledig mislukt — wijzigingen gaan mogelijk verloren.');
    }, 150);
  }

  async function load(){
    try{
      const raw = await Storage.get(STORAGE_KEY);
      if(raw){
        const parsed = JSON.parse(raw);
        state = Object.assign(defaultState(), parsed);
        state.settings = Object.assign(defaultState().settings, parsed.settings || {});
      }
    }catch(e){ console.error('Laden mislukt, val terug op lege staat', e); }
    // migratie/defensief: ontbrekende velden aanvullen
    state.habits.forEach(h => {
      if(h.subIds === undefined) h.subIds = [];
      if(h.parentId === undefined) h.parentId = null;
      if(h.checks === undefined) h.checks = {};
      if(h.collapsed === undefined) h.collapsed = false;
      if(h.isChallengeHabit === undefined) h.isChallengeHabit = false;
      if(h.challengeId === undefined) h.challengeId = null;
    });
    state.challenges.forEach(c => {
      if(c.linkedHabitId === undefined) c.linkedHabitId = null;
      if(c.checkpoint === undefined) c.checkpoint = null; // { targetValue, actualValue, date }
      if(c.completed === undefined) c.completed = false;
      if(c.completedDate === undefined) c.completedDate = null;
    });
  }

  const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36);

  const NeedsGrowState = {
    Storage, uid,
    load,
    save: scheduleSave,
    get: () => state,
    findHabit: (id) => state.habits.find(h => h.id === id),
    findChallenge: (id) => state.challenges.find(c => c.id === id),
  };

  global.NeedsGrowState = NeedsGrowState;
})(window);
