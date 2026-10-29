// Schnell lesen – „Lesen“-Knopf an jedem LinkedIn-Beitrag.
// LinkedIn verschleiert seine Klassennamen. Die Anker hier sind ARIA-Labels
// und data-testid-Attribute, Stand Oktober 2026.
(function () {
  'use strict';
  if (window.__schnellLesenLinkedIn) return;

  const POST_MENU =
    'button[aria-label^="Kontrollmenü für den Beitrag"], button[aria-label^="Control menu for post"]';
  const TEXT_BOX = '[data-testid="expandable-text-box"]';
  const COMMENTS = '[componentkey*="commentsSectionContainer"]';
  const ACTION = 'button[aria-label^="Kommentieren"], button[aria-label^="Comment"]';
  const MARK = 'data-schnell-lesen';

  /** Alle Beiträge auf der Seite (Feed, Profil, Einzelansicht). */
  function posts() {
    const found = new Set();
    document.querySelectorAll(POST_MENU).forEach((btn) => {
      const post = btn.closest('[role="listitem"]') || btn.closest('article');
      if (post) found.add(post);
    });
    return [...found];
  }

  /** Textboxen des Beitrags ohne Kommentare. Bei Reposts sind es zwei. */
  function textBoxes(post) {
    return [...post.querySelectorAll(TEXT_BOX)].filter((b) => !b.closest(COMMENTS));
  }

  /** Voller Beitragstext. LinkedIn kürzt nur per CSS, im DOM steht alles. */
  function postText(post) {
    return textBoxes(post)
      .map((b) =>
        (b.innerText || '')
          .replace(/\s*…\s*(mehr|more|see more)\s*$/i, '')
          .replace(/[ \t ]+/g, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .trim()
      )
      .filter(Boolean)
      .join('\n\n');
  }

  /** Beitrag, der der Bildschirmmitte am nächsten ist. */
  function centerPostText() {
    const mid = innerHeight / 2;
    const dist = (el) => {
      const r = el.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    };
    const list = posts().filter((p) => p.getClientRects().length && textBoxes(p).length);
    list.sort((a, b) => dist(a) - dist(b));
    return list.length ? postText(list[0]) : '';
  }

  // ------------------------------------------------------------ Knopf

  const BOLT =
    '<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" style="flex:none">' +
    '<path fill="#d6261c" d="M13 2 4 14h6l-1 8 9-12h-6z"/></svg>';

  function makeButton(post) {
    const b = document.createElement('button');
    b.type = 'button';
    b.setAttribute(MARK, '');
    b.title = 'Diesen Beitrag schnell lesen';
    b.setAttribute('aria-label', 'Diesen Beitrag schnell lesen');
    b.innerHTML = BOLT + '<span>Lesen</span>';
    b.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:4px',
      'height:32px',
      'padding:0 10px',
      'margin:4px',
      'border:0',
      'border-radius:4px',
      'background:transparent',
      'color:inherit',
      'font:inherit',
      'font-size:14px',
      'font-weight:600',
      'opacity:0.75',
      'cursor:pointer',
      'flex:none',
    ].join(';');
    b.addEventListener('mouseenter', () => {
      b.style.background = 'rgba(127,127,127,0.15)';
      b.style.opacity = '1';
    });
    b.addEventListener('mouseleave', () => {
      b.style.background = 'transparent';
      b.style.opacity = '0.75';
    });
    b.addEventListener('click', (ev) => {
      // Nicht an LinkedIn weiterreichen, sonst öffnet sich ggf. die Einzelansicht
      ev.preventDefault();
      ev.stopPropagation();
      const text = postText(post);
      if (text && window.__schnellLesen) window.__schnellLesen.openText(text);
    });
    return b;
  }

  /** Leiste mit Gefällt mir · Kommentieren · Reposten · Senden: erster Vorfahr mit ≥ 3 Kindern. */
  function actionBar(action, post) {
    let el = action.parentElement;
    while (el && el !== post) {
      if (el.children.length >= 3) return el;
      el = el.parentElement;
    }
    return null;
  }

  function decorate(post) {
    if (post.querySelector('[' + MARK + ']')) return;
    const boxes = textBoxes(post);
    if (!boxes.length) return; // nur Bild oder Video
    const action = [...post.querySelectorAll(ACTION)].find((a) => !a.closest(COMMENTS));
    const btn = makeButton(post);
    const bar = action && actionBar(action, post);
    if (bar) {
      bar.append(btn);
    } else {
      boxes[boxes.length - 1].after(btn);
    }
  }

  let queued = false;
  function scan() {
    queued = false;
    posts().forEach(decorate);
  }
  // Timer statt requestAnimationFrame: läuft auch in Hintergrund-Tabs
  function queue() {
    if (!queued) {
      queued = true;
      setTimeout(scan, 150);
    }
  }

  new MutationObserver(queue).observe(document.body, { childList: true, subtree: true });
  scan();

  window.__schnellLesenLinkedIn = { posts, postText, centerPostText, scan };
})();
