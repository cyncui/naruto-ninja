import { useRef, useState } from 'react';
import type { AppModel } from './app-model';
import FloatingPanel from './FloatingPanel';
import './view.css';

export default function AppView({ model }: { model: AppModel }) {
  const catalogue = useRef<HTMLDialogElement>(null);
  const settings = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState('');
  const [family, setFamily] = useState('all');
  const [calibrationSeal, setCalibrationSeal] = useState(model.seals[0]?.id || '');
  const variant = model.selected.variants.find(v => v.id === model.variantId) || model.selected.variants[0];
  const choices = model.techniques.filter(t => (family === 'all' || t.family === family) && `${t.name} ${t.family} ${t.nature.join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  const families = [...new Set(model.techniques.map(t => t.family))].sort();
  const totalSamples = Object.values(model.samples).reduce((a,b) => a+b,0);
  const currentSeal = model.sequence[model.progress];
  const ready = model.cameraStatus === 'live' && model.trackerStatus === 'ready';
  const completed = model.sequence.length > 0 && model.progress >= model.sequence.length;
  const cameraLabel = model.cameraStatus === 'live' ? 'End camera' : model.cameraStatus === 'requesting' ? 'Cancel request' : 'Start camera';
  const feedLabel = model.mode === 'demo' ? 'DEMO / SIMULATION' : model.cameraStatus === 'live' ? 'CAMERA / LIVE' : model.cameraStatus === 'requesting' ? 'CAMERA / REQUESTING' : model.cameraStatus === 'error' ? 'CAMERA / ERROR' : 'CAMERA / STANDBY';
  return <main className="ninja-screen">
    <div className="full-camera" aria-label="Camera and visual effect viewfinder">{model.stage}</div>
    <header className="masthead">
      <div className="brand"><span className="brand-seal" aria-hidden="true">忍</span><div><strong>NARUTO<span>/</span>NINJA</strong><small>HAND SEAL LABORATORY</small></div></div>
      <div className="feed-state"><i className={model.cameraStatus === 'live' && model.mode === 'camera' ? 'pilot on' : 'pilot'} />{feedLabel}</div>
      <span className="edition">VOL. 01 / EXPERIMENTAL</span><div className="mobile-mode" aria-label="Input mode"><button aria-pressed={model.mode === 'demo'} onClick={() => model.setMode('demo')}>Demo</button><button aria-pressed={model.mode === 'camera'} onClick={() => model.setMode('camera')}>Camera</button></div>
    </header>
    <div className="camera-readout"><span className="mobile-feed">{feedLabel}</span><span>{model.mode === 'demo' ? 'MANUAL REHEARSAL' : `TRACKER: ${model.trackerStatus.toUpperCase()}`}</span>{model.mode === 'camera' && <span>{model.handsDetected}/2 HANDS{model.detectedSeal ? ` · ${model.detectedSeal}` : ''}</span>}<span>{model.activeEffect ? 'VISUAL SIMULATION ACTIVE' : 'EFFECT STANDBY'}</span></div>
    {(model.cameraMessage || model.trackerMessage) && <div className="device-message" role={model.cameraStatus === 'error' || model.trackerStatus === 'error' ? 'alert' : 'status'}>{model.cameraMessage && <p>{model.cameraMessage}</p>}{model.trackerMessage && <p>{model.trackerMessage}</p>}</div>}
    <FloatingPanel title="HAND SEQUENCE">
      <div className="sequence-content">
        <div className="technique-heading"><div><span className="eyebrow">{model.selected.family}{model.selected.nature.length ? ` / ${model.selected.nature.join(' + ')}` : ''}</span><h1>{model.selected.name}</h1></div><button className="change-technique" onClick={() => catalogue.current?.showModal()} aria-label="Change technique">↗</button></div>
        {model.selected.variants.length > 1 && <label className="variant-picker"><span>Sequence</span><select value={model.variantId} onChange={e => model.selectVariant(e.target.value)}>{model.selected.variants.map(v => <option value={v.id} key={v.id}>{v.label}</option>)}</select></label>}
        {model.sequence.length ? <ol className="sequence-rail">{model.sequence.map((seal,index) => <li key={`${index}-${seal.id}`}><button onClick={() => model.inputSeal(seal.id)} className={`seal-step ${index < model.progress ? 'complete' : ''} ${index === model.progress ? 'current' : ''}`} aria-current={index === model.progress ? 'step' : undefined} aria-label={`Practice step ${index+1}: ${seal.name}`}><span>{index < model.progress ? '✓' : String(index+1).padStart(2,'0')}</span><strong>{seal.name}</strong></button></li>)}</ol> : <div className="no-sequence"><strong>{variant?.kind === 'no_seals' ? 'No hand seals reported.' : 'Sequence unresolved.'}</strong><p>Effect preview is available below.</p></div>}
        <div className="practice-row"><div role="status"><strong>{completed ? 'Practice complete.' : currentSeal ? `Next: ${currentSeal.name}` : 'Preview only'}</strong><span>{model.sequence.length ? `${Math.min(model.progress,model.sequence.length)} of ${model.sequence.length} signs` : 'No automatic casting'}</span></div><button onClick={model.resetSequence}>↺ Reset</button></div>
        <p className="runtime-status" role="status">{model.status}</p>
        <details className="source-notes"><summary>Source & notes <span>+</span></summary><div><p>{variant?.evidence === 'primary_verified' ? 'Primary source verified.' : variant?.evidence === 'unresolved' ? 'Activation unresolved. No sequence verified.' : 'Secondary-reported sequence. Not primary-verified.'} {variant?.sourceUrl && <a href={variant.sourceUrl} target="_blank" rel="noreferrer">View reference ↗</a>}</p>{variant?.notes.map((note,i) => <p key={i}>{note}</p>)}<p>Click numbered signs to rehearse. Repeated signs are separate steps. Effect preview is a simulation, independent of completing practice.</p></div></details>
      </div>
    </FloatingPanel>
    <nav className="control-dock" aria-label="Camera and practice controls">
      <div className="mode-switch" aria-label="Input mode"><button aria-pressed={model.mode === 'demo'} onClick={() => model.setMode('demo')}>Demo</button><button aria-pressed={model.mode === 'camera'} onClick={() => model.setMode('camera')}>Camera</button></div>
      <button className="camera-button" onClick={model.cameraStatus === 'live' || model.cameraStatus === 'requesting' ? model.stopCamera : model.startCamera}><span aria-hidden="true">{model.cameraStatus === 'live' ? '■' : '●'}</span> {cameraLabel}</button>
      <span className="dock-divider"/>
      <button className="catalogue-button" onClick={() => catalogue.current?.showModal()}><span aria-hidden="true">▤</span> Techniques</button>
      <button className="preview-button" onClick={model.previewEffect}>Preview effect <span aria-hidden="true">↗</span></button>
      <button className="settings-button" onClick={() => settings.current?.showModal()}>Calibration <span aria-hidden="true">+</span></button>
    </nav>
    <dialog className="lab-dialog" ref={catalogue} aria-labelledby="catalogue-title">
      <header className="dialog-header"><span>01 / REFERENCE LIBRARY</span><button aria-label="Close technique catalogue" onClick={() => catalogue.current?.close()}>×</button></header>
      <div className="dialog-content"><h2 id="catalogue-title">Technique index<span>{model.techniques.length} entries</span></h2><div className="library-filters"><label className="search-label"><span>Search techniques, clans, or nature</span><input type="search" placeholder="e.g. Fire, Uchiha, Shadow…" value={query} onChange={e => setQuery(e.target.value)} autoFocus/></label><label><span>Collection</span><select value={family} onChange={e => setFamily(e.target.value)}><option value="all">All collections</option>{families.map(f => <option key={f}>{f}</option>)}</select></label></div><p className="results-count" aria-live="polite">{choices.length} matching {choices.length===1?'entry':'entries'}</p><div className="technique-list">{choices.map(t => <button className={`technique-item ${t.id===model.selected.id?'selected':''}`} key={t.id} onClick={() => {model.selectTechnique(t.id);catalogue.current?.close();}} aria-pressed={t.id===model.selected.id}><span><strong>{t.name}</strong><small>{t.family}{t.nature.length ? ` / ${t.nature.join(' + ')}` : ''}</small></span><span aria-hidden="true">{t.id===model.selected.id?'●':'↗'}</span></button>)}{!choices.length&&<p>No matching techniques. Try a different search.</p>}</div></div>
    </dialog>
    <dialog className="lab-dialog calibration-dialog" ref={settings} aria-labelledby="calibration-title">
      <header className="dialog-header"><span>02 / PERSONAL SETUP</span><button aria-label="Close calibration and settings" onClick={() => settings.current?.close()}>×</button></header>
      <div className="dialog-content"><h2 id="calibration-title">Teach your hands.</h2><p className="calibration-intro">Recognition is personal and experimental. Hand tracking alone does not know Naruto signs.</p><div className="calibration-instruction"><strong>3 seconds to get ready. 3 samples per pose.</strong><p>Choose a seal, press capture, then put both hands back in view. Hold the pose until the countdown finishes. Both hands must be tracked at capture.</p></div><label className="calibration-choice"><span>Seal to teach</span><select value={calibrationSeal} onChange={e=>setCalibrationSeal(e.target.value)}>{model.seals.map(s=><option key={s.id} value={s.id}>{s.name} · {model.samples[s.id]||0} saved</option>)}</select></label><div className="capture-row"><button className="preview-button" disabled={!ready || !calibrationSeal} onClick={()=>model.calibrate(calibrationSeal)}>Capture in 3 seconds ↗</button><span>{totalSamples} examples saved</span></div><p className="calibration-status" role="status">{ready?model.status:'Start the camera and wait for the hand tracker before capturing.'}</p><button className="clear-samples" onClick={model.clearCalibration} disabled={!totalSamples}>Clear saved examples</button><div className="preferences"><label><input type="checkbox" checked={model.mirrored} onChange={model.toggleMirror}/> Mirror camera feed</label><label><input type="checkbox" checked={model.reducedMotion} onChange={model.toggleReducedMotion}/> Reduce effect motion</label></div><p className="calibration-foot">Effects are visual simulations. Eye and face previews do not guarantee face tracking.</p></div>
    </dialog>
  </main>;
}
