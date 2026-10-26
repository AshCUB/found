import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { DESK_SRC, loadEnvelopeAssets } from './assets';
import './Envelope.css';

const RECIPIENT_NAME = 'JANE DOE';

// All envelope durations (ms) and easings. Closing plays the same steps in reverse order.
export const TIMINGS = {
  select: { duration: 500, easing: 'ease-out' },
  flipToEdge: { duration: 300, easing: 'ease-in' },
  flipFromEdge: { duration: 300, easing: 'ease-out' },
  flapToEdge: { duration: 320, easing: 'ease-in' },
  flapFromEdge: { duration: 320, easing: 'ease-out' },
};

const SELECTED_SCALE = 1.18;
const OVERLAY_OPACITY = 0.45;
const FLIP_DIM = 0.8;
const FLAP_DIM = 0.85;
const FLAP_OPEN_BRIGHTNESS = 0.93;

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Envelope({ onClose }) {
  const [assets, setAssets] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | busy | open
  const [face, setFace] = useState('front');
  const overlayRef = useRef(null);
  const liftRef = useRef(null);
  const flipRef = useRef(null);
  const flapRef = useRef(null);
  const running = useRef(new Set());

  useEffect(() => {
    let active = true;
    loadEnvelopeAssets()
      .then((result) => active && setAssets(result))
      .catch((error) => {
        console.error('Error loading envelope images:', error);
        if (active) setLoadError(true);
      });
    const animations = running.current;
    return () => {
      active = false;
      animations.forEach((animation) => animation.cancel());
    };
  }, []);

  // Plays one step on each [element, keyframes] pair in parallel, then bakes the end state into inline styles.
  const step = (timing, ...tracks) => {
    const options = { ...timing, duration: reducedMotion() ? 1 : timing.duration, fill: 'forwards' };
    return Promise.all(
      tracks.map(async ([el, keyframes]) => {
        const animation = el.animate(keyframes, options);
        running.current.add(animation);
        await animation.finished;
        running.current.delete(animation);
        animation.commitStyles();
        animation.cancel();
      })
    );
  };

  const showFace = (next) => flushSync(() => setFace(next));

  const open = async () => {
    const [overlay, lift, flip, flap] = [overlayRef, liftRef, flipRef, flapRef].map((ref) => ref.current);
    await step(
      TIMINGS.select,
      [lift, { transform: ['scale(1)', `scale(${SELECTED_SCALE})`] }],
      [overlay, { opacity: [0, OVERLAY_OPACITY] }]
    );
    await step(TIMINGS.flipToEdge, [flip, { transform: ['scaleX(1)', 'scaleX(0)'], filter: ['brightness(1)', `brightness(${FLIP_DIM})`] }]);
    showFace('back');
    await step(TIMINGS.flipFromEdge, [flip, { transform: ['scaleX(0)', 'scaleX(1)'], filter: [`brightness(${FLIP_DIM})`, 'brightness(1)'] }]);
    await step(TIMINGS.flapToEdge, [flap, { transform: ['scaleY(1)', 'scaleY(0)'], filter: ['brightness(1)', `brightness(${FLAP_DIM})`] }]);
    await step(TIMINGS.flapFromEdge, [
      flap,
      { transform: ['scaleY(0)', 'scaleY(-1)'], filter: [`brightness(${FLAP_DIM})`, `brightness(${FLAP_OPEN_BRIGHTNESS})`] },
    ]);
  };

  const close = async () => {
    const [overlay, lift, flip, flap] = [overlayRef, liftRef, flipRef, flapRef].map((ref) => ref.current);
    await step(TIMINGS.flapToEdge, [
      flap,
      { transform: ['scaleY(-1)', 'scaleY(0)'], filter: [`brightness(${FLAP_OPEN_BRIGHTNESS})`, `brightness(${FLAP_DIM})`] },
    ]);
    await step(TIMINGS.flapFromEdge, [flap, { transform: ['scaleY(0)', 'scaleY(1)'], filter: [`brightness(${FLAP_DIM})`, 'brightness(1)'] }]);
    await step(TIMINGS.flipToEdge, [flip, { transform: ['scaleX(1)', 'scaleX(0)'], filter: ['brightness(1)', `brightness(${FLIP_DIM})`] }]);
    showFace('front');
    await step(TIMINGS.flipFromEdge, [flip, { transform: ['scaleX(0)', 'scaleX(1)'], filter: [`brightness(${FLIP_DIM})`, 'brightness(1)'] }]);
    await step(
      TIMINGS.select,
      [lift, { transform: [`scale(${SELECTED_SCALE})`, 'scale(1)'] }],
      [overlay, { opacity: [OVERLAY_OPACITY, 0] }]
    );
  };

  const handleTap = () => {
    if (phase === 'busy') return;
    const wasOpen = phase === 'open';
    setPhase('busy');
    (wasOpen ? close() : open()).then(
      () => setPhase(wasOpen ? 'idle' : 'open'),
      // Cancelled because the page closed mid-animation.
      () => {}
    );
  };

  return (
    <div className="envelope-scene">
      {assets && <div className="envelope-scene__desk" style={{ backgroundImage: `url(${DESK_SRC})` }} />}
      <div ref={overlayRef} className="envelope-scene__overlay" />

      <header className="envelope-scene__header">
        <p className="envelope-scene__wordmark font-primary">FOUND</p>
        <button onClick={onClose} className="envelope-scene__close font-buttons">
          ← Back
        </button>
      </header>

      {loadError && (
        <p className="envelope-scene__hint font-body" role="alert">
          we couldn't load the envelope. check your connection and try again.
        </p>
      )}

      {assets && (
        <>
          <button
            type="button"
            className="envelope"
            onClick={handleTap}
            aria-label={phase === 'open' ? 'Close envelope' : `Open envelope for ${RECIPIENT_NAME}`}
            aria-disabled={phase === 'busy'}
          >
            <div ref={liftRef} className="envelope__layer">
              <div className="envelope__layer envelope__shadow">
                <div ref={flipRef} className="envelope__layer">
                  <div className="envelope__layer" style={{ visibility: face === 'front' ? 'visible' : 'hidden' }}>
                    <img className="envelope__front" src={assets.front} alt="" draggable="false" />
                    <span className="envelope__name">{RECIPIENT_NAME}</span>
                  </div>
                  <div className="envelope__layer" style={{ visibility: face === 'back' ? 'visible' : 'hidden' }}>
                    <img className="envelope__inside" src={assets.inside} alt="" draggable="false" />
                    <div ref={flapRef} className="envelope__flap">
                      <img src={assets.flap} alt="" draggable="false" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </button>

          <p className="envelope-scene__hint font-body" aria-live="polite">
            {phase === 'open' ? 'tap to close' : phase === 'idle' ? 'tap the envelope' : '\u00a0'}
          </p>
        </>
      )}
    </div>
  );
}
