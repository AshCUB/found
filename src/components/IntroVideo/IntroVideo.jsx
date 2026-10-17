import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import './IntroVideo.css';

const SESSION_KEY = 'found_intro_video_played';
const ACTIVE_CLASS = 'intro-video-active';
const FADING_CLASS = 'intro-video-fading';
const PHONE_QUERY = '(pointer: coarse) and (hover: none) and (max-width: 500px) and (orientation: portrait)';
const BASE = import.meta.env.BASE_URL;
const VIDEO_SRC = `${BASE}video/intro.mp4`;
const POSTER_SRC = `${BASE}video/intro-poster.jpg`;

const START_TIMEOUT_MS = 3000;
const STALL_TIMEOUT_MS = 3000;
const FADE_MS = 500;
const ICON_DELAY_MS = 1000;
const ICON_FAINT_AFTER_MS = 4000;
const ICON_SOUND_ON_HIDE_MS = 1500;
const ICON_REMUTE_FAINT_MS = 1500;

export function isIntroVideoDevice() {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(PHONE_QUERY).matches;
}

export function shouldShowIntroVideo() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
  } catch {
    return false;
  }
  return isIntroVideoDevice();
}

function MutedIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <line x1="22" y1="9" x2="16" y2="15" />
      <line x1="16" y1="9" x2="22" y2="15" />
    </svg>
  );
}

function SoundOnIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M11 5 6 9H3v6h3l5 4V5z" fill="currentColor" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export default function IntroVideo({ onFinish }) {
  const videoRef = useRef(null);
  const leavingRef = useRef(false);
  const iconTimerRef = useRef(null);
  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  const [leaving, setLeaving] = useState(false);
  const [soundOn, setSoundOn] = useState(false);
  const [icon, setIcon] = useState('hidden'); // 'hidden' | 'hint' | 'faint'

  const scheduleIcon = (level, delay) => {
    clearTimeout(iconTimerRef.current);
    iconTimerRef.current = setTimeout(() => setIcon(level), delay);
  };

  const finish = useCallback(() => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    clearTimeout(iconTimerRef.current);
    setLeaving(true);
    document.documentElement.classList.replace(ACTIVE_CLASS, FADING_CLASS);

    const video = videoRef.current;
    const startVolume = video ? video.volume : 0;
    const t0 = performance.now();
    const fadeAudio = (now) => {
      const v = videoRef.current;
      if (!v || v.muted || v.paused) return;
      const p = Math.min((now - t0) / FADE_MS, 1);
      v.volume = startVolume * (1 - p);
      if (p < 1) requestAnimationFrame(fadeAudio);
    };
    requestAnimationFrame(fadeAudio);

    setTimeout(() => {
      const v = videoRef.current;
      if (v) {
        v.pause();
        v.muted = true;
        v.removeAttribute('src');
        v.load();
      }
      onFinishRef.current?.();
    }, FADE_MS);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;

    try {
      sessionStorage.setItem(SESSION_KEY, '1');
    } catch {
      /* ignore */
    }

    document.documentElement.classList.add(ACTIVE_CLASS);

    video.muted = true;
    video.defaultMuted = true;
    video.setAttribute('muted', '');
    video.setAttribute('webkit-playsinline', '');
    if (!video.getAttribute('src')) video.src = VIDEO_SRC;

    let active = true;
    let started = false;
    let lastTime = -1;
    let lastProgressAt = performance.now();

    const markStarted = () => {
      if (started || leavingRef.current) return;
      started = true;
      lastProgressAt = performance.now();
      clearTimeout(iconTimerRef.current);
      iconTimerRef.current = setTimeout(() => {
        setIcon('hint');
        iconTimerRef.current = setTimeout(() => setIcon('faint'), ICON_FAINT_AFTER_MS);
      }, ICON_DELAY_MS);
    };

    // AbortError means our own pause()/src change interrupted play(); a real block is NotAllowedError.
    const onPlayRejected = (err) => {
      if (active && err?.name !== 'AbortError') finish();
    };

    const onPlaying = () => markStarted();
    const onTimeUpdate = () => {
      if (video.currentTime > 0) markStarted();
    };

    const startTimer = setTimeout(() => {
      if (!started) finish();
    }, START_TIMEOUT_MS);

    const watchdog = setInterval(() => {
      if (!started || leavingRef.current || document.hidden || video.ended) return;
      const now = performance.now();
      if (video.currentTime !== lastTime) {
        lastTime = video.currentTime;
        lastProgressAt = now;
      } else if (now - lastProgressAt > STALL_TIMEOUT_MS) {
        finish();
      }
    }, 250);

    const onVisibility = () => {
      if (document.hidden || leavingRef.current) return;
      lastProgressAt = performance.now();
      if (video.paused && !video.ended) video.play().catch(onPlayRejected);
    };

    video.addEventListener('playing', onPlaying);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('ended', finish);
    video.addEventListener('error', finish);
    document.addEventListener('visibilitychange', onVisibility);

    const playPromise = video.play();
    if (playPromise && playPromise.catch) playPromise.catch(onPlayRejected);

    return () => {
      active = false;
      clearTimeout(startTimer);
      clearInterval(watchdog);
      clearTimeout(iconTimerRef.current);
      video.removeEventListener('playing', onPlaying);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('ended', finish);
      video.removeEventListener('error', finish);
      document.removeEventListener('visibilitychange', onVisibility);
      document.documentElement.classList.remove(ACTIVE_CLASS, FADING_CLASS);
      video.pause();
    };
  }, [finish]);

  const handleTap = () => {
    const video = videoRef.current;
    if (!video || leavingRef.current) return;

    if (video.muted) {
      video.muted = false;
      video.volume = 1;
      if (video.paused && !video.ended) {
        video.play().catch(() => {
          video.muted = true;
          setSoundOn(false);
          video.play().catch(finish);
        });
      }
      setSoundOn(true);
      setIcon('hint');
      scheduleIcon('hidden', ICON_SOUND_ON_HIDE_MS);
    } else {
      video.muted = true;
      setSoundOn(false);
      setIcon('hint');
      scheduleIcon('faint', ICON_REMUTE_FAINT_MS);
    }
  };

  return createPortal(
    <div className={`intro-video${leaving ? ' is-leaving' : ''}`}>
      <video
        ref={videoRef}
        className="intro-video__media"
        poster={POSTER_SRC}
        autoPlay
        muted
        playsInline
        preload="auto"
        disablePictureInPicture
        disableRemotePlayback
        controlsList="nodownload nofullscreen noremoteplayback"
        tabIndex={-1}
        aria-hidden="true"
      />
      <button
        type="button"
        className="intro-video__tap"
        onClick={handleTap}
        aria-label={soundOn ? 'Mute intro video' : 'Turn on intro video sound'}
        aria-pressed={soundOn}
      >
        <span className={`intro-video__icon is-${icon}`}>
          {soundOn ? <SoundOnIcon /> : <MutedIcon />}
        </span>
      </button>
    </div>,
    document.body
  );
}
