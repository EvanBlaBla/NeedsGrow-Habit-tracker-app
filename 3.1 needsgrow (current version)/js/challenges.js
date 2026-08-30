(function(global){
  const S = NeedsGrowState;
  const I18n = NeedsGrowI18n;
  const H = global.NeedsGrowHabits; // todayIso / addDays / weekdayMon0 / toggleCheck herbruikt uit habits.js

  let currentChallengeView = 'full';
  let editingChallengeId = null;
  let chDayPicker = null;

  function diffDays(a,b){ return Math.round((new Date(b+'T00:00:00') - new Date(a+'T00:00:00')) / 86400000); }
  function fmtShortDate(iso){ return `${iso.slice(8,10)}-${iso.slice(5,7)}`; }
  function nl(){ return I18n.activeLang() === 'nl'; }

  function statusOf(c){
    if(c.completed) return 'done';
    const graceEnd = H.addDays(c.endDate, 3);
    if(H.todayIso() > graceEnd) return 'failed';
    return 'active';
  }
  function canComplete(c){
    if(statusOf(c) === 'failed') return false;
    const graceEnd = H.addDays(c.endDate, 3);
    const today = H.todayIso();
    return today >= c.endDate && today <= graceEnd;
  }
  function progressPct(c){
    const total = diffDays(c.startDate, c.endDate) || 1;
    const done = diffDays(c.startDate, H.todayIso());
    return Math.max(0, Math.min(100, Math.round((done/total) * 100)));
  }

  // ================= RENDER =================
  function render(){
    const root = document.getElementById('challenges-view-root');
    const empty = document.getElementById('challenges-empty');
    if(!root) return; // challenges.js kan geladen zijn voor de DOM helemaal klaar is
    const list = S.get().challenges.slice().sort((a,b) => a.startDate.localeCompare(b.startDate));
    empty.style.display = list.length ? 'none' : 'block';
    root.innerHTML = '';
    if(!list.length) return;
    if(currentChallengeView === 'compact'){
      const grid = document.createElement('div'); grid.className = 'challenge-grid-compact';
      list.forEach(c => grid.appendChild(buildCompactBlock(c)));
      root.appendChild(grid);
    } else {
      const wrap = document.createElement('div'); wrap.className = 'challenge-list-full';
      list.forEach(c => wrap.appendChild(buildFullBlock(c)));
      root.appendChild(wrap);
    }
  }

  function closeAllChallengeMenus(){
    document.querySelectorAll('#tab-challenges .popover').forEach(p => p.hidden = true);
  }

  function buildChallengeMenu(c, status){
    const menu = document.createElement('div'); menu.className = 'popover'; menu.hidden = true;
    if(status !== 'failed'){
      const editBtn = document.createElement('button'); editBtn.textContent = I18n.t('common.edit');
      editBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = true; openChallengeForm(c); });
      menu.appendChild(editBtn);
    }
    const delBtn = document.createElement('button'); delBtn.className = 'danger'; delBtn.textContent = I18n.t('common.delete');
    delBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = true; deleteChallenge(c); });
    menu.appendChild(delBtn);
    return menu;
  }

  function deleteChallenge(c){
    S.get().challenges = S.get().challenges.filter(x => x.id !== c.id);
    if(c.linkedHabitId) S.get().habits = S.get().habits.filter(h => h.id !== c.linkedHabitId);
    S.save(); render();
    if(H && H.render) H.render();
  }

  function buildTimeline(c, status){
    const tl = document.createElement('div'); tl.className = 'challenge-timeline' + (status !== 'active' ? ' ' + status : '');
    const startLbl = document.createElement('div'); startLbl.className = 'tl-date'; startLbl.textContent = fmtShortDate(c.startDate);
    const track = document.createElement('div'); track.className = 'tl-track';
    const fill = document.createElement('div'); fill.className = 'tl-fill';
    const pct = (status === 'done' || status === 'failed') ? 100 : progressPct(c);
    fill.style.height = pct + '%';
    track.appendChild(fill);
    if(c.checkpoint){
      const mark = document.createElement('div'); mark.className = 'tl-checkpoint-mark';
      const totalDays = diffDays(c.startDate, c.endDate) || 1;
      const cpDays = diffDays(c.startDate, c.checkpoint.date);
      mark.style.bottom = Math.max(0, Math.min(100, (cpDays/totalDays) * 100)) + '%';
      track.appendChild(mark);
    }
    const endLbl = document.createElement('div'); endLbl.className = 'tl-date'; endLbl.textContent = fmtShortDate(c.endDate);
    tl.appendChild(startLbl); tl.appendChild(track); tl.appendChild(endLbl);
    return tl;
  }

  function buildCheckpointEl(c){
    const wrap = document.createElement('div');
    const today = H.todayIso();
    if(today < c.checkpoint.date){
      wrap.className = 'challenge-checkpoint pending';
      wrap.innerHTML = `<span class="cp-label">${nl()?'Checkpoint op':'Checkpoint on'} ${fmtShortDate(c.checkpoint.date)}:</span> ${nl()?'streefwaarde':'target'} ${c.checkpoint.targetValue}`;
      return wrap;
    }
    if(c.checkpoint.actualValue === null || c.checkpoint.actualValue === undefined){
      wrap.className = 'challenge-checkpoint pending';
      const label = document.createElement('span'); label.className = 'cp-label';
      label.textContent = `${nl()?'Checkpoint (streefwaarde':'Checkpoint (target'} ${c.checkpoint.targetValue}):`;
      wrap.appendChild(label);
      const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.placeholder = nl()?'werkelijk':'actual';
      wrap.appendChild(input);
      const btn = document.createElement('button'); btn.type = 'button'; btn.textContent = I18n.t('common.save');
      btn.addEventListener('click', () => {
        const v = parseFloat(input.value);
        if(isNaN(v)) return;
        c.checkpoint.actualValue = v;
        S.save(); render();
      });
      wrap.appendChild(btn);
      return wrap;
    }
    const good = c.checkpoint.actualValue >= parseFloat(c.checkpoint.targetValue);
    wrap.className = 'challenge-checkpoint ' + (good ? 'green' : 'red');
    wrap.textContent = `Checkpoint: ${c.checkpoint.actualValue} / ${c.checkpoint.targetValue}`;
    return wrap;
  }

  function buildFullBlock(c){
    const status = statusOf(c);
    const block = document.createElement('div'); block.className = 'challenge-block' + (status !== 'active' ? ' status-'+status : '');

    const row = document.createElement('div'); row.className = 'challenge-full';
    const main = document.createElement('div'); main.className = 'challenge-main';

    const nameWrap = document.createElement('div'); nameWrap.className = 'challenge-menu-anchor';
    const nameEl = document.createElement('span'); nameEl.className = 'challenge-name'; nameEl.textContent = c.name;
    nameWrap.appendChild(nameEl);
    if(status === 'done'){ const b = document.createElement('span'); b.className='challenge-status-badge done'; b.textContent = nl()?'Voltooid':'Done'; nameWrap.appendChild(b); }
    if(status === 'failed'){ const b = document.createElement('span'); b.className='challenge-status-badge failed'; b.textContent = nl()?'Mislukt':'Failed'; nameWrap.appendChild(b); }
    const menu = buildChallengeMenu(c, status);
    nameWrap.appendChild(menu);
    nameEl.addEventListener('click', (e) => { e.stopPropagation(); closeAllChallengeMenus(); menu.hidden = false; });
    main.appendChild(nameWrap);

    const goalEl = document.createElement('div'); goalEl.className = 'challenge-goal'; goalEl.textContent = c.goal;
    main.appendChild(goalEl);

    if(c.linkedHabitId){
      const habit = S.findHabit(c.linkedHabitId);
      if(habit){
        const hRow = document.createElement('div'); hRow.className = 'challenge-habit-row';
        const iso = H.todayIso();
        const scheduled = habit.days.includes(H.weekdayMon0(iso));
        if(scheduled){
          const cb = document.createElement('input'); cb.type='checkbox'; cb.className='check';
          cb.checked = !!(habit.checks && habit.checks[iso]);
          cb.addEventListener('change', () => { H.toggleCheck(habit.id, iso, cb.checked); render(); });
          hRow.appendChild(cb);
        } else {
          const dash = document.createElement('span'); dash.className='check-off'; dash.textContent='–'; hRow.appendChild(dash);
        }
        const lbl = document.createElement('span'); lbl.className = 'lbl'; lbl.textContent = habit.name;
        hRow.appendChild(lbl);
        main.appendChild(hRow);
      }
    }

    if(c.checkpoint) main.appendChild(buildCheckpointEl(c));

    const completeRow = document.createElement('div'); completeRow.className = 'challenge-complete-row' + (canComplete(c) || c.completed ? '' : ' locked');
    const cb2 = document.createElement('input'); cb2.type = 'checkbox'; cb2.className = 'check'; cb2.checked = !!c.completed;
    cb2.disabled = status === 'failed' ? true : (!canComplete(c) && !c.completed);
    cb2.addEventListener('change', () => {
      c.completed = cb2.checked;
      c.completedDate = cb2.checked ? H.todayIso() : null;
      S.save(); render();
    });
    completeRow.appendChild(cb2);
    const compLbl = document.createElement('span');
    compLbl.textContent = status === 'failed'
      ? (nl()?'Deadline verstreken':'Deadline passed')
      : (canComplete(c) || c.completed
          ? (nl()?'Voltooid':'Completed')
          : (nl()?'Nog niet af te vinken (kan vanaf de einddatum)':'Not completable yet (from end date)'));
    completeRow.appendChild(compLbl);
    main.appendChild(completeRow);

    row.appendChild(main);
    row.appendChild(buildTimeline(c, status));
    block.appendChild(row);
    return block;
  }

  function buildCompactBlock(c){
    const status = statusOf(c);
    const block = document.createElement('div'); block.className = 'challenge-block-compact' + (status !== 'active' ? ' status-'+status : '');
    const nameEl = document.createElement('div'); nameEl.className = 'challenge-compact-name'; nameEl.textContent = c.name;
    nameEl.addEventListener('click', (e) => { e.stopPropagation(); if(status !== 'failed') openChallengeForm(c); });
    block.appendChild(nameEl);
    const goalEl = document.createElement('div'); goalEl.className = 'challenge-compact-goal'; goalEl.textContent = c.goal;
    block.appendChild(goalEl);
    const progRow = document.createElement('div'); progRow.className = 'challenge-compact-progress';
    const bar = document.createElement('div'); bar.className = 'challenge-compact-bar';
    const fill = document.createElement('div'); fill.className = 'fill';
    fill.style.width = ((status==='done'||status==='failed') ? 100 : progressPct(c)) + '%';
    bar.appendChild(fill); progRow.appendChild(bar);
    block.appendChild(progRow);
    const endRow = document.createElement('div'); endRow.className = 'challenge-compact-end';
    const cb = document.createElement('input'); cb.type='checkbox'; cb.className='check'; cb.checked = !!c.completed;
    cb.disabled = status === 'failed' ? true : (!canComplete(c) && !c.completed);
    cb.addEventListener('change', () => { c.completed = cb.checked; c.completedDate = cb.checked ? H.todayIso() : null; S.save(); render(); });
    endRow.appendChild(cb);
    const endLbl = document.createElement('span'); endLbl.textContent = fmtShortDate(c.endDate);
    endRow.appendChild(endLbl);
    block.appendChild(endRow);
    return block;
  }

  // ================= view switch =================
  document.querySelectorAll('#challenges-view-switch .view-switch-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#challenges-view-switch .view-switch-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentChallengeView = btn.dataset.view;
      render();
    });
  });

  // ================= toevoegen/bewerken overlay =================
  function buildDayPickerLocal(container, opts){
    opts = opts || {};
    container.innerHTML = '';
    const selected = new Set(opts.preset || []);
    for(let i=0;i<7;i++){
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'day-toggle sub-color';
      btn.textContent = I18n.dayLabels()[i];
      if(selected.has(i)) btn.classList.add('active');
      btn.addEventListener('click', () => {
        if(selected.has(i)){ selected.delete(i); btn.classList.remove('active'); }
        else { selected.add(i); btn.classList.add('active'); }
      });
      container.appendChild(btn);
    }
    return { selected };
  }

  function resetChallengeForm(){
    document.getElementById('form-challenge').reset();
    document.getElementById('challenge-form-error').classList.remove('show');
    document.getElementById('challenge-start').value = H.todayIso();
    document.getElementById('challenge-end').value = H.addDays(H.todayIso(), 29);
    document.getElementById('challenge-link-habit').checked = false;
    document.getElementById('challenge-habit-fields').style.display = 'none';
    document.getElementById('challenge-add-checkpoint').checked = false;
    document.getElementById('challenge-checkpoint-fields').style.display = 'none';
    chDayPicker = buildDayPickerLocal(document.getElementById('challenge-habit-days-picker'), {});
  }

  document.getElementById('btn-add-challenge').addEventListener('click', () => {
    editingChallengeId = null;
    document.getElementById('challenge-form-title').textContent = nl() ? 'Nieuwe challenge' : 'New challenge';
    resetChallengeForm();
    NeedsGrowNav.openOverlay('overlay-challenge-form');
    setTimeout(() => document.getElementById('challenge-name').focus(), 60);
  });

  document.getElementById('challenge-link-habit').addEventListener('change', (e) => {
    document.getElementById('challenge-habit-fields').style.display = e.target.checked ? 'block' : 'none';
  });
  document.getElementById('challenge-add-checkpoint').addEventListener('change', (e) => {
    document.getElementById('challenge-checkpoint-fields').style.display = e.target.checked ? 'block' : 'none';
  });

  function openChallengeForm(c){
    editingChallengeId = c.id;
    document.getElementById('challenge-form-title').textContent = I18n.t('common.edit');
    resetChallengeForm();
    document.getElementById('challenge-name').value = c.name;
    document.getElementById('challenge-goal').value = c.goal;
    document.getElementById('challenge-start').value = c.startDate;
    document.getElementById('challenge-end').value = c.endDate;
    if(c.linkedHabitId){
      const habit = S.findHabit(c.linkedHabitId);
      document.getElementById('challenge-link-habit').checked = true;
      document.getElementById('challenge-habit-fields').style.display = 'block';
      if(habit){
        document.getElementById('challenge-habit-name').value = habit.name;
        chDayPicker = buildDayPickerLocal(document.getElementById('challenge-habit-days-picker'), { preset: habit.days });
      }
    }
    if(c.checkpoint){
      document.getElementById('challenge-add-checkpoint').checked = true;
      document.getElementById('challenge-checkpoint-fields').style.display = 'block';
      document.getElementById('challenge-checkpoint-target').value = c.checkpoint.targetValue;
    }
    NeedsGrowNav.openOverlay('overlay-challenge-form');
  }

  document.getElementById('form-challenge').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('challenge-name').value.trim();
    const goal = document.getElementById('challenge-goal').value.trim();
    const startDate = document.getElementById('challenge-start').value;
    const endDate = document.getElementById('challenge-end').value;
    const errorEl = document.getElementById('challenge-form-error');
    if(!name || !goal || !startDate || !endDate || endDate < startDate){
      errorEl.textContent = nl() ? 'Vul naam, doel, start- en einddatum in (einddatum na startdatum).' : 'Fill in name, goal, start and end date (end after start).';
      errorEl.classList.add('show'); return;
    }
    const wantsHabit = document.getElementById('challenge-link-habit').checked;
    const habitName = document.getElementById('challenge-habit-name').value.trim();
    const habitDays = chDayPicker ? Array.from(chDayPicker.selected).sort((a,b)=>a-b) : [];
    if(wantsHabit && (!habitName || habitDays.length === 0)){
      errorEl.textContent = nl() ? 'Vul een naam en minstens één dag in voor de challenge-gewoonte.' : 'Enter a name and at least one day for the challenge habit.';
      errorEl.classList.add('show'); return;
    }
    const wantsCheckpoint = document.getElementById('challenge-add-checkpoint').checked;
    const cpTarget = document.getElementById('challenge-checkpoint-target').value.trim();
    if(wantsCheckpoint && !cpTarget){
      errorEl.textContent = nl() ? 'Vul een streefwaarde in voor het checkpoint.' : 'Enter a target value for the checkpoint.';
      errorEl.classList.add('show'); return;
    }
    errorEl.classList.remove('show');

    let challenge;
    if(editingChallengeId){
      challenge = S.findChallenge(editingChallengeId);
      challenge.name = name; challenge.goal = goal; challenge.startDate = startDate; challenge.endDate = endDate;
    } else {
      challenge = { id: S.uid(), name, goal, startDate, endDate, linkedHabitId: null, checkpoint: null, completed: false, completedDate: null };
      S.get().challenges.push(challenge);
    }

    // gekoppelde challenge-habit
    if(wantsHabit){
      if(challenge.linkedHabitId && S.findHabit(challenge.linkedHabitId)){
        const habit = S.findHabit(challenge.linkedHabitId);
        habit.name = habitName; habit.days = habitDays;
      } else {
        const habitId = S.uid();
        S.get().habits.push({ id: habitId, name: habitName, days: habitDays, checks:{}, parentId:null, subIds:[], isChallengeHabit:true, challengeId: challenge.id, createdAt: H.todayIso() });
        challenge.linkedHabitId = habitId;
      }
    } else if(challenge.linkedHabitId){
      S.get().habits = S.get().habits.filter(h => h.id !== challenge.linkedHabitId);
      challenge.linkedHabitId = null;
    }

    // checkpoint (halverwege de looptijd)
    if(wantsCheckpoint){
      const totalDays = diffDays(startDate, endDate);
      const cpDate = H.addDays(startDate, Math.floor(totalDays/2));
      if(challenge.checkpoint){ challenge.checkpoint.targetValue = cpTarget; challenge.checkpoint.date = cpDate; }
      else { challenge.checkpoint = { targetValue: cpTarget, actualValue: null, date: cpDate }; }
    } else {
      challenge.checkpoint = null;
    }

    S.save(); render(); NeedsGrowNav.closeOverlay('overlay-challenge-form');
    if(H && H.render) H.render();
  });

  global.NeedsGrowChallenges = { render };
})(window);
