import * as React from 'react';
import { StrictMode, useState } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { QualityContext } from '@mp/ui';
import { detectLang, LangContext } from './i18n.ts';
import { detectQuality } from './quality.ts';
import { Home } from './screens/Home.tsx';
import { PlayerRoute } from './screens/PlayerRoute.tsx';
import { TvRoute } from './screens/TvRoute.tsx';
import './app.css';

// Production game bundles resolve `react` and `react/jsx-runtime` to this shared instance
// (see scripts/build-games.mjs), so a game never ships its own copy of React.
(globalThis as { __MP_SHARED__?: unknown }).__MP_SHARED__ = { react: React, jsx: jsxRuntime };

function App() {
  const [quality] = useState(detectQuality);
  const [lang] = useState(detectLang);
  return (
    <QualityContext.Provider value={quality}>
      <LangContext.Provider value={lang}>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/r/:code" element={<PlayerRoute />} />
            <Route path="/tv" element={<TvRoute />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </BrowserRouter>
      </LangContext.Provider>
    </QualityContext.Provider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
