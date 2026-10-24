import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GameManifest } from '@mp/game-sdk';
import { Button, Toggle } from '@mp/ui';
import { useT } from '../i18n.ts';

/** Accent- and case-insensitive text for search. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * Full-screen game menu for the Host: search, an optional "fits the current player count"
 * filter, and one card per game. Choosing a game closes it.
 */
export function GamePicker({
  games,
  selectedId,
  players,
  onPick,
  onClose,
}: {
  games: GameManifest[];
  selectedId: string | null;
  players: number;
  onPick(game: GameManifest): void;
  onClose(): void;
}) {
  const { t, tg } = useT();
  const [query, setQuery] = useState('');
  const [fitsOnly, setFitsOnly] = useState(false);
  const panel = useRef<HTMLDivElement>(null);

  // Modal behaviour: Esc closes, the page behind doesn't scroll, focus moves into the sheet.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    panel.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = before;
    };
  }, [onClose]);

  const fits = (m: GameManifest) => players >= m.minPlayers && players <= m.maxPlayers;
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return games
      .filter((m) => !fitsOnly || fits(m))
      .filter((m) => !q || fold(`${tg(m.name)} ${tg(m.description)}`).includes(q))
      .sort((a, b) => Number(fits(b)) - Number(fits(a)) || tg(a.name).localeCompare(tg(b.name)));
  }, [games, query, fitsOnly, players]);

  // Rendered into <body>: an ancestor with a transform or backdrop-filter (panels, entry
  // animations) would otherwise become the containing block of `position: fixed`, making the sheet
  // taller than the screen and its end unreachable.
  return createPortal(
    <div className="picker" role="dialog" aria-modal="true" aria-label={t('admin.pickGame')}>
      <div className="picker-sheet" ref={panel} tabIndex={-1}>
        <header className="picker-head">
          <h2 className="mp-title">{t('admin.pickGame')}</h2>
          <Button small variant="ghost" onClick={onClose} aria-label={t('admin.close')}>
            ✕
          </Button>
        </header>
        <div className="picker-tools">
          <input
            className="mp-input"
            type="search"
            value={query}
            placeholder={t('admin.searchGames')}
            aria-label={t('admin.searchGames')}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Toggle label={t('admin.fitsOnly', { n: players })} checked={fitsOnly} onChange={setFitsOnly} />
        </div>
        <div className="picker-list">
          {shown.length === 0 && <p className="mp-subtitle picker-empty">{t('admin.noGamesFound')}</p>}
          {shown.map((m) => (
            <button
              key={m.id}
              type="button"
              className="game-card"
              aria-pressed={m.id === selectedId}
              style={{ ['--accent' as string]: m.accent }}
              onClick={() => onPick(m)}
            >
              <h3>
                {tg(m.name)}
                {m.id === selectedId && (
                  <span className="mp-chip mp-chip--ok picker-chosen">{t('admin.selected')}</span>
                )}
              </h3>
              <p>{tg(m.description)}</p>
              <div className="row wrap" style={{ gap: 6 }}>
                <span className={`mp-chip ${fits(m) ? '' : 'mp-chip--crimson'}`}>
                  👥 {m.minPlayers}–{m.maxPlayers}
                </span>
                <span className="mp-chip">⏱ ~{m.estimatedMinutes} min</span>
                {m.usesDealer && <span className="mp-chip mp-chip--crimson">🃏 Dealer</span>}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
