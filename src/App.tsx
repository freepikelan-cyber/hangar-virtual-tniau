import { CheckCircle2, X, XCircle } from 'lucide-react';
import { HangarScene } from './components/canvas/HangarScene';
import { TopHeader } from './components/hud/TopHeader';
import { FleetSidebar } from './components/hud/FleetSidebar';
import { InfoPanel } from './components/hud/InfoPanel';
import { HotspotCard } from './components/hud/HotspotCard';
import { BottomDock } from './components/hud/BottomDock';
import { WelcomeScreen } from './components/hud/WelcomeScreen';
import { InfographicModal } from './components/hud/InfographicModal';
import { AeroControlPanel } from './components/hud/AeroControlPanel';
import { SafetyStoryPanel } from './components/hud/SafetyStoryPanel';
import { useHangarStore, useSelectedUnit } from './store/useHangarStore';

/** Banner Kuis 3D ringkas saat panel kanan ditutup (terutama di layar smartphone). */
function FloatingQuizBanner() {
  const unit = useSelectedUnit();
  const quiz = useHangarStore((s) => s.quiz);
  const rightOpen = useHangarStore((s) => s.rightOpen);
  const nextQuestion = useHangarStore((s) => s.nextQuestion);
  const exitQuiz = useHangarStore((s) => s.exitQuiz);

  if (quiz.status !== 'active' || rightOpen) return null;
  const qHotspot = unit.hotspots.find((h) => h.id === quiz.order[quiz.index]);
  if (!qHotspot) return null;

  return (
    <div className="pointer-events-none fixed top-[122px] left-1/2 z-25 w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 animate-slidein">
      <div className="hud-panel pointer-events-auto rounded-xl border-[#ffb703]/60 p-3 shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-display font-bold tracking-wider uppercase">
          <span className="text-[#4da6ff]">
            KUIS {quiz.index + 1}/{quiz.order.length} • SKOR: {quiz.score}
          </span>
          <button
            type="button"
            onClick={exitQuiz}
            aria-label="Keluar Kuis"
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-700 bg-[#0e2a54] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <p className="text-xs sm:text-sm font-medium text-white leading-snug">
          Ketuk pin <strong className="text-[#ffb703]">{qHotspot.name}</strong> pada pesawat 3D!
        </p>

        {quiz.feedback && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#4da6ff]/20">
            <span
              className={`flex items-center gap-1.5 font-display text-xs font-bold uppercase ${
                quiz.feedback.correct ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {quiz.feedback.correct ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Tepat!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4" /> Jawaban: Pin {quiz.feedback.questionId}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={nextQuestion}
              className="rounded-lg border border-[#4da6ff] bg-[#4da6ff]/20 px-3 py-1.5 font-display text-xs font-bold tracking-wider text-[#4da6ff] uppercase hover:bg-[#4da6ff] hover:text-[#0a1e3c] cursor-pointer"
            >
              {quiz.index + 1 >= quiz.order.length ? 'Skor Akhir' : 'Lanjut'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function App() {
  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#0a1e3c]">
      {/* Kanvas 3D Interaktif */}
      <HangarScene />

      {/* Lapisan HUD Militer */}
      <TopHeader />
      <FleetSidebar />
      <InfoPanel />
      <AeroControlPanel />
      <SafetyStoryPanel />
      <FloatingQuizBanner />
      <HotspotCard />
      <BottomDock />
      <InfographicModal />
      <WelcomeScreen />
    </main>
  );
}

export default App;
