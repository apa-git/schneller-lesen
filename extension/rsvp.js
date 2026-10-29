/*
 * Schnell-Lesen – RSVP-Lesekern
 * Zeigt Text Wort für Wort an einer festen Stelle. Ein Buchstabe pro Wort
 * (Optimal Recognition Point, ORP) ist farbig markiert und steht immer auf
 * derselben Achse, damit das Auge nicht springen muss.
 *
 * Läuft im Browser (globalThis.RSVP) und unter Node (module.exports) für Tests.
 */
(function (root) {
  'use strict';

  const MIN_WPM = 100;
  const MAX_WPM = 1000;
  const WPM_STEP = 25;
  const MAX_PIECE = 13; // längere Wörter werden getrennt
  const RAMP_WORDS = 5; // Anlauf nach Start: die ersten Wörter etwas langsamer

  const SENTENCE_END = /[.!?…]["'»«“”‘’)\]]*$/;
  const CLAUSE_END = /[,;:–—]["'»«“”‘’)\]]*$/;
  const LEADING_PUNCT = /^[\s"'»«“”‘’„(\[¿¡\-–—*•]+/;

  // ---------------------------------------------------------------- Logik

  /** Index des Fixierungsbuchstabens, Satzzeichen am Wortanfang werden übersprungen. */
  function orpIndex(word) {
    const lead = (word.match(LEADING_PUNCT) || [''])[0].length;
    const core = word.slice(lead).replace(/[^\p{L}\p{N}]+$/u, '');
    const n = core.length;
    let i;
    if (n <= 1) i = 0;
    else if (n <= 5) i = 1;
    else if (n <= 9) i = 2;
    else if (n <= 13) i = 3;
    else i = 4;
    return Math.min(lead + i, Math.max(word.length - 1, 0));
  }

  /** Trennt überlange Wörter in Stücke mit Bindestrich. */
  function splitLong(word) {
    if (word.length <= MAX_PIECE) return [word];
    // An vorhandenen Bindestrichen trennen, wenn möglich
    const parts = word.split('-');
    if (parts.length > 1 && parts.every(Boolean)) {
      return parts.flatMap((p, i) => {
        const pieces = chop(p);
        if (i < parts.length - 1) pieces[pieces.length - 1] += '-';
        return pieces;
      });
    }
    return chop(word);
  }

  /** Teilt ein Wort ohne Bindestrich in gleich lange Stücke. */
  function chop(word) {
    if (word.length <= MAX_PIECE) return [word];
    const pieces = Math.ceil(word.length / (MAX_PIECE - 2));
    const size = Math.ceil(word.length / pieces);
    const out = [];
    for (let i = 0; i < word.length; i += size) {
      const piece = word.slice(i, i + size);
      out.push(i + size < word.length ? piece + '-' : piece);
    }
    // Ein Rest aus nur Satzzeichen hängt am vorigen Stück
    if (out.length > 1 && !/[\p{L}\p{N}]/u.test(out[out.length - 1])) {
      const tail = out.pop();
      out[out.length - 1] = out[out.length - 1].replace(/-$/, '') + tail;
    }
    return out;
  }

  /**
   * Zerlegt Text in Tokens: { text, orp, factor, sentenceEnd, paragraphEnd }.
   * factor ist der Zeitfaktor relativ zur Grunddauer eines Worts.
   */
  function tokenize(text) {
    const tokens = [];
    const paragraphs = String(text || '')
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n+/)
      .map((p) => p.trim())
      .filter(Boolean);

    paragraphs.forEach((para) => {
      const words = para.split(/\s+/).filter(Boolean);
      words.forEach((raw, wi) => {
        const pieces = splitLong(raw);
        pieces.forEach((piece, pi) => {
          const lastPiece = pi === pieces.length - 1;
          const lastInPara = lastPiece && wi === words.length - 1;
          tokens.push(makeToken(piece, lastPiece, lastInPara));
        });
      });
    });
    return tokens;
  }

  function makeToken(text, wordEnd, paragraphEnd) {
    const sentenceEnd = wordEnd && SENTENCE_END.test(text);
    const clauseEnd = wordEnd && !sentenceEnd && CLAUSE_END.test(text);
    let factor = 1;
    if (paragraphEnd) factor = 2.8;
    else if (sentenceEnd) factor = 2.2;
    else if (clauseEnd) factor = 1.5;
    if (text.replace(/[^\p{L}\p{N}]/gu, '').length >= 9) factor *= 1.3;
    if (/\d/.test(text)) factor *= 1.3;
    return {
      text,
      orp: orpIndex(text),
      factor,
      sentenceEnd: sentenceEnd || paragraphEnd,
      paragraphEnd,
    };
  }

  /**
   * Fasst Tokens zu Einblendungen zusammen (1–3 Wörter).
   * Eine Einblendung endet immer am Satzende, damit Pausen erhalten bleiben.
   */
  function buildFrames(tokens, wordsPerFrame) {
    const n = Math.max(1, Math.min(3, wordsPerFrame | 0 || 1));
    const frames = [];
    let i = 0;
    while (i < tokens.length) {
      const group = [tokens[i]];
      while (
        group.length < n &&
        i + group.length < tokens.length &&
        !group[group.length - 1].sentenceEnd &&
        !/-$/.test(group[group.length - 1].text)
      ) {
        group.push(tokens[i + group.length]);
      }
      frames.push(makeFrame(group, i));
      i += group.length;
    }
    return frames;
  }

  function makeFrame(group, start) {
    const text = group.map((t) => t.text).join(' ');
    const last = group[group.length - 1];
    // Zeit: ein Wort braucht seine Grunddauer, die längste Pause zählt einmal
    const pause = Math.max(...group.map((t) => t.factor));
    const factor = group.length === 1 ? pause : group.length - 1 + pause;
    return {
      text,
      orp: group.length === 1 ? group[0].orp : orpIndex(text),
      factor,
      start, // Index des ersten Tokens
      words: group.length,
      sentenceEnd: last.sentenceEnd,
      paragraphEnd: last.paragraphEnd,
    };
  }

  /** Indizes der Einblendungen, mit denen ein Satz beginnt. */
  function sentenceStarts(frames) {
    const starts = frames.length ? [0] : [];
    frames.forEach((f, i) => {
      if (f.sentenceEnd && i + 1 < frames.length) starts.push(i + 1);
    });
    return starts;
  }

  /** Ziel beim Satzsprung. dir = -1 zurück, +1 vor. */
  function sentenceJump(starts, index, dir) {
    if (!starts.length) return 0;
    let cur = 0;
    for (let k = 0; k < starts.length; k++) if (starts[k] <= index) cur = k;
    if (dir > 0) return cur + 1 < starts.length ? starts[cur + 1] : starts[cur];
    // Zurück: steht man mitten im Satz, an dessen Anfang; sonst einen Satz davor
    if (index - starts[cur] > 1) return starts[cur];
    return starts[Math.max(0, cur - 1)];
  }

  function baseDelay(wpm) {
    return 60000 / clampWpm(wpm);
  }

  function clampWpm(wpm) {
    return Math.max(MIN_WPM, Math.min(MAX_WPM, Math.round(wpm) || 300));
  }

  /** Dauer einer Einblendung in ms. rampStep zählt die Einblendungen seit Start. */
  function frameDelay(frame, wpm, rampStep) {
    const ramp = rampStep < RAMP_WORDS ? 1 + (RAMP_WORDS - rampStep) * 0.15 : 1;
    return baseDelay(wpm) * frame.factor * ramp;
  }

  function formatDuration(ms) {
    const s = Math.max(0, Math.round(ms / 1000));
    const m = Math.floor(s / 60);
    return m ? `${m}:${String(s % 60).padStart(2, '0')} min` : `${s} s`;
  }

  // ---------------------------------------------------------------- Speicher

  const DEFAULTS = { wpm: 300, wordsPerFrame: 1, fontSize: 48, theme: 'auto', showContext: true };
  const STORAGE_KEY = 'schnell-lesen:settings';

  const localStore = {
    load() {
      try {
        return Promise.resolve(JSON.parse(localStorage.getItem(STORAGE_KEY)) || {});
      } catch (e) {
        return Promise.resolve({});
      }
    },
    save(obj) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      } catch (e) {
        /* privater Modus o. Ä. – Einstellungen gelten dann nur für diese Sitzung */
      }
    },
  };

  // ---------------------------------------------------------------- Oberfläche

  function el(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function button(cls, label, title) {
    const b = el('button', 'rsvp-btn ' + cls, label);
    b.type = 'button';
    if (title) {
      b.title = title;
      b.setAttribute('aria-label', title);
    }
    return b;
  }

  /**
   * Baut den Leser in container.
   * opts: { text, storage, onClose, autoplay, keyTarget }
   * Rückgabe: { play, pause, toggle, setText, destroy }
   */
  function createReader(container, opts) {
    opts = opts || {};
    const storage = opts.storage || localStore;
    const keyTarget = opts.keyTarget || document;
    let settings = Object.assign({}, DEFAULTS);

    let tokens = [];
    let frames = [];
    let starts = [];
    let prefix = [0]; // Präfixsummen der Zeitfaktoren für die Restzeit
    let index = 0;
    let playing = false;
    let timer = null;
    let rampStep = 0;
    let destroyed = false;

    // --- DOM
    const rootEl = el('div', 'rsvp');
    rootEl.tabIndex = -1;

    const stage = el('div', 'rsvp-stage');
    const lineTop = el('div', 'rsvp-guide rsvp-guide-top');
    const lineBottom = el('div', 'rsvp-guide rsvp-guide-bottom');
    const wordBox = el('div', 'rsvp-word');
    const pre = el('span', 'rsvp-pre');
    const orp = el('span', 'rsvp-orp');
    const post = el('span', 'rsvp-post');
    wordBox.append(pre, orp, post);
    stage.append(lineTop, wordBox, lineBottom);

    const context = el('div', 'rsvp-context');

    const progress = el('div', 'rsvp-progress');
    const progressFill = el('div', 'rsvp-progress-fill');
    progress.append(progressFill);
    progress.title = 'Klicken, um an diese Stelle zu springen';

    const status = el('div', 'rsvp-status');
    const statusPos = el('span', 'rsvp-status-pos');
    const statusLeft = el('span', 'rsvp-status-left');
    status.append(statusPos, statusLeft);

    const controls = el('div', 'rsvp-controls');
    const btnBack = button('rsvp-back', '⏮', 'Satz zurück (←)');
    const btnPlay = button('rsvp-play', '▶', 'Start/Pause (Leertaste)');
    const btnFwd = button('rsvp-fwd', '⏭', 'Satz vor (→)');
    const btnSlower = button('rsvp-slower', '−', 'Langsamer (↓)');
    const wpmLabel = el('span', 'rsvp-wpm');
    const btnFaster = button('rsvp-faster', '+', 'Schneller (↑)');
    const wpmRange = el('input', 'rsvp-range');
    Object.assign(wpmRange, { type: 'range', min: MIN_WPM, max: MAX_WPM, step: WPM_STEP });
    wpmRange.setAttribute('aria-label', 'Wörter pro Minute');

    const chunkSel = el('select', 'rsvp-select');
    chunkSel.setAttribute('aria-label', 'Wörter pro Einblendung');
    [1, 2, 3].forEach((n) => {
      const o = el('option', null, n === 1 ? '1 Wort' : `${n} Wörter`);
      o.value = String(n);
      chunkSel.append(o);
    });

    const btnSmaller = button('rsvp-smaller', 'A−', 'Schrift kleiner');
    const btnBigger = button('rsvp-bigger', 'A+', 'Schrift größer');
    const btnTheme = button('rsvp-theme', '◐', 'Hell/Dunkel wechseln');
    const btnClose = opts.onClose ? button('rsvp-close', '✕', 'Schließen (Esc)') : null;

    const groupNav = el('div', 'rsvp-group');
    groupNav.append(btnBack, btnPlay, btnFwd);
    const groupSpeed = el('div', 'rsvp-group');
    groupSpeed.append(btnSlower, wpmLabel, btnFaster);
    const groupView = el('div', 'rsvp-group');
    groupView.append(chunkSel, btnSmaller, btnBigger, btnTheme);
    if (btnClose) groupView.append(btnClose);
    controls.append(groupNav, groupSpeed, wpmRange, groupView);

    const hint = el('div', 'rsvp-hint', 'Leertaste Start/Pause · ← → Satz · ↑ ↓ Tempo' + (btnClose ? ' · Esc schließen' : ''));

    rootEl.append(stage, context, progress, status, controls, hint);
    container.append(rootEl);

    // --- Darstellung

    function applySettings() {
      settings.wpm = clampWpm(settings.wpm);
      rootEl.style.setProperty('--rsvp-font-size', settings.fontSize + 'px');
      rootEl.dataset.theme = settings.theme;
      wpmLabel.textContent = settings.wpm + ' WPM';
      wpmRange.value = String(settings.wpm);
      chunkSel.value = String(settings.wordsPerFrame);
    }

    function persist() {
      storage.save({
        wpm: settings.wpm,
        wordsPerFrame: settings.wordsPerFrame,
        fontSize: settings.fontSize,
        theme: settings.theme,
        showContext: settings.showContext,
      });
    }

    function rebuild(keepTokenIndex) {
      const tokenIdx = frames[index] ? frames[index].start : 0;
      frames = buildFrames(tokens, settings.wordsPerFrame);
      starts = sentenceStarts(frames);
      prefix = [0];
      frames.forEach((f) => prefix.push(prefix[prefix.length - 1] + f.factor));
      if (keepTokenIndex) {
        let k = 0;
        while (k + 1 < frames.length && frames[k + 1].start <= tokenIdx) k++;
        index = k;
      } else {
        index = 0;
      }
    }

    function render() {
      const f = frames[index];
      if (!f) {
        pre.textContent = '';
        orp.textContent = '';
        post.textContent = tokens.length ? '' : 'Kein Text';
        wordBox.style.transform = 'none';
        updateStatus();
        return;
      }
      pre.textContent = f.text.slice(0, f.orp);
      orp.textContent = f.text.charAt(f.orp);
      post.textContent = f.text.slice(f.orp + 1);
      alignToAxis();
      updateStatus();
      if (!playing) renderContext();
    }

    /** Verschiebt das Wort so, dass die Mitte des ORP-Buchstabens auf der Achse liegt. */
    function alignToAxis() {
      wordBox.style.transform = 'none';
      const stageRect = stage.getBoundingClientRect();
      const orpRect = orp.getBoundingClientRect();
      if (!stageRect.width) return;
      const axis = stageRect.left + stageRect.width * axisRatio();
      const center = orpRect.left + orpRect.width / 2;
      wordBox.style.transform = `translateX(${Math.round(axis - center)}px)`;
    }

    function axisRatio() {
      const v = parseFloat(getComputedStyle(rootEl).getPropertyValue('--rsvp-axis'));
      return isNaN(v) ? 0.38 : v / 100;
    }

    function updateStatus() {
      const total = frames.length;
      const pct = total ? (index / Math.max(1, total - 1)) * 100 : 0;
      progressFill.style.width = (total ? pct : 0) + '%';
      const wordNo = frames[index] ? frames[index].start + 1 : 0;
      statusPos.textContent = `Wort ${wordNo} von ${tokens.length}`;
      const remaining = (prefix[prefix.length - 1] - prefix[index]) * baseDelay(settings.wpm);
      statusLeft.textContent = 'noch ' + formatDuration(remaining);
      btnPlay.textContent = playing ? '⏸' : '▶';
      rootEl.classList.toggle('is-playing', playing);
    }

    function renderContext() {
      context.textContent = '';
      if (!settings.showContext || playing || !frames.length) {
        context.hidden = true;
        return;
      }
      context.hidden = false;
      // aktueller Satz, aktuelle Einblendung hervorgehoben
      let s = 0;
      for (const st of starts) if (st <= index) s = st;
      let e = s;
      while (e < frames.length - 1 && !frames[e].sentenceEnd) e++;
      for (let k = s; k <= e; k++) {
        const span = el('span', k === index ? 'rsvp-context-current' : null, frames[k].text);
        span.dataset.index = String(k);
        context.append(span, document.createTextNode(' '));
      }
    }

    // --- Ablauf

    function schedule() {
      clearTimeout(timer);
      if (!playing) return;
      const f = frames[index];
      if (!f) return pause();
      const delay = frameDelay(f, settings.wpm, rampStep);
      timer = setTimeout(() => {
        if (index >= frames.length - 1) {
          pause();
          return;
        }
        index++;
        rampStep++;
        render();
        schedule();
      }, delay);
    }

    function play() {
      if (destroyed || !frames.length) return;
      if (index >= frames.length - 1) index = 0;
      playing = true;
      rampStep = 0;
      context.hidden = true;
      render();
      schedule();
    }

    function pause() {
      playing = false;
      clearTimeout(timer);
      updateStatus();
      renderContext();
    }

    function toggle() {
      playing ? pause() : play();
    }

    function jumpTo(i) {
      index = Math.max(0, Math.min(frames.length - 1, i));
      rampStep = 0;
      render();
      if (playing) schedule();
    }

    function changeWpm(delta) {
      settings.wpm = clampWpm(settings.wpm + delta);
      applySettings();
      updateStatus();
      persist();
    }

    function setText(text) {
      pause();
      tokens = tokenize(text);
      rebuild(false);
      render();
    }

    // --- Ereignisse

    btnPlay.addEventListener('click', toggle);
    btnBack.addEventListener('click', () => jumpTo(sentenceJump(starts, index, -1)));
    btnFwd.addEventListener('click', () => jumpTo(sentenceJump(starts, index, +1)));
    btnSlower.addEventListener('click', () => changeWpm(-WPM_STEP));
    btnFaster.addEventListener('click', () => changeWpm(+WPM_STEP));
    wpmRange.addEventListener('input', () => {
      settings.wpm = clampWpm(+wpmRange.value);
      applySettings();
      updateStatus();
    });
    wpmRange.addEventListener('change', persist);
    chunkSel.addEventListener('change', () => {
      settings.wordsPerFrame = +chunkSel.value;
      rebuild(true);
      render();
      persist();
    });
    btnSmaller.addEventListener('click', () => {
      settings.fontSize = Math.max(24, settings.fontSize - 6);
      applySettings();
      render();
      persist();
    });
    btnBigger.addEventListener('click', () => {
      settings.fontSize = Math.min(120, settings.fontSize + 6);
      applySettings();
      render();
      persist();
    });
    btnTheme.addEventListener('click', () => {
      const dark =
        settings.theme === 'dark' ||
        (settings.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
      settings.theme = dark ? 'light' : 'dark';
      applySettings();
      persist();
    });
    if (btnClose) btnClose.addEventListener('click', () => opts.onClose());

    progress.addEventListener('click', (ev) => {
      const r = progress.getBoundingClientRect();
      jumpTo(Math.round(((ev.clientX - r.left) / r.width) * (frames.length - 1)));
    });
    stage.addEventListener('click', toggle);
    context.addEventListener('click', (ev) => {
      const t = ev.target.closest('[data-index]');
      if (t) jumpTo(+t.dataset.index);
    });

    function onKey(ev) {
      if (destroyed || !rootEl.isConnected || !rootEl.getClientRects().length) return;
      const tag = (ev.composedPath()[0] || {}).tagName;
      if (tag === 'TEXTAREA' || (tag === 'INPUT' && ev.composedPath()[0].type !== 'range')) return;
      if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
      let handled = true;
      switch (ev.key) {
        case ' ':
        case 'k':
          toggle();
          break;
        case 'ArrowLeft':
          jumpTo(sentenceJump(starts, index, -1));
          break;
        case 'ArrowRight':
          jumpTo(sentenceJump(starts, index, +1));
          break;
        case 'ArrowUp':
          changeWpm(+WPM_STEP);
          break;
        case 'ArrowDown':
          changeWpm(-WPM_STEP);
          break;
        case 'Escape':
          if (opts.onClose) opts.onClose();
          else pause();
          break;
        default:
          handled = false;
      }
      if (handled) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
    keyTarget.addEventListener('keydown', onKey, true);

    let resizeRaf = 0;
    const ro = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(() => {
          cancelAnimationFrame(resizeRaf);
          resizeRaf = requestAnimationFrame(alignToAxis);
        })
      : null;
    if (ro) ro.observe(stage);

    function destroy() {
      destroyed = true;
      pause();
      keyTarget.removeEventListener('keydown', onKey, true);
      if (ro) ro.disconnect();
      rootEl.remove();
    }

    // --- Start
    applySettings();
    setText(opts.text || '');
    storage.load().then((saved) => {
      if (destroyed) return;
      settings = Object.assign({}, DEFAULTS, saved || {});
      applySettings();
      rebuild(true);
      render();
      if (opts.autoplay) play();
    });
    rootEl.focus({ preventScroll: true });

    return { play, pause, toggle, setText, destroy };
  }

  const api = {
    MIN_WPM,
    MAX_WPM,
    orpIndex,
    splitLong,
    tokenize,
    buildFrames,
    sentenceStarts,
    sentenceJump,
    frameDelay,
    formatDuration,
    createReader,
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RSVP = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
