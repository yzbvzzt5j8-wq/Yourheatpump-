import { useEffect, useState, useCallback } from 'react';

/**
 * Minimal hash-based router. No dependency added beyond the spec's stack —
 * this is just window.location.hash plus a hashchange listener, giving
 * bookmarkable/shareable URLs without pulling in react-router.
 */
function readHash(): string {
  return window.location.hash.replace(/^#\/?/, '') || 'home';
}

export function useHashRoute(): [string, (path: string) => void] {
  const [route, setRoute] = useState(readHash);

  useEffect(() => {
    const onChange = () => setRoute(readHash());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((path: string) => {
    window.location.hash = `/${path}`;
  }, []);

  return [route, navigate];
}

export function routeSegments(route: string): string[] {
  return route.split('/').filter(Boolean);
}
