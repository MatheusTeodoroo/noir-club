import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QualityContext } from '@mp/ui';
import '../sdk/platform.css';
import './playground.css';
import { ControlRoom } from './control.tsx';
import { DealerDevice, DisplayDevice, PlayerDevice } from './devices.tsx';

const params = new URLSearchParams(location.search);
const device = params.get('device');

function App() {
  if (device === 'display') return <DisplayDevice />;
  if (device === 'dealer') return <DealerDevice />;
  if (device === 'player') return <PlayerDevice id={params.get('id') ?? 'p1'} />;
  return <ControlRoom />;
}

document.documentElement.classList.toggle('pg-device-page', !!device);
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QualityContext.Provider value={(params.get('quality') as 'high' | 'medium' | 'low') ?? 'high'}>
      <App />
    </QualityContext.Provider>
  </StrictMode>,
);
