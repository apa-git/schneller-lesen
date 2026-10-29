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
    b.innerHTML = BOLT + '<span>Schnell lesen</span>';
    b.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'gap:6px',
      'height:30px',
      'padding:0 14px 0 10px',
      'margin:8px 0 2px',
      'border:1.5px solid #d6261c',
      'border-radius:15px',
      'background:transparent',
      'color:inherit',
      'font:inherit',
      'font-size:14px',
      'font-weight:600',
      'line-height:1',
      'cursor:pointer',
    ].join(';');
    b.addEventListener('mouseenter', () => {
      b.style.background = 'rgba(214,38,28,0.12)';
    });
    b.addEventListener('mouseleave', () => {
      b.style.background = 'transparent';
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

  /**
   * Knopf als eigene Zeile direkt unter den Beitragstext. Die Textbox selbst
   * schneidet per overflow ab, deshalb kommt er als Geschwister dahinter.
   */
  function decorate(post) {
    if (post.querySelector('[' + MARK + ']')) return;
    const boxes = textBoxes(post);
    if (!boxes.length) return; // nur Bild oder Video
    const row = document.createElement('span');
    row.setAttribute(MARK, 'row');
    row.style.cssText = 'display:block';
    row.append(makeButton(post));
    boxes[boxes.length - 1].after(row);
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
