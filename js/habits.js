(function(global){
  const S = NeedsGrowState;
  const I18n = NeedsGrowI18n;

  // ---------------- datumhelpers ----------------
  // Weekday-index systeem voor habit.days: 0 = maandag ... 6 = zondag (vast,
  // onafhankelijk van de "eerste dag van de week"-instelling, die alleen de
  // WEERGAVE-volgorde bepaalt).
  function isoDate(d){ const off = d.getTimezoneOffset(); const local = new Date(d.getTime() - off*60000); return local.toISOString().slice(0,10); }
  function todayIso(){ return isoDate(new Date()); }
  function addDays(iso, n){ const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return isoDate(d); }
  function weekdayMon0(iso){ const d = new Date(iso + 'T00:00:00'); return (d.getDay() + 6) % 7; }
  function fmtDayNum(iso){ return parseInt(iso.slice(8,10), 10); }
  function startOfWeek(iso){
    const first = S.get().settings.firstDayOfWeek || 0;
    const diff = (weekdayMon0(iso) - first + 7) % 7;
    return addDays(iso, -diff);
  }
  function range(a,b){ const r=[]; for(let i=a;i<=b;i++) r.push(i); return r; }

  // ---------------- view-state ----------------
  // dayOffset = gedeelde "focus"-dag t.o.v. vandaag (0 = vandaag). De pijltjes
  // bij de datumbalk verspringen 'm met 7 (week), de pijltjes bij de
  // dagafkortingen in 3 dagen/vandaag met 1 dag.
  let currentView = 'week';
  let dayOffset = 0;
  let detailHabitId = null;
  let detailMonthCursor = null; // 'YYYY-MM'

  const root = document.getElementById('habits-view-root');
  const emptyEl = document.getElementById('habits-empty');
  const weekNavEl = document.getElementById('week-nav');
  const weekNavLabel = document.getElementById('week-nav-label');

  function getTopLevelSorted(){
    const all = S.get().habits.filter(h => !h.parentId);
    const normal = all.filter(h => !h.isChallengeHabit);
    const challenge = all.filter(h => h.isChallengeHabit);
    return normal.concat(challenge); // challenge-habits altijd onderaan, zie §4.4
  }
  function subsOf(h){ return (h.subIds || []).map(id => S.findHabit(id)).filter(Boolean); }

  // ================= RENDER: dispatch =================
  function render(){
    const hasAny = S.get().habits.length > 0;
    emptyEl.style.display = hasAny ? 'none' : 'block';
    root.innerHTML = '';
    weekNavEl.style.display = 'flex'; // datumbalk + weekpijltjes gelden voor alle 3 weergaven
    weekNavLabel.textContent = weekRangeLabel();
    if(!hasAny) return;
    if(currentView === 'today') renderPatternView('today');
    else if(currentView === 'threeday') renderPatternView('threeday');
    else renderWeek();
    requestAnimationFrame(applyTitleTruncation);
  }

  function weekRangeLabel(){
    const ws = startOfWeek(addDays(todayIso(), dayOffset));
    return `${fmtDayNum(ws)} – ${fmtDayNum(addDays(ws,6))} ${I18n.monthName(new Date(addDays(ws,6)+'T00:00:00').getMonth())}`;
  }

  // fade-masker op de titel alleen aanzetten als hij ook écht wordt afgesneden
  function applyTitleTruncation(){
    root.querySelectorAll('.habit-name').forEach(el => {
      el.classList.toggle('name-truncated', el.scrollWidth > el.clientWidth + 1);
    });
  }

  // ================= gedeelde naam-/checkbox-content =================
  function nameCellContent(h, isSub){
    const span = document.createElement('span');
    span.className = 'habit-name';
    span.textContent = h.name;
    const wrap = document.createElement('span');
    wrap.className = 'habit-name-wrap';
    wrap.appendChild(span);
    if(h.isChallengeHabit){ const tag = document.createElement('span'); tag.className='habit-tag challenge'; tag.textContent='challenge'; wrap.appendChild(tag); }
    if(isSub){ const tag = document.createElement('span'); tag.className='habit-tag sub'; tag.textContent='sub'; wrap.appendChild(tag); }
    return wrap;
  }

  function buildCheckContent(h, iso){
    const wd = weekdayMon0(iso);
    if(!h.days.includes(wd)){
      const dash = document.createElement('span');
      dash.className = 'check-off'; dash.textContent = '–';
      return dash;
    }
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'check';
    cb.checked = !!(h.checks && h.checks[iso]);
    const isFuture = iso > todayIso();
    cb.disabled = isFuture; // toekomstige dagen niet aanvinkbaar
    cb.addEventListener('change', () => setCheck(h, iso, cb.checked));
    cb.addEventListener('click', (e) => e.stopPropagation());
    return cb;
  }

  function setCheck(h, iso, checked){
    if(!h.checks) h.checks = {};
    h.checks[iso] = checked;
    if(!h.parentId){
      // hoofdgewoonte: mirror naar deelgewoontes die die dag gepland staan
      subsOf(h).forEach(sub => { if(sub.days.includes(weekdayMon0(iso))){ if(!sub.checks) sub.checks={}; sub.checks[iso]=checked; } });
    } else {
      // deelgewoonte: check of alle zusjes voor die dag afgevinkt zijn -> hoofd meevinken
      const main = S.findHabit(h.parentId);
      if(main){
        const wd = weekdayMon0(iso);
        const siblings = subsOf(main).filter(s => s.days.includes(wd));
        const allDone = siblings.length > 0 && siblings.every(s => s.checks && s.checks[iso]);
        if(!main.checks) main.checks = {};
        main.checks[iso] = allDone;
      }
    }
    S.save();
    render();
    if(detailHabitId) renderDetail();
    if(global.NeedsGrowChallenges && global.NeedsGrowChallenges.render) global.NeedsGrowChallenges.render();
  }
  // door Challenges-tab gebruikt om een gekoppelde challenge-habit af te vinken
  function toggleCheckExternal(habitId, iso, checked){
    const h = S.findHabit(habitId);
    if(h) setCheck(h, iso, checked);
  }

  function buildRowShell(h, isSub){
    const row = document.createElement('div');
    row.className = 'habit-row-grid' + (isSub ? ' is-sub' : '') + (h.isChallengeHabit ? ' is-challenge' : '');
    if(!isSub && h.subIds.length){
      const arrow = document.createElement('button');
      arrow.className = 'habit-expand'; arrow.textContent = h.collapsed ? '▸' : '▾';
      arrow.addEventListener('click', (e) => { e.stopPropagation(); h.collapsed = !h.collapsed; S.save(); render(); });
      row.appendChild(arrow);
    } else if(!isSub){
      const sp = document.createElement('span'); sp.className = 'habit-expand'; row.appendChild(sp);
    }
    const nameCol = document.createElement('div'); nameCol.className = 'habit-name-col';
    nameCol.appendChild(nameCellContent(h, isSub));
    nameCol.addEventListener('click', () => openDetail(h.id));
    row.appendChild(nameCol);
    return row;
  }

  // ================= WEEK =================
  const WEEK_CELL = 24, WEEK_GAP = 4;

  function renderWeek(){
    const weekStart = startOfWeek(addDays(todayIso(), dayOffset));
    const days = range(0,6).map(k => addDays(weekStart, k));

    const area = document.createElement('div');
    area.className = 'day-scroll-area';

    const headerRow = document.createElement('div'); headerRow.className = 'day-header-row';
    const spacer = document.createElement('div'); spacer.className = 'name-col-spacer'; headerRow.appendChild(spacer);
    const stripHeader = document.createElement('div'); stripHeader.className = 'day-strip-header';
    days.forEach(iso => {
      const cell = document.createElement('div'); cell.className = 'day-abbr-cell' + (iso===todayIso() ? ' is-today' : '');
      cell.style.width = WEEK_CELL+'px';
      cell.textContent = I18n.dayLabels()[weekdayMon0(iso)];
      stripHeader.appendChild(cell);
    });
    headerRow.appendChild(stripHeader);
    area.appendChild(headerRow);

    const list = document.createElement('div'); list.className = 'habit-list';
    function addRow(h, isSub){
      const row = buildRowShell(h, isSub);
      const strip = document.createElement('div'); strip.className = 'day-strip';
      days.forEach(iso => {
        const cellWrap = document.createElement('div'); cellWrap.className = 'day-cell';
        cellWrap.style.width = WEEK_CELL+'px'; cellWrap.style.height = WEEK_CELL+'px';
        cellWrap.appendChild(buildCheckContent(h, iso));
        strip.appendChild(cellWrap);
      });
      row.appendChild(strip);
      list.appendChild(row);
    }
    getTopLevelSorted().forEach(h => {
      addRow(h, false);
      if(h.subIds.length && !h.collapsed) subsOf(h).forEach(sub => addRow(sub, true));
    });
    area.appendChild(list);
    root.appendChild(area);
  }

  // ================= 3 DAGEN / VANDAAG (statisch, pijltjes i.p.v. swipen) =================
  const SIZE = { large: 24, medium: 18, small: 13 }; // large = zelfde als een week-vakje
  const PATTERNS = {
    threeday: [ {o:-2,size:'small'}, {o:-1,size:'medium'}, {o:0,size:'large'}, {o:1,size:'medium'}, {o:2,size:'small'} ],
    today:    [ {o:-1,size:'small'}, {o:0,size:'large'}, {o:1,size:'small'} ]
  };

  function renderPatternView(pattern){
    const cfg = PATTERNS[pattern];

    const area = document.createElement('div');
    area.className = 'day-scroll-area';

    const headerRow = document.createElement('div'); headerRow.className = 'day-header-row';
    const spacer = document.createElement('div'); spacer.className = 'name-col-spacer'; headerRow.appendChild(spacer);

    const prevBtn = document.createElement('button'); prevBtn.className = 'icon-btn day-shift-btn'; prevBtn.textContent = '‹';
    prevBtn.addEventListener('click', () => shiftDayOffset(-1));
    headerRow.appendChild(prevBtn);

    const stripHeader = document.createElement('div'); stripHeader.className = 'day-strip-header';
    cfg.forEach(slot => {
      const iso = addDays(todayIso(), dayOffset + slot.o);
      const cell = document.createElement('div'); cell.className = 'day-abbr-cell' + (iso===todayIso() ? ' is-today' : '');
      cell.style.width = SIZE[slot.size]+'px';
      cell.innerHTML = `${I18n.dayLabels()[weekdayMon0(iso)]}<span class="num">${fmtDayNum(iso)}</span>`;
      stripHeader.appendChild(cell);
    });
    headerRow.appendChild(stripHeader);

    const nextBtn = document.createElement('button'); nextBtn.className = 'icon-btn day-shift-btn'; nextBtn.textContent = '›';
    nextBtn.addEventListener('click', () => shiftDayOffset(1));
    headerRow.appendChild(nextBtn);

    area.appendChild(headerRow);

    const list = document.createElement('div'); list.className = 'habit-list';
    function addRow(h, isSub){
      const row = buildRowShell(h, isSub);
      const strip = document.createElement('div'); strip.className = 'day-strip';
      cfg.forEach(slot => {
        const iso = addDays(todayIso(), dayOffset + slot.o);
        const isSmall = slot.size === 'small';
        const cellWrap = document.createElement('div'); cellWrap.className = 'day-cell' + (isSmall ? ' small-slot' : '');
        cellWrap.style.width = SIZE[slot.size]+'px'; cellWrap.style.height = SIZE[slot.size]+'px';
        cellWrap.appendChild(buildCheckContent(h, iso));
        strip.appendChild(cellWrap);
      });
      row.appendChild(strip);
      list.appendChild(row);
    }
    getTopLevelSorted().forEach(h => {
      addRow(h, false);
      if(h.subIds.length && !h.collapsed) subsOf(h).forEach(sub => addRow(sub, true));
    });
    area.appendChild(list);
    root.appendChild(area);
  }

  function shiftDayOffset(delta){
    const area = root.querySelector('.day-scroll-area');
    if(area){
      area.style.transition = 'opacity .12s ease';
      area.style.opacity = '0';
    }
    setTimeout(() => {
      dayOffset += delta;
      render();
      const newArea = root.querySelector('.day-scroll-area');
      if(newArea){
        newArea.style.opacity = '0';
        requestAnimationFrame(() => {
          newArea.style.transition = 'opacity .15s ease';
          newArea.style.opacity = '1';
        });
      }
    }, 120);
  }

  // ================= view switcher / datumbalk-pijltjes =================
  document.querySelectorAll('#habits-view-switch .view-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#habits-view-switch .view-switch-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.dataset.view;
      render();
    });
  });
  document.getElementById('week-prev').addEventListener('click', () => { dayOffset -= 7; render(); });
  document.getElementById('week-next').addEventListener('click', () => { dayOffset += 7; render(); });

  // ================= gewoonte toevoegen/bewerken (overlay) =================
  let dayPicker = null;
  let subBlockPickers = [];
  let editingHabitId = null;

  function buildDayPicker(container, opts){
    opts = opts || {};
    container.innerHTML = '';
    const selected = new Set(opts.preset || []);
    const buttons = [];
    for(let i=0;i<7;i++){
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'day-toggle' + (opts.subColor ? ' sub-color' : '');
      btn.textContent = I18n.dayLabels()[i];
      const allowed = !opts.restrictTo || opts.restrictTo.has(i);
      if(selected.has(i) && allowed) btn.classList.add('active');
      if(!allowed){ btn.disabled = true; btn.classList.add('disabled'); selected.delete(i); }
      btn.addEventListener('click', () => {
        if(btn.disabled) return;
        if(selected.has(i)){ selected.delete(i); btn.classList.remove('active'); }
        else { selected.add(i); btn.classList.add('active'); }
        if(opts.onChange) opts.onChange(selected);
      });
      buttons.push(btn);
      container.appendChild(btn);
    }
    return {
      selected, buttons,
      refreshRestrict(newRestrict){
        buttons.forEach((btn, i) => {
          const allowed = !newRestrict || newRestrict.has(i);
          btn.disabled = !allowed; btn.classList.toggle('disabled', !allowed);
          if(!allowed && selected.has(i)){ selected.delete(i); btn.classList.remove('active'); }
        });
      }
    };
  }

  function addSubHabitBlock(){
    const container = document.getElementById('subhabit-blocks');
    const block = document.createElement('div');
    block.className = 'subhabit-block';
    block.innerHTML = `
      <div class="subhabit-block-header">
        <span class="mini-label">${I18n.activeLang()==='nl'?'Deelgewoonte':'Sub-habit'}</span>
        <button type="button" class="subhabit-remove">✕</button>
      </div>
      <input type="text" placeholder="${I18n.activeLang()==='nl'?'Naam':'Name'}" maxlength="60">
      <div class="days-picker"></div>
    `;
    const nameInput = block.querySelector('input');
    const daysWrap = block.querySelector('.days-picker');
    const picker = buildDayPicker(daysWrap, { subColor:true, restrictTo: dayPicker.selected });
    subBlockPickers.push(picker);
    block.querySelector('.subhabit-remove').addEventListener('click', () => {
      subBlockPickers = subBlockPickers.filter(p => p !== picker);
      block.remove();
    });
    block.__refs = { nameInput, picker };
    container.appendChild(block);
  }

  function resetHabitForm(){
    document.getElementById('form-habit').reset();
    document.getElementById('habit-form-error').classList.remove('show');
    document.getElementById('subhabit-blocks').innerHTML = '';
    subBlockPickers = [];
    document.getElementById('habit-add-subs').checked = false;
    document.getElementById('btn-add-subhabit').style.display = 'none';
    dayPicker = buildDayPicker(document.getElementById('habit-days-picker'), {
      onChange: (sel) => subBlockPickers.forEach(p => p.refreshRestrict(sel))
    });
  }

  document.getElementById('btn-add-habit').addEventListener('click', () => {
    editingHabitId = null;
    document.getElementById('habit-form-title').textContent = I18n.t('habits.add.title');
    document.getElementById('habit-add-subs').closest('.toggle-row').style.display = 'flex';
    resetHabitForm();
    NeedsGrowNav.openOverlay('overlay-habit-form');
    setTimeout(() => document.getElementById('habit-name').focus(), 60);
  });

  document.getElementById('habit-add-subs').addEventListener('change', (e) => {
    document.getElementById('btn-add-subhabit').style.display = e.target.checked ? 'block' : 'none';
  });
  document.getElementById('btn-add-subhabit').addEventListener('click', addSubHabitBlock);

  document.getElementById('form-habit').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('habit-name').value.trim();
    const days = Array.from(dayPicker.selected).sort((a,b)=>a-b);
    const errorEl = document.getElementById('habit-form-error');
    if(!name || days.length === 0){ errorEl.classList.add('show'); return; }
    errorEl.classList.remove('show');

    if(editingHabitId){
      const h = S.findHabit(editingHabitId);
      h.name = name; h.days = days;
      if(h.checks){ Object.keys(h.checks).forEach(iso => { if(!days.includes(weekdayMon0(iso))) delete h.checks[iso]; }); }
      subsOf(h).forEach(sub => {
        const filtered = sub.days.filter(d => days.includes(d));
        if(filtered.length !== sub.days.length){
          sub.days = filtered;
          if(sub.checks) Object.keys(sub.checks).forEach(iso => { if(!filtered.includes(weekdayMon0(iso))) delete sub.checks[iso]; });
        }
      });
    } else {
      const mainId = S.uid();
      const subIds = [];
      if(document.getElementById('habit-add-subs').checked){
        document.querySelectorAll('#subhabit-blocks .subhabit-block').forEach(block => {
          const { nameInput, picker } = block.__refs;
          const subName = nameInput.value.trim();
          const subDays = Array.from(picker.selected).sort((a,b)=>a-b);
          if(subName && subDays.length){
            const subId = S.uid();
            S.get().habits.push({ id: subId, name: subName, days: subDays, checks:{}, parentId: mainId, subIds:[], isChallengeHabit:false, challengeId:null, createdAt: todayIso() });
            subIds.push(subId);
          }
        });
      }
      S.get().habits.push({ id: mainId, name, days, checks:{}, parentId:null, subIds, isChallengeHabit:false, challengeId:null, collapsed:false, createdAt: todayIso() });
    }
    S.save(); render(); NeedsGrowNav.closeOverlay('overlay-habit-form');
  });

  // ================= detail / statistieken overlay =================
  function openDetail(id){
    detailHabitId = id;
    const h = S.findHabit(id);
    detailMonthCursor = todayIso().slice(0,7); // 'YYYY-MM', start op huidige maand
    document.getElementById('detail-habit-name').textContent = h.name;
    renderDetail();
    NeedsGrowNav.openOverlay('overlay-habit-detail');
  }

  document.getElementById('btn-detail-menu').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('detail-menu');
    menu.hidden = !menu.hidden;
  });
  document.getElementById('detail-menu-edit').addEventListener('click', () => {
    document.getElementById('detail-menu').hidden = true;
    const h = S.findHabit(detailHabitId);
    NeedsGrowNav.closeOverlay('overlay-habit-detail');
    editingHabitId = h.id;
    document.getElementById('habit-form-title').textContent = I18n.t('common.edit');
    document.getElementById('habit-add-subs').closest('.toggle-row').style.display = 'none';
    document.getElementById('subhabit-blocks').innerHTML = '';
    document.getElementById('btn-add-subhabit').style.display = 'none';
    subBlockPickers = [];
    document.getElementById('habit-form-error').classList.remove('show');
    document.getElementById('habit-name').value = h.name;
    let restrictTo = null;
    if(h.parentId){ const parent = S.findHabit(h.parentId); if(parent) restrictTo = new Set(parent.days); }
    dayPicker = buildDayPicker(document.getElementById('habit-days-picker'), { preset: h.days, restrictTo, subColor: !!h.parentId });
    NeedsGrowNav.openOverlay('overlay-habit-form');
  });
  document.getElementById('detail-menu-delete').addEventListener('click', () => {
    document.getElementById('detail-menu').hidden = true;
    const h = S.findHabit(detailHabitId);
    if(!h) return;
    let idsToRemove = [h.id].concat(h.subIds || []);
    if(h.parentId){ const parent = S.findHabit(h.parentId); if(parent) parent.subIds = parent.subIds.filter(id => id !== h.id); }
    S.get().habits = S.get().habits.filter(x => !idsToRemove.includes(x.id));
    S.save(); render();
    NeedsGrowNav.closeOverlay('overlay-habit-detail');
  });

  document.getElementById('month-prev').addEventListener('click', () => { shiftMonthCursor(-1); renderDetail(); });
  document.getElementById('month-next').addEventListener('click', () => { shiftMonthCursor(1); renderDetail(); });
  function shiftMonthCursor(delta){
    const [y,m] = detailMonthCursor.split('-').map(Number);
    const d = new Date(y, m-1+delta, 1);
    detailMonthCursor = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
  }

  function renderDetail(){
    const h = S.findHabit(detailHabitId);
    if(!h) return;
    const [y,m] = detailMonthCursor.split('-').map(Number);
    document.getElementById('month-label').textContent = `${I18n.monthName(m-1)} ${y}`;

    const cal = document.getElementById('month-calendar');
    cal.innerHTML = '';
    const firstOfMonth = new Date(y, m-1, 1);
    const leadingBlanks = weekdayMon0(isoDate(firstOfMonth));
    for(let i=0;i<leadingBlanks;i++){ const d = document.createElement('div'); d.className='month-day empty'; cal.appendChild(d); }
    const daysInMonth = new Date(y, m, 0).getDate();
    let monthChecked = 0;
    for(let day=1; day<=daysInMonth; day++){
      const iso = `${y}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const wd = weekdayMon0(iso);
      const cell = document.createElement('div');
      cell.className = 'month-day';
      cell.textContent = day;
      const scheduled = h.days.includes(wd) && iso >= h.createdAt;
      const done = scheduled && h.checks && h.checks[iso];
      if(scheduled) cell.classList.add('scheduled');
      if(done){ cell.classList.add('done'); monthChecked++; }
      if(iso > todayIso()) cell.classList.add('future');
      cal.appendChild(cell);
    }

    // totalen sinds createdAt t/m vandaag
    let totalScheduled = 0, totalChecked = 0;
    let cursor = h.createdAt;
    const stop = todayIso();
    while(cursor <= stop){
      if(h.days.includes(weekdayMon0(cursor))){
        totalScheduled++;
        if(h.checks && h.checks[cursor]) totalChecked++;
      }
      cursor = addDays(cursor, 1);
    }
    const pct = totalScheduled ? Math.round((totalChecked/totalScheduled)*100) : 0;
    const streak = computeStreak(h);

    const isNl = I18n.activeLang() === 'nl';
    const stats = [
      [monthChecked, isNl?'Deze maand':'This month'],
      [totalChecked, isNl?'Totaal gehaald':'Total done'],
      [pct + '%', isNl?'Percentage':'Percentage'],
      [streak, isNl?'Huidige streak':'Current streak'],
    ];
    const grid = document.getElementById('stats-grid');
    grid.innerHTML = '';
    stats.forEach(([val,label]) => {
      const card = document.createElement('div'); card.className='stat-card';
      card.innerHTML = `<div class="stat-value">${val}</div><div class="stat-label">${label}</div>`;
      grid.appendChild(card);
    });
  }

  function computeStreak(h){
    let streak = 0;
    let iso = todayIso();
    while(iso >= h.createdAt){
      const wd = weekdayMon0(iso);
      if(h.days.includes(wd)){
        const checked = !!(h.checks && h.checks[iso]);
        if(checked) streak++;
        else if(iso !== todayIso()) break; // vandaag mag nog open staan zonder de streak te breken
      }
      iso = addDays(iso, -1);
    }
    return streak;
  }

  global.NeedsGrowHabits = { render, toggleCheck: toggleCheckExternal, todayIso, addDays, weekdayMon0 };
})(window);
