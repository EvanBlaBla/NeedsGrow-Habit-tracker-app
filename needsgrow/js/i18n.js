/*
  i18n: Nederlands (default) + Engels. Appnamen (NeedsGrow, Needs, ...) worden
  nooit vertaald — die staan dus niet in dit woordenboek maar hardcoded in de HTML.
  Instellingenscherm (taalkeuze zelf) volgt in de volgende bouwstap; deze module
  is al klaar om daaraan te koppelen.
*/
(function(global){
  const STRINGS = {
    nl: {
      'common.save': 'Opslaan',
      'common.edit': '✏️ Bewerken',
      'common.delete': '🗑 Verwijderen',
      'common.cancel': 'Annuleren',
      'habits.title': 'Gewoontes',
      'habits.empty': 'Nog geen gewoontes. Tik op + om te beginnen.',
      'habits.view.today': 'Vandaag',
      'habits.view.threeday': '3 dagen',
      'habits.view.week': 'Week',
      'habits.add.title': 'Nieuwe gewoonte',
      'habits.add.name': 'Naam',
      'habits.add.days': 'Dagen',
      'habits.add.addSubs': 'Deelgewoontes toevoegen',
      'habits.add.addSubBtn': '+ Voeg deelgewoonte toe',
      'habits.add.error': 'Vul een naam in en kies minstens één dag.',
      'challenges.title': 'Challenges',
      'profile.title': 'Instellingen',
    },
    en: {
      'common.save': 'Save',
      'common.edit': '✏️ Edit',
      'common.delete': '🗑 Delete',
      'common.cancel': 'Cancel',
      'habits.title': 'Habits',
      'habits.empty': 'No habits yet. Tap + to get started.',
      'habits.view.today': 'Today',
      'habits.view.threeday': '3 days',
      'habits.view.week': 'Week',
      'habits.add.title': 'New habit',
      'habits.add.name': 'Name',
      'habits.add.days': 'Days',
      'habits.add.addSubs': 'Add sub-habits',
      'habits.add.addSubBtn': '+ Add sub-habit',
      'habits.add.error': 'Enter a name and pick at least one day.',
      'challenges.title': 'Challenges',
      'profile.title': 'Settings',
    }
  };

  const DAY_LABELS = {
    nl: ['Ma','Di','Wo','Do','Vr','Za','Zo'],
    en: ['Mo','Tu','We','Th','Fr','Sa','Su']
  };
  const MONTH_NAMES = {
    nl: ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december'],
    en: ['January','February','March','April','May','June','July','August','September','October','November','December']
  };

  function activeLang(){
    const s = NeedsGrowState.get().settings;
    if(s.language === 'nl' || s.language === 'en') return s.language;
    return navigator.language.toLowerCase().startsWith('nl') ? 'nl' : 'en';
  }

  function t(key){
    const lang = activeLang();
    return (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.nl[key] || key;
  }

  function dayLabels(){ return DAY_LABELS[activeLang()]; }
  function monthName(idx){ return MONTH_NAMES[activeLang()][idx]; }

  function applyToDom(){
    document.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
  }

  function setLanguage(lang){ // 'nl' | 'en' | null (volg systeem)
    NeedsGrowState.get().settings.language = lang;
    NeedsGrowState.save();
    applyToDom();
  }

  global.NeedsGrowI18n = { t, dayLabels, monthName, applyToDom, setLanguage, activeLang };
})(window);
