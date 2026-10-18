import { useEffect, useState } from 'react';

const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const NAVIGATE_EVENT = 'found:navigate';

function currentPath() {
  const { pathname } = window.location;
  const rel = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname;
  return rel.replace(/\/+$/, '') || '/';
}

// replace: swap the current history entry instead of adding one (used for redirects).
// state: stored on the history entry, readable via window.history.state.
export function navigate(path, { replace = false, state = null } = {}) {
  if (path === currentPath()) return;
  window.history[replace ? 'replaceState' : 'pushState'](state, '', BASE + path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
}

export function useRoute() {
  const [path, setPath] = useState(currentPath);
  useEffect(() => {
    const update = () => setPath(currentPath());
    window.addEventListener('popstate', update);
    window.addEventListener(NAVIGATE_EVENT, update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener(NAVIGATE_EVENT, update);
    };
  }, []);
  return path;
}

export function Link({ to, onClick, ...props }) {
  const handleClick = (e) => {
    onClick?.(e);
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(to);
  };
  return <a href={BASE + to} onClick={handleClick} {...props} />;
}
