// Schnell lesen – Overlay im Tab. Wird bei jedem Aufruf erneut eingespritzt,
// deshalb nur einmal definieren.
(function () {
  'use strict';
  if (window.__schnellLesen) return;

  const BLOCKS = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,pre,figcaption,dd,dt';
  const SKIP = 'nav,aside,footer,form,button,script,style,noscript,[role="navigation"],[role="complementary"],[aria-hidden="true"]';

  let host = null;
  let reader = null;
  let savedOverflow = '';

  const chromeStore = {
    load: () =>
      new Promise((resolve) => {
        try {
          chrome.storage.local.get('settings', (r) => resolve((r && r.settings) || {}));
        } catch (e) {
          resolve({});
        }
      }),
    save: (obj) => {
      try {
        chrome.storage.local.set({ settings: obj });
      } catch (e) {
        /* Erweiterung neu geladen – Einstellungen gehen dann verloren */
      }
    },
  };

  // ------------------------------------------------------------ Text holen

  function visible(el) {
    return el.getClientRects().length > 0;
  }

  function clean(t) {
    return t.replace(/[ \t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  }

  /** Text aus Blockelementen eines Bereichs, Absätze bleiben erhalten. */
  function blockText(root) {
    const parts = [];
    root.querySelectorAll(BLOCKS).forEach((el) => {
      if (el.closest(SKIP) || !visible(el)) return;
      // verschachtelte Blöcke (z. B. p in li) nur einmal zählen
      const outer = el.parentElement && el.parentElement.closest(BLOCKS);
      if (outer && root.contains(outer)) return;
      const t = clean(el.innerText || '');
      if (t) parts.push(t);
    });
    return parts.join('\n\n');
  }

  /** Der Block in Bildschirmmitte, so weit nach oben, bis genug Text dasteht. */
  function centerBlock() {
    let el = document.elementFromPoint(innerWidth / 2, innerHeight / 2);
    while (el && el !== document.body) {
      const len = (el.innerText || '').trim().length;
      if (len > 200) return el;
      el = el.parentElement;
    }
    return null;
  }

  function linkedInText() {
    const posts = [
      ...document.querySelectorAll(
        '.feed-shared-update-v2, [data-urn^="urn:li:activity"], [data-id^="urn:li:activity"], .scaffold-layout__detail article'
      ),
    ].filter(visible);
    if (!posts.length) return '';
    // Beitrag, der der Bildschirmmitte am nächsten ist
    const mid = innerHeight / 2;
    const dist = (el) => {
      const r = el.getBoundingClientRect();
      return r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
    };
    posts.sort((a, b) => dist(a) - dist(b));
    const post = posts[0];
    // „…mehr“ aufklappen, damit der ganze Beitrag gelesen wird
    const more = post.querySelector(
      '.feed-shared-inline-show-more-text__see-more-less-toggle, button[aria-label*="mehr" i], button[aria-label*="more" i]'
    );
    if (more && /mehr|more/i.test(more.innerText || more.getAttribute('aria-label') || '')) more.click();
    const body = post.querySelector(
      '.update-components-text, .feed-shared-inline-show-more-text, .feed-shared-text, [data-test-id="main-feed-activity-card__commentary"]'
    );
    return clean((body || post).innerText || '').replace(/\s*…\s*(mehr|more)\s*$/i, '');
  }

  function mainText() {
    if (/(^|\.)linkedin\.com$/.test(location.hostname) && !/\/pulse\//.test(location.pathname)) {
      const t = linkedInText();
      if (t) return t;
    }
    const candidates = [...document.querySelectorAll('article, [role="main"], main')].filter(visible);
    let best = '';
    candidates.forEach((c) => {
      const t = blockText(c);
      if (t.length > best.length) best = t;
    });
    if (best.length < 300) {
      // Keine Artikelstruktur: Bereich mit dem meisten Absatztext
      const blocks = new Map();
      document.querySelectorAll('p').forEach((p) => {
        if (!visible(p) || p.closest(SKIP)) return;
        const parent = p.parentElement;
        blocks.set(parent, (blocks.get(parent) || 0) + (p.innerText || '').length);
      });
      let top = null;
      let max = 0;
      blocks.forEach((n, el) => {
        if (n > max) {
          max = n;
          top = el;
        }
      });
      const t = top ? blockText(top) : '';
      if (t.length > best.length) best = t;
    }
    if (best.length < 200) {
      const el = centerBlock();
      if (el) best = clean(el.innerText || '');
    }
    return best;
  }

  // ------------------------------------------------------------ Overlay

  const OVERLAY_CSS = `
    :host { all: initial; }
    .backdrop {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      padding: 16px;
      background: rgba(10, 10, 12, 0.55);
      backdrop-filter: blur(3px);
      -webkit-backdrop-filter: blur(3px);
    }
    .panel { width: min(920px, 100%); max-height: calc(100vh - 32px); overflow: auto; border-radius: 14px; box-shadow: 0 20px 60px rgba(0,0,0,0.35); }
    .source {
      font: 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #9a9aa0; margin: 0 0 8px 4px;
    }
  `;

  function close() {
    if (reader) reader.destroy();
    reader = null;
    if (host) host.remove();
    host = null;
    document.documentElement.style.overflow = savedOverflow;
  }

  function open(fallback, css) {
    const selection = (window.getSelection() || '').toString().trim();
    const text = selection || (fallback || '').trim() || mainText();

    host = document.createElement('div');
    host.id = 'schnell-lesen-host';
    host.style.cssText = 'position:fixed;inset:0;z-index:2147483647;';
    const shadow = host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = css + OVERLAY_CSS;
    const backdrop = document.createElement('div');
    backdrop.className = 'backdrop';
    const panel = document.createElement('div');
    panel.className = 'panel';
    backdrop.append(panel);
    shadow.append(style, backdrop);
    backdrop.addEventListener('mousedown', (ev) => {
      if (ev.target === backdrop) close();
    });

    savedOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.documentElement.append(host);

    reader = RSVP.createReader(panel, {
      text: text || 'Auf dieser Seite wurde kein lesbarer Text gefunden. Markiere den gewünschten Text und versuche es erneut.',
      storage: chromeStore,
      onClose: close,
      autoplay: !!text,
      keyTarget: window,
    });
  }

  window.__schnellLesen = {
    toggle(fallback, css) {
      if (host) close();
      else open(fallback, css);
    },
    extract: mainText, // für tools/testseite.html
  };
})();
