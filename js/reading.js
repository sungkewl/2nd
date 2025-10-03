// ./js/reading.js
'use strict';

// DOM 캐시
const problemsContainer = document.getElementById('reading-problems-container');
const xpEl     = document.getElementById('xp-display');
const livesEl  = document.getElementById('lives-display');
const timeEl   = document.getElementById('study-time-display');
const levelEl  = document.getElementById('level-display');
const cdEl     = document.getElementById('countdown-display');
const resetBtn = document.getElementById('reset-button');
const comboEl  = document.getElementById('combo-display');

// 학습 시간/카운트다운/콤보
let totalStudySeconds = 0;
let studyTimerId;
let countdownInterval;
let comboCount = 0; // ✅ 콤보 카운트

// 문제 데이터
const readingData = [
  { 
    id: "problem-1",
    title: "2025년 수능특강 1강",
    passage: "The concept of 'nature' is a complex one. For many, it refers to the non-human world, the wilderness untouched by human hands. However, this view is increasingly challenged as human activity now impacts every corner of the globe. Is a managed forest still nature? What about a genetically modified crop?",
    options: [
      "The definition of nature is universally agreed upon.",
      "Human activity has no real impact on nature.",
      "The traditional view of nature as 'untouched wilderness' is being questioned.",
      "Genetically modified crops are the best example of pure nature.",
      "Managed forests are more natural than wild ones."
    ],
    correctAnswer: 3
  },
  { 
    id: "problem-2",
    title: "2025년 수능특강 2강",
    passage: "Cognitive dissonance is the mental discomfort experienced by a person who holds two or more contradictory beliefs, ideas, or values. This discomfort is triggered by a situation in which a person's belief clashes with new evidence perceived by the person. To reduce this discomfort, people may change their beliefs, actions, or perceptions.",
    options: [
      "Cognitive dissonance is a state of mental comfort.",
      "People enjoy holding contradictory beliefs.",
      "New evidence always reinforces existing beliefs.",
      "People might change their beliefs to reduce mental discomfort.",
      "Cognitive dissonance only occurs in rare situations."
    ],
    correctAnswer: 4
  },
  { 
    id: "problem-3",
    title: "2025년 수능특강 3강",
    passage: "The Industrial Revolution, which began in the 18th century, was a period of major industrialization that saw the mechanization of agriculture and textile manufacturing and a revolution in power, including steam ships and railroads. This period altered the social, economic, and cultural fabric of the age.",
    options: [
      "The Industrial Revolution started in the 20th century.",
      "It was a period focused solely on agricultural changes.",
      "Steam power was a minor part of this revolution.",
      "This era had a profound impact on society and economy.",
      "The revolution had no effect on cultural aspects."
    ],
    correctAnswer: 4
  }
];


// ✅ HUD 묶음 함수
function renderHUD() {
  updateXPDisplay();
  updateLivesDisplay();
  updateLevelDisplay();
  updateComboDisplay();
}
// ===== Avatar Sprite (drop-in) =====
const AVATAR_SPRITE_IDLE = {
  url: './images/reading_avatar_sprites.png', // 3프레임 아이들 시트
  fw: 32, fh: 32, scale: 2, cols: 3, rows: 4
};
const AVATAR_SPRITE_RUN = {
  url: './images/reading_avatar_run_sprites.png', // 4프레임 런 시트
  fw: 32, fh: 32, scale: 2, cols: 4, rows: 4
};

let _avatarSheet = AVATAR_SPRITE_IDLE;
let _avatarCol = 0;
let _avatarTimer;

function getAvatarRowByLevel(lv){
  if (lv >= 10) return 3; // Voyager
  if (lv >= 7)  return 2; // Ranger
  if (lv >= 4)  return 1; // Explorer
  return 0;               // Novice
}

function setAvatarFrame(row, col){
  const fig = document.getElementById('avatar-figure');
  if (!fig) return;
  const sw = _avatarSheet.fw * _avatarSheet.scale; // 64
  const sh = _avatarSheet.fh * _avatarSheet.scale; // 64
  fig.style.backgroundImage = `url(${_avatarSheet.url})`;
  fig.style.backgroundSize = `${_avatarSheet.cols*sw}px ${_avatarSheet.rows*sh}px`;
  fig.style.backgroundPosition = `-${col*sw}px -${row*sh}px`;
}

function renderAvatar(){
  const s = DataManager.getState();
  const lv = s.player.level;
  const row = getAvatarRowByLevel(lv);

  const fig  = document.getElementById('avatar-figure');
  const ttl  = document.getElementById('avatar-title');
  const desc = document.getElementById('avatar-desc');

  if (fig){
    // 코스튬(테두리/광택) 클래스 유지하고, 내용은 스프라이트를 씀
    fig.classList.remove('costume-1','costume-2','costume-3','costume-4');
    const costumeClass = row===0?'costume-1':row===1?'costume-2':row===2?'costume-3':'costume-4';
    fig.classList.add(costumeClass);
    fig.textContent = ''; // 이모지 제거
    setAvatarFrame(row, _avatarCol);
  }
  if (ttl)  ttl.textContent  = (row===3?'Sky Voyager':row===2?'Word Ranger':row===1?'Story Explorer':'Novice Reader') + ` (Lv.${lv})`;
  if (desc) desc.textContent = (row===3?'전설의 독해가':row===2?'심화 독해가':row===1?'탐험 독해가':'기본 복장');
}

function startAvatarAnim(interval=250){
  clearInterval(_avatarTimer);
  _avatarTimer = setInterval(()=>{
    _avatarCol = (_avatarCol + 1) % _avatarSheet.cols;
    const row = getAvatarRowByLevel(DataManager.getState().player.level);
    setAvatarFrame(row, _avatarCol);
  }, interval);
}

function useAvatarSheet(sheet, fps=4){
  _avatarSheet = sheet;
  startAvatarAnim(1000 / fps);
  renderAvatar();
}

// 정답 시 잠깐 달리기 → 아이들로 복귀
let _runKickTimer;
function kickRun(ms=900){
  clearTimeout(_runKickTimer);
  useAvatarSheet(AVATAR_SPRITE_RUN, 8); // 경쾌하게 8fps
  _runKickTimer = setTimeout(()=>{
    useAvatarSheet(AVATAR_SPRITE_IDLE, 4); // 다시 idle 4fps
  }, ms);
}

// ReadingQuest 이벤트에 연결 (정답일 때만 러닝 연출)
// Avatar run animation now handled by js/avatarWidget.js on XP change

// HUD 업데이트
function updateXPDisplay() {
  const s = DataManager.getState();
  if (xpEl) xpEl.textContent = `${s.player.xp} / ${s.player.xpToNextLevel} XP`;
}
function updateLivesDisplay() {
  const lives = DataManager.getState().readingProgress.lives;
  if (livesEl) livesEl.textContent = '❤️'.repeat(lives) + '♡'.repeat(3 - lives);
}
function updateLevelDisplay() {
  const s = DataManager.getState();
  if (levelEl) levelEl.textContent = `Lv.${s.player.level}`;
}
function updateComboDisplay() {
  if (!comboEl) return;
  comboEl.textContent = comboCount > 1 ? `Combo ×${comboCount}` : '';
}
function updateStudyTimeDisplay() {
  const m = Math.floor(totalStudySeconds / 60);
  const s = totalStudySeconds % 60;
  if (timeEl) timeEl.textContent = `${m}분 ${s}초`;
}

// 선택 처리
function handleOptionSelect(e) {
  const selected = e.currentTarget;
  const container = selected.parentElement;

  if (container.classList.contains('answered') || selected.classList.contains('tried')) return;

  const section = selected.closest('.content-section');
  const pid = section.id;
  const data = readingData.find(p => p.id === pid);
  const idx = parseInt(selected.dataset.optionIndex);

  selected.classList.add('selected');
  const feedback = selected.closest('.rc-problem').querySelector('.feedback');

  if (idx === data.correctAnswer) {
    // ✅ 정답
    window.dispatchEvent(new CustomEvent('rq:answer', {detail: {correct: true}}));
    selected.classList.add('correct');
    container.classList.add('answered');

    comboCount += 1;
    const base = 10;
    const bonus = Math.min((comboCount - 1) * 5, 20);
    const totalGain = base + bonus;

      if (feedback) {
      feedback.textContent = `정답입니다! +${base} XP${bonus ? ` (보너스 +${bonus})` : ''}`;
      feedback.className = 'feedback correct';
    }
    if (window.__xpLock) return;
    window.__xpLock = true;
    DataManager.addXP('reading', totalGain);
    DataManager.readingAddCorrect();
    setTimeout(() => { window.__xpLock = false; }, 400);

  

    const s = DataManager.getState();
    if (comboCount >= 3 && !s.badges['combo-3']) DataManager.addBadge('combo-3', '연속 정답 ×3');
    if (comboCount >= 5 && !s.badges['combo-5']) DataManager.addBadge('combo-5', '연속 정답 ×5');
    if (s.readingProgress.correctAnswersCount === 1 && !s.badges['first-correct']) {
      DataManager.addBadge('first-correct', '첫 정답');
    }
    if (s.readingProgress.correctAnswersCount >= readingData.length && !s.badges['reading-perfect']) {
      DataManager.addBadge('reading-perfect', '독해 퍼펙트');
    }

  } else {
    // ❌ 오답
     window.dispatchEvent(new CustomEvent('rq:answer', {detail: {correct: false}}));
    selected.classList.add('incorrect', 'tried');
    DataManager.readingLoseLife();
    comboCount = 0;

    if (feedback) {
      feedback.textContent = '오답! ❤️ -1';
      feedback.className = 'feedback incorrect';
    }

    const s2 = DataManager.getState();
    if (s2.readingProgress.lives <= 0) {
      const retry = confirm('GAME OVER! 모든 생명을 소진했습니다.\n다시 시작하시겠습니까?');
      if (retry) {
        DataManager.resetReadingSession();
        comboCount = 0;
        resetUI();
      } else {
        alert('학습을 종료합니다.');
        document.querySelectorAll('.options-container').forEach(c => c.classList.add('answered'));
      }
    }
  }

  renderHUD(); // ✅ HUD 갱신
}

// UI 초기화
function resetUI() {
  document.querySelectorAll('.option-item').forEach(o => o.classList.remove('selected','correct','incorrect','tried'));
  document.querySelectorAll('.options-container').forEach(c => c.classList.remove('answered'));
  document.querySelectorAll('.feedback').forEach(fb => { fb.textContent = ''; fb.className = 'feedback'; });
  totalStudySeconds = 0;
  renderHUD();
}

// 페이지 초기화
function initializePage() {
  // 단어 툴팁 주석 데이터
  const readingAnnotations = {
    'problem-1': [
      { phrase: 'nature', meaning: '자연(인간이 만든 것이 아닌 세계)', usage: "Many people enjoy being close to nature." },
      { phrase: 'wilderness', meaning: '황야, 손대지 않은 자연', usage: "They hiked deep into the wilderness." },
      { phrase: 'managed forest', meaning: '관리형(조성/간벌 등 인위적 관리가 있는) 숲', usage: "A managed forest is regularly maintained by humans." },
      { phrase: 'genetically modified crop', meaning: '유전자 변형 작물(GMO)', usage: "A genetically modified crop can resist certain pests." }
    ],
    'problem-2': [
      { phrase: 'Cognitive dissonance', meaning: '인지 부조화(모순된 신념/행동으로 인한 심리적 불편)', usage: "Cognitive dissonance can motivate people to change." },
      { phrase: 'contradictory', meaning: '모순되는, 상반되는', usage: "The two statements are contradictory." },
      { phrase: 'perceived', meaning: '인지된, 지각된(사람이 받아들인)', usage: "The risk is often higher than perceived." }
    ],
    'problem-3': [
      { phrase: 'Industrial Revolution', meaning: '산업혁명(18세기 후반~19세기 사회·경제적 대변혁)', usage: "The Industrial Revolution began in Britain." },
      { phrase: 'mechanization', meaning: '기계화(사람의 일을 기계가 대체함)', usage: "Mechanization increased factory productivity." },
      { phrase: 'textile manufacturing', meaning: '섬유(직물) 제조', usage: "Textile manufacturing expanded rapidly." },
      { phrase: 'steam ships', meaning: '증기선', usage: "Steam ships transformed global trade." },
      { phrase: 'railroads', meaning: '철도', usage: "Railroads connected distant cities quickly." }
    ]
  };

  function escapeRegExp(str){
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function buildVocabSpan(phrase, meaning, usage){
    const tip = `${meaning} — 예: ${usage}`;
    // 접근성: 키보드 포커스 가능, title 제공
    return `<span class="vocab" tabindex="0" title="${tip}">`+
           `<span class="vocab-text">${phrase}</span>`+
           `<span class="vocab-mark" aria-hidden="true">ⓘ</span>`+
           `<span class="vocab-tooltip" role="tooltip">`+
             `<strong>${phrase}</strong><br><span class="v-meaning">${meaning}</span><br><span class="v-usage">${usage}</span>`+
           `</span>`+
           `</span>`;
  }

  function annotatePassage(text, annList){
    if (!annList || !annList.length) return text;
    let result = text;
    // 각 용어의 첫 출현만 치환 (대소문자 무시)
    annList.forEach(({phrase, meaning, usage}) => {
      const re = new RegExp(`(\\b)(${escapeRegExp(phrase)})`, 'i');
      result = result.replace(re, (m, b, p2) => `${b}${buildVocabSpan(p2, meaning, usage)}`);
    });
    return result;
  }

  readingData.forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.id = item.id;
    wrapper.className = `content-section ${index === 0 ? 'active' : ''}`;

    const optionsHtml = item.options.map((t, i) => `
      <div class="option-item" data-option-index="${i + 1}">
        <button>${i + 1}</button>
        <p>${t}</p>
      </div>`).join('');

    const annotated = annotatePassage(item.passage, readingAnnotations[item.id]);
    wrapper.innerHTML = `
      <div class="rc-problem">
        <h3>${item.title}</h3>
        <p class="passage">${annotated}</p>
        <div class="options-container">${optionsHtml}</div>
        <div class="feedback" aria-live="polite"></div>
      </div>
    `;
    problemsContainer.appendChild(wrapper);
  });

  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      const target = document.querySelector(link.dataset.target);
      if (target) target.classList.add('active');
    });
  });

  document.querySelectorAll('.option-item').forEach(opt => {
    opt.addEventListener('click', handleOptionSelect);
  });

  renderHUD(); // ✅ 초기 HUD 표시
}

// 타이머
function startStudyTimer() {
  studyTimerId = setInterval(() => { totalStudySeconds++; updateStudyTimeDisplay(); }, 1000);
}
function startCountdownTimer(mins) {
  let remain = mins * 60;
  if (countdownInterval) clearInterval(countdownInterval);
  if (resetBtn) resetBtn.style.display = 'none';

  countdownInterval = setInterval(() => {
    const m = Math.floor(remain / 60), s = remain % 60;
    if (cdEl) cdEl.innerHTML = `남은 시간: ${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    remain--;
    if (remain < 0) {
      clearInterval(countdownInterval);
      if (cdEl) cdEl.innerHTML = '시간 종료!';
      if (resetBtn) resetBtn.style.display = 'inline-block';
    }
  }, 1000);

  if (resetBtn) resetBtn.onclick = () => startCountdownTimer(mins);
}

// 이벤트 구독 (HUD 자동 반영)
if (window.DataManager?.subscribe) {
  DataManager.subscribe(() => {
    renderHUD();
    renderAvatar(); // ⬅️ 레벨 변화 즉시 반영
  });
}
window.addEventListener('storage', (e) => {
  if (e.key === 'linguaVerseUserData') renderHUD();
});


// ===== Reading Quest – 가미 시스템 (붙여넣기) =====
(function(){
  const hasDM = !!(window.DataManager && window.DataManager.getState && window.DataManager.update);
  const LS_KEY = 'readingQuestState';

  const defaultState = {
    level: 1,
    xp: 0,
    xpToNext: 10,
    lives: 3,
    correctCountToday: 0,
    bestComboToday: 0,
    currentCombo: 0,
    studySecondsToday: 0,
    keys: 0,
    lastDate: new Date().toISOString().slice(0,10) // YYYY-MM-DD
  };

  function loadState(){
    if (hasDM) {
      const s = window.DataManager.getState();
      // DataManager에 읽기 전용 필드가 없다면 localStorage 사용
      const ls = localStorage.getItem(LS_KEY);
      return ls ? JSON.parse(ls) : {...defaultState};
    } else {
      const ls = localStorage.getItem(LS_KEY);
      return ls ? JSON.parse(ls) : {...defaultState};
    }
  }

  function saveState(st){
    if (hasDM) {
      // DataManager를 건드리지 않고 로컬에만 저장해 UI만 강화
      localStorage.setItem(LS_KEY, JSON.stringify(st));
    } else {
      localStorage.setItem(LS_KEY, JSON.stringify(st));
    }
  }

  function resetIfNewDay(st){
    const today = new Date().toISOString().slice(0,10);
    if (st.lastDate !== today){
      st.correctCountToday = 0;
      st.bestComboToday = 0;
      st.currentCombo = 0;
      st.studySecondsToday = 0;
      st.lastDate = today;
    }
  }

  // ===== UI 요소 =====
  const xpFill = document.getElementById('xp-fill');
  const xpText = document.getElementById('xp-display');
  const levelEl = document.getElementById('level-display');
  const livesEl = document.getElementById('lives-display');
  const questList = document.getElementById('quest-list');
  const keyCount = document.getElementById('key-count');
  const chestBtn = document.getElementById('open-chest-btn');
  const rewardToast = document.getElementById('reward-toast');
  const comboFx = document.getElementById('combo-fx');

  let state = loadState();
  resetIfNewDay(state);
  saveState(state);

  // ===== 퀘스트 정의 =====
  const quests = [
    { id:'q_correct10', name:'문제 3개 풀기', getProgress: s => `${s.correctCountToday}/3`, done: s => s.correctCountToday >= 3 },
    { id:'q_combo5',    name:'콤보 5회 달성',   getProgress: s => `${s.bestComboToday}/5`,     done: s => s.bestComboToday >= 5 },
    { id:'q_15min',     name:'15분 이상 학습',  getProgress: s => `${Math.floor(s.studySecondsToday/60)}분/15분`, done: s => s.studySecondsToday >= 15*60 },
  ];

  function renderQuests(){
    if (!questList) return;
    questList.innerHTML = '';
    quests.forEach(q=>{
      const li = document.createElement('li');
      const label = document.createElement('div');
      label.textContent = q.name;
      const right = document.createElement('div');
      right.className = 'quest-progress';
      right.textContent = q.done(state) ? '완료!' : q.getProgress(state);
      if (q.done(state)) right.classList.add('quest-done');
      li.appendChild(label);
      li.appendChild(right);
      questList.appendChild(li);
    });
  }

  function renderBars(){
    if (levelEl) levelEl.textContent = `Lv.${state.level}`;
    if (xpText) xpText.textContent = `${state.xp} / ${state.xpToNext} XP`;
    if (xpFill) xpFill.style.width = Math.min(100, (state.xp/state.xpToNext)*100) + '%';
    if (livesEl){
      const hearts = Math.max(0, state.lives);
      livesEl.textContent = '❤️'.repeat(hearts) || '🤍';
    }
    if (keyCount) keyCount.textContent = state.keys;
  }

  function levelUp(){
    state.level += 1;
    state.xp = Math.max(0, state.xp - state.xpToNext);
    state.xpToNext = 10 + (state.level-1)*10;
    toast(`레벨 업! Lv.${state.level} 🎉`);
    flashComboFx(`LEVEL UP!`);
  }

  function gainXP(amount){
    state.xp += amount;
    while (state.xp >= state.xpToNext){
      levelUp();
    }
    saveState(state);
    renderBars();
  }

  function toast(msg){
    if (!rewardToast) return;
    rewardToast.textContent = msg;
    rewardToast.classList.add('show');
    setTimeout(()=>rewardToast.classList.remove('show'), 2200);
  }

  function flashComboFx(text){
    if (!comboFx) return;
    comboFx.textContent = text;
    comboFx.classList.remove('show');
    // reflow
    void comboFx.offsetWidth;
    comboFx.classList.add('show');
  }

  // ===== 콤보/정답 이벤트 연동 =====
  function onAnswer(correct){
    if (correct){
      state.currentCombo += 1;
      state.bestComboToday = Math.max(state.bestComboToday, state.currentCombo);
      state.correctCountToday += 1;

      // 콤보 연출
      if (state.currentCombo >= 2){
        flashComboFx(`🔥 ${state.currentCombo} COMBO!`);
      }

      // 보상: 기본 XP + 콤보 보너스
      const xpGain = 2 + Math.floor(Math.max(0, state.currentCombo-1) * 0.5); // 2~…
      gainXP(xpGain);

      // 키 지급: 정답 3개마다 1개
      if (state.correctCountToday % 3 === 0){
        state.keys += 1;
        toast('🔑 열쇠 +1');
      }
    } else {
      state.currentCombo = 0;
      // 패널티(선택): 삶 -1 (원치 않으면 주석)
      // state.lives = Math.max(0, state.lives - 1);
    }

    saveState(state);
    renderQuests();
    renderBars();
  }

  // 페이지 학습 시간 집계 (1초 간격)
  setInterval(()=>{
    state.studySecondsToday += 1;
    // 1분 단위로 저장/렌더 절약
    if (state.studySecondsToday % 60 === 0){
      saveState(state);
      renderQuests();
    }
  }, 1000);

  // 보물상자 열기
  function openChest(){
    if (state.keys <= 0){
      chestBtn && chestBtn.classList.add('shake');
      setTimeout(()=>chestBtn.classList.remove('shake'), 600);
      toast('열쇠가 부족해요 🔑');
      return;
    }
    state.keys -= 1;

    // 간단한 랜덤 보상표
    const rewards = [
      {type:'xp', value: 5,  label:'+5 XP'},
      {type:'xp', value: 8,  label:'+8 XP'},
      {type:'xp', value: 12, label:'+12 XP'},
      {type:'life', value: 1, label:'❤️ +1'},
      {type:'buff', value: 'nextCorrectDouble', label:'다음 정답 XP x2'},
    ];
    const r = rewards[Math.floor(Math.random()*rewards.length)];

    if (!state.buff) state.buff = {};
    switch(r.type){
      case 'xp':
        gainXP(r.value);
        toast(`보상 획득! ${r.label}`);
        break;
      case 'life':
        state.lives += 1;
        toast(`보상 획득! ${r.label}`);
        break;
      case 'buff':
        state.buff.nextCorrectDouble = true;
        toast(`버프 획득! ${r.label}`);
        break;
    }

    saveState(state);
    renderBars();
    renderQuests();
  }

  if (chestBtn) chestBtn.addEventListener('click', openChest);

  // 외부(채점 지점)에서 호출할 수 있도록 공개
  window.ReadingQuest = {
    answer(correct){
      // 버프 처리: 다음 정답 XP 2배
      if (correct && state.buff && state.buff.nextCorrectDouble){
        // 일반 로직 먼저 → 추가 XP를 더 줌
        const beforeXP = state.xp;
        onAnswer(true); // 기본 처리
        const gained = Math.max(0, state.xp - beforeXP);
        gainXP(gained); // 한 번 더
        state.buff.nextCorrectDouble = false;
        saveState(state);
        return;
      }
      onAnswer(!!correct);
    },
    getState(){ return {...state}; }
  };

  // 커스텀 이벤트 훅(선호 시 사용)
  window.addEventListener('rq:answer', (e)=>{
    const ok = !!(e && e.detail && e.detail.correct);
    window.ReadingQuest.answer(ok);
  });

  // 최초 렌더
  renderBars();
  renderQuests();
})();


// 초기 실행
DataManager.resetReadingSession();
initializePage();
useAvatarSheet(AVATAR_SPRITE_IDLE, 4); // ⬅️ 추가: 기본은 idle 시트
renderAvatar();                         // ⬅️ 추가: 첫 렌더
startStudyTimer();
startCountdownTimer(5);
renderHUD();
