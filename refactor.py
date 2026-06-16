import sys

with open('js/main.js', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "import { Swaroscope }    from './ui/swaroscope.js';",
    "import { VisualizationEngine } from './ui/swaroscope/visualization-engine.js';"
)

content = content.replace(
    "_swaroscope?.setMode(_scopeMode);\n    showToast(_scopeMode === 'guided' ? '🎯 Guided — play an alankar' : '🎵 Free Monitor');",
    "_swaroscope?.setMode(_scopeMode);\n    showToast(_scopeMode === 'guided' ? '🎯 Guided — play an alankar' : '🎵 Free Monitor');"
)

content = content.replace(
    "if (!_swaroscope) _swaroscope = new Swaroscope('swaroscopeCanvas');\n\n    await _pitchEngine.start();\n    if (!_pitchEngine.isRunning) return;\n\n    _swaroscope.setMode(_scopeMode);\n    _swaroscope.setBasePitch(get('basePitch'));\n    _swaroscope.start(_pitchEngine, ctx);",
    "if (!_swaroscope) _swaroscope = new VisualizationEngine(document.getElementById('swaroscopeCanvas'), { basePitch: get('basePitch') }, _pitchEngine, ctx);\n\n    await _pitchEngine.start();\n    if (!_pitchEngine.isRunning) return;\n\n    _swaroscope.setMode(_scopeMode);\n    _swaroscope.start();"
)

content = content.replace(
    "subscribe('basePitch', (v) => {\n    _pitchEngine?.setBasePitch(v);\n    _swaroscope?.setBasePitch(v);\n  });",
    "subscribe('basePitch', (v) => {\n    _pitchEngine?.setBasePitch(v);\n    if (_swaroscope) _swaroscope._state.basePitch = v;\n  });"
)

oldOnPitch = """function _onPitchResult(result) {
  const nameEl   = document.getElementById('pitchSwaraName');
  const fullEl   = document.getElementById('pitchSwaraFull');
  const freqEl   = document.getElementById('pitchFreq');
  const centsEl  = document.getElementById('pitchOctave');
  const needleEl = document.getElementById('tunerNeedle');

  const SCOL = { 'pa-sa':'#34d399','komal':'#f87171','teevra':'#fbbf24','shuddh':'#c084fc' };
  const TCOL = { perfect:'#34d399', good:'#86efac', sharp:'#fbbf24', flat:'#fb923c' };

  if (!result) {
    if (nameEl)  { nameEl.textContent = '—'; nameEl.style.color = 'var(--text3)'; nameEl.style.textShadow = ''; }
    if (fullEl)   fullEl.textContent  = 'Listening…';
    if (freqEl)   freqEl.textContent  = '';
    if (centsEl)  { centsEl.textContent = ''; centsEl.style.color = 'var(--text3)'; }
    if (needleEl) { needleEl.style.left = '50%'; needleEl.style.background = 'var(--text3)'; needleEl.style.boxShadow = ''; }
    return;
  }

  const { hz, swara } = result;
  const col   = SCOL[swara.type] || '#c084fc';
  const tuneC = TCOL[swara.tuneStatus] || '#f87171';

  if (nameEl)  { nameEl.textContent = swara.label; nameEl.style.color = col; nameEl.style.textShadow = `0 0 24px ${col}90`; }
  if (fullEl)  {
    const OCT = { '-1':'Mandra', 0:'Madhya', 1:'Taar', 2:'Ati-Taar' };
    fullEl.textContent = `${swara.full} · ${OCT[swara.octOffset] ?? ''}`;
  }
  if (freqEl)  freqEl.textContent = `${hz} Hz`;
  if (centsEl) {
    const sign = swara.centsFromSwara >= 0 ? '+' : '';
    centsEl.textContent = `${sign}${swara.centsFromSwara}¢`;
    centsEl.style.color = tuneC;
  }
  if (needleEl) {
    const pct = Math.max(0, Math.min(100, ((swara.centsFromSwara + 50) / 100) * 100));
    needleEl.style.left      = `${pct}%`;
    needleEl.style.background = tuneC;
    needleEl.style.boxShadow  = `0 0 10px ${tuneC}`;
  }"""

newOnPitch = """function _onPitchResult(result) {
  const nameEl   = document.getElementById('pitchNoteName');
  const fullEl   = document.getElementById('pitchNoteSecondary');
  const freqEl   = document.getElementById('pitchFreq');
  const centsEl  = document.getElementById('pitchOctave');
  const needleEl = document.getElementById('tunerNeedle');

  const SCOL = { 'pa-sa':'#34d399','komal':'#f87171','teevra':'#fbbf24','shuddh':'#c084fc' };
  const TCOL = { perfect:'#34d399', good:'#86efac', sharp:'#fbbf24', flat:'#fb923c' };

  if (!result) {
    if (nameEl)  { nameEl.textContent = '-'; nameEl.style.color = 'var(--text3)'; nameEl.style.textShadow = ''; }
    if (fullEl)   fullEl.textContent  = 'Listening...';
    if (freqEl)   freqEl.textContent  = '';
    if (centsEl)  { centsEl.textContent = ''; centsEl.style.color = 'var(--text3)'; }
    if (needleEl) { needleEl.style.left = '50%'; needleEl.style.background = 'var(--text3)'; needleEl.style.boxShadow = ''; }
    return;
  }

  const { hz, swara, note, octave, fullNotation } = result;
  const col   = SCOL[swara.type] || '#c084fc';
  const tuneC = TCOL[swara.tuneStatus] || '#f87171';

  if (nameEl)  { 
    nameEl.textContent = fullNotation; 
    nameEl.style.color = '#fff'; 
    nameEl.style.textShadow = `0 0 16px rgba(255,255,255,0.4)`; 
  }
  if (fullEl)  {
    const OCT = { '-1':'Mandra', 0:'Madhya', 1:'Taar', 2:'Ati-Taar' };
    fullEl.textContent = `${swara.full} — ${OCT[swara.octOffset] ?? ''}`;
    fullEl.style.color = col;
  }
  if (freqEl)  freqEl.textContent = `${hz} Hz`;
  if (centsEl) {
    const sign = swara.centsFromSwara >= 0 ? '+' : '';
    centsEl.textContent = `${sign}${swara.centsFromSwara}¢`;
    centsEl.style.color = tuneC;
  }
  if (needleEl) {
    const pct = Math.max(0, Math.min(100, ((swara.centsFromSwara + 50) / 100) * 100));
    needleEl.style.left      = `${pct}%`;
    needleEl.style.background = tuneC;
    needleEl.style.boxShadow  = `0 0 10px ${tuneC}`;
  }"""

content = content.replace(oldOnPitch, newOnPitch)

content = content.replace(
    "['pitchSwaraName','pitchSwaraFull','pitchFreq','pitchOctave'].forEach(id => {\n    const el = document.getElementById(id);\n    if (el) { el.textContent = id === 'pitchSwaraName' ? '—' : ''; el.style.color = ''; }",
    "['pitchNoteName','pitchNoteSecondary','pitchFreq','pitchOctave'].forEach(id => {\n    const el = document.getElementById(id);\n    if (el) { el.textContent = id === 'pitchNoteName' ? '-' : ''; el.style.color = ''; }"
)

with open('js/main.js', 'w', encoding='utf-8') as f:
    f.write(content)
