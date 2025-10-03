// ./js/dataManager.js
'use strict';

(function initDataManager (global) {
  const STORAGE_KEY = 'linguaVerseUserData';

  // ========= 구독자(옵저버) 시스템 =========
  const _subscribers = new Set();
  function notify(reason, payload) {
    _subscribers.forEach(fn => {
      try { fn(reason, payload); } catch (_) { /* no-op */ }
    });
  }

  // ========= 기본 상태 =========
  function getDefaultState() {
    return {
      player: {
        name: 'Hero',
        level: 1,
        xp: 0,
        xpToNextLevel: 10,
        achievements: []         // 뱃지 키 배열 (호환용)
      },
      badges: {},                // 키 → {title, earnedAt} 맵 (reading.js에서 사용)
      grammarQuest: {
        xp: 0,
        stage: 'start'
      },
      readingProgress: {
        xp: 0,
        lives: 3,
        correctAnswersCount: 0,
        streak: 0
      },
      bingoProgress: {
        xp: 0,
        missions: []             // [{id,title,progress}, ...]
      }
    };
  }

  // ========= 내부 상태 로드/세이브 =========
  let _state = load();

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return getDefaultState();
      const parsed = JSON.parse(raw);
      return deepMerge(getDefaultState(), parsed);
    } catch (e) {
      console.warn('[DataManager] load failed, use default:', e);
      return getDefaultState();
    }
  }

  function save(state = _state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('[DataManager] save failed:', e);
    }
  }

  // 얕은 병합 + 객체 재귀 머지
  function deepMerge(base, extra) {
    if (Array.isArray(base)) return Array.isArray(extra) ? extra.slice() : base.slice();
    if (typeof base === 'object' && base !== null) {
      const out = { ...base };
      if (typeof extra === 'object' && extra !== null) {
        for (const k of Object.keys(extra)) {
          if (k in base) out[k] = deepMerge(base[k], extra[k]);
          else out[k] = extra[k];
        }
      }
      return out;
    }
    return (typeof extra !== 'undefined') ? extra : base;
  }

  // ========= 대시보드용 브로드캐스트 =========
  function dispatchChanged(type, detail = {}) {
    try {
      const evt = new CustomEvent('lv:stateChanged', { detail: { type, ...detail, state: _state } });
      window.dispatchEvent(evt);
    } catch (_) { /* no-op */ }
  }

  // ========= 공개 API =========
  const DataManager = {
    // 상태 접근
    getState() { return _state; },
    setState(next) {
      _state = deepMerge(_state, next);
      save(_state);
      dispatchChanged('setState');
      return _state;
    },
    reset() {
      _state = getDefaultState();
      save(_state);
      dispatchChanged('reset');
      notify('reset', {});
    },

    // 구독/해지
    subscribe(fn) {
      if (typeof fn === 'function') _subscribers.add(fn);
      return () => _subscribers.delete(fn);
    },
    unsubscribe(fn) { _subscribers.delete(fn); },

    // 뱃지(배지) 지급
    addBadge(key, title = key) {
      if (!key) return;
      const now = Date.now();
      if (!_state.badges) _state.badges = {};
      if (!_state.badges[key]) {
        _state.badges[key] = { title, earnedAt: now };
        // 호환: achievements 배열에도 키를 보관
        const arr = _state.player.achievements || [];
        if (!arr.includes(key)) arr.push(key);
        _state.player.achievements = arr;

        save(_state);
        dispatchChanged('achievement', { name: key });
        notify('badge-earned', { key, badge: { key, title, earnedAt: now } });
      }
    },

    // 옛 호환 API: addAchievement(name)
    addAchievement(name) { this.addBadge(name, name); },

    /**
     * 공통 XP 지급 (모듈 + 플레이어 동시 반영)
     * @param {'reading'|'grammar'|'bingo'} module
     * @param {number} amount
     */
    addXP(module, amount) {
      const n = Math.max(0, Number(amount) || 0);
      if (n === 0) return _state;

      const prevLevel = _state.player.level || 1;

      // DEBUG 로그 (원하면 주석 해제)
      // console.log(`[XP] module=${module}, +${n}`, JSON.parse(JSON.stringify(_state)));

      // 1) 플레이어 총 XP
      _state.player.xp = (_state.player.xp || 0) + n;

      // 2) 모듈별 XP
      if (module === 'reading')  _state.readingProgress.xp = (_state.readingProgress.xp || 0) + n;
      if (module === 'grammar')  _state.grammarQuest.xp    = (_state.grammarQuest.xp    || 0) + n;
      if (module === 'bingo')    _state.bingoProgress.xp   = (_state.bingoProgress.xp   || 0) + n;

      // 3) 레벨업 처리
      while (_state.player.xp >= _state.player.xpToNextLevel) {
        _state.player.xp -= _state.player.xpToNextLevel;
        _state.player.level = (_state.player.level || 1) + 1;
        _state.player.xpToNextLevel = Math.round(_state.player.xpToNextLevel * 1.2);
      }
      const levelUps = (_state.player.level || 1) - prevLevel;

      // 4) 저장 & 브로드캐스트
      save(_state);
      dispatchChanged('xp', { module, amount: n, levelUps });         // 대시보드용
      notify('xp-change', { module, amount: n, levelUps });           // reading.js 등 구독자용
      return _state;
    },

    // ======= Reading 전용 헬퍼들 (reading.js가 호출) =======
    readingSetStreak(count) {
      _state.readingProgress.streak = Math.max(0, Number(count) || 0);
      save(_state);
      dispatchChanged('reading-streak', { streak: _state.readingProgress.streak });
      notify('reading-streak', { streak: _state.readingProgress.streak });
    },
    readingAddCorrect() {
      _state.readingProgress.correctAnswersCount =
        (_state.readingProgress.correctAnswersCount || 0) + 1;
      save(_state);
      dispatchChanged('reading-correct', { count: _state.readingProgress.correctAnswersCount });
      notify('reading-correct', { count: _state.readingProgress.correctAnswersCount });
    },
    readingLoseLife() {
      _state.readingProgress.lives = Math.max(0, (_state.readingProgress.lives || 0) - 1);
      save(_state);
      dispatchChanged('reading-life', { lives: _state.readingProgress.lives });
      notify('reading-life', { lives: _state.readingProgress.lives });
    },
    resetReadingSession() {
      _state.readingProgress = {
        xp: _state.readingProgress?.xp || 0,  // XP는 유지
        lives: 3,
        correctAnswersCount: 0,
        streak: 0
      };
      save(_state);
      dispatchChanged('reading-reset', {});
      notify('reading-reset', {});
    }
  };

  // 전역 공개
  global.DataManager = DataManager;

})(window);
