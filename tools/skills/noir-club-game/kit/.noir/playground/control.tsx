import { useEffect, useReducer, useState, type ReactNode } from 'react';
import type { ConfigField, GameLogic, GameManifest } from '@mp/game-sdk';
import { configDefaults, fitsPlayerCount } from '@mp/game-sdk';
import type { Lang } from '@mp/protocol';
import logic from '@game/src/logic.ts';
import manifestJson from '@game/manifest.json';
import { PlaygroundHost } from './host.ts';
import { installAgentHelpers } from './agent.ts';

const manifest = manifestJson as GameManifest;
const initialPlayers =
  Array.from({ length: manifest.maxPlayers }, (_, i) => i + 1).find((n) => n >= Math.min(4, manifest.maxPlayers) && fitsPlayerCount(manifest, n)) ??
  manifest.minPlayers;

// One engine per control room, created outside React so StrictMode's double render can't fork it,
// and lazily so the device iframes (which load this module too) never start one.
let hostInstance: PlaygroundHost | null = null;
function getHost() {
  if (hostInstance) return hostInstance;
  hostInstance = new PlaygroundHost(logic as GameLogic, {
    players: initialPlayers,
    config: configDefaults(manifest),
    lang: 'pt-BR',
  });
  installAgentHelpers(hostInstance);
  return hostInstance;
}

// A hot reload re-runs this module (e.g. after an edit to the game logic): stop the old engine,
// or it keeps driving the devices next to the new one.
import.meta.hot?.dispose(() => {
  hostInstance?.dispose();
  hostInstance = null;
});

/** Scales a real-size device iframe into the control room. */
function Device({
  src,
  w,
  h,
  width,
  label,
  extra,
}: {
  src: string;
  w: number;
  h: number;
  width: number;
  label: string;
  extra?: ReactNode;
}) {
  const scale = width / w;
  return (
    <figure className="pg-device">
      <figcaption>
        <span>{label}</span>
        <span className="pg-device-tools">
          {extra}
          <a href={src} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
            ↗
          </a>
        </span>
      </figcaption>
      <div style={{ width, height: h * scale }} className="pg-device-frame">
        <iframe src={src} title={label} width={w} height={h} style={{ transform: `scale(${scale})` }} />
      </div>
    </figure>
  );
}

export function ControlRoom() {
  const host = getHost();
  const [players, setPlayers] = useState(initialPlayers);
  const [config, setConfig] = useState<Record<string, unknown>>(() => configDefaults(manifest));
  const [lang, setLang] = useState<Lang>('pt-BR');
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  useEffect(() => {
    const off = host.subscribe(rerender);
    const id = setInterval(rerender, 500);
    return () => {
      off();
      clearInterval(id);
    };
  }, []);

  const restart = (patch: Partial<{ players: number; config: Record<string, unknown>; lang: Lang }> = {}) => {
    const next = { players, config, lang, ...patch };
    setPlayers(next.players);
    setConfig(next.config);
    setLang(next.lang);
    host.restart(next);
  };

  const now = host.now();
  const nextTimer = host.engine.nextTimerAt();
  const phase = host.engine.state.phase;
  const ids = host.clients.filter((c) => c.role === 'player').map((c) => c.id);
  const phoneW = ids.length > 6 ? 170 : 210;

  return (
    <div className="pg">
      {host.retired && (
        <div style={{ background: '#5a1020', color: '#fff', padding: '10px 16px', borderRadius: 8, marginBottom: 8 }}>
          Outra sala de controle está aberta neste navegador e assumiu o jogo. Feche esta aba ou recarregue-a.
        </div>
      )}
      <header className="pg-bar">
        <b className="pg-title">
          🎲 {manifest.name['pt-BR']} <small>{manifest.version} · playground</small>
        </b>
        <label>
          Jogadores
          <select value={players} onChange={(e) => restart({ players: Number(e.target.value) })}>
            {Array.from({ length: Math.max(1, manifest.maxPlayers) }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n} disabled={!fitsPlayerCount(manifest, n)}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          Idioma
          <select value={lang} onChange={(e) => restart({ lang: e.target.value as Lang })}>
            <option value="pt-BR">PT</option>
            <option value="en">EN</option>
          </select>
        </label>
        <button onClick={() => restart()}>↺ Reiniciar partida</button>
        <span className="pg-sep" />
        <span className="pg-clock">
          fase <b>{phase}</b> · próximo timer{' '}
          {nextTimer === null ? '—' : `${Math.max(0, Math.ceil((nextTimer - now) / 1000))}s`}
        </span>
        <button onClick={() => host.advance(5_000)}>+5s</button>
        <button onClick={() => host.advance(30_000)}>+30s</button>
        <button onClick={() => host.skipToNextTimer()}>⏭ Próximo timer</button>
        <button onClick={() => host.setFrozen(host.frozenAt === null)}>
          {host.frozenAt === null ? '⏸ Congelar relógio' : '▶ Retomar relógio'}
        </button>
      </header>

      {manifest.config.length > 0 && (
        <section className="pg-config">
          {manifest.config.map((f) => (
            <ConfigInput
              key={f.key}
              field={f}
              value={config[f.key]}
              onChange={(v) => restart({ config: { ...config, [f.key]: v } })}
            />
          ))}
        </section>
      )}

      <main className="pg-main">
        <div className="pg-screens">
          <Device src="?device=display" w={1280} h={720} width={640} label="📺 Display (TV pública)" />
          <Device src="?device=dealer" w={1280} h={720} width={400} label="🃏 Dealer (sala isolada)" />
        </div>
        <div className="pg-phones">
          {ids.map((id) => {
            const c = host.clients.find((x) => x.id === id)!;
            return (
              <Device
                key={id}
                src={`?device=player&id=${id}`}
                w={390}
                h={780}
                width={phoneW}
                label={`📱 ${c.name}${c.isAdmin ? ' ♛' : ''}`}
                extra={
                  <>
                    <button title="Conectar / desconectar" onClick={() => host.setConnected(id, !c.connected)}>
                      {c.connected ? '🟢' : '🔴'}
                    </button>
                    <button title="Jogar remotamente" onClick={() => host.setRemote(id, !host.remote.has(id))}>
                      {host.remote.has(id) ? '🌐' : '🏠'}
                    </button>
                  </>
                }
              />
            );
          })}
        </div>
        <aside className="pg-log">
          <b>Eventos</b>
          <ol>
            {host.log.map((e, i) => (
              <li key={i}>
                <time>{new Date(e.at).toLocaleTimeString()}</time> {e.text}
              </li>
            ))}
          </ol>
        </aside>
      </main>
    </div>
  );
}

function ConfigInput({ field, value, onChange }: { field: ConfigField; value: unknown; onChange(v: unknown): void }) {
  const label = field.label['pt-BR'];
  if (field.type === 'boolean') {
    return (
      <label>
        <input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} /> {label}
      </label>
    );
  }
  if (field.type === 'number') {
    return (
      <label>
        {label}
        <input
          type="number"
          min={field.min}
          max={field.max}
          step={field.step ?? 1}
          value={Number(value)}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      </label>
    );
  }
  return (
    <label>
      {label}
      <select value={String(value)} onChange={(e) => onChange(e.target.value)}>
        {field.options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label['pt-BR']}
          </option>
        ))}
      </select>
    </label>
  );
}
