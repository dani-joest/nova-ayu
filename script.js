/* ==========================================================
   Happy Birthday, Nova Ayu! - interaksi (Vanilla JS)
   Seluruh logic dibungkus IIFE agar tidak mengotori global scope.
   File ini ASCII saja; ikon dibuat sebagai SVG.
   ========================================================== */
(() => {
  'use strict';

  /* ---------- Utilitas ---------- */
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reduceMotionQuery.matches;
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const rand = (min, max) => min + Math.random() * (max - min);
  const $ = (id) => document.getElementById(id);
  const SVG_NS = 'http://www.w3.org/2000/svg';

  /* Membuat ikon SVG dari sprite yang ada di index.html */
  function makeIcon(symbolId, className) {
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('class', className);
    const use = document.createElementNS(SVG_NS, 'use');
    use.setAttribute('href', `#${symbolId}`);
    svg.appendChild(use);
    return svg;
  }

  /* ---------- Konstanta ---------- */
  const CONFETTI_COLORS = ['#FFB6D1', '#FF9CC2', '#FFD6E7', '#E8DDFB', '#FFFFFF', '#F9D98B'];
  const SYMBOL_COLORS = ['#FF9CC2', '#B3416F', '#FFB6D1', '#F9D98B'];
  const BURST_SYMBOLS = ['i-heart', 'i-heart', 'i-sparkle', 'i-star'];
  const DECO_SYMBOLS = ['i-heart', 'i-heart', 'i-sparkle', 'i-star'];
  const MAX_FX_NODES = 160;

  // Melodi sederhana (C5 E5 G5 E5 F5 G5 A5 G5) dibuat dengan Web Audio, tanpa file audio
  const NOTE_GAP = 0.32;
  const PHRASE = [523.25, 659.25, 783.99, 659.25, 698.46, 783.99, 880.0, 783.99];
  const PHRASE_MS = PHRASE.length * NOTE_GAP * 1000;

  /* ---------- Elemen DOM ---------- */
  const el = {
    deco: $('deco'),
    fx: $('fx'),
    musicBtn: $('musicBtn'),
    musicLabel: $('musicLabel'),
    musicUse: $('musicUse'),
    openBtn: $('openBtn'),
    wishBtn: $('wishBtn'),
    wishStatus: $('wishStatus'),
    toMessageBtn: $('toMessageBtn'),
    messageBody: $('messageBody'),
    toFinalBtn: $('toFinalBtn'),
    giftBtn: $('giftBtn'),
    giftBox: $('giftBox'),
    finalMsg: $('finalMsg'),
    restartBtn: $('restartBtn'),
    cookieBtn: $('cookieBtn'),
    fortuneText: $('fortuneText'),
    fortuneHint: $('fortuneHint'),
    toRiddleBtn: $('toRiddleBtn'),
    riddleBtn: $('riddleBtn'),
    riddleAnswer: $('riddleAnswer'),
    toCouponBtn: $('toCouponBtn'),
    toFinalFromCouponBtn: $('toFinalFromCouponBtn'),
  };

  const screens = {
    opening: $('opening'),
    birthday: $('birthday'),
    message: $('message'),
    fortune: $('fortune'),
    riddle: $('riddle'),
    coupons: $('coupons'),
    final: $('final'),
  };

  const candles = Array.from(document.querySelectorAll('.candle'));
  const coupons = Array.from(document.querySelectorAll('.coupon'));
  const messageParagraphs = Array.from(el.messageBody.querySelectorAll('p'));
  // Teks disimpan sebelum dikosongkan untuk animasi mengetik
  const messageTexts = messageParagraphs.map((p) => p.textContent);

  /* ---------- State ---------- */
  const state = {
    current: 'opening',
    busy: false,
    typingId: 0,
    giftOpened: false,
  };

  /* ==========================================================
     Pindah layar
     ========================================================== */
  function showScreen(name) {
    if (state.busy || name === state.current) return;

    const fromEl = screens[state.current];
    const toEl = screens[name];
    state.busy = true;
    state.current = name;
    fromEl.classList.add('is-leaving');

    setTimeout(() => {
      fromEl.hidden = true;
      fromEl.classList.remove('is-leaving');

      toEl.hidden = false;
      toEl.classList.remove('enter');
      void toEl.offsetWidth; // paksa reflow agar animasi berjalan ulang
      toEl.classList.add('enter');

      state.busy = false;

      const heading = toEl.querySelector('[data-focus]');
      if (heading) heading.focus({ preventScroll: true });
    }, prefersReducedMotion() ? 0 : 380);
  }

  /* ==========================================================
     Kartu pesan: efek mengetik
     ========================================================== */
  function appendMessageIcon(p) {
    const name = p.dataset.icon;
    if (name) p.appendChild(makeIcon(`i-${name}`, 'msg-ico'));
  }

  async function typeMessage() {
    const id = ++state.typingId;
    el.toFinalBtn.hidden = true;

    for (let i = 0; i < messageParagraphs.length; i += 1) {
      const p = messageParagraphs[i];
      const text = messageTexts[i];
      p.textContent = '';

      if (prefersReducedMotion()) {
        p.textContent = text;
      } else {
        p.classList.add('typing');
        for (let c = 1; c <= text.length; c += 1) {
          if (id !== state.typingId) return;
          p.textContent = text.slice(0, c);
          await wait(22);
        }
        p.classList.remove('typing');
        await wait(260);
        if (id !== state.typingId) return;
      }

      appendMessageIcon(p);
    }

    if (id === state.typingId) el.toFinalBtn.hidden = false;
  }

  /* ==========================================================
     Lilin & Make a Wish
     ========================================================== */
  function setCandle(candle, lit) {
    candle.setAttribute('aria-pressed', String(lit));
  }

  function makeWish() {
    candles.forEach((candle, index) => {
      setTimeout(() => setCandle(candle, false), prefersReducedMotion() ? 0 : index * 140);
    });

    el.wishStatus.textContent = 'Semoga semua harapanmu terkabul, Ayu!';
    el.toMessageBtn.hidden = false;
    burst({ count: 70 });
  }

  /* ==========================================================
     Confetti & ikon melayang (Web Animations API)
     ========================================================== */
  function burst({ count, symbols = null, origin = null }) {
    if (prefersReducedMotion()) return;

    const originX = origin ? origin.x : window.innerWidth / 2;
    const originY = origin ? origin.y : window.innerHeight * 0.4;
    const fallDistance = window.innerHeight - originY + 60;

    for (let i = 0; i < count; i += 1) {
      if (el.fx.childElementCount >= MAX_FX_NODES) break;

      let piece;
      if (symbols) {
        const size = rand(16, 26);
        piece = makeIcon(pick(symbols), 'fx-symbol');
        piece.style.width = `${size.toFixed(0)}px`;
        piece.style.height = `${size.toFixed(0)}px`;
        piece.style.fill = pick(SYMBOL_COLORS);
      } else {
        const size = rand(6, 11);
        piece = document.createElement('span');
        piece.className = 'confetti';
        piece.style.width = `${size.toFixed(1)}px`;
        piece.style.height = `${(size * rand(1, 1.8)).toFixed(1)}px`;
        piece.style.background = pick(CONFETTI_COLORS);
        piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '3px';
      }

      piece.style.left = `${originX}px`;
      piece.style.top = `${originY}px`;
      el.fx.appendChild(piece);

      const dx = rand(-0.42, 0.42) * window.innerWidth;
      const lift = rand(0.22, 0.5) * window.innerHeight;
      const rot = rand(-540, 540);

      piece
        .animate(
          [
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${dx * 0.6}px, ${-lift}px) rotate(${rot * 0.5}deg)`, opacity: 1, offset: 0.35 },
            { transform: `translate(${dx}px, ${fallDistance}px) rotate(${rot}deg)`, opacity: 0 },
          ],
          {
            duration: rand(2200, 3400),
            easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
            fill: 'forwards',
          }
        )
        .addEventListener('finish', () => piece.remove());
    }
  }

  /* ==========================================================
     Kotak hadiah
     ========================================================== */
  function openGift() {
    if (state.giftOpened) return;
    state.giftOpened = true;

    el.giftBox.classList.add('is-open');
    el.giftBtn.setAttribute('aria-expanded', 'true');
    el.giftBtn.setAttribute('aria-label', 'Kotak hadiah sudah terbuka');

    el.finalMsg.hidden = false;
    el.finalMsg.classList.add('reveal');

    const rect = el.giftBtn.getBoundingClientRect();
    const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    burst({ count: 30, symbols: BURST_SYMBOLS, origin });
    burst({ count: 50, origin });
  }

  /* ==========================================================
     Reset ke awal
     ========================================================== */
  function resetExperience() {
    state.typingId += 1; // batalkan efek mengetik yang masih berjalan
    state.giftOpened = false;

    candles.forEach((candle) => setCandle(candle, true));
    el.wishStatus.textContent = '';
    el.toMessageBtn.hidden = true;
    el.toFinalBtn.hidden = true;

    messageParagraphs.forEach((p) => {
      p.textContent = '';
      p.classList.remove('typing');
    });

    el.giftBox.classList.remove('is-open');
    el.giftBtn.setAttribute('aria-expanded', 'false');
    el.giftBtn.setAttribute('aria-label', 'Buka kotak hadiah');
    el.finalMsg.hidden = true;
    el.finalMsg.classList.remove('reveal');

    resetChapters();
    showScreen('opening');
  }

  /* ==========================================================
     Musik latar (opsional, tidak autoplay)
     ========================================================== */
  const music = {
    ctx: null,
    master: null,
    timer: null,
    playing: false,
    notes: [],
  };

  function ensureAudio() {
    if (music.ctx) return true;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return false;

    music.ctx = new AudioCtx();
    music.master = music.ctx.createGain();
    music.master.gain.value = 0.4;
    music.master.connect(music.ctx.destination);
    return true;
  }

  function schedulePhrase() {
    const ctx = music.ctx;
    const start = ctx.currentTime + 0.05;

    PHRASE.forEach((freq, i) => {
      const t = start + i * NOTE_GAP;
      const dur = NOTE_GAP * 1.6;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.18, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

      osc.connect(gain);
      gain.connect(music.master);
      osc.start(t);
      osc.stop(t + dur + 0.05);
      music.notes.push({ osc, end: t + dur + 0.05 });
    });

    // Buang referensi node yang sudah selesai agar memori tidak menumpuk
    music.notes = music.notes.filter((note) => note.end > ctx.currentTime);
  }

  function setMusicUI(on) {
    el.musicBtn.setAttribute('aria-pressed', String(on));
    el.musicLabel.textContent = on ? 'Jeda musik' : 'Putar musik';
    el.musicUse.setAttribute('href', on ? '#i-pause' : '#i-play');
  }

  function toggleMusic() {
    if (music.playing) {
      music.playing = false;
      clearInterval(music.timer);
      music.timer = null;
      music.notes.forEach(({ osc }) => {
        try {
          osc.stop();
        } catch (error) {
          // Node sudah berhenti; tidak perlu tindakan
        }
      });
      music.notes = [];
      setMusicUI(false);
      return;
    }

    if (!ensureAudio()) {
      el.musicBtn.disabled = true;
      el.musicLabel.textContent = 'Audio tidak didukung';
      return;
    }

    if (music.ctx.state === 'suspended') {
      music.ctx.resume();
    }

    music.playing = true;
    schedulePhrase();
    music.timer = setInterval(schedulePhrase, PHRASE_MS);
    setMusicUI(true);
  }

  /* ==========================================================
     Dekorasi latar melayang
     ========================================================== */
  function buildDecor() {
    if (!el.deco) return;

    const count = window.innerWidth < 600 ? 12 : 20;
    const colors = ['#FF9CC2', '#FFB6D1', '#FFFFFF', '#E8DDFB', '#F9D98B'];
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
      const item = makeIcon(pick(DECO_SYMBOLS), 'deco-item');
      item.style.setProperty('--x', `${rand(0, 100).toFixed(1)}%`);
      item.style.setProperty('--size', `${rand(12, 24).toFixed(0)}px`);
      item.style.setProperty('--color', pick(colors));
      item.style.setProperty('--dur', `${rand(14, 24).toFixed(1)}s`);
      item.style.setProperty('--delay', `${(-rand(0, 22)).toFixed(1)}s`);
      item.style.setProperty('--rot', `${rand(-160, 160).toFixed(0)}deg`);
      fragment.appendChild(item);
    }

    el.deco.appendChild(fragment);
  }

  /* ==========================================================
     Event listeners (dikelompokkan di satu tempat)
     ========================================================== */
  function bindEvents() {
    el.openBtn.addEventListener('click', () => showScreen('birthday'));

    candles.forEach((candle) => {
      candle.addEventListener('click', () => {
        setCandle(candle, candle.getAttribute('aria-pressed') !== 'true');
      });
    });

    el.wishBtn.addEventListener('click', makeWish);

    el.toMessageBtn.addEventListener('click', () => {
      showScreen('message');
      typeMessage();
    });

    el.toFinalBtn.addEventListener('click', () => showScreen('fortune'));

    el.cookieBtn.addEventListener('click', revealFortune);
    el.toRiddleBtn.addEventListener('click', () => showScreen('riddle'));
    el.riddleBtn.addEventListener('click', revealRiddle);
    el.toCouponBtn.addEventListener('click', () => showScreen('coupons'));
    coupons.forEach((coupon) => {
      coupon.addEventListener('click', () => toggleCoupon(coupon));
    });
    el.toFinalFromCouponBtn.addEventListener('click', () => showScreen('final'));
    el.giftBtn.addEventListener('click', openGift);
    el.restartBtn.addEventListener('click', resetExperience);
    el.musicBtn.addEventListener('click', toggleMusic);
  }

  /* ==========================================================
     Bab tambahan: ramalan, tebak-tebakan, kupon
     ========================================================== */
  const FORTUNES = [
    'Hari ini akan ada hal kecil yang bikin kamu senyum sendiri.',
    'Pesan manis dari orang yang menyayangimu akan datang tak lama lagi.',
    'Tahun ini penuh peluang baik. Ambil yang kamu suka.',
    'Mimpimu sedang menunggu giliran untuk jadi nyata.',
    'Kamu akan menemukan alasan baru untuk tertawa lepas.',
    'Jangan lupa minum air dan istirahat yang cukup, ya.',
    'Bintang-bintang bilang kamu layak mendapat semua hal indah.',
    'Kebahagiaanmu hari ini datang dari hal-hal sederhana.',
  ];

  function revealFortune() {
    el.fortuneText.textContent = pick(FORTUNES);
    el.fortuneText.hidden = false;
    el.fortuneText.classList.remove('reveal');
    void el.fortuneText.offsetWidth; // paksa reflow agar animasi berjalan ulang
    el.fortuneText.classList.add('reveal');
    el.fortuneHint.hidden = true;
    el.toRiddleBtn.hidden = false;
  }

  function revealRiddle() {
    el.riddleAnswer.hidden = false;
    el.riddleBtn.hidden = true;
    el.riddleBtn.setAttribute('aria-expanded', 'true');
    el.toCouponBtn.hidden = false;
  }

  function toggleCoupon(coupon) {
    coupon.setAttribute('aria-pressed', String(coupon.getAttribute('aria-pressed') !== 'true'));
  }

  function resetChapters() {
    el.fortuneText.textContent = '';
    el.fortuneText.hidden = true;
    el.fortuneText.classList.remove('reveal');
    el.fortuneHint.hidden = false;
    el.toRiddleBtn.hidden = true;

    el.riddleAnswer.hidden = true;
    el.riddleBtn.hidden = false;
    el.riddleBtn.setAttribute('aria-expanded', 'false');
    el.toCouponBtn.hidden = true;

    coupons.forEach((coupon) => coupon.setAttribute('aria-pressed', 'false'));
  }

  /* ---------- Inisialisasi ---------- */
  function init() {
    messageParagraphs.forEach((p) => {
      p.textContent = '';
    });
    buildDecor();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
