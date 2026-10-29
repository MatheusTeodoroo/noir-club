import { useEffect, useState } from 'react';
import { useRive } from '@rive-app/react-webgl2';
import { useQuality, type RiveViewProps } from './components.tsx';

/**
 * The Rive player behind RiveView. A separate module so the Rive runtime (the largest library on
 * the site) downloads only when an animation is first shown.
 */
export default function RivePlayer({
  src,
  artboard,
  stateMachine = 'Main',
  values,
  trigger,
  className,
  style,
  fallback,
}: RiveViewProps) {
  const tier = useQuality();
  const [failed, setFailed] = useState(false);
  const { rive, RiveComponent } = useRive(
    failed
      ? null
      : {
          src,
          artboard,
          stateMachine,
          autoplay: true,
          // Only bind a view model when the caller drives data; plain animations have none.
          autoBind: !!values || !!trigger,
          onLoadError: () => setFailed(true),
        },
    { useDevicePixelRatio: tier !== 'low' },
  );

  useEffect(() => {
    const vmi = rive?.viewModelInstance;
    if (!vmi || !values) return;
    for (const [key, v] of Object.entries(values)) {
      if (typeof v === 'string') {
        const p = vmi.string(key);
        if (p) p.value = v;
      } else if (typeof v === 'number') {
        const p = vmi.number(key);
        if (p) p.value = v;
      } else {
        const p = vmi.boolean(key);
        if (p) p.value = v;
      }
    }
  }, [rive, values]);

  useEffect(() => {
    if (!trigger) return;
    rive?.viewModelInstance?.trigger(trigger.name)?.trigger();
  }, [rive, trigger?.name, trigger?.nonce]);

  if (failed) return <>{fallback ?? null}</>;
  return <RiveComponent className={className} style={style} />;
}
