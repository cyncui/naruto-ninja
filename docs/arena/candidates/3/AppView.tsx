import { useRef, useState } from 'react';
import type { AppModel } from './app-model';
import FloatingPanel from './FloatingPanel';
import './view.css';

const shortName = (name: string) => name.replace(/^(Fire|Water|Wind|Earth|Lightning|Wood|Ice) Release: /, '').replace(/ Technique$/, '');

export default function AppView({ model }: { model: AppModel }) {
  const catalogue = useRef<HTMLDialogElement>(null);
  const calibration = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('All');
  const [sampleSeal, setSampleSeal] = useState(model.seals[0]?.id ?? 'tiger');
  const variant = model.selected.variants.find(item => item.id === model.variantId) ?? model.selected.variants[0];
  const families = ['All', ...new Set(model.techniques.map(item => item.family).filter(Boolean))];
  const visible = model.techniques.filter(item => (family === 'All' || item.family === family) && `${item.name} ${item.family} ${item.nature.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const sampleCount = Object.values(model.samples).reduce((sum, count) => sum + count, 0);
  const canCapture = model.cameraStatus === 'live' && model.trackerStatus === 'ready';
  const cameraRunning = model.cameraStatus === 'live' || model.cameraStatus === 'requesting';
  const inputState = model.mode === 'demo' ? 'DEMO / SIMULATION' : model.cameraStatus === 'live' ? 'CAMERA / LIVE' : model.cameraStatus === 'requesting' ? 'CAMERA / OPENING' : 'CAMERA / STANDBY';
  const error = model.cameraStatus === 'error' || model.trackerStatus === 'error';

  return <main className="field-app">
    <div className="full-stage" aria-label="Camera viewfinder">{model.stage}</div>
    <div className="lens-shade" aria-hidden="true"/>
    <header className="masthead">
      <div className="brand"><span className="brand-mark" aria-hidden="true">忍</span><div>NARUTO<span>NINJA</span></div><span className="brand-note">HAND SIGN<br/>FIELD STUDY</span></div>
      <div className="top-controls"><span className="input-state"><i className={model.mode === 'camera' && model.cameraStatus === 'live' ? 'record-light on' : 'record-light'}/>{inputState}</span><button className="glass-button tune-button" onClick={() => calibration.current?.showModal()} aria-haspopup="dialog">Calibration <span aria-hidden="true">⌁</span></button></div>
    </header>
    <div className="mobile-mode-switch" role="group" aria-label="Input mode"><button aria-pressed={model.mode === 'demo'} onClick={() => model.setMode('demo')}>Demo</button><button aria-pressed={model.mode === 'camera'} onClick={() => model.setMode('camera')}>Camera</button></div>
    <div className="viewfinder-guide" aria-hidden="true"><i/><i/><i/><i/></div>
    <div className="field-caption"><span>THE TRAINING ROOM</span><p>Form.<br/><em>Focus.</em><br/>Cast.</p></div>
    <div className="live-messages" role={error ? 'alert' : 'status'} aria-live="polite">{(model.cameraMessage || model.trackerMessage) && <div className={error ? 'runtime-note error' : 'runtime-note'}>{model.cameraMessage && <p>{model.cameraMessage}</p>}{model.trackerMessage && <p>{model.trackerMessage}</p>}</div>}</div>

    <FloatingPanel title="HAND SEQUENCE">
      <div className="sequence-head"><div><span className="eyebrow">{model.selected.family}{model.selected.nature.length ? ` / ${model.selected.nature.join(', ')}` : ''}</span><h1>{shortName(model.selected.name)}</h1></div><button className="change-technique" onClick={() => catalogue.current?.showModal()} aria-haspopup="dialog" aria-label="Choose another technique">↗</button></div>
      {model.sequence.length ? <><div className="sequence-progress"><span>{model.progress >= model.sequence.length ? 'Practice sequence complete' : `Next: ${model.sequence[model.progress]?.name}`}</span><span>{Math.min(model.progress, model.sequence.length)} / {model.sequence.length}</span></div><ol className="sequence-rail">{model.sequence.map((seal, index) => <li key={`${index}-${seal.id}`} className={index < model.progress ? 'complete' : index === model.progress ? 'current' : ''}><button onClick={() => model.inputSeal(seal.id)} aria-label={`Practice step ${index + 1}: ${seal.name}`} aria-current={index === model.progress ? 'step' : undefined}><span>{String(index + 1).padStart(2, '0')}{index < model.progress ? ' ✓' : ''}</span><strong>{seal.name}</strong></button></li>)}</ol></> : <p className="empty-sequence">{variant?.kind === 'no_seals' ? 'No hand seals are reported for this technique.' : 'No complete sequence is established.'} Effect preview is still available.</p>}
      <div className="sequence-actions"><span>Tap seals to practice.</span><button onClick={model.resetSequence}>Reset practice</button></div>
      <p className="sequence-status" aria-live="polite">{model.status}</p>
      <details className="sequence-details"><summary>Reference &amp; practice inputs</summary>
        {model.selected.variants.length > 1 && <label className="variant-label">Sequence version<select value={model.variantId} onChange={event => model.selectVariant(event.target.value)}>{model.selected.variants.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>}
        <div className="source-line"><span>{variant?.evidence.replaceAll('_', ' ') ?? 'Unresolved'}</span>{variant?.sourceUrl && <a href={variant.sourceUrl} target="_blank" rel="noreferrer">Source ↗</a>}</div>
        {variant?.notes.length > 0 && <p>{variant.notes.join(' ')}</p>}
        <p>Preview is a simulation, separate from completing the practice sequence. Eye and face effects do not guarantee face tracking.</p>
        <div className="seal-keyboard" aria-label="Free seal practice">{model.seals.map(seal => <button key={seal.id} onClick={() => model.inputSeal(seal.id)}>{seal.name}</button>)}</div>
      </details>
    </FloatingPanel>

    <nav className="camera-dock" aria-label="Camera and technique controls">
      <div className="mode-switch" role="group" aria-label="Input mode"><button aria-pressed={model.mode === 'demo'} onClick={() => model.setMode('demo')}>Demo</button><button aria-pressed={model.mode === 'camera'} onClick={() => model.setMode('camera')}>Camera</button></div>
      <button className="camera-button" onClick={cameraRunning ? model.stopCamera : model.startCamera}><span aria-hidden="true">{cameraRunning ? '■' : '●'}</span> {model.cameraStatus === 'requesting' ? 'Cancel camera' : model.cameraStatus === 'live' ? 'End camera' : 'Start camera'}</button>
      <span className="dock-divider" aria-hidden="true"/>
      <button className="catalogue-button" onClick={() => catalogue.current?.showModal()} aria-haspopup="dialog"><span className="desktop-only">THE INDEX / </span>Techniques <span aria-hidden="true">↗</span></button>
      <button className="preview-button" onClick={model.previewEffect}>Preview effect <span aria-hidden="true">▷</span></button>
      <span className="dock-annotation">EXPERIMENTAL<br/>PERSONAL RECOGNITION</span>
    </nav>

    <dialog ref={catalogue} className="field-dialog catalogue-dialog" aria-labelledby="catalogue-heading" onClick={event => { if (event.target === event.currentTarget) catalogue.current?.close(); }}>
      <div className="dialog-header"><div><span className="eyebrow">THE TECHNIQUE INDEX</span><h2 id="catalogue-heading">Choose your <em>next move.</em></h2></div><button className="dialog-close" onClick={() => catalogue.current?.close()} aria-label="Close technique catalogue">×</button></div>
      <div className="catalogue-tools"><label className="search-label">Search techniques, clans, elements<input autoFocus type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Fireball, Uchiha, water…"/></label><label className="family-label">Collection<select value={family} onChange={event => setFamily(event.target.value)}>{families.map(item => <option key={item}>{item}</option>)}</select></label></div>
      <p className="result-count" aria-live="polite">{visible.length} of {model.techniques.length} techniques</p>
      <ul className="technique-list">{visible.map((technique, index) => <li key={technique.id}><button className={technique.id === model.selected.id ? 'selected' : ''} aria-pressed={technique.id === model.selected.id} onClick={() => { model.selectTechnique(technique.id); catalogue.current?.close(); }}><span className="technique-number">{String(index + 1).padStart(2, '0')}</span><span><strong>{shortName(technique.name)}</strong><small>{technique.family}{technique.nature.length ? ` / ${technique.nature.join(', ')}` : ''}</small></span><span className="select-arrow" aria-hidden="true">↗</span></button></li>)}</ul>
      {!visible.length && <p className="no-results">No matches. Try a different name or collection.</p>}
      <p className="dialog-footnote">Research references, not a trained recognition library. Every technique remains available for effect preview.</p>
    </dialog>

    <dialog ref={calibration} className="field-dialog calibration-dialog" aria-labelledby="calibration-heading" onClick={event => { if (event.target === event.currentTarget) calibration.current?.close(); }}>
      <div className="dialog-header"><div><span className="eyebrow">PERSONAL CALIBRATION</span><h2 id="calibration-heading">Teach it <em>your hands.</em></h2></div><button className="dialog-close" onClick={() => calibration.current?.close()} aria-label="Close calibration">×</button></div>
      <p className="calibration-intro">Hand tracking alone does not know Naruto signs. This local two-hand recognizer is experimental. Save at least <b>3 samples per pose.</b></p>
      <div className="capture-form"><label>Choose a seal<select value={sampleSeal} onChange={event => setSampleSeal(event.target.value)}>{model.seals.map(seal => <option key={seal.id} value={seal.id}>{seal.name} · {model.samples[seal.id] ?? 0} samples</option>)}</select></label><button className="capture-button" disabled={!canCapture} onClick={() => { model.calibrate(sampleSeal); calibration.current?.close(); }}>Capture in 3 seconds ↗</button></div>
      <p className="capture-help">{canCapture ? 'The dialog closes for the countdown. Return both hands to frame and hold the selected pose.' : 'Start the camera and wait for hand tracking to be ready. Both hands must be visible when the countdown ends.'}</p>
      <div className="calibration-summary"><span>{sampleCount} saved examples</span><button onClick={model.clearCalibration} disabled={!sampleCount}>Clear samples</button></div>
      <div className="preferences"><label><input type="checkbox" checked={model.mirrored} onChange={model.toggleMirror}/> Mirror camera</label><label><input type="checkbox" checked={model.reducedMotion} onChange={model.toggleReducedMotion}/> Reduced motion</label></div>
      <p className="dialog-footnote">Camera: {model.cameraStatus}. Tracker: {model.trackerStatus}. {model.handsDetected} / 2 hands visible.{model.detectedSeal ? ` Detected: ${model.seals.find(seal => seal.id === model.detectedSeal)?.name ?? model.detectedSeal}.` : ''}</p>
    </dialog>
  </main>;
}
