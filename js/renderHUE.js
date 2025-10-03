/* renderHUE.js
 * HUD(레벨/XP 바 + 토스트 + 뱃지 팝업) 자동 생성/갱신
 * DataManager를 구독하여 상태 변화에 맞춰 애니메이션
 */

(function (global) {
  const $ = (sel, root = document) => root.querySelector(sel);
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const pct = (x, need) => (need ? clamp((x / need) * 100, 0, 100) : 0);
  const reflow = (el) => void el.offsetWidth;
  const waitWidthTransition = (el) =>
    new Promise((res) => {
      const h = (e) => {
        if (e.propertyName === 'width') {
          el.removeEventListener('transitionend', h);
          res();
        }
      };
      el.addEventListener('transitionend', h);
    });

  // 스타일 1회 주입
  function injectStyleOnce() {
    if ($('#hud-style')) return;
    const css = document.createElement('style');
    css.id = 'hud-style';
    css.textContent = `
      :root{--hud-bg:rgba(0,0,0,.55);--hud-text:#fff;--bar-bg:#2a2f3a;--bar-fill:#6fd36f;--accent:#ffd166}
      #hud{position:fixed;left:16px;top:16px;width:320px;background:var(--hud-bg);color:var(--hud-text);
           padding:12px 14px;border-radius:12px;backdrop-filter:blur(6px);z-index:9999}
      .level-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-weight:600}
      .xp-bar{position:relative;width:100%;height:14px;background:var(--bar-bg);border-radius:8px;overflow:hidden;
              box-shadow:inset 0 0 0 1px rgba(255,255,255,.06)}
      .xp-fill{height:100%;width:0%;background:var(--bar-fill);transition:width .5s ease}
      #toast{position:fixed;left:50%;top:18%;transform:translateX(-50%) translateY(-12px);
             background:rgba(0,0,0,.8);color:#fff;padding:10px 14px;border-radius:10px;font-weight:700;opacity:0;pointer-events:none}
      #toast.show{animation:toast-pop 1000ms ease both}
      @keyframes toast-pop{
        0%{opacity:0;transform:translate(-50%,-8px) scale(.96)}
        15%{opacity:1;transform:translate(-50%,0) scale(1)}
        80%{opacity:1}
        100%{opacity:0}
      }
      #badge-pop{position:fixed;right:16px;top:16px;background:rgba(0,0,0,.75);color:#fff;
                 padding:10px 12px;border-radius:12px;opacity:0;pointer-events:none}
      #badge-pop.show{animation:badge-pop 1400ms ease both}
      @keyframes badge-pop{
        0%{opacity:0; transform:translateY(-8px)}
        20%{opacity:1; transform:translateY(0)}
        80%{opacity:1}
        100%{opacity:0}
      }
    `;
    document.head.appendChild(css);
  }

  // DOM 자동 생성
  function ensureHudDom() {
    if ($('#hud')) return;
    const wrap = document.createElement('div');
    wrap.id = 'hud';
    wrap.innerHTML = `
      <div class="level-row">
        <span class="level-label">Lv. <span id="player-level">1</span></span>
        <span id="xp-text">0 / 10 XP</span>
      </div>
      <div class="xp-bar"><div class="xp-fill" id="xp-fill"></div></div>
    `;
    document.body.appendChild(wrap);

    if (!$('#toast')) {
      const t = document.createElement('div');
      t.id = 'toast';
      document.body.appendChild(t);
    }
    if (!$('#badge-pop')) {
      const b = document.createElement('div');
      b.id = 'badge-pop';
      b.textContent = 'Badge!';
      document.body.appendChild(b);
    }
  }

  let els = {};
  let animateLock = Promise.resolve();

  function setTexts(snap) {
    els.level.textContent = snap.player.level;
    els.xpText.textContent = `${snap.player.xp} / ${snap.player.xpToNextLevel} XP`;
  }
  function syncBarInstant(snap) {
    els.xpFill.style.transition = 'none';
    els.xpFill.style.width = pct(snap.player.xp, snap.player.xpToNextLevel) + '%';
    reflow(els.xpFill);
    els.xpFill.style.transition = 'width .5s ease';
  }
  function showToast(msg) {
    els.toast.textContent = msg;
    els.toast.classList.remove('show');
    reflow(els.toast);
    els.toast.classList.add('show');
  }
  function showBadgePop(badge) {
    els.badge.textContent = `🏅 ${badge.title || 'Badge Unlocked'}`;
    els.badge.classList.remove('show');
    reflow(els.badge);
    els.badge.classList.add('show');
  }

  async function animateXP(before, after, levelUps) {
    // 시작 동기화
    setTexts(before);
    syncBarInstant(before);

    if (levelUps === 0) {
      els.xpFill.style.width = pct(after.player.xp, after.player.xpToNextLevel) + '%';
      setTexts(after);
      await waitWidthTransition(els.xpFill);
      return;
    }

    // 첫 레벨을 100%까지 채움
    els.xpFill.style.width = '100%';
    await waitWidthTransition(els.xpFill);

    // 중간 레벨업들
    for (let i = 1; i <= levelUps; i++) {
      const currentLevel = before.player.level + i;
      const isLast = i === levelUps;

      showToast(`LEVEL UP!  Lv.${currentLevel}`);

      // 0%로 리셋
      els.xpFill.style.transition = 'none';
      els.xpFill.style.width = '0%';
      reflow(els.xpFill);
      els.xpFill.style.transition = 'width .5s ease';

      if (isLast) {
        setTexts(after);
        els.xpFill.style.width =
          pct(after.player.xp, after.player.xpToNextLevel) + '%';
        await waitWidthTransition(els.xpFill);
      } else {
        // 중간 레벨은 풀채움
        // 표시는 Lv.N / 0 / need 정도로만 간단 표시
        els.level.textContent = currentLevel;
        els.xpText.textContent = `0 / ${requiredXPFor(currentLevel)} XP`;
        els.xpFill.style.width = '100%';
        await waitWidthTransition(els.xpFill);
      }
    }
  }

  const RenderHUE = {
    init() {
      injectStyleOnce();
      ensureHudDom();
      els = {
        level: $('#player-level'),
        xpText: $('#xp-text'),
        xpFill: $('#xp-fill'),
        toast: $('#toast'),
        badge: $('#badge-pop'),
      };

      // 최초 스냅샷
      const snap = DataManager.getState();
      setTexts(snap);
      syncBarInstant(snap);

      // 데이터 변경 구독
      DataManager.subscribe(async (reason, payload) => {
        if (reason === 'xp-change') {
          const { levelUps, state: after } = payload;
          const before = RenderHUE._lastSnap || DataManager.getState();
          // 직렬화 (애니메이션 경합 방지)
          animateLock = animateLock.then(() => animateXP(before, after, levelUps)).catch(()=>{});
          await animateLock;
          RenderHUE._lastSnap = after;
        }
        if (reason === 'badge-earned') {
          showBadgePop(payload.badge);
        }
        if (reason === 'init' || reason === 'reset') {
          const snap2 = payload.state;
          setTexts(snap2);
          syncBarInstant(snap2);
          RenderHUE._lastSnap = snap2;
        }
      });
    },
  };

  global.RenderHUE = RenderHUE;
})(window);
