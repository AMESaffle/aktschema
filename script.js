(() => {
const KEY = 'aktivitetsplan-schema-v1';
const DAYS = ['Måndag','Tisdag','Onsdag','Torsdag','Fredag'];
const TIMES = ['08.00','09.00','10.00','11.00','RAST','13.00','14.00','15.00'];
const MONTHS = ['Jan','Feb','Mar','Apr','Maj','Jun','Jul','Aug','Sep','Okt','Nov','Dec'];
const PAL = ['#cfe8f3','#d9ecc8','#fde5b8','#f6d0d8','#e3d6f0','#c9eadf','#fbd9c4','#d6e0f5','#eee6b8','#f3d3ea','#cde7ea','#e4e4e4','#f7e0a8','#d3efd0','#eeeeee'];
const AKT0 = ['Coachning enskilt','Jobsökargrupp','Arbetsmarknadskunskap','Miljöstationer','Utegrupp','Praktik Kommun','Praktisk verks. AME','Praktik Privat','Skaparverkstad','Språkgrupp','Utbildning deltid','Studiebeöksgr.','Eget jobbsökande','7-Tjugo','-'];
const SYF0 = ['Personlig utv.','Öva språk','Social samvaro','Söka arbete','Utbildning','Rutinfrämjande','Arbetsträning','Arbetsprövning','Yrkesinskt','Planering','Planerad anställning','-'];

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const defAkt = () => AKT0.map((n,i) => ({id:'a'+i, n, c:PAL[i]}));
const defSyf = () => SYF0.map((n,i) => ({id:'s'+i, n}));

let S;
try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
if (!S || !S.akt || !S.syf) S = {month:'Nov', akt:defAkt(), syf:defSyf(), cells:{}};
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };

// Ta bort val som pekar på listposter som inte längre finns
function clean() {
  Object.values(S.cells).forEach(c => {
    if (c.a && !S.akt.some(x => x.id === c.a)) delete c.a;
    if (c.s && !S.syf.some(x => x.id === c.s)) delete c.s;
  });
}

const opts = (list, sel, ph) => `<option value="">${ph}</option>` +
  list.map(x => `<option value="${x.id}"${x.id === sel ? ' selected' : ''}>${esc(x.n)}</option>`).join('');

// Samma aktivitet + syfte i två rutor ovanpå varandra = ett sammanhängande block
const same = (d, r1, r2) => { const x = S.cells[d+'-'+r1], y = S.cells[d+'-'+r2]; return !!(x && y && x.a && x.a === y.a && x.s === y.s); };

function renderGrid() {
  let h = '<thead><tr><th>TID</th>' + DAYS.map((d, i) =>
    `<th>${d}<button class="cpday" data-day="${i}" title="Kopiera ${d} till alla andra dagar">⧉</button></th>`).join('') + '</tr></thead><tbody>';
  TIMES.forEach((t, r) => {
    if (t === 'RAST') { h += '<tr class="rast"><th>RAST</th><td colspan="5"></td></tr>'; return; }
    h += `<tr><th>${t}</th>`;
    DAYS.forEach((_, d) => {
      const k = d + '-' + r, c = S.cells[k] || {};
      const a = S.akt.find(x => x.id === c.a), s = S.syf.find(x => x.id === c.s);
      const cu = r > 0 && TIMES[r-1] !== 'RAST' && same(d, r-1, r);
      const cd = r < TIMES.length - 1 && TIMES[r+1] !== 'RAST' && same(d, r, r+1);
      h += `<td data-k="${k}" class="${cu ? 'cu ' : ''}${cd ? 'cd' : ''}"${a ? ` style="--c:${a.c}"` : ''}>
        <label><b>Akt:</b><select data-f="a">${opts(S.akt, c.a, 'Välj aktivitet')}</select><span class="pv">${a ? esc(a.n) : ''}</span></label>
        <label><b>Syfte:</b><select data-f="s">${opts(S.syf, c.s, 'Välj syfte')}</select><span class="pv">${s ? esc(s.n) : ''}</span></label>${c.a || c.s ? '<i class="fh" title="Dra nedåt eller åt höger för att förlänga. Klicka = +1 timme">+</i>' : ''}</td>`;
    });
    h += '</tr>';
  });
  $('grid').innerHTML = h + '</tbody>';
  renderSummary();
}

function renderSummary() {
  const n = {}; let tot = 0;
  Object.values(S.cells).forEach(c => {
    const a = S.akt.find(x => x.id === c.a);
    if (a && a.n.trim() !== '-') { n[a.id] = (n[a.id] || 0) + 1; tot++; }
  });
  $('summary').innerHTML = `<h2>Totalt <b>${tot}</b> tim per vecka</h2><div class="chips">` +
    S.akt.filter(a => n[a.id]).map(a => `<span style="--c:${a.c}">${esc(a.n)} <b>${n[a.id]} tim</b></span>`).join('') + '</div>';
}

function renderLists() {
  const col = (key, title, color) => `<div><h3>${title}</h3>` + S[key].map((x, i) =>
    `<div class="row" data-l="${key}" data-i="${i}">${color ? `<input type="color" value="${x.c}" data-act="color" title="Färg">` : ''}` +
    `<input type="text" value="${esc(x.n)}" data-act="name">` +
    `<button data-act="up"${i ? '' : ' disabled'}>↑</button><button data-act="down"${i < S[key].length - 1 ? '' : ' disabled'}>↓</button><button data-act="del">✕</button></div>`
  ).join('') + `<button class="add" data-l="${key}" data-act="add">+ Lägg till</button></div>`;
  $('lists').innerHTML = col('akt', 'Akt (aktivitet)', true) + col('syf', 'Syfte', false);
}

// Val i schemat
$('grid').addEventListener('change', e => {
  const sel = e.target.closest('select'); if (!sel) return;
  const k = sel.closest('td').dataset.k;
  const c = S.cells[k] = S.cells[k] || {};
  if (sel.value) c[sel.dataset.f] = sel.value; else delete c[sel.dataset.f];
  save(); renderGrid();
});

// Förläng aktivitet: dra i handtaget (nedåt = fler timmar, åt höger = fler dagar), klick = +1 timme
let drag = null;
const parse = k => k.split('-').map(Number);
function fillKeys(d, r, td) {
  const out = [];
  if (!td) return out;
  const [d2, r2] = parse(td.dataset.k);
  if (Math.abs(d2 - d) > Math.abs(r2 - r)) { for (let i = d + 1; i <= d2; i++) out.push(i + '-' + r); }
  else { for (let i = r + 1; i <= r2; i++) if (TIMES[i] !== 'RAST') out.push(d + '-' + i); }
  return out;
}
function mark(keys) {
  $('grid').querySelectorAll('td.fill').forEach(t => t.classList.remove('fill'));
  keys.forEach(k => { const t = $('grid').querySelector(`td[data-k="${k}"]`); if (t) t.classList.add('fill'); });
}
$('grid').addEventListener('pointerdown', e => {
  const h = e.target.closest('.fh'); if (!h) return;
  e.preventDefault();
  const [d, r] = parse(h.closest('td').dataset.k);
  drag = {d, r, x: e.clientX, y: e.clientY, moved: false, keys: []};
  h.setPointerCapture(e.pointerId);
});
$('grid').addEventListener('pointermove', e => {
  if (!drag) return;
  if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) drag.moved = true;
  const el = document.elementFromPoint(e.clientX, e.clientY);
  drag.keys = fillKeys(drag.d, drag.r, el && el.closest('td[data-k]'));
  mark(drag.keys);
});
$('grid').addEventListener('pointerup', e => {
  if (!drag) return;
  let keys = drag.keys;
  if (!drag.moved) { let n = drag.r + 1; if (TIMES[n] === 'RAST') n++; keys = n < TIMES.length ? [drag.d + '-' + n] : []; }
  const src = S.cells[drag.d + '-' + drag.r] || {};
  keys.forEach(k => { S.cells[k] = {}; if (src.a) S.cells[k].a = src.a; if (src.s) S.cells[k].s = src.s; });
  drag = null; mark([]); save(); renderGrid();
});
$('grid').addEventListener('pointercancel', () => { drag = null; mark([]); });

// Kopiera en hel dag till alla andra dagar
$('grid').addEventListener('click', e => {
  const b = e.target.closest('.cpday'); if (!b) return;
  const d = +b.dataset.day;
  if (!confirm(`Kopiera ${DAYS[d]} till alla andra dagar? Befintligt innehåll ersätts.`)) return;
  TIMES.forEach((_, r) => { for (let i = 0; i < 5; i++) {
    if (i === d) continue;
    const src = S.cells[d + '-' + r];
    if (src) S.cells[i + '-' + r] = {...src}; else delete S.cells[i + '-' + r];
  } });
  save(); renderGrid();
});

// Redigera listorna (globalt – rutorna lagrar id, inte text)
$('lists').addEventListener('input', e => {
  const row = e.target.closest('.row'); if (!row) return;
  const item = S[row.dataset.l][row.dataset.i];
  if (e.target.dataset.act === 'name') item.n = e.target.value;
  if (e.target.dataset.act === 'color') item.c = e.target.value;
  save(); renderGrid();
});
$('lists').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const row = b.closest('.row'), key = b.dataset.l || row.dataset.l, list = S[key];
  if (b.dataset.act === 'add') {
    list.push({id: key[0] + Date.now(), n: '', c: PAL[list.length % PAL.length]});
    renderLists(); const ins = $('lists').querySelectorAll(`.row[data-l="${key}"] input[type=text]`); ins[ins.length - 1].focus(); return;
  }
  const i = +row.dataset.i, f = key === 'akt' ? 'a' : 's';
  if (b.dataset.act === 'up') [list[i-1], list[i]] = [list[i], list[i-1]];
  if (b.dataset.act === 'down') [list[i+1], list[i]] = [list[i], list[i+1]];
  if (b.dataset.act === 'del') {
    const used = Object.values(S.cells).filter(c => c[f] === list[i].id).length;
    if (used && !confirm(`"${list[i].n}" används i ${used} ruta(or). Ta bort ändå? Rutorna blir tomma.`)) return;
    list.splice(i, 1); clean();
  }
  save(); renderLists(); renderGrid();
});

$('btnLists').onclick = () => { renderLists(); $('dlg').showModal(); };
$('dlg').addEventListener('close', () => { S.akt.forEach(x => x.n = x.n.trim() || 'Ny aktivitet'); S.syf.forEach(x => x.n = x.n.trim() || 'Nytt syfte'); save(); renderGrid(); });
$('btnReset').onclick = () => {
  if (!confirm('Återställ Akt och Syfte till standardlistorna? Egna tillägg tas bort.')) return;
  S.akt = defAkt(); S.syf = defSyf(); clean(); save(); renderLists(); renderGrid();
};
$('btnClear').onclick = () => { if (confirm('Rensa hela schemat?')) { S.cells = {}; save(); renderGrid(); } };
$('btnPdf').onclick = () => {
  const old = document.title; document.title = 'Aktivitetsplan ' + S.month;
  window.print(); document.title = old;
};

$('month').innerHTML = MONTHS.map(m => `<option${m === S.month ? ' selected' : ''}>${m}</option>`).join('');
$('month').onchange = e => { S.month = e.target.value; save(); };
renderGrid();
})();
