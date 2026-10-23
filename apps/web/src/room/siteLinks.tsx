import type { Lang } from '@mp/protocol';
import { FORMS } from '../links.ts';
import { useSetLang, useT } from '../i18n.ts';

/** PT / EN switch for this device. */
export function LangSwitch() {
  const { t, lang } = useT();
  const setLang = useSetLang();
  const options: { value: Lang; label: string }[] = [
    { value: 'pt-BR', label: 'PT' },
    { value: 'en', label: 'EN' },
  ];
  return (
    <div className="lang-switch" role="group" aria-label={t('lang.label')}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={lang === o.value}
          lang={o.value}
          onClick={() => setLang(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Links to the suggestion, bug and copyright forms. `full` adds the title and the independence /
 * copyright notice (home screen); the compact version fits under the lobby and the scoreboard.
 */
export function SiteLinks({ full, lead }: { full?: boolean; lead?: string }) {
  const { t } = useT();
  const links = [
    { href: FORMS.suggest, icon: '💡', label: t('links.suggest') },
    { href: FORMS.bug, icon: '🐞', label: t('links.bug') },
    { href: FORMS.copyright, icon: '©', label: t('links.copyright') },
  ];
  return (
    <nav className={`site-links ${full ? 'site-links--full' : ''}`} aria-label={t('links.title')}>
      {full && <span className="mp-eyebrow">{t('links.title')}</span>}
      {lead && <span className="site-links-lead">{lead}</span>}
      <ul>
        {links.map((l) => (
          <li key={l.href}>
            <a href={l.href} target="_blank" rel="noopener noreferrer" title={t('links.opensNewTab')}>
              <span aria-hidden>{l.icon}</span> {l.label}
            </a>
          </li>
        ))}
      </ul>
      {full && <p className="site-links-notice">{t('links.notice')}</p>}
    </nav>
  );
}
