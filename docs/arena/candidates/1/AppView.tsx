import { useId, useMemo, useRef, useState } from 'react';
import type { AppModel } from './app-model';
import FloatingPanel from './FloatingPanel';
import './view.css';

const glyphs: Record<string, string> = { rat: '子', ox: '丑', tiger: '寅', hare: '卯', dragon: '辰', snake: '巳', horse: '午', ram: '未', monkey: '申', bird: '酉', dog: '戌', boar: '亥' };

export default function AppView({ model }: { model: AppModel }) {
  const archive = useRef<HTMLDialogElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const searchId = useId();
  const sealId = useId();
  const [search, setSearch] = useState('');
  const [nature, setNature] = useState('all');
  const [calibrationSeal, setCalibrationSeal] = useState(model.seals[0]?.id ?? 'rat');
  const [previewRequested, setPreviewRequested] = useState(false);
  const variant = model.selected.variants.find(v => v.id === model.variantId) ?? model.selected.variants[0];
  const natures = useMemo(() => Array.from(new Set(model.techniques.flatMap(t => t.nature))).sort(), [model.techniques]);
  const filtered = model.techniques.filter(t => (nature === 'all' || t.nature.includes(nature)) && `${t.name} ${t.family} ${t.nature.join(' ')}`.toLowerCase().includes(search.toLowerCase()));
  const live = model.cameraStatus === 'live';
  const pending = model.cameraStatus === 'requesting';
  const canCapture = live && model.trackerStatus === 'ready';
  const completed = model.sequence.length > 0 && model.progress >= model.sequence.length;
  const preview = () => { setPreviewRequested(true); model.previewEffect(); };
  const reset = () => { setPreviewRequested(false); model.resetSequence(); };
  const cameraAction = () => { if (live || pending) model.stopCamera(); else { model.setMode('camera'); model.startCamera(); } };
  const evidence = variant?.evidence === 'primary_verified' ? 'Primary source verified' : variant?.evidence === 'secondary_reported' ? 'Secondary source · provisional' : 'Sequence unresolved';

  return <main className={`field-camera${model.reducedMotion ? ' reduce-motion' : ''}`}>
    <div className="camera-surface">{model.stage}</div>
    <div className="camera-vignette" aria-hidden="true" />
    <div className="camera-corners" aria-hidden="true"><i/><i/><i/><i/></div>
    <header className="camera-masthead">
      <div className="field-wordmark"><span className="mark" aria-hidden="true">✳</span><div><strong>NARUTO</strong><span>NINJA / FIELD CAMERA</span></div></div>
      <div className="top-right"><div className="source-switch" aria-label="Camera source"><button aria-pressed={model.mode === 'camera'} onClick={() => model.setMode('camera')}>Camera</button><button aria-pressed={model.mode === 'demo'} onClick={() => model.setMode('demo')}>Demo</button></div><span className={`camera-signal${live ? ' is-live' : ''}`}><i/>{live ? 'LIVE' : pending ? 'CONNECTING' : model.mode === 'demo' ? 'DEMO' : 'OFFLINE'}</span></div>
    </header>
    <div className="camera-notices" aria-live="polite">
      {model.mode === 'camera' && <p className={`camera-status${model.cameraStatus === 'error' ? ' error' : ''}`}>{pending ? 'Allow camera access in your browser. You can cancel below.' : model.cameraMessage}</p>}
      {live && <p className="tracking-notice">{model.trackerStatus === 'ready' ? `${model.handsDetected} hands visible · ${model.detectedSeal ?? 'No seal matched'}` : model.trackerMessage}</p>}
      {model.activeEffect && <p className="effect-notice">{previewRequested ? 'EFFECT PREVIEW / SIMULATION' : completed ? 'PRACTICE SEQUENCE COMPLETE' : 'EFFECT ACTIVE'}<span>{model.effectName}</span></p>}
    </div>

    <FloatingPanel title="HAND SEQUENCE">
      <div className="sequence-sheet">
        <div className="sequence-title"><div><span className="category">{model.selected.nature.join(' / ') || model.selected.family}</span><h1>{model.selected.name}</h1></div><b aria-hidden="true">術</b></div>
        {model.sequence.length > 0 ? <>
          <div className="sequence-progress"><span>{completed ? 'Sequence complete' : `Next: ${model.sequence[model.progress]?.name ?? 'Ready'}`}</span><span>{Math.min(model.progress, model.sequence.length)} / {model.sequence.length}</span></div>
          <ol className="seal-rail" aria-label="Technique hand signs in order">{model.sequence.map((seal, index) => <li key={`${index}-${seal.id}`} className={index < model.progress ? 'done' : index === model.progress ? 'current' : ''}><button aria-label={`Step ${index + 1}: ${seal.name}${index < model.progress ? ', completed' : index === model.progress ? ', next' : ''}`} aria-current={index === model.progress ? 'step' : undefined} onClick={() => { setPreviewRequested(false); model.inputSeal(seal.id); }}><span className="seal-number">{index < model.progress ? '✓' : String(index + 1).padStart(2, '0')}</span><span className="seal-character" aria-hidden="true">{glyphs[seal.id] ?? '印'}</span><span className="seal-name">{seal.name}</span></button></li>)}</ol>
          <p className="sequence-hint">Tap signs to practice. Camera recognition needs your saved samples.</p>
        </> : <div className="no-sequence"><strong>{variant?.kind === 'no_seals' ? 'No hand seals reported.' : 'No confirmed sequence available.'}</strong><p>You can still preview this technique’s visual effect.</p></div>}
        <div className="sequence-actions"><button onClick={reset}>↺ Reset practice</button><button onClick={() => archive.current?.showModal()}>Change jutsu ↗</button></div>
        <p className="runtime-status" role="status">{model.status}</p>
        <details className="sequence-evidence"><summary>{evidence}</summary><div>{model.selected.variants.length > 1 && <label>Sequence version<select value={model.variantId} onChange={event => { setPreviewRequested(false); model.selectVariant(event.target.value); }}>{model.selected.variants.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}</select></label>}<p>{variant?.label}</p>{variant?.notes.map((note, i) => <p key={i}>{note}</p>)}{variant?.sourceUrl && <a className="source-link" href={variant.sourceUrl} target="_blank" rel="noreferrer">Read the source ↗</a>}<p>Zodiac characters identify the seals; they are not hand-position diagrams.</p></div></details>
      </div>
    </FloatingPanel>

    <nav className="camera-dock" aria-label="Camera controls">
      <button className={`dock-button camera-button${live || pending ? ' stop' : ''}`} onClick={cameraAction}><span className="dock-icon" aria-hidden="true">{live || pending ? '■' : '●'}</span>{pending ? 'Cancel' : live ? 'End camera' : 'Start camera'}</button>
      <span className="dock-separator"/>
      <button className="dock-button" onClick={() => archive.current?.showModal()}><span className="dock-icon" aria-hidden="true">▤</span>Techniques</button>
      <button className="dock-button" onClick={preview}><span className="dock-icon" aria-hidden="true">✧</span>Preview</button>
      <button className="dock-button settings-button" aria-label="Settings and calibration" onClick={() => settings.current?.showModal()}><span className="dock-icon" aria-hidden="true">☷</span><span>Settings</span></button>
    </nav>

    <dialog className="terminal-dialog archive-dialog" ref={archive} aria-labelledby="archive-title"><div className="dialog-inner">
      <header className="dialog-heading"><div><span className="dialog-eyebrow">THE FIELD ARCHIVE</span><h2 id="archive-title">Choose your jutsu.</h2></div><button className="close-dialog" aria-label="Close technique catalogue" onClick={() => archive.current?.close()}>×</button></header>
      <div className="archive-filters"><label htmlFor={searchId}>Find a technique<input id={searchId} type="search" value={search} placeholder="Name, clan, or nature…" onChange={e => setSearch(e.target.value)}/></label><label className="nature-picker">Nature<select value={nature} onChange={e => setNature(e.target.value)}><option value="all">All natures</option>{natures.map(n => <option key={n} value={n}>{n}</option>)}</select></label></div>
      <div className="archive-count">{filtered.length} / {model.techniques.length} techniques<span>Choose one to load its sequence</span></div>
      <div className="technique-list">{filtered.map(t => <button key={t.id} className={t.id === model.selected.id ? 'is-selected' : ''} onClick={() => { setPreviewRequested(false); model.selectTechnique(t.id); archive.current?.close(); }}><span className="entry-marker" aria-hidden="true">{t.id === model.selected.id ? '●' : '○'}</span><span><strong>{t.name}</strong><small>{[t.family, t.nature.join(' / ')].filter(Boolean).join(' · ')}</small></span><span className="entry-arrow" aria-hidden="true">↗</span></button>)}{!filtered.length && <p className="no-results">No match. Try a clan name or another nature.</p>}</div>
      <footer className="dialog-footer">Source-reported sequences. Variants and evidence travel with every technique.</footer>
    </div></dialog>

    <dialog className="terminal-dialog settings-dialog" ref={settings} aria-labelledby="settings-title"><div className="dialog-inner">
      <header className="dialog-heading"><div><span className="dialog-eyebrow">PERSONAL FIELD SETTINGS</span><h2 id="settings-title">Make it yours.</h2></div><button className="close-dialog" aria-label="Close settings" onClick={() => settings.current?.close()}>×</button></header>
      <div className="settings-content"><div className="view-settings"><label><span>Mirror camera</span><input type="checkbox" checked={model.mirrored} onChange={model.toggleMirror}/></label><label><span>Reduced motion</span><input type="checkbox" checked={model.reducedMotion} onChange={model.toggleReducedMotion}/></label></div><p className="settings-note">Effects are visual simulations. Eye and face effects are previews; face tracking is not guaranteed.</p>
      <section className="calibration-section" aria-labelledby="calibration-title"><div className="calibration-heading"><h3 id="calibration-title">Teach your hand signs.</h3><span>EXPERIMENTAL</span></div><p>Hand tracking alone does not know Naruto signs. Save at least 3 examples of each pose for your personal two-hand recognizer.</p><label htmlFor={sealId} className="calibration-select">Pose to capture<select id={sealId} value={calibrationSeal} onChange={e => setCalibrationSeal(e.target.value)}>{model.seals.map(seal => <option key={seal.id} value={seal.id}>{seal.name} · {model.samples[seal.id] ?? 0} saved</option>)}</select></label><p className="capture-instructions">Capture starts a 3-second countdown. This panel closes so you can put both hands in frame. Both hands must be visible when the sample is taken.</p><button className="capture-button" disabled={!canCapture} onClick={() => { settings.current?.close(); model.calibrate(calibrationSeal); }}>Capture {model.seals.find(s => s.id === calibrationSeal)?.name} · {model.samples[calibrationSeal] ?? 0} saved</button><p className="capture-availability">{canCapture ? 'Camera and tracker ready. Hold your pose after the countdown.' : 'Start the camera and wait for the tracker before capturing.'}</p><button className="clear-samples" onClick={model.clearCalibration}>Clear saved samples ({Object.values(model.samples).reduce((sum, n) => sum + n, 0)})</button></section></div>
    </div></dialog>
  </main>;
}
