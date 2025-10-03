/* gr.js — Grammar Quest 완전체 */
(function () {
  // ===== 기본 설정 =====
  const tileSize = 32;
  const W = 16,
    H = 9;
  const NPC_POS = { x: 14, y: 3 }; // NPC 위치

  const TILE = {
    FLOOR: 0,
    WALL: 1,
    GATE: 2,
    BOX_BLUE: 3,
    BOX_GRAY: 4,
    BOX_GREEN: 5,
  };
  const $ = (s, r = document) => r.querySelector(s);

  // ===== XP 지급 헬퍼 =====
  function awardGrammarXP(amount) {
    const n = Number(amount) || 0;
    if (n <= 0) return;
    if (window.__xpLock) return;
    window.__xpLock = true;
    try {
      window.DataManager?.addXP?.("grammar", n);
    } finally {
      setTimeout(() => (window.__xpLock = false), 300);
    }
  }

  // ===== HUD 갱신 =====
  function renderHUD() {
    const s = window.DataManager?.getState?.();
    const localBadges = window.__localBadges || {};
    if (!s && !Object.keys(localBadges).length) return;
    const lvlEl = $("#rp-player-level");
    const xpBar = $("#player-xp-bar");
    const xpTxt = $("#rp-player-xp-text");
    if (s) {
      if (lvlEl) lvlEl.textContent = s.player.level;
      if (xpTxt)
        xpTxt.textContent = `${s.player.xp} / ${s.player.xpToNextLevel}`;
      if (xpBar) {
        const pct = s.player.xpToNextLevel
          ? Math.min(100, (s.player.xp / s.player.xpToNextLevel) * 100)
          : 0;
        xpBar.style.width = pct + "%";
      }
    }
    // 뱃지
    const badgeBox = $("#badge-container");
    if (badgeBox) {
      badgeBox.innerHTML = "";
      const iconMap = {
        "first-solve": "🎉",
        "streak-2": "🔥",
        "streak-3": "⚡",
        "gate-open": "🗝️",
      };
      const badges = s?.badges ? s.badges : localBadges;
      const ach = document.querySelector("#achievements");
      const keys = Object.keys(badges);
      if (ach) ach.style.display = keys.length ? "" : "none";
      keys.forEach((key) => {
        const div = document.createElement("div");
        div.className = "badge";
        const b = badges[key] || {};
        div.title = b.title || key;
        div.textContent = b.icon || iconMap[key] || "🏅";
        badgeBox.appendChild(div);
      });
    }
  }

  // 같은 탭
  if (window.DataManager?.subscribe) {
    DataManager.subscribe((reason) => {
      if (["xp-change", "badge-earned", "reset"].includes(reason)) {
        renderHUD();
      }
    });
  }
  // 커스텀 이벤트
  window.addEventListener("lv:stateChanged", renderHUD);
  // 다른 탭
  window.addEventListener("storage", (e) => {
    if (e.key === "linguaVerseUserData") renderHUD();
  });

  // ===== 토스트 =====
  function showToast(msg) {
    let el = $("#toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.style.cssText = `position:fixed;bottom:20px;left:50%;transform:translateX(-50%);
        background:rgba(0,0,0,.7);color:#fff;padding:8px 14px;border-radius:8px;z-index:9999;
        opacity:0;transition:.3s;`;
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.style.opacity = "1";
    setTimeout(() => (el.style.opacity = "0"), 2000);
  }

  // ===== SFX (Web Audio) =====
  let __audioCtx;
  function getAudio() {
    try {
      __audioCtx =
        __audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
    return __audioCtx;
  }

  // ===== Rule Book Popup + Typing =====
  let __typingTimer = null;
  function hideRulebook() {
    const ov = document.querySelector("#rulebook-overlay");
    const book = document.querySelector("#rulebook");
    if (ov) {
      ov.classList.add("hidden");
    }
    if (book) {
      book.classList.remove("typing");
    }
    if (__typingTimer) {
      clearTimeout(__typingTimer);
      __typingTimer = null;
    }
  }
  function typeText(el, text, speed = 20, onDone) {
    if (!el) return;
    if (__typingTimer) {
      clearTimeout(__typingTimer);
      __typingTimer = null;
    }
    let i = 0;
    el.textContent = "";
    const step = () => {
      el.textContent = text.slice(0, i);
      i++;
      if (i <= text.length) {
        __typingTimer = setTimeout(step, speed);
      } else {
        __typingTimer = null;
        onDone && onDone();
      }
    };
    step();
  }
  function showRulebookTyping(text) {
    const ov = document.querySelector("#rulebook-overlay");
    const book = document.querySelector("#rulebook");
    const txt = document.querySelector("#rulebook-text");
    if (!ov || !txt) return;
    ov.classList.remove("hidden");
    book && book.classList.add("typing");
    typeText(txt, text, 18, () => {
      book && book.classList.remove("typing");
    });
  }
  function tone(freq = 440, dur = 0.15, type = "sine", volume = 0.15) {
    const ctx = getAudio();
    if (!ctx) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = volume;
    o.connect(g);
    g.connect(ctx.destination);
    const now = ctx.currentTime;
    o.start(now);
    g.gain.setTargetAtTime(0.0001, now + dur * 0.6, dur * 0.3);
    o.stop(now + dur);
  }
  function playSFX(name) {
    // lightweight earcon set
    if (name === "correct") {
      tone(523, 0.08, "triangle");
      setTimeout(() => tone(659, 0.1, "triangle"), 80);
      return;
    }
    if (name === "wrong") {
      tone(180, 0.12, "sawtooth", 0.12);
      setTimeout(() => tone(140, 0.12, "sawtooth", 0.12), 100);
      return;
    }
    if (name === "reward") {
      tone(660, 0.08, "square");
      setTimeout(() => tone(880, 0.1, "square"), 70);
      return;
    }
    if (name === "gate") {
      tone(392, 0.08, "triangle");
      setTimeout(() => tone(523, 0.09, "triangle"), 90);
      setTimeout(() => tone(659, 0.11, "triangle"), 180);
      return;
    }
    if (name === "penalty") {
      tone(300, 0.12, "sawtooth", 0.12);
      setTimeout(() => tone(220, 0.15, "sawtooth", 0.12), 120);
      return;
    }
    if (name === "badge") {
      tone(700, 0.08, "triangle");
      setTimeout(() => tone(940, 0.09, "triangle"), 80);
      setTimeout(() => tone(1175, 0.11, "triangle"), 160);
      return;
    }
  }

  // ===== 맵/월드 =====
  const map = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 2, 1, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 0, 1, 0, 1, 1, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];
  map[4][14] = TILE.BOX_BLUE;
  const initialMap = map.map((row) => row.slice());

  const world = {
    player: { x: 1, y: 1 },
    gateOpened: false,
    keys: 0,
    awaitingBoxOpen: false,
  };
  let playerEl, npcEl, npcLabel;
  world.streak = 0;
  world.isGameOverPrompt = false;
  world.introActive = true;
  world.introPrompt = true;

  function awardBadge(id, title, icon) {
    let awarded = false;
    try {
      if (window.DataManager?.addBadge) {
        const before = Object.keys(
          window.DataManager.getState().badges || {}
        ).length;
        window.DataManager.addBadge(id, title);
        const after = Object.keys(
          window.DataManager.getState().badges || {}
        ).length;
        awarded = after > before;
      }
    } catch {}
    if (!awarded) {
      window.__localBadges = window.__localBadges || {};
      if (!window.__localBadges[id]) {
        window.__localBadges[id] = { title, icon };
        awarded = true;
      }
    }
    if (awarded) {
      showToast(`뱃지 획득: ${title}`);
      window.dispatchEvent(new Event("lv:stateChanged"));
    }
  }

  function updateKeyBadge(delta) {
    const countEl = document.querySelector("#key-count");
    if (countEl) {
      countEl.textContent = String(world.keys);
    }
    const badge = document.querySelector("#key-badge");
    if (badge && delta) {
      badge.classList.remove("bump");
      // force reflow to restart animation
      void badge.offsetWidth;
      badge.classList.add("bump");
    }
  }

  // ===== NPC 근접/질문 표시 =====
  function isNearNPC() {
    const dx = Math.abs(world.player.x - NPC_POS.x);
    const dy = Math.abs(world.player.y - NPC_POS.y);
    return dx + dy <= 1;
  }
  function setQuestionVisible(show) {
    const box = document.querySelector("#question-box");
    if (box) {
      box.classList.toggle("hidden", !show);
    }
  }
  function setDialogueVisible(show) {
    const box = document.querySelector("#dialogue-box");
    if (box) {
      box.classList.toggle("hidden", !show);
    }
  }
  function setDialogueText(txt) {
    const p = document.querySelector("#dialogue-text");
    if (p) {
      p.textContent = txt;
    }
  }
  function updateProximity() {
    const q = questions[qIdx];
    const qt = document.querySelector("#question-text");
    const quest = document.querySelector("#quest-text");
    if (isNearNPC()) {
      if (world.readyForNextQuestion) {
        world.readyForNextQuestion = false;
        qIdx++;
        renderQuestion();
      }
      if (world.awaitingBoxOpen) {
        setQuestionVisible(true);
        if (!world.__awaitPopupShown) {
          world.__awaitPopupShown = true;
          try {
            showRulebookTyping(
              "상자를 먼저 열어 보세요!\n열쇠로 보물 상자를 열면 다음 문제를 드릴게요."
            );
          } catch {}
        }
        qt && (qt.textContent = "상자를 먼저 열어 보세요!");
      } else {
        setQuestionVisible(!!q);
        if (q) {
          qt && (qt.textContent = `Q${q.id}. ${q.ko}`);
        }
      }
      quest && (quest.textContent = "NPC 근처: 문제를 풀어보세요.");
    } else {
      setQuestionVisible(false);
      quest && (quest.textContent = "NPC에게 다가가면 문제가 나타납니다.");
    }
  }

  function resetGame() {
    // restore map
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        map[y][x] = initialMap[y][x];
      }
    }
    world.player = { x: 1, y: 1 };
    world.gateOpened = false;
    world.keys = 0;
    world.awaitingBoxOpen = false;
    world.readyForNextQuestion = false;
    drawTiles();
    placePlayer();
    qIdx = 0;
    renderQuestion();
    updateKeyBadge();
    const lootLog = document.querySelector("#loot-log");
    lootLog && (lootLog.textContent = "리셋됨: 맵과 문제를 초기화했어요");
    showToast("리셋 완료! 다시 도전해요");
    world.streak = 0;
    setQuestionVisible(false);
    updateProximity();

    // Fix garbled quest text by forcing valid Korean
    try {
      const questEl = document.querySelector("#quest-text");
      const qBox = document.querySelector("#question-box");
      const fixQuest = () => {
        if (!questEl) return;
        const txt = questEl.textContent || "";
        const hasGarbled = /�/.test(txt) || (/\?/.test(txt) && /�/.test(txt)); // contains replacement char
        if (hasGarbled || txt.trim() === "") {
          const near = qBox && !qBox.classList.contains("hidden");
          questEl.textContent = near
            ? "NPC 근처: 문제를 볼 수 있어요."
            : "NPC에게 가까이 가면 문제가 보여요.";
        }
      };
      const mo = new MutationObserver(fixQuest);
      if (questEl) {
        mo.observe(questEl, {
          childList: true,
          characterData: true,
          subtree: true,
        });
      }
      fixQuest();
    } catch {}
  }

  function drawTiles() {
    const layer = $("#tiles");
    if (!layer) return;
    layer.innerHTML = "";
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const cls =
          ["floor", "wall", "gate", "box-blue", "box-gray", "box-green"][
            map[y][x]
          ] || "floor";
        const t = document.createElement("div");
        t.className = "tile " + cls;
        t.style.left = `${x * tileSize}px`;
        t.style.top = `${y * tileSize}px`;
        layer.appendChild(t);
      }
  }
  function placePlayer() {
    if (playerEl) {
      playerEl.style.left = `${world.player.x * tileSize}px`;
      playerEl.style.top = `${world.player.y * tileSize}px`;
    }
  }

  function applyBoxEffect(color) {
    const lootLog = document.querySelector("#loot-log");
    if (color === "green") {
      awardGrammarXP(3);
      showToast("🟢 작은 XP 보석 +3 XP");
      lootLog && (lootLog.textContent = "획득: 작은 XP 보석 (+3 XP)");
    }
    if (color === "blue") {
      awardGrammarXP(5);
      showToast("🔵 +5 XP, 문이 열렸습니다");
      lootLog && (lootLog.textContent = "획득: 푸른 보석 (+5 XP), 게이트 개방");
      world.gateOpened = true;
      try {
        awardBadge("gate-open", "게이트 개방", "🗝️");
      } catch {}
      // 게이트 타일을 바닥으로 변경하여 시각적으로 개방
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          if (map[y][x] === TILE.GATE) {
            map[y][x] = TILE.FLOOR;
          }
        }
      }
      drawTiles();
    }
    if (color === "gray") {
      showToast("⚪ 함정! 시작 지점으로 이동");
      lootLog && (lootLog.textContent = "함정 발동: 시작 지점으로 이동");
      world.player = { x: 1, y: 1 };
      placePlayer();
    }
  }
  function tryOpenBoxAt(x, y) {
    const tile = map[y][x];
    if (![TILE.BOX_GREEN, TILE.BOX_BLUE, TILE.BOX_GRAY].includes(tile))
      return false;
    if (world.keys <= 0) {
      showToast("열쇠 필요");
      return true;
    }
    world.keys--;
    updateKeyBadge(-1);
    map[y][x] = TILE.FLOOR;
    drawTiles();
    const color =
      tile === TILE.BOX_GREEN
        ? "green"
        : tile === TILE.BOX_BLUE
        ? "blue"
        : "gray";
    applyBoxEffect(color);
    if (world.awaitingBoxOpen) {
      world.awaitingBoxOpen = false;
      world.__awaitPopupShown = false;
      world.readyForNextQuestion = true;
      const next = questions[qIdx + 1];
      // Show hint in popup (rulebook)
      try {
        if (next && color !== "gray") {
          const hintsMap = {
            2: "3인칭 단수 주어에는 has를 사용해요.",
            3: "의문문은 Do/Does + 주어 + have ... ?",
            4: "부정문은 don't/doesn't have ... 형태예요.",
            5: "식사 표현에도 have를 써요: have breakfast.",
          };
          const hintText =
            hintsMap[next.id] || "다음 문제의 have/has 쓰임에 주의하세요!";
          showRulebookTyping("힌트: " + hintText);
        }
      } catch {}
      const hints = {
        2: "주어가 그녀(3인칭 단수). 동사에 -s 붙이기.",
        3: "주어가 그들(복수). 동사는 원형, 목적어는 English.",
      };
      const lootLog = document.querySelector("#loot-log");
      if (color !== "gray" && next) {
        const hint =
          hints[next.id] || "다음 문제의 주어/동사 형태를 주의하세요.";
        lootLog && (lootLog.textContent = `힌트: ${hint}`);
        showToast("힌트를 얻었어요! NPC에게 가 보세요");
      } else if (color === "gray") {
        lootLog &&
          (lootLog.textContent =
            "페널티 발생! 그래도 NPC에게 가면 다음 문제를 줍니다.");
      }
    }
    return true;
  }
  function move(dx, dy) {
    const nx = world.player.x + dx,
      ny = world.player.y + dy;
    if (nx < 0 || ny < 0 || nx >= W || ny >= H) return;
    if (
      map[ny][nx] === TILE.WALL ||
      (map[ny][nx] === TILE.GATE && !world.gateOpened)
    )
      return;
    world.player.x = nx;
    world.player.y = ny;
    placePlayer();
    tryOpenBoxAt(nx, ny);
    updateProximity();
  }

  // ===== 퀴즈 =====
  const questions = [
    {
      id: 1,
      ko: "나는 사과 두 개를 가지고 있다.",
      options: [
        "I have two apples.",
        "I has two apples.",
        "I am have two apples.",
        "I have got two apple.",
      ],
      correct: 0,
      xp: 6,
    },
    {
      id: 2,
      ko: "그녀는 차를 가지고 있다.",
      options: [
        "She have a car.",
        "She has a car.",
        "Does she has a car?",
        "She is have a car.",
      ],
      correct: 1,
      xp: 7,
    },
    {
      id: 3,
      ko: "우리는 숙제를 가지고 있지 않다.",
      options: [
        "We don't have homework.",
        "We doesn't have homework.",
        "We haven't homework.",
        "Do we has homework?",
      ],
      correct: 0,
      xp: 7,
    },
    {
      id: 4,
      ko: "그는 형제가 있니?",
      options: [
        "Do he have a brother?",
        "Does he have a brother?",
        "Does he has a brother?",
        "Is he have a brother?",
      ],
      correct: 1,
      xp: 8,
    },
    {
      id: 5,
      ko: "그들은 아침 식사를 한다.",
      options: [
        "They have breakfast.",
        "They has breakfast.",
        "Do they has breakfast?",
        "They are have breakfast.",
      ],
      correct: 0,
      xp: 8,
    },
  ];
  let qIdx = 0;

  function renderQuestion() {
    const q = questions[qIdx];
    const txt = $("#question-text");
    const box = $("#choices");
    if (!txt || !box) return;
    box.innerHTML = "";
    if (!q) {
      world.isGameOverPrompt = true;
      setQuestionVisible(true);
      txt.textContent = "Game Over! 다시 해볼까요? (Y/N)";
      return;
    }
    txt.textContent = `Q${q.id}. ${q.ko}`;
    const labels = ["A", "B", "C", "D"];
    (q.options || []).forEach((opt, idx) => {
      const btn = document.createElement("button");
      btn.className = "choice-btn";
      btn.type = "button";
      btn.textContent = `${labels[idx]}. ${opt}`;
      btn.addEventListener("click", () => onChoiceMC(idx));
      box.appendChild(btn);
    });
  }
  // New MC handler with chest-limit + popup dialogue
  function onChoiceMC(choiceIdx) {
    const q = questions[qIdx];
    if (!q) return;
    if (world.isGameOverPrompt) {
      showToast("Y/N을 선택하세요");
      return;
    }
    if (!isNearNPC()) {
      showToast("NPC에게 가까이 가서 답하세요");
      return;
    }
    if (world.awaitingBoxOpen) {
      showToast("상자를 먼저 열어보세요");
      return;
    }
    if (choiceIdx === q.correct) {
      try {
        playSFX("correct");
      } catch {}
      const lootLog = document.querySelector("#loot-log");
      // Streak & badges
      world.streak = (world.streak || 0) + 1;
      if (qIdx === 0) {
        awardBadge("first-solve", "처음 정답!", "🏅");
      }
      if (world.streak === 2) {
        awardBadge("streak-2", "2연속 정답", "🔥");
      }
      if (world.streak === 3) {
        awardBadge("streak-3", "3연속 정답", "⚡");
      }

      if (q.id <= 3) {
        // First 3: key + require chest
        awardGrammarXP(q.xp);
        world.keys++;
        updateKeyBadge(+1);
        world.awaitingBoxOpen = true;
        lootLog &&
          (lootLog.textContent = `획득: 열쇠 +1 (보유: ${world.keys})`);
        try {
          showRulebookTyping(
            "정답입니다! 열쇠를 획득했습니다.\n보물 상자를 열어보세요."
          );
        } catch {}
        world.__awaitPopupShown = true;
      } else {
        // Last 2: alternative rewards (no chest)
        const bonus = q.id === 4 ? 5 : 7;
        awardGrammarXP(q.xp + bonus);
        lootLog &&
          (lootLog.textContent = `보상: 보너스 XP +${bonus} (총 +${
            q.xp + bonus
          } XP)`);
        try {
          showRulebookTyping(
            `정답입니다! 보너스 XP +${bonus}를 획득했습니다.\n다음 문제로 진행하세요 (NPC에게 접근).`
          );
        } catch {}
        world.readyForNextQuestion = true;
      }
    } else {
      try {
        playSFX("wrong");
      } catch {}
      showToast("오답");
      world.streak = 0;
    }
  }
  function onChoice(choiceIdx) {
    const q = questions[qIdx];
    if (!q) return;
    if (world.isGameOverPrompt) {
      showToast("Y/N을 선택하세요");
      return;
    }
    if (!isNearNPC()) {
      showToast("NPC에게 가까이 가서 답하세요");
      return;
    }
    if (world.awaitingBoxOpen) {
      showToast("상자를 먼저 열어보세요");
      return;
    }
    if (choiceIdx === q.correct) {
      try {
        playSFX("correct");
      } catch {}
      awardGrammarXP(q.xp);
      world.keys++;
      updateKeyBadge(+1);
      world.awaitingBoxOpen = true;
      showToast("정답! 열쇠를 얻었어요");
      const lootLog = document.querySelector("#loot-log");
      lootLog && (lootLog.textContent = `획득: 열쇠 +1 (보유: ${world.keys})`);
      // Streak & badges
      world.streak = (world.streak || 0) + 1;
      if (qIdx === 0) {
        awardBadge("first-solve", "처음 정답!", "🏅");
      }
      if (world.streak === 2) {
        awardBadge("streak-2", "2연속 정답", "🔥");
      }
      if (world.streak === 3) {
        awardBadge("streak-3", "3연속 정답", "⚡");
      }
    } else {
      try {
        playSFX("wrong");
      } catch {}
      showToast("오답");
      world.streak = 0;
    }
  }

  // ===== 인트로 대화 (Y/N) =====
  function showIntro() {
    const lines = [
      "NPC: 오늘은 'have'의 쓰임을 배워보자!",
      "I/you/we/they는 have, he/she/it은 has.",
      "과거형은 인칭에 관계없이 had를 써야해.",
      "부정: don't/doesn't have. 의문: Do/Does + 주어 + have ...?",
      "일상 표현: have breakfast, have a meeting",
      "모험을 떠나시겠습니까? (Y/N)",
    ];
    setDialogueVisible(true);
    setQuestionVisible(false);
    setDialogueText(lines.join("\n"));
    const quest = document.querySelector("#quest-text");
    quest && (quest.textContent = "NPC의 설명을 듣고 Y/N을 선택하세요.");
    world.introActive = true;
    world.introPrompt = true;
  }
  function onSubmit() {
    const q = questions[qIdx];
    if (!q) return;
    const input = $("#q-input");
    const val = input?.value.trim();
    if (world.isGameOverPrompt) {
      showToast("Y/N로 선택하세요");
      return;
    }
    if (!isNearNPC()) {
      showToast("NPC에게 다가가서 제출하세요");
      input && input.focus();
      return;
    }
    if (world.awaitingBoxOpen) {
      showToast("상자를 먼저 열어보세요");
      return;
    }
    if (val && val.toLowerCase() === q.answer.toLowerCase()) {
      awardGrammarXP(q.xp);
      world.keys++;
      updateKeyBadge(+1);
      world.awaitingBoxOpen = true;
      showToast("정답! 열쇠를 얻었습니다");
      const lootLog = document.querySelector("#loot-log");
      lootLog && (lootLog.textContent = `획득: 열쇠 +1 (보유: ${world.keys})`);
      // Streak & badges
      world.streak = (world.streak || 0) + 1;
      if (qIdx === 0) {
        awardBadge("first-solve", "처음 정답!", "🎉");
      }
      if (world.streak === 2) {
        awardBadge("streak-2", "2연속 정답", "🔥");
      }
      if (world.streak === 3) {
        awardBadge("streak-3", "3연속 정답", "⚡");
      }
      if (input) {
        input.value = "";
        input.focus();
      }
    } else {
      showToast("오답");
      world.streak = 0;
      if (input) {
        input.select();
        input.focus();
      }
    }
  }

  // ===== 초기화 =====
  // Override: Intro using Rule Book popup with typing
  function showIntro() {
    const text = [
      "NPC: 오늘은 'have'의 쓰임을 정리해볼게!",
      "- I/you/we/they → have",
      "- he/she/it (3인칭 단수) → has",
      "- 부정문: don't/doesn't have",
      "- 의문문: Do/Does + 주어 + have ...?",
      "- 표현: have breakfast, have a meeting",
      "",
      "모험을 떠나시겠습니까? (Y/N)",
    ].join("\n");
    setQuestionVisible(false);
    showRulebookTyping(text);
    const quest = document.querySelector("#quest-text");
    quest && (quest.textContent = "Rule Book을 읽고 Y/N을 선택하세요.");
    world.introActive = true;
    world.introPrompt = true;
  }
  document.addEventListener("DOMContentLoaded", () => {
    // Player
    playerEl = document.createElement("div");
    playerEl.className = "player";
    const pFace = document.createElement("div");
    pFace.className = "face";
    pFace.innerHTML =
      '<span class="eye left"></span><span class="eye right"></span><span class="mouth"></span>';
    playerEl.appendChild(pFace);
    $("#entities").appendChild(playerEl);
    // NPC
    npcEl = document.createElement("div");
    npcEl.className = "npc";
    npcEl.style.left = `${NPC_POS.x * tileSize}px`;
    npcEl.style.top = `${NPC_POS.y * tileSize}px`;
    const nFace = document.createElement("div");
    nFace.className = "face smile";
    nFace.innerHTML =
      '<span class="eye left"></span><span class="eye right wink"></span><span class="mouth"></span>';
    npcEl.appendChild(nFace);
    $("#entities").appendChild(npcEl);
    npcLabel = document.createElement("div");
    npcLabel.className = "label up";
    npcLabel.textContent = "NPC";
    npcEl.appendChild(npcLabel);

    drawTiles();
    placePlayer();
    renderQuestion();
    renderHUD();
    showIntro();
    // 초기에 문제는 NPC 근처에서만 보이도록
    setQuestionVisible(false);
    updateKeyBadge();

    $("#btn-review")?.addEventListener("click", resetGame);

    // Mobile: auto-start on very small screens (rulebook hidden at <=500px)
    try {
      const small = window.matchMedia("(max-width: 500px)").matches;
      if (small) {
        hideRulebook();
        world.introActive = false;
        world.introPrompt = false;
        setDialogueVisible(false);
        setQuestionVisible(false);
      }
    } catch {}

    // Mobile D-Pad bindings (tap to move)
    const bindBtn = (id, fn) => {
      const el = document.getElementById(id);
      if (!el) return;
      const fire = (e) => {
        e.preventDefault();
        if (!world.introActive) fn();
      };
      el.addEventListener("click", fire, { passive: false });
      el.addEventListener("touchstart", fire, { passive: false });
    };
    bindBtn("mc-up", () => move(0, -1));
    bindBtn("mc-down", () => move(0, 1));
    bindBtn("mc-left", () => move(-1, 0));
    bindBtn("mc-right", () => move(1, 0));
    // Rulebook close (disabled during intro)
    document.querySelector("#rb-close")?.addEventListener("click", () => {
      if (world.introActive) {
        showToast("Y 또는 N으로 선택하세요");
        return;
      }
      hideRulebook();
    });
    // Force-close rulebook even during intro (X button or backdrop)
    const __rbOverlay = document.querySelector("#rulebook-overlay");
    document.querySelector("#rb-close")?.addEventListener("click", () => {
      hideRulebook();
      if (world.introActive) {
        world.introActive = false;
        world.introPrompt = false;
        setDialogueVisible(false);
        setQuestionVisible(false);
        const quest = document.querySelector("#quest-text");
        quest &&
          (quest.textContent =
            "NPC에게 다가가 문제를 풀고 열쇠로 상자를 여세요.");
      }
    });
    __rbOverlay?.addEventListener("click", (e) => {
      if (e.target === __rbOverlay) {
        hideRulebook();
        if (world.introActive) {
          world.introActive = false;
          world.introPrompt = false;
          setDialogueVisible(false);
          setQuestionVisible(false);
          const quest = document.querySelector("#quest-text");
          quest &&
            (quest.textContent =
              "NPC에게 다가가 문제를 풀고 열쇠로 상자를 여세요.");
        }
      }
    });
    // Enter 키로 제출

    // 이동 키 처리 + 스크롤 방지
    window.addEventListener("keydown", (e) => {
      // Handle Game Over prompt Y/N
      if (world.isGameOverPrompt) {
        if (e.key === "y" || e.key === "Y") {
          world.isGameOverPrompt = false;
          resetGame();
          e.preventDefault();
          return;
        }
        if (e.key === "n" || e.key === "N") {
          world.isGameOverPrompt = false;
          setQuestionVisible(false);
          showToast("다음에 다시 도전!");
          e.preventDefault();
          return;
        }
      }
      // Intro Y/N
      if (world.introActive && world.introPrompt) {
        if (e.key === "y" || e.key === "Y") {
          try {
            hideRulebook();
          } catch {}
          world.introActive = false;
          world.introPrompt = false;
          setDialogueVisible(false);
          setQuestionVisible(false);
          const quest = document.querySelector("#quest-text");
          quest &&
            (quest.textContent =
              "NPC에게 다가가 문제를 풀고 열쇠로 상자를 여세요.");
          e.preventDefault();
          return;
        }
        if (e.key === "n" || e.key === "N") {
          showIntro();
          e.preventDefault();
          return;
        }
      }
      // Close popup quickly with N or X when not in intro
      const ov = document.querySelector("#rulebook-overlay");
      if (ov && !ov.classList.contains("hidden") && !world.introActive) {
        if (e.key === "n" || e.key === "N" || e.key === "x" || e.key === "X") {
          hideRulebook();
          e.preventDefault();
        }
      }
      const active = document.activeElement;
      const typing =
        active &&
        (active.tagName === "INPUT" ||
          active.tagName === "TEXTAREA" ||
          active.isContentEditable);
      if (typing) return; // 입력 중에는 이동 금지
      if (world.introActive) return; // 인트로 중 이동 금지
      if (["ArrowLeft", "a", "A"].includes(e.key)) {
        move(-1, 0);
        e.preventDefault();
      } else if (["ArrowRight", "d", "D"].includes(e.key)) {
        move(1, 0);
        e.preventDefault();
      } else if (["ArrowUp", "w", "W"].includes(e.key)) {
        move(0, -1);
        e.preventDefault();
      } else if (["ArrowDown", "s", "S"].includes(e.key)) {
        move(0, 1);
        e.preventDefault();
      }
    });
    // Ensure rulebook closes on Y during intro
    window.addEventListener("keydown", (e) => {
      if (
        world.introActive &&
        world.introPrompt &&
        (e.key === "y" || e.key === "Y")
      ) {
        hideRulebook();
      }
    });
    updateProximity();

    // ===== Responsive scale for mobile =====
    function resizeGame() {
      const gw = document.querySelector("#game-world");
      const cp = document.querySelector("#center-panel");
      if (!gw || !cp) return;
      const baseW = 512,
        baseH = 288;
      const pad = 24; // side padding margin
      const availW =
        Math.max(280, Math.min(window.innerWidth, cp.clientWidth || baseW)) -
        pad;
      const availH = Math.max(220, window.innerHeight - 200); // rough header/controls allowance
      const scale = Math.min(1, availW / baseW, availH / baseH);
      // Center the scale anchor so the board doesn't shift left
      gw.style.transformOrigin = "top center";
      gw.style.transform = `scale(${scale})`;
      // Ensure the board is horizontally centered in its cell
      gw.style.marginLeft = "auto";
      gw.style.marginRight = "auto";
      // Reserve space so layout wraps scaled height
      cp.style.minHeight = Math.max(420, Math.ceil(baseH * scale) + 20) + "px";
    }
    try {
      resizeGame();
      window.addEventListener("resize", resizeGame);
      window.addEventListener("orientationchange", resizeGame);
      setTimeout(resizeGame, 0);
      setTimeout(resizeGame, 250);
    } catch {}
  });
})();
