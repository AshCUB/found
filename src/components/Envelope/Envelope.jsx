import { useEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { loadEnvelopeAssets } from './assets';
import FindCard from './FindCard';
import './Envelope.css';

const RECIPIENT_NAME = 'JANE DOE';

// All envelope durations (ms) and easings. Closing plays the same steps in reverse order.
const TIMINGS = {
  select: { duration: 500, easing: 'ease-out' },
  flipToEdge: { duration: 300, easing: 'ease-in' },
  flipFromEdge: { duration: 300, easing: 'ease-out' },
  flapToEdge: { duration: 320, easing: 'ease-in' },
  flapFromEdge: { duration: 320, easing: 'ease-out' },
  cardPull: { duration: 450, easing: 'ease-in-out' },
  cardPresent: { duration: 450, easing: 'ease-in-out' },
  // Going to the next find: the top card lifts, then tucks in behind the pile as the next card comes forward.
  shuffleLift: { duration: 340, easing: 'ease-out' },
  shuffleSettle: { duration: 480, easing: 'ease-in-out' },
};

const SELECTED_SCALE = 1.18;
const OVERLAY_OPACITY = 0.45;
const FLIP_DIM = 0.8;
const FLAP_DIM = 0.85;
const FLAP_OPEN_BRIGHTNESS = 0.93;
// Card positions, as transforms of the card: tucked in the pocket, pulled up out of the envelope, and presented in
// front of it. Pulled up must leave the card's bottom above the pocket, so moving it to the front is never seen.
// The card is taller than the envelope (the part below the envelope is hidden while it's inside).
const CARD_IN = 'translateY(0)';
const CARD_PULLED = 'translateY(-103.5%)';
const CARD_PRESENTED = 'translateY(-45%) scale(1.15)';
// The next find waits just behind the presented card, peeking out above it like the next card in a pile.
const CARD_BACK = `${CARD_PRESENTED} translateY(-5%) scale(0.95)`;
// How far the top card lifts before it tucks in behind the pile: far enough to clear the next card's top edge
// (which peeks out about 7.5% above it), so dropping behind it is never seen.
const CARD_LIFTED = `${CARD_PRESENTED} translateY(-110%)`;
// The envelope drops down (by a share of its height) while the card is pulled out, so the card stays on screen.
const ENVELOPE_RAISED = 'translateY(0)';
const ENVELOPE_LOWERED = 'translateY(60%)';

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function Envelope({ dailyFinds = [], onClose }) {
  const [assets, setAssets] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState('idle'); // idle | busy | open | shuffling
  const [face, setFace] = useState('front');
  const [flapOpen, setFlapOpen] = useState(false);
  const [cardInFront, setCardInFront] = useState(false);
  const [cardBehind, setCardBehind] = useState(false);
  const [findIndex, setFindIndex] = useState(0);
  const overlayRef = useRef(null);
  const shiftRef = useRef(null);
  const liftRef = useRef(null);
  const flipRef = useRef(null);
  const flapRef = useRef(null);
  const cardRef = useRef(null);
  const nextCardRef = useRef(null);
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
  // Pairs whose element isn't rendered (e.g. no next card with a single find) are skipped.
  const step = (timing, ...tracks) => {
    const options = { ...timing, duration: reducedMotion() ? 1 : timing.duration, fill: 'forwards' };
    return Promise.all(
      tracks.filter(([el]) => el).map(async ([el, keyframes]) => {
        const animation = el.animate(keyframes, options);
        running.current.add(animation);
        await animation.finished;
        running.current.delete(animation);
        animation.commitStyles();
        animation.cancel();
      })
    );
  };

  // Layering changes happen while the piece is scaled to zero or out of the way, so they're never seen.
  const showFace = (next) => flushSync(() => setFace(next));
  const showFlapOpen = (next) => flushSync(() => setFlapOpen(next));
  const showCardInFront = (next) => flushSync(() => setCardInFront(next));

  const elements = () =>
    [overlayRef, shiftRef, liftRef, flipRef, flapRef, cardRef, nextCardRef].map((ref) => ref.current);

  const open = async () => {
    const [overlay, shift, lift, flip, flap, card, nextCard] = elements();
    await step(
      TIMINGS.select,
      [lift, { transform: ['scale(1)', `scale(${SELECTED_SCALE})`] }],
      [overlay, { opacity: [0, OVERLAY_OPACITY] }]
    );
    await step(TIMINGS.flipToEdge, [flip, { transform: ['scaleX(1)', 'scaleX(0)'], filter: ['brightness(1)', `brightness(${FLIP_DIM})`] }]);
    showFace('back');
    await step(TIMINGS.flipFromEdge, [flip, { transform: ['scaleX(0)', 'scaleX(1)'], filter: [`brightness(${FLIP_DIM})`, 'brightness(1)'] }]);
    await step(TIMINGS.flapToEdge, [flap, { transform: ['scaleY(1)', 'scaleY(0)'], filter: ['brightness(1)', `brightness(${FLAP_DIM})`] }]);
    showFlapOpen(true);
    await step(TIMINGS.flapFromEdge, [
      flap,
      { transform: ['scaleY(0)', 'scaleY(-1)'], filter: [`brightness(${FLAP_DIM})`, `brightness(${FLAP_OPEN_BRIGHTNESS})`] },
    ]);
    await step(
      TIMINGS.cardPull,
      [card, { transform: [CARD_IN, CARD_PULLED] }],
      [shift, { transform: [ENVELOPE_RAISED, ENVELOPE_LOWERED] }]
    );
    showCardInFront(true);
    await step(
      TIMINGS.cardPresent,
      [card, { transform: [CARD_PULLED, CARD_PRESENTED] }],
      [shift, { transform: [ENVELOPE_LOWERED, ENVELOPE_RAISED] }],
      [nextCard, { opacity: [0, 1] }]
    );
  };

  const close = async () => {
    const [overlay, shift, lift, flip, flap, card, nextCard] = elements();
    await step(
      TIMINGS.cardPresent,
      [card, { transform: [CARD_PRESENTED, CARD_PULLED] }],
      [shift, { transform: [ENVELOPE_RAISED, ENVELOPE_LOWERED] }],
      [nextCard, { opacity: [1, 0] }]
    );
    showCardInFront(false);
    await step(
      TIMINGS.cardPull,
      [card, { transform: [CARD_PULLED, CARD_IN] }],
      [shift, { transform: [ENVELOPE_LOWERED, ENVELOPE_RAISED] }]
    );
    await step(TIMINGS.flapToEdge, [
      flap,
      { transform: ['scaleY(-1)', 'scaleY(0)'], filter: [`brightness(${FLAP_OPEN_BRIGHTNESS})`, `brightness(${FLAP_DIM})`] },
    ]);
    showFlapOpen(false);
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

  // Once the card is out, tapping anywhere but the card (or the header) puts it away; so does Escape.
  const handleSceneClick = (event) => {
    if (phase === 'open' && !event.target.closest('.envelope__card, .envelope-scene__header')) handleTap();
  };

  useEffect(() => {
    if (phase !== 'open') return undefined;
    const handleKey = (event) => event.key === 'Escape' && handleTap();
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  });

  const handleEnvelopeKey = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    if (phase === 'idle') handleTap();
  };

  // The top card lifts, drops behind the next card, and settles at the back of the pile while the next card
  // comes forward. Then the two cards swap finds and positions in the same frame, so the swap is never seen.
  const shuffle = async () => {
    const [card, nextCard] = [cardRef.current, nextCardRef.current];
    await step(TIMINGS.shuffleLift, [card, { transform: [CARD_PRESENTED, CARD_LIFTED] }]);
    flushSync(() => setCardBehind(true));
    await step(
      TIMINGS.shuffleSettle,
      [card, { transform: [CARD_LIFTED, CARD_BACK] }],
      [nextCard, { transform: [CARD_BACK, CARD_PRESENTED] }]
    );
    flushSync(() => {
      setFindIndex((index) => (index + 1) % dailyFinds.length);
      setCardBehind(false);
    });
    card.style.transform = CARD_PRESENTED;
    nextCard.style.transform = CARD_BACK;
  };

  const handleNextFind = () => {
    if (phase !== 'open') return;
    setPhase('shuffling');
    shuffle().then(() => setPhase('open'), () => {});
  };

  const find = dailyFinds.length ? dailyFinds[findIndex % dailyFinds.length] : null;
  const upNext = dailyFinds.length > 1 ? dailyFinds[(findIndex + 1) % dailyFinds.length] : null;
  const cardOut = phase === 'open' || phase === 'shuffling';
  const closed = !cardOut;

  return (
    <div className="envelope-scene" onClick={handleSceneClick}>
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
          {/* Only a button while closed: once open, the card is its own button and taps outside close it. */}
          <div
            className="envelope"
            role={closed ? 'button' : undefined}
            tabIndex={closed ? 0 : undefined}
            onClick={phase === 'idle' ? handleTap : undefined}
            onKeyDown={closed ? handleEnvelopeKey : undefined}
            aria-label={closed ? `Open envelope for ${RECIPIENT_NAME}` : undefined}
            aria-disabled={closed ? phase === 'busy' : undefined}
          >
            <div ref={shiftRef} className="envelope__layer">
              <div ref={liftRef} className="envelope__layer">
                <div className="envelope__layer envelope__shadow">
                  <div ref={flipRef} className="envelope__layer">
                    <div className="envelope__layer" style={{ visibility: face === 'front' ? 'visible' : 'hidden' }}>
                      <img className="envelope__front" src={assets.front} alt="" draggable="false" />
                      <span className="envelope__name">{RECIPIENT_NAME}</span>
                    </div>
                    <div className="envelope__layer" style={{ visibility: face === 'back' ? 'visible' : 'hidden' }}>
                      <img className="envelope__back" src={assets.back} alt="" draggable="false" />
                      <div className={`envelope__card-slot${cardInFront ? ' is-front' : ''}`}>
                        {upNext && (
                          <FindCard
                            find={upNext}
                            interactive={false}
                            cardRef={nextCardRef}
                            className="find-card--next"
                            style={{ transform: CARD_BACK }}
                          />
                        )}
                        <FindCard
                          find={find}
                          onNext={upNext ? handleNextFind : null}
                          interactive={cardInFront}
                          cardRef={cardRef}
                          className={cardBehind ? 'is-behind' : ''}
                        />
                      </div>
                      <img className="envelope__pocket" src={assets.pocket} alt="" draggable="false" />
                      <div ref={flapRef} className={`envelope__flap${flapOpen ? ' is-open' : ''}`}>
                        <img src={assets.flap} alt="" draggable="false" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <p className="envelope-scene__hint font-body" aria-live="polite">
            {cardOut
              ? upNext
                ? 'tap the card for the next find, or outside to close'
                : 'tap outside to close'
              : phase === 'idle'
                ? 'tap the envelope'
                : '\u00a0'}
          </p>
        </>
      )}
    </div>
  );
}
