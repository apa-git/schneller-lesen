// Schnell lesen – Hintergrund: Einstiege (Kontextmenü, Symbol, Tastenkürzel)
// Der Leser wird erst beim Aufruf in den Tab gespritzt (activeTab), es läuft
// also nichts dauerhaft auf fremden Seiten.

const MENU_ID = 'schnell-lesen';
let cssCache = null;

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: MENU_ID,
    title: 'Schnell lesen',
    contexts: ['selection', 'page'],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === MENU_ID && tab) openReader(tab, info.selectionText || '');
});

// Symbolklick und Tastenkürzel (_execute_action) landen hier
chrome.action.onClicked.addListener((tab) => openReader(tab, ''));

// content.js fragt das Leser-CSS ab, wenn es per Manifest geladen wurde (LinkedIn-Knopf)
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg && msg.type === 'css') {
    readerCss().then(sendResponse, () => sendResponse(''));
    return true; // Antwort kommt asynchron
  }
});

async function readerCss() {
  if (!cssCache) cssCache = await (await fetch(chrome.runtime.getURL('rsvp.css'))).text();
  return cssCache;
}

async function openReader(tab, selectionText) {
  const target = { tabId: tab.id };
  try {
    await chrome.scripting.executeScript({ target, files: ['rsvp.js', 'content.js'] });
    const css = await readerCss();
    await chrome.scripting.executeScript({
      target,
      func: (fallback, css) => window.__schnellLesen.toggle(fallback, css),
      args: [selectionText, css],
    });
  } catch (err) {
    // chrome://-Seiten, Web Store, PDF-Viewer: dort darf keine Erweiterung Skripte ausführen
    chrome.action.setBadgeBackgroundColor({ color: '#d6261c', tabId: tab.id });
    chrome.action.setBadgeText({ text: '!', tabId: tab.id });
    chrome.action.setTitle({
      tabId: tab.id,
      title: 'Schnell lesen ist auf dieser Seite nicht möglich: ' + (err && err.message ? err.message : err),
    });
    setTimeout(() => chrome.action.setBadgeText({ text: '', tabId: tab.id }), 4000);
  }
}
