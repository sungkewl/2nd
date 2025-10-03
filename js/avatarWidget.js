'use strict';

// Lightweight avatar widget for pages that include #avatar-figure
// Depends on window.DataManager (provided by js/dataManager.js)

(function initAvatarWidget(){
  if (typeof window === 'undefined') return;

  // DOM helpers
  function $(sel){ return document.querySelector(sel); }

  // Sprite sheets
  const AVATAR_SPRITE_IDLE = { url: './images/reading_avatar_sprites.png', fw: 32, fh: 32, scale: 2, cols: 3, rows: 4 };
  const AVATAR_SPRITE_RUN  = { url: './images/reading_avatar_run_sprites.png', fw: 32, fh: 32, scale: 2, cols: 4, rows: 4 };

  let sheet = AVATAR_SPRITE_IDLE;
  let col = 0;
  let timer;
  let runKickTimer;

  function getRowByLevel(lv){
    if (lv >= 10) return 3; // Voyager
    if (lv >= 7)  return 2; // Ranger
    if (lv >= 4)  return 1; // Explorer
    return 0;               // Novice
  }

  function setFrame(row, c){
    const el = $('#avatar-figure');
    if (!el) return;
    const sw = sheet.fw * sheet.scale; // 64
    const sh = sheet.fh * sheet.scale; // 64
    el.style.backgroundImage = `url(${sheet.url})`;
    el.style.backgroundSize = `${sheet.cols*sw}px ${sheet.rows*sh}px`;
    el.style.backgroundPosition = `-${c*sw}px -${row*sh}px`;
  }

  function renderAvatar(){
    const fig  = $('#avatar-figure');
    if (!fig) return;
    const s = window.DataManager?.getState?.() || { player:{ level:1 } };
    const lv = s.player?.level || 1;
    const row = getRowByLevel(lv);
    fig.classList.remove('costume-1','costume-2','costume-3','costume-4');
    fig.classList.add(row===0?'costume-1':row===1?'costume-2':row===2?'costume-3':'costume-4');
    setFrame(row, col);

    const ttl  = $('#avatar-title');
    const desc = $('#avatar-desc');
    if (ttl)  ttl.textContent  = (row===3?'Sky Voyager':row===2?'Word Ranger':row===1?'Story Explorer':'Novice Reader') + ` (Lv.${lv})`;
    if (desc) desc.textContent = (row===3?'하늘을 누비는 독해 고수':row===2?'어휘의 정복자':row===1?'이야기 탐험가':'기본 복장');
  }

  function startAnim(intervalMs){
    clearInterval(timer);
    timer = setInterval(()=>{
      col = (col + 1) % sheet.cols;
      const s = window.DataManager?.getState?.();
      const row = getRowByLevel(s?.player?.level || 1);
      setFrame(row, col);
    }, Math.max(60, intervalMs|0 || 250));
  }

  function useSheet(next, fps){
    sheet = next;
    startAnim(1000 / (fps || 4));
    renderAvatar();
  }

  function kickRun(ms){
    clearTimeout(runKickTimer);
    useSheet(AVATAR_SPRITE_RUN, 8);
    runKickTimer = setTimeout(()=> useSheet(AVATAR_SPRITE_IDLE, 4), Math.max(200, ms||900));
  }

  function initIfPresent(){
    if (!$('#avatar-figure')) return; // not on this page
    // Initial render + idle
    useSheet(AVATAR_SPRITE_IDLE, 4);
    renderAvatar();

    // React to XP changes to briefly run
    try{
      window.DataManager?.subscribe?.((reason)=>{
        if (reason === 'xp-change') kickRun();
        renderAvatar();
      });
      window.addEventListener('lv:stateChanged', renderAvatar);
      window.addEventListener('storage', (e)=>{ if(e.key==='linguaVerseUserData') renderAvatar(); });
    }catch{}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIfPresent, { once:true });
  } else {
    initIfPresent();
  }
})();

