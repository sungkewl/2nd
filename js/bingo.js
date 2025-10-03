// ./js/bingo.js  (UTF-8, single source of truth)
'use strict';

const boardSize = 5;

// Per-video game data (definitions are optional)
const gameData = {
  'video-1-content': {
    items: [
      'Freedom is wasted on the free','Paralyzed by choice','I wanted to run','I wanted to speak',
      'Confinement is like a small death','Lose the chance to do everything one day',
      'Our mind is the maximum security prison','A chance to find inner freedom','Imagination and knowledge',
      'Beyond the Fuck It','Wanted to stop the mental anguish','We can choose serenity','We can choose kindness',
      'Pain is the ultimate common denominator','Music','Poetry','More than 400 knocks',
      'Infinite creativity within limits','Appreciate life through deprivation','Power outage','The smell of rain',
      'Too many emails','Nagging children','Enlarge small blemishes when the canvas is full','When the canvas is empty'
    ],
    definitions: [
      '자유는 자유로운 사람들에게는 낭비되기도 한다',
      '선택이 너무 많아 아무 것도 못 한다',
      '나는 도망치고 싶었다',
      '나는 말하고 싶었다',
      '감금은 작은 죽음과 같다',
      '언젠가 모든 것을 할 기회를 잃는다',
      '우리의 마음은 최고 보안 감옥과 같다',
      '내면의 자유를 찾을 기회',
      '상상력과 지식',
      '포기(에라 모르겠다)를 넘어',
      '정신적 고통을 멈추고 싶었다',
      '우리는 평온함을 선택할 수 있다',
      '우리는 친절함을 선택할 수 있다',
      '고통은 인류가 공유하는 궁극의 공통분모다',
      '음악',
      '시(詩)',
      '400번이 넘는 두드림',
      '제한 속의 무한한 창의성',
      '결핍을 통해 삶을 더 소중히 여기다',
      '정전',
      '빗내음(비 냄새)',
      '너무 많은 이메일',
      '잔소리하는 아이들',
      '캔버스가 가득 차면 작은 흠도 커 보인다',
      '캔버스가 비어 있을 때는 다르다'
    ]
  },
  'video-2-content': {
    items: [
      'a senior millitary officer','chilling message on social media','demands are not met','they will be executed',
      'gut-wrenching images of child abuse','Start of the adventure','capital murder case','generative AI','indistinguishable from reality',
      'lies and conspiracies','They manipulated images','you could alter history','the rise','humiliate',
      'extort','seemed reasonable','each image is degraded','convert noise into an image','consistent',
      "it's incredible",'electronic sensor','residual noise','natural and artificial','recede away','geometry and physics'
    ],
    definitions: [
      '고위 군 장교',
      '소셜미디어에 올라온 소름끼치는 메시지',
      '요구가 충족되지 않았다',
      '그들은 처형될 것이다',
      '아동학대의 끔찍한 영상들',
      '모험의 시작',
      '사형이 가능한 살인 사건',
      '생성형 AI',
      '현실과 구분할 수 없다',
      '거짓과 음모',
      '그들은 이미지를 조작했다',
      '당신은 역사를 바꿀 수도 있다',
      '부상, 상승',
      '굴욕감을 주다',
      '갈취하다',
      '그럴듯해 보였다',
      '각 이미지가 점점 열화된다',
      '노이즈를 이미지로 변환하다',
      '일관된, 일치하는',
      '믿기 어려울 정도로 놀랍다',
      '전자 센서',
      '잔류 잡음',
      '자연적인 것과 인공적인 것',
      '멀어지다, 점차 사라지다',
      '기하학과 물리학'
    ]
  }
};

// Navigation (left list)
const navList = document.querySelector('.nav-list');
const sections = document.querySelectorAll('.content-section');

if (navList) {
  navList.addEventListener('click', (e) => {
    const a = e.target.closest('.nav-link');
    if (!a) return;
    e.preventDefault();

    document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
    a.classList.add('active');

    const targetId = a.dataset.target?.replace('#', '');
    sections.forEach(sec => sec.classList.toggle('active', sec.id === targetId));
  });
}

// Initialize board in each section
function initGame(bingoSection) {
  const contentId = bingoSection.closest('.content-section')?.id;
  const data = gameData[contentId];
  if (!data) return;

  const board   = bingoSection.querySelector('.bingo-board');
  const msg     = bingoSection.querySelector('.message-area');
  const counter = bingoSection.querySelector('.bingo-counter');
  const resetBtn= bingoSection.querySelector('.reset-btn');

  const pairs = data.items.map((item, i) => ({ item, def: (data.definitions && data.definitions[i]) || '' }));
  shuffle(pairs);

  board.innerHTML = '';
  for (let i = 0; i < boardSize * boardSize; i++) {
    const cell = document.createElement('div');
    cell.className = 'bingo-cell';
    cell.textContent = pairs[i].item;
    cell.dataset.definition = pairs[i].def;
    cell.setAttribute('role', 'gridcell');
    cell.tabIndex = 0;

    const select = () => handleCellClick(cell, bingoSection);
    cell.addEventListener('click', select);
    cell.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); select(); }
    });

    board.appendChild(cell);
  }

  msg.textContent = '빙고를 시작하려면 단어를 클릭하세요!';
  msg.setAttribute('aria-live', 'polite');
  counter.textContent = 'BINGO: 0';
  bingoSection.dataset.firstBingo = 'false';
  bingoSection.dataset.blackout   = 'false';

  if (resetBtn) resetBtn.onclick = () => initGame(bingoSection);
}

document.querySelectorAll('.bingo-section').forEach(initGame);

// Dock TED video to the left when scrolling
(function setupVideoDocking() {
  const leftNav = document.querySelector('.left-nav');
  const mainContainer = document.querySelector('.main-container');
  if (!leftNav || !mainContainer) return;

  function getActiveVideoContainer() {
    return document.querySelector('.content-section.active .video-container');
  }

  function isMobile() {
    return window.matchMedia('(max-width: 980px)').matches;
  }

  function updateDock() {
    const vc = getActiveVideoContainer();
    if (!vc) return;

    // Simple rule: any scroll -> dock; top -> undock (works across layouts)
    const shouldDock = window.scrollY > 10;
    if (!shouldDock) {
      vc.classList.remove('docked');
      vc.style.removeProperty('--dock-left');
      vc.style.removeProperty('--dock-width');
      vc.style.removeProperty('--dock-top');
      return;
    }

    // Measure the left nav to align and size
    const navRect = leftNav.getBoundingClientRect();
    const containerRect = mainContainer.getBoundingClientRect();

    // Align video to the left-nav's left X, and use its width
    const dockLeft = Math.max(16, Math.round(navRect.left));
    const dockWidth = Math.max(200, Math.round(navRect.width));
    const dockTop = Math.max(16, Math.round(navRect.bottom + 8));

    vc.style.setProperty('--dock-left', dockLeft + 'px');
    vc.style.setProperty('--dock-width', dockWidth + 'px');
    vc.style.setProperty('--dock-top', dockTop + 'px');
    vc.classList.add('docked');
  }

  // Optional: force-dock on user wheel intent even if iframe swallows scroll
  function forceDockOnIntent(deltaY) {
    const vc = getActiveVideoContainer();
    if (!vc) return;
    if (deltaY > 0) {
      const navRect = leftNav.getBoundingClientRect();
      const dockLeft = Math.max(16, Math.round(navRect.left));
      const dockWidth = Math.max(200, Math.round(navRect.width));
      const dockTop = Math.max(16, Math.round(navRect.bottom + 8));
      vc.style.setProperty('--dock-left', dockLeft + 'px');
      vc.style.setProperty('--dock-width', dockWidth + 'px');
      vc.style.setProperty('--dock-top', dockTop + 'px');
      vc.classList.add('docked');
    } else if (window.scrollY <= 10) {
      vc.classList.remove('docked');
      vc.style.removeProperty('--dock-left');
      vc.style.removeProperty('--dock-width');
      vc.style.removeProperty('--dock-top');
    }
  }

  // Update on scroll and resize, and when nav switches section
  window.addEventListener('scroll', updateDock, { passive: true });
  window.addEventListener('resize', updateDock);
  window.addEventListener('wheel', (e) => forceDockOnIntent(e.deltaY), { passive: true });
  window.addEventListener('touchmove', () => updateDock(), { passive: true });

  // Recalculate on initial load and after a tick to ensure layout settled
  window.addEventListener('load', () => {
    updateDock();
    setTimeout(updateDock, 50);
  });

  // When switching videos via the left nav
  const nav = document.querySelector('.nav-list');
  if (nav) nav.addEventListener('click', () => setTimeout(updateDock, 0));
})();

// Utils
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Select cell
function handleCellClick(cell, bingoSection) {
  if (cell.classList.contains('selected')) return;
  cell.classList.add('selected');

  const msg = bingoSection.querySelector('.message-area');
  const def = cell.dataset.definition || '';
  msg.textContent = def ? `"${cell.textContent}": ${def}` : `"${cell.textContent}" selected.`;

  checkBingo(bingoSection);
}

// Check BINGO
function checkBingo(bingoSection) {
  const cells   = Array.from(bingoSection.querySelectorAll('.bingo-cell'));
  const counter = bingoSection.querySelector('.bingo-counter');
  const msg     = bingoSection.querySelector('.message-area');

  const lines = [];
  for (let i = 0; i < boardSize; i++) {
    const row = [], col = [];
    for (let j = 0; j < boardSize; j++) {
      row.push(cells[i * boardSize + j]);
      col.push(cells[j * boardSize + i]);
    }
    lines.push(row, col);
  }
  const diag1 = [], diag2 = [];
  for (let i = 0; i < boardSize; i++) {
    diag1.push(cells[i * boardSize + i]);
    diag2.push(cells[i * boardSize + (boardSize - 1 - i)]);
  }
  lines.push(diag1, diag2);

  cells.forEach(c => c.classList.remove('bingo-line-highlight'));
  let completed = 0;
  for (const line of lines) {
    if (line.every(c => c.classList.contains('selected'))) {
      completed++;
      line.forEach(c => c.classList.add('bingo-line-highlight'));
    }
  }

  counter.textContent = `BINGO: ${completed}`;

  if (completed > 0 && bingoSection.dataset.firstBingo !== 'true') {
    bingoSection.dataset.firstBingo = 'true';
    msg.textContent = '첫 빙고 달성! 뱃지를 확인해 보세요';
    if (window.DataManager) {
      try {
        DataManager.addXP('bingo', 20);
        const s = DataManager.getState();
        if (!s.badges['first-bingo']) DataManager.addBadge('first-bingo', '첫 빙고');
      } catch {}
    }
    unlockBadgeDom('badge-first-bingo');
  }

  const allSelected = cells.every(c => c.classList.contains('selected'));
  if (allSelected && bingoSection.dataset.blackout !== 'true') {
    bingoSection.dataset.blackout = 'true';
    msg.textContent = '블랙아웃 성공! 축하해요!';
    if (window.DataManager) {
      try {
        DataManager.addXP('bingo', 40);
        const s = DataManager.getState();
        if (!s.badges['bingo-blackout']) DataManager.addBadge('bingo-blackout', '빙고 블랙아웃');
      } catch {}
    }
    unlockBadgeDom('badge-perfect');
  }
}

// Badge DOM helper
function unlockBadgeDom(id) {
  const el = document.getElementById(id);
  if (el && el.classList.contains('locked')) {
    el.classList.remove('locked');
    el.classList.add('achieved');
  }
}
