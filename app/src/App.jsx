import { useEffect, useRef, useState } from 'react';
import LottoMachine from './components/LottoMachine.jsx';
import './App.css';
import { useAudioCue } from './hooks/useAudioCue.js';
import { useLocale } from './hooks/useLocale.js';

const DEFAULT_MESSAGES = {
  draw: 'Draw',
  retry: 'Retry',
  headline: 'Lucky Lotto Machine',
  instructions: 'Press draw to tumble and pick six lucky balls.',
  mobileHint: 'Tip: rotate your device for a wider view.'
};

export default function App() {
  const machineRef = useRef(null);
  const [drawnNumbers, setDrawnNumbers] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const { t } = useLocale(DEFAULT_MESSAGES);
  const { playCue, registerCue } = useAudioCue({ enabled: false });

  useEffect(() => {
    registerCue('draw-start');
    registerCue('ball-drawn');
    registerCue('draw-complete');
    registerCue('reset');
  }, [registerCue]);

  const handleDraw = () => {
    if (!machineRef.current || isDrawing) return;

    setIsDrawing(true);
    setHasDrawn(true);
    setDrawnNumbers([]);
    playCue('draw-start');

    machineRef.current.startDraw({
      onBallDrawn: (number) => {
        setDrawnNumbers((prev) => {
          const next = [...prev, number];
          next.sort((a, b) => a - b);
          return next;
        });
        playCue('ball-drawn');
      },
      onComplete: () => {
        setIsDrawing(false);
        playCue('draw-complete');
      }
    });
  };

  const handleRetry = () => {
    if (!machineRef.current) return;
    machineRef.current.reset();
    setDrawnNumbers([]);
    setIsDrawing(false);
    setHasDrawn(false);
    playCue('reset');
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <h1>{t('headline')}</h1>
          <p>{t('instructions')}</p>
        </div>
        <div className="controls">
          <button type="button" onClick={handleDraw} disabled={isDrawing}>
            {t('draw')}
          </button>
          <button
            type="button"
            className="secondary"
            onClick={handleRetry}
            disabled={isDrawing || !hasDrawn}
          >
            {t('retry')}
          </button>
        </div>
      </header>

      <main className="app-main">
        <section className="machine-wrapper">
          <LottoMachine ref={machineRef} />
        </section>
        <section className="results" aria-live="polite">
          <h2>{t('draw')}</h2>
          <div className="numbers">
            {Array.from({ length: 6 }).map((_, index) => {
              const value = drawnNumbers[index];
              return (
                <span key={index} className={value ? 'filled' : ''}>
                  {value ?? '—'}
                </span>
              );
            })}
          </div>
          <p className="mobile-hint">{t('mobileHint')}</p>
        </section>
      </main>
    </div>
  );
}
