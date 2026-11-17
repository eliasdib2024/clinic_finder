import { tx } from '../../lib/i18n';
import { lazy, Suspense, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';

const HeroScene = lazy(() => import('./HeroScene'));

function hasWebGL() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch { return false; }
}

/** Static fallback for reduced motion, no WebGL, or while the 3D chunk loads. */
export function HeartFallback({ dark }) {
  const a = dark ? '#3fd0bd' : '#14998a';
  const b = dark ? '#7cc4f0' : '#3b82c4';
  return (
    <svg viewBox="0 0 400 400" width="78%" role="img" aria-label={tx('Illustration of a heart inside a DNA helix')}>
      <defs>
        <radialGradient id="hg" cx="40%" cy="35%" r="70%"><stop offset="0" stopColor="#c6f5ec" /><stop offset=".45" stopColor={a} /><stop offset="1" stopColor="#0d5f59" /></radialGradient>
      </defs>
      {Array.from({ length: 18 }, (_, i) => {
        const y = 40 + i * 18; const x = Math.sin(i * 0.7) * 150;
        return <g key={i} opacity=".85"><line x1={200 + x} y1={y} x2={200 - x} y2={y} stroke={dark ? '#2f8077' : '#cde9e5'} strokeWidth="1.5" /><circle cx={200 + x} cy={y} r="5" fill={a} /><circle cx={200 - x} cy={y} r="5" fill={b} /></g>;
      })}
      <path d="M200 318c-6 0-12-3-17-7C120 262 82 226 82 178c0-36 27-62 61-62 24 0 44 13 57 33 13-20 33-33 57-33 34 0 61 26 61 62 0 48-38 84-101 133-5 4-11 7-17 7z" fill="url(#hg)" />
      <path d="M118 176h34l12-24 18 48 14-34 8 10h56" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" opacity=".9" />
    </svg>
  );
}

export function HeroVisual({ dark = false, follow = true }) {
  const reduce = useReducedMotion();
  const [ok, setOk] = useState(false);
  useEffect(() => { setOk(hasWebGL()); }, []);
  const fallback = <div className="hero-fallback"><HeartFallback dark={dark} /></div>;
  if (reduce || !ok) return fallback;
  return <Suspense fallback={fallback}><HeroScene dark={dark} follow={follow} /></Suspense>;
}
