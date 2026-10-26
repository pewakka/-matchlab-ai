const form = document.querySelector('#search-form');
const input = document.querySelector('#question');
const searchButton = document.querySelector('#search-button');
const statusEl = document.querySelector('#status');
const resultSection = document.querySelector('#result-section');
const loading = document.querySelector('#loading');
const errorEl = document.querySelector('#error');
const answerEl = document.querySelector('#answer');
const sourcesWrap = document.querySelector('#sources-wrap');
const sourcesEl = document.querySelector('#sources');
const timestampEl = document.querySelector('#timestamp');
let selectedSport = 'all';

function setVisible(el, visible) { el.classList.toggle('hidden', !visible); }
function escapeHTML(value) { return value.replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function renderMarkdown(text) {
  // Escape first, then render a small safe subset of Markdown. Raw HTML is never executed.
  let s = escapeHTML(text);
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  s = s.replace(/^### (.*)$/gm, '<h3>$1</h3>').replace(/^## (.*)$/gm, '<h2>$1</h2>').replace(/^# (.*)$/gm, '<h2>$1</h2>');
  s = s.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>');
  const lines = s.split('\n'); let out = ''; let inList = false;
  for (const line of lines) {
    if (/^\s*[-*] /.test(line)) { if (!inList) { out += '<ul>'; inList = true; } out += '<li>' + line.replace(/^\s*[-*] /, '') + '</li>'; }
    else { if (inList) { out += '</ul>'; inList = false; } if (line.trim()) out += /^<h[23]>/.test(line) ? line : '<p>' + line + '</p>'; }
  }
  if (inList) out += '</ul>';
  return out;
}

async function checkStatus() {
  try {
    const r = await fetch('/api/status'); const data = await r.json();
    statusEl.className = 'status ' + (data.configured ? 'ok' : 'bad');
    statusEl.innerHTML = '<i></i> ' + (data.configured ? 'Ricerca web pronta' : 'Configurazione API richiesta');
  } catch {
    statusEl.className = 'status bad'; statusEl.innerHTML = '<i></i> Servizio non raggiungibile';
  }
}

document.querySelectorAll('.sport').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.sport').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
  button.classList.add('active'); button.setAttribute('aria-pressed', 'true'); selectedSport = button.dataset.sport;
  const examples = { all: 'Scrivi una domanda su calcio, NBA o tennis…', football: 'Es. Confronta tiri e calci d’angolo delle partite di oggi…', nba: 'Es. Confronta triple, rimbalzi e assist nelle ultime 5 partite…', tennis: 'Es. Confronta forma recente e precedenti su questa superficie…' };
  input.placeholder = examples[selectedSport];
}));

document.querySelectorAll('.example').forEach(button => button.addEventListener('click', () => { input.value = button.dataset.question; input.focus(); input.scrollIntoView({ behavior: 'smooth', block: 'center' }); }));
document.querySelector('#clear-button').addEventListener('click', () => { input.value = ''; resultSection.classList.add('hidden'); input.focus(); });

form.addEventListener('submit', async event => {
  event.preventDefault();
  const question = input.value.trim(); if (!question) return;
  resultSection.classList.remove('hidden'); setVisible(loading, true); setVisible(errorEl, false); setVisible(answerEl, false); setVisible(sourcesWrap, false); timestampEl.textContent = '';
  searchButton.disabled = true; searchButton.querySelector('span').textContent = 'Cerco…';
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  try {
    const response = await fetch('/api/search', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question, sport: selectedSport }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'La ricerca non è riuscita.');
    answerEl.innerHTML = renderMarkdown(data.answer || 'Nessun risultato testuale.'); setVisible(answerEl, true);
    const sources = Array.isArray(data.sources) ? data.sources : [];
    sourcesEl.replaceChildren();
    sources.forEach(source => { try { const url = new URL(source.url); if (!['http:', 'https:'].includes(url.protocol)) return; const a = document.createElement('a'); a.className = 'source'; a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = source.title || url.hostname; const small = document.createElement('small'); small.textContent = url.hostname; a.appendChild(small); sourcesEl.appendChild(a); } catch {} });
    setVisible(sourcesWrap, sourcesEl.childElementCount > 0);
    const date = data.generatedAt ? new Date(data.generatedAt) : new Date(); timestampEl.textContent = 'Ricerca eseguita il ' + date.toLocaleString('it-IT') + ' · Modello: ' + (data.model || 'configurato sul server');
  } catch (error) { errorEl.textContent = error.message || 'Errore imprevisto.'; setVisible(errorEl, true); }
  finally { setVisible(loading, false); searchButton.disabled = false; searchButton.querySelector('span').textContent = 'Cerca'; await checkStatus(); }
});
checkStatus();
