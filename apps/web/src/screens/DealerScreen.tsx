import { Avatar, Countdown, RoomTimeContext, Stage } from '@mp/ui';
import { LangContext, makeT } from '../i18n.ts';
import { GameBoundary, kit, Logo, StatusOverlay, useGameUI } from '../room/common.tsx';
import { useSession, type Session } from '../room/session.ts';
import { DEALER_CALL_MS_HINT, DEALER_VISIT_MS_HINT } from './constants.ts';

/**
 * The private screen in the isolated room. Shows who is called and the one-time code; once the
 * player types it on their phone, shows that player's private game view. No input.
 */
export function DealerScreen({ session, onLeave }: { session: Session; onLeave?(): void }) {
  const state = useSession(session);
  const frame = state.public;
  const dealer = state.dealer;
  const gameUI = useGameUI(session, frame);
  const lang = frame?.platform.lang ?? 'pt-BR';
  const t = makeT(lang);
  const cur = dealer?.current ?? null;
  const playing = frame?.platform.phase === 'playing';

  const Dealer = gameUI?.Dealer;

  let body;
  if (playing && dealer && !cur && Dealer && dealer.game != null) {
    // The game's standing view (dealerIdleView): this Dealer shows one team's board all match.
    body = (
      <GameBoundary resetKey={dealer.seq}>
        <Dealer
          kit={kit}
          lang={lang}
          t={(x: { 'pt-BR': string; en: string }) => x[lang]}
          platform={frame!.platform}
          view={dealer.game}
          playerName=""
        />
      </GameBoundary>
    );
  } else if (!playing || !dealer || !cur) {
    body = (
      <div className="screen-center">
        <div className="stack" style={{ justifyItems: 'center', gap: '2em', textAlign: 'center' }}>
          <Logo size={1.1} />
          <p className="mp-subtitle" style={{ fontSize: '2em' }}>
            {t('dealer.waiting')}
          </p>
          {dealer && dealer.queue.length > 0 && playing && (
            <div className="row" style={{ gap: '0.8em' }}>
              <span className="mp-eyebrow">{t('dealer.queue')}</span>
              {dealer.queue.map((q) => (
                <Avatar key={q.id} emoji={q.avatar} size={48} title={q.name} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  } else if (!cur.verified) {
    body = (
      <div className="screen-center">
        <div
          className="stack mp-enter"
          style={{ justifyItems: 'center', gap: '1.6em', textAlign: 'center' }}
          key={cur.playerId}
        >
          <Avatar emoji={cur.avatar} size={140} crimson />
          <h2 className="mp-title" style={{ fontSize: '4em' }}>
            {cur.name}
          </h2>
          {cur.code ? (
            <>
              <span className="mp-eyebrow" style={{ fontSize: '1.3em' }}>
                {t('dealer.typeCode')}
              </span>
              <div className="tv-dealer-code mp-title" data-testid="dealer-code">
                {cur.code}
              </div>
            </>
          ) : (
            <p className="mp-subtitle" style={{ fontSize: '2em' }}>
              {t('dealer.remote')}
            </p>
          )}
          <Countdown deadline={cur.deadline} total={DEALER_CALL_MS_HINT} size="5em" />
        </div>
      </div>
    );
  } else {
    body = (
      <>
        <div className="tv-corner tv-corner--tl">
          <Avatar emoji={cur.avatar} size={40} active />
          <b style={{ fontSize: '1.3em' }}>{cur.name}</b>
        </div>
        <div className="tv-corner tv-corner--tr">
          <Countdown deadline={cur.deadline} total={DEALER_VISIT_MS_HINT} size="3em" />
        </div>
        {Dealer && dealer.game ? (
          <GameBoundary resetKey={dealer.seq}>
            <Dealer
              kit={kit}
              lang={lang}
              t={(x: { 'pt-BR': string; en: string }) => x[lang]}
              platform={frame!.platform}
              view={dealer.game}
              playerName={cur.name}
            />
          </GameBoundary>
        ) : (
          <div className="screen-center">
            <p className="mp-subtitle" style={{ fontSize: '2em' }}>
              {t('dealer.remote')}
            </p>
          </div>
        )}
      </>
    );
  }

  return (
    <LangContext.Provider value={lang}>
      <RoomTimeContext.Provider value={session.roomNow}>
        <Stage className="tv" particles={!cur?.verified}>
          {body}
          <StatusOverlay state={state} onLeave={onLeave} />
        </Stage>
      </RoomTimeContext.Provider>
    </LangContext.Provider>
  );
}
