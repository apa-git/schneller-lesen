const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./rsvp.js');

test('ORP-Index nach Wortlänge', () => {
  assert.equal(R.orpIndex('a'), 0);
  assert.equal(R.orpIndex('der'), 1);
  assert.equal(R.orpIndex('Hallo'), 1);
  assert.equal(R.orpIndex('Lesen'), 1);
  assert.equal(R.orpIndex('schnell'), 2);
  assert.equal(R.orpIndex('Geschwindig'), 3);
});

test('ORP überspringt Satzzeichen am Anfang', () => {
  assert.equal(R.orpIndex('„Hallo'), 2);
  assert.equal(R.orpIndex('(schnell'), 3);
});

test('ORP ignoriert Satzzeichen am Ende bei der Länge', () => {
  assert.equal(R.orpIndex('Hallo.'), 1);
  assert.equal(R.orpIndex('Haus,'), 1);
});

test('lange Wörter werden getrennt', () => {
  const parts = R.splitLong('Donaudampfschifffahrtsgesellschaft');
  assert.ok(parts.length >= 3);
  parts.slice(0, -1).forEach((p) => assert.ok(p.endsWith('-')));
  assert.equal(parts.join('').replace(/-/g, ''), 'Donaudampfschifffahrtsgesellschaft');
  parts.forEach((p) => assert.ok(p.length <= 13, p));
});

test('vorhandene Bindestriche werden als Trennstelle genutzt', () => {
  const parts = R.splitLong('Claude-Code-Tipps-und-Tricks');
  assert.deepEqual(parts, ['Claude-', 'Code-', 'Tipps-', 'und-', 'Tricks']);
});

test('langer Teil vor einem Bindestrich führt nicht zur Endlosschleife', () => {
  const parts = R.splitLong('Projektmanagement-Werkzeug');
  assert.equal(parts.join('').replace(/-/g, ''), 'ProjektmanagementWerkzeug');
  parts.forEach((p) => assert.ok(p.length <= 13, p));
  assert.deepEqual(R.splitLong('-'), ['-']);
  assert.ok(R.splitLong('Leerzeichen--------------').length >= 1);
});

test('Pausenfaktoren', () => {
  const t = R.tokenize('Ich lese, du liest. Ende\n\nNeuer Absatz');
  const by = (w) => t.find((x) => x.text === w);
  assert.equal(by('Ich').factor, 1);
  assert.equal(by('lese,').factor, 1.5);
  assert.equal(by('liest.').factor, 2.2);
  assert.equal(by('Ende').factor, 2.8);
  assert.ok(by('Ende').paragraphEnd);
  assert.ok(by('liest.').sentenceEnd);
});

test('Zahlen und lange Wörter bekommen mehr Zeit', () => {
  const t = R.tokenize('2026 Projektleiter x');
  assert.equal(t[0].factor, 1.3);
  assert.equal(t[1].factor, 1.3);
  assert.equal(t[2].factor, 2.8); // letztes Wort im Absatz
});

test('Satzzeichen hinter Anführungszeichen zählt als Satzende', () => {
  const t = R.tokenize('Er sagte „Ja.“ Dann ging er.');
  assert.ok(t.find((x) => x.text === '„Ja.“').sentenceEnd);
});

test('Einblendungen mit mehreren Wörtern enden am Satzende', () => {
  const t = R.tokenize('Eins zwei drei. Vier fünf');
  const f = R.buildFrames(t, 2);
  assert.deepEqual(f.map((x) => x.text), ['Eins zwei', 'drei.', 'Vier fünf']);
});

test('Satzsprünge', () => {
  const t = R.tokenize('A b c. D e f. G h i.');
  const f = R.buildFrames(t, 1);
  const s = R.sentenceStarts(f);
  assert.deepEqual(s, [0, 3, 6]);
  assert.equal(R.sentenceJump(s, 4, +1), 6);
  assert.equal(R.sentenceJump(s, 8, +1), 6); // letzter Satz bleibt
  assert.equal(R.sentenceJump(s, 5, -1), 3); // mitten im Satz → Satzanfang
  assert.equal(R.sentenceJump(s, 3, -1), 0); // am Satzanfang → Satz davor
  assert.equal(R.sentenceJump(s, 1, -1), 0);
});

test('Dauer pro Wort', () => {
  const [f] = R.buildFrames(R.tokenize('Wort nächstes'), 1);
  assert.equal(R.frameDelay(f, 300, 99), 200);
  assert.ok(R.frameDelay(f, 300, 0) > 200); // Anlauf
  assert.equal(R.frameDelay(f, 50, 99), 600); // Untergrenze 100 WPM
});

test('leerer Text', () => {
  assert.deepEqual(R.tokenize(''), []);
  assert.deepEqual(R.tokenize('   \n\n  '), []);
});
