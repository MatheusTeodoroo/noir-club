import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fitsPlayerCount, type GameManifest } from '@mp/game-sdk';
import { Button } from '@mp/ui';
import { playerRange, useT } from '../i18n.ts';

/** Accent- and case-insensitive text for search. */
const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Games for one or two players, as opposed to group games. */
const isDuel = (m: GameManifest) => m.maxPlayers <= 2;
const QUICK_MINUTES = 15;

type Size = 'all' | 'duel' | 'group';
interface Filters {
  size: Size;
  fits: boolean;
  quick: boolean;
  dealer: boolean;
}
const NO_FILTERS: Filters = { size: 'all', fits: false, quick: false, dealer: false };

// Games this device picked last, newest first, shown above the full list.
const RECENT_KEY = 'mp.recentGames';
const RECENT_MAX = 4;

function loadRecent(): string[] {
  try {
    const ids = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]') as unknown;
    return Array.isArray(ids) ? ids.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

function saveRecent(id: string) {
  try {
    const ids = [id, ...loadRecent().filter((x) => x !== id)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids));
  } catch {
    /* storage unavailable: no recents */
  }
}

/**
 * Full-screen game menu for the Host. Compact tiles in a grid, narrowed by search and quick
 * filters, with the games this device picked recently on top. Tapping a tile opens its details;
 * choosing there selects the game and closes the menu.
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
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [open, setOpen] = useState<GameManifest | null>(null);
  const [recent] = useState(loadRecent);
  const sheet = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const listScroll = useRef(0);

  // Modal behaviour: Esc steps back (details → list → closed), the page behind doesn't scroll.
  const openRef = useRef(open);
  openRef.current = open;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (openRef.current) setOpen(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    const html = document.documentElement;
    const before = html.style.overflow;
    html.style.overflow = 'hidden';
    sheet.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey);
      html.style.overflow = before;
    };
  }, [onClose]);

  // Details start at the top; going back restores the list where it was.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTop = open ? 0 : listScroll.current;
  }, [open]);

  const fits = (m: GameManifest) => fitsPlayerCount(m, players);
  const filtering = query.trim() !== '' || filters !== NO_FILTERS;
  const shown = useMemo(() => {
    const q = fold(query.trim());
    return games
      .filter((m) => filters.size === 'all' || (filters.size === 'duel') === isDuel(m))
      .filter((m) => !filters.fits || fits(m))
      .filter((m) => !filters.quick || m.estimatedMinutes <= QUICK_MINUTES)
      .filter((m) => !filters.dealer || m.usesDealer)
      .filter((m) => !q || fold(`${tg(m.name)} ${tg(m.description)}`).includes(q))
      .sort((a, b) => Number(fits(b)) - Number(fits(a)) || tg(a.name).localeCompare(tg(b.name)));
  }, [games, query, filters, players]);
  const recentGames = recent.map((id) => games.find((m) => m.id === id)).filter((m) => !!m);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));
  const show = (m: GameManifest) => {
    listScroll.current = scroller.current?.scrollTop ?? 0;
    setOpen(m);
  };
  const choose = (m: GameManifest) => {
    saveRecent(m.id);
    onPick(m);
  };

  const tile = (m: GameManifest) => (
    <button
      key={m.id}
      type="button"
      className="game-tile"
      aria-pressed={m.id === selectedId}
      style={{ ['--accent' as string]: m.accent }}
      onClick={() => show(m)}
    >
      <span className="game-tile-name">{tg(m.name)}</span>
      <span className="game-tile-meta">
        <span className={fits(m) ? '' : 'game-tile-off'}>👥 {playerRange(m, t)}</span>
        <span>⏱ {m.estimatedMinutes}′</span>
        {m.usesDealer && <span title="Dealer">🃏</span>}
      </span>
      {m.id === selectedId && <span className="game-tile-check" aria-hidden>✓</span>}
    </button>
  );

  // Rendered into <body>: an ancestor with a transform or backdrop-filter (panels, entry
  // animations) would otherwise become the containing block of `position: fixed`, making the sheet
  // taller than the screen and its end unreachable.
  return createPortal(
    <div className="picker" role="dialog" aria-modal="true" aria-label={t('admin.pickGame')} ref={scroller}>
      <div className="picker-sheet" ref={sheet} tabIndex={-1}>
        <header className="picker-head">
          {open ? (
            <Button small variant="ghost" onClick={() => setOpen(null)}>
              ‹ {t('admin.back')}
            </Button>
          ) : (
            <h2 className="mp-title">{t('admin.pickGame')}</h2>
          )}
          <Button small variant="ghost" onClick={onClose} aria-label={t('admin.close')}>
            ✕
          </Button>
        </header>

        {open ? (
          <GameDetails
            game={open}
            fits={fits(open)}
            selected={open.id === selectedId}
            onChoose={() => choose(open)}
          />
        ) : (
          <>
            <div className="picker-tools">
              <input
                className="mp-input"
                type="search"
                value={query}
                placeholder={t('admin.searchGames')}
                aria-label={t('admin.searchGames')}
                onChange={(e) => setQuery(e.target.value)}
              />
              <div className="picker-filters" role="group" aria-label={t('admin.filters')}>
                {(['all', 'duel', 'group'] as const).map((size) => (
                  <button
                    key={size}
                    type="button"
                    className="picker-filter"
                    aria-pressed={filters.size === size}
                    onClick={() => set({ size })}
                  >
                    {t(size === 'all' ? 'admin.filterAll' : size === 'duel' ? 'admin.filterDuel' : 'admin.filterGroup')}
                  </button>
                ))}
                <span className="picker-filters-sep" aria-hidden />
                <button
                  type="button"
                  className="picker-filter"
                  aria-pressed={filters.fits}
                  onClick={() => set({ fits: !filters.fits })}
                >
                  👥 {t('admin.filterFits', { n: players })}
                </button>
                <button
                  type="button"
                  className="picker-filter"
                  aria-pressed={filters.quick}
                  onClick={() => set({ quick: !filters.quick })}
                >
                  ⏱ {t('admin.filterQuick', { n: QUICK_MINUTES })}
                </button>
                <button
                  type="button"
                  className="picker-filter"
                  aria-pressed={filters.dealer}
                  onClick={() => set({ dealer: !filters.dealer })}
                >
                  🃏 Dealer
                </button>
              </div>
            </div>

            {!filtering && recentGames.length > 0 && (
              <section className="picker-section">
                <h3 className="section-title">{t('admin.recent')}</h3>
                <div className="picker-grid">{recentGames.map(tile)}</div>
              </section>
            )}

            <section className="picker-section">
              <h3 className="section-title picker-count">
                <span>{filtering ? t('admin.results') : t('admin.allGames')}</span>
                <span className="picker-count-n">{shown.length}</span>
                {filtering && (
                  <button
                    type="button"
                    className="picker-clear"
                    onClick={() => {
                      setQuery('');
                      setFilters(NO_FILTERS);
                    }}
                  >
                    {t('admin.clearFilters')}
                  </button>
                )}
              </h3>
              {shown.length === 0 ? (
                <p className="mp-subtitle picker-empty">{t('admin.noGamesFound')}</p>
              ) : (
                <div className="picker-grid">{shown.map(tile)}</div>
              )}
            </section>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function GameDetails({
  game,
  fits,
  selected,
  onChoose,
}: {
  game: GameManifest;
  fits: boolean;
  selected: boolean;
  onChoose(): void;
}) {
  const { t, tg } = useT();
  return (
    <article className="picker-details mp-enter" style={{ ['--accent' as string]: game.accent }}>
      <h2 className="mp-title picker-details-name">{tg(game.name)}</h2>
      <div className="row wrap" style={{ gap: 6 }}>
        <span className={`mp-chip ${fits ? '' : 'mp-chip--crimson'}`}>👥 {playerRange(game, t)}</span>
        <span className="mp-chip">⏱ ~{game.estimatedMinutes} min</span>
        {game.usesDealer && <span className="mp-chip mp-chip--crimson">🃏 Dealer</span>}
      </div>
      <p className="picker-details-desc">{tg(game.description)}</p>
      {!fits && (
        <p className="picker-details-warn">
          {t((game.playerStep ?? 1) > 1 ? 'lobby.needStep' : 'lobby.need', {
            min: game.minPlayers,
            max: game.maxPlayers,
            step: game.playerStep ?? 1,
          })}
        </p>
      )}
      <Button block onClick={onChoose}>
        {selected ? `✓ ${t('admin.selected')}` : t('admin.chooseThis')}
      </Button>
    </article>
  );
}
