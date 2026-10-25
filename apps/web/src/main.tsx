import './compat.ts';
import * as React from 'react';
import { Component, StrictMode, useCallback, useEffect, useState, type ReactNode } from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router';
import { QualityContext } from '@mp/ui';
import type { Lang } from '@mp/protocol';
import { detectLang, LangContext, makeT, saveLang, SetLangContext } from './i18n.ts';
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
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/r/:code" element={<PlayerRoute />} />
              <Route path="/tv" element={<TvRoute />} />
              <Route path="*" element={<Home />} />
            </Routes>
          </BrowserRouter>
        </SetLangContext.Provider>
      </LangContext.Provider>
    </QualityContext.Provider>
  );
}

/** Last resort: an error outside a game shows what broke instead of an empty black page. */
class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    const t = makeT(detectLang());
    return (
      <div className="crash-screen" role="alert">
        <h1 className="mp-title">{t('crash.title')}</h1>
        <p className="mp-subtitle">{t('crash.hint')}</p>
        <code>{String(error.message || error)}</code>
        <button type="button" className="mp-btn" onClick={() => location.reload()}>
          {t('crash.reload')}
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CrashScreen>
      <App />
    </CrashScreen>
  </StrictMode>,
);
