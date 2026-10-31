import * as React from 'react';
import { lazy, StrictMode, Suspense, useCallback, useEffect, useState } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { QualityContext } from '@mp/ui';
import type { Lang } from '@mp/protocol';
import { detectLang, LangContext, saveLang, SetLangContext } from './i18n.ts';
import { detectQuality } from './quality.ts';
import { Home } from './screens/Home.tsx';
// Each screen is its own chunk: the home page doesn't download the room or the TV.
const PlayerRoute = lazy(() => import('./screens/PlayerRoute.tsx').then((m) => ({ default: m.PlayerRoute })));
const TvRoute = lazy(() => import('./screens/TvRoute.tsx').then((m) => ({ default: m.TvRoute })));
import './app.css';

// Production game bundles resolve `react` and `react/jsx-runtime` to this shared instance
// (see scripts/build-games.mjs), so a game never ships its own copy of React.
(globalThis as { __MP_SHARED__?: unknown }).__MP_SHARED__ = { react: React, jsx: jsxRuntime };

function App() {
  const [quality] = useState(detectQuality);
  const [lang, setLangState] = useState(detectLang);
  const setLang = useCallback((next: Lang) => {
    saveLang(next);
    setLangState(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  return (
    <QualityContext.Provider value={quality}>
      <LangContext.Provider value={lang}>
        <SetLangContext.Provider value={setLang}>
          <BrowserRouter>
            <Suspense
              fallback={
                <div className="screen-center">
                  <div className="mp-spinner" />
                </div>
              }
            >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/r/:code" element={<PlayerRoute />} />
                <Route path="/tv" element={<TvRoute />} />
                <Route path="/display" element={<TvRoute role="display" />} />
                <Route path="/dealer" element={<TvRoute role="dealer" />} />
                <Route path="*" element={<Home />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </SetLangContext.Provider>
      </LangContext.Provider>
    </QualityContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
