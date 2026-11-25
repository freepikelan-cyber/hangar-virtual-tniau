import { lazy, Suspense, useEffect } from 'react';
import { CheckCircle2, X, XCircle } from 'lucide-react';
import { HangarScene } from './components/canvas/HangarScene';
import { TopHeader } from './components/hud/TopHeader';
import { FleetSidebar } from './components/hud/FleetSidebar';
import { InfoPanel } from './components/hud/InfoPanel';
import { HotspotCard } from './components/hud/HotspotCard';
import { BottomDock } from './components/hud/BottomDock';
import { WelcomeScreen } from './components/hud/WelcomeScreen';
import { useHangarStore } from './store/useHangarStore';
import { bgmPlayer } from './utils/bgmPlayer';

// Lazy-load panel sekunder agar muat awal aplikasi instan & ringan
const InfographicModal = lazy(() =>
  import('./components/hud/InfographicModal').then((m) => ({ default: m.InfographicModal })),
);
const AeroControlPanel = lazy(() =>
  import('./components/hud/AeroControlPanel').then((m) => ({ default: m.AeroControlPanel })),
);
const AarStatusPanel = lazy(() =>
  import('./components/hud/AarStatusPanel').then((m) => ({ default: m.AarStatusPanel })),
);
const FighterManeuverPanel = lazy(() =>
  import('./components/hud/FighterManeuverPanel').then((m) => ({ default: m.FighterManeuverPanel })),
);
const GSuitControlPanel = lazy(() =>
  import('./components/hud/GSuitControlPanel').then((m) => ({ default: m.GSuitControlPanel })),
);
const JupiterManeuverPanel = lazy(() =>
  import('./components/hud/JupiterManeuverPanel').then((m) => ({ default: m.JupiterManeuverPanel })),
);
const SafetyStoryPanel = lazy(() =>
  import('./components/hud/SafetyStoryPanel').then((m) => ({ default: m.SafetyStoryPanel })),
);

/** Banner Kuis 3D ringkas saat panel kanan ditutup (terutama di layar smartphone). */
function FloatingQuizBanner() {
  const quiz = useHangarStore((s) => s.quiz);
  const rightOpen = useHangarStore((s) => s.rightOpen);
  const answerMcq = useHangarStore((s) => s.answerMcq);
  const nextQuestion = useHangarStore((s) => s.nextQuestion);
  const exitQuiz = useHangarStore((s) => s.exitQuiz);

  if (quiz.status !== 'active' || rightOpen) return null;
  const curQ = quiz.questions[quiz.index];
  if (!curQ) return null;

  return (
    <div className="pointer-events-none fixed top-[122px] left-1/2 z-25 w-[min(420px,calc(100vw-1.5rem))] -translate-x-1/2 animate-slidein">
      <div className="hud-panel pointer-events-auto rounded-xl border-[#ffb703]/60 p-3 shadow-xl space-y-2">
        <div className="flex items-center justify-between gap-2 text-[11px] font-display font-bold tracking-wider uppercase">
          <span className="text-[#4da6ff]">
            KUIS {quiz.index + 1}/{quiz.questions.length} • SKOR: {quiz.score}
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

        <p className="text-xs sm:text-sm font-medium text-white leading-snug">{curQ.prompt}</p>

        {curQ.kind === 'mcq' && !quiz.feedback && (
          <div className="grid grid-cols-1 gap-1.5 pt-1">
            {curQ.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => answerMcq(i)}
                className="rounded-lg border border-slate-700 bg-[#0e2a54]/90 px-2.5 py-1.5 text-left text-xs text-slate-100 hover:border-[#4da6ff] cursor-pointer"
              >
                <strong className="text-[#ffb703] mr-1.5">{['A', 'B', 'C', 'D'][i]}.</strong>
                {opt}
              </button>
            ))}
          </div>
        )}

        {quiz.feedback && (
          <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#4da6ff]/20">
            <span
              className={`flex items-center gap-1.5 font-display text-xs font-bold uppercase ${
                quiz.feedback.correct ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {quiz.feedback.correct ? (
                <>
                  <CheckCircle2 className="h-4 w-4 shrink-0" /> Tepat!
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 shrink-0" /> Jawaban: {quiz.feedback.correctText}
                </>
              )}
            </span>
            <button
              type="button"
              onClick={nextQuestion}
              className="rounded-lg border border-[#4da6ff] bg-[#4da6ff]/20 px-3 py-1.5 font-display text-xs font-bold tracking-wider text-[#4da6ff] uppercase hover:bg-[#4da6ff] hover:text-[#0a1e3c] cursor-pointer shrink-0"
            >
              {quiz.index + 1 >= quiz.questions.length ? 'Skor Akhir' : 'Lanjut'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const SHOWCASE_FLEET = ['su30mk2', 'rafale', 'f16id', 'kt1b', 'c130j', 'b737vip', 'caracal'];

export function App() {
  const showWelcome = useHangarStore((s) => s.showWelcome);
  const showcaseMode = useHangarStore((s) => s.showcaseMode);
  const bgmEnabled = useHangarStore((s) => s.bgmEnabled);
  const flightMode = useHangarStore((s) => s.flightMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);

  // Musik latar belakang: aktif di halaman awal & eksplorasi hanggar, otomatis MATI total saat simulasi terbang/safety!
  useEffect(() => {
    const shouldPlayBgm = bgmEnabled && (showWelcome || (flightMode === 'parked' && !safetyMode));
    bgmPlayer.sync(shouldPlayBgm);
  }, [bgmEnabled, showWelcome, flightMode, safetyMode]);

  useEffect(() => {
    if (!showcaseMode) return;
    let idx = Math.max(0, SHOWCASE_FLEET.indexOf(useHangarStore.getState().selectedId));
    const timer = window.setInterval(() => {
      idx = (idx + 1) % SHOWCASE_FLEET.length;
      useHangarStore.getState().selectAircraft(SHOWCASE_FLEET[idx]);
      useHangarStore.setState({ autoRotate: true, leftOpen: false, rightOpen: false });
    }, 12000);
    return () => window.clearInterval(timer);
  }, [showcaseMode]);

  if (showWelcome) {
    return (
      <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#061226]">
        <WelcomeScreen />
      </main>
    );
  }

  return (
    <main className="relative h-[100dvh] w-screen overflow-hidden bg-[#07152c]">
      {/* Kanvas 3D Interaktif */}
      <HangarScene />

      {/* Lapisan HUD Militer */}
      <TopHeader />
      <FleetSidebar />
      <InfoPanel />
      <Suspense fallback={null}>
        <AeroControlPanel />
        <AarStatusPanel />
        <FighterManeuverPanel />
        <GSuitControlPanel />
        <JupiterManeuverPanel />
        <SafetyStoryPanel />
        <InfographicModal />
      </Suspense>
      <FloatingQuizBanner />
      <HotspotCard />
      <BottomDock />
    </main>
  );
}

export default App;
