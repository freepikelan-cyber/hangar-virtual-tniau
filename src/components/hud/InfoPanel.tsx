import { useState } from 'react';
import {
  Award,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Compass,
  Crosshair,
  Download,
  Gauge,
  HelpCircle,
  MapPin,
  Mountain,
  RotateCcw,
  Shield,
  Target,
  XCircle,
} from 'lucide-react';
import { useHangarStore, useSelectedUnit, type InfoTab } from '../../store/useHangarStore';
import { QuizCertificateModal } from './QuizCertificateModal';

export function InfoPanel() {
  const unit = useSelectedUnit();
  const [showCert, setShowCert] = useState(false);
  const rightOpen = useHangarStore((s) => s.rightOpen);
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const flightMode = useHangarStore((s) => s.flightMode);
  const pilotRoomOpen = useHangarStore((s) => s.pilotRoomOpen);
  const toggleRight = useHangarStore((s) => s.toggleRight);
  const infoTab = useHangarStore((s) => s.infoTab);
  const setInfoTab = useHangarStore((s) => s.setInfoTab);
  const activeHotspot = useHangarStore((s) => s.activeHotspot);
  const focusHotspot = useHangarStore((s) => s.focusHotspot);
  const quiz = useHangarStore((s) => s.quiz);
  const startQuiz = useHangarStore((s) => s.startQuiz);
  const nextQuestion = useHangarStore((s) => s.nextQuestion);
  const exitQuiz = useHangarStore((s) => s.exitQuiz);

  const tabs: { id: InfoTab; label: string; icon: typeof Gauge }[] = [
    { id: 'spec', label: 'Spesifikasi', icon: Gauge },
    { id: 'ops', label: 'Operasional', icon: BookOpen },
    { id: 'quiz', label: 'Kuis 3D', icon: HelpCircle },
  ];

  const currentQuestionHotspot =
    quiz.status === 'active'
      ? unit.hotspots.find((h) => h.id === quiz.order[quiz.index])
      : null;

  const isEquipment = unit.id === 'gsuit' || unit.id === 'pilot-helmet';
  const isJupiterManeuver = unit.id === 'kt1b' && flightMode === 'maneuver';
  const isFighterManeuver = unit.category === 'Tempur' && flightMode === 'maneuver';
  const isAar = flightMode === 'aar';
  if (pilotRoomOpen) return null;
  if ((aeroMode || safetyMode || isJupiterManeuver || isFighterManeuver || isAar) && !isEquipment) return null;

  return (
    <aside
      className={`pointer-events-none fixed top-[74px] sm:top-[84px] bottom-[102px] sm:bottom-[112px] right-2.5 sm:right-4 flex items-start gap-2 ${
        rightOpen ? 'z-30 lg:z-20' : 'z-20'
      }`}
    >
      {!rightOpen && (
        <button
          type="button"
          onClick={toggleRight}
          aria-label="Tampilkan Informasi Teknis"
          title="Buka Panel Informasi"
          className="hud-panel hud-btn pointer-events-auto h-11 sm:h-12 px-2.5 sm:px-3 gap-1.5 text-[#4da6ff] hover:bg-[#4da6ff]/20"
        >
          <span className="font-display text-xs font-bold tracking-widest uppercase">Info</span>
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}

      {rightOpen && (
        <div className="hud-panel pointer-events-auto flex h-full w-[min(340px,calc(100vw-1.25rem))] lg:w-[320px] xl:w-[360px] flex-col rounded-xl overflow-hidden animate-slidein">
          {/* Header Unit */}
          <div className="flex items-start justify-between gap-2 border-b border-[#4da6ff]/25 px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded bg-[#ffb703]/20 border border-[#ffb703]/50 px-1.5 py-0.5 font-display text-[10px] font-bold tracking-widest text-[#ffb703] uppercase">
                  {unit.tailNumber}
                </span>
                <span className="text-[11px] text-[#4da6ff] font-display font-semibold tracking-wider uppercase truncate">
                  {unit.code}
                </span>
              </div>
              <h2 className="mt-1 font-display text-lg font-bold tracking-wide text-white leading-snug">
                {unit.name}
              </h2>
              <p className="text-xs text-slate-300/90 leading-snug">{unit.squadron}</p>
            </div>
            <button
              type="button"
              onClick={toggleRight}
              aria-label="Sembunyikan Panel Informasi"
              title="Sembunyikan Panel Kanan"
              className="hud-btn h-12 w-12 shrink-0 border-[#4da6ff]/30 bg-[#103060]/70 text-[#4da6ff] hover:bg-[#4da6ff]/20"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* 3 Tab Navigasi */}
          <div className="grid grid-cols-3 gap-2 border-b border-[#4da6ff]/20 p-2.5">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = infoTab === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setInfoTab(t.id)}
                  className={`min-h-[48px] flex flex-col items-center justify-center gap-1 rounded-lg border px-1.5 py-1.5 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer ${
                    active
                      ? 'border-[#4da6ff] bg-[#4da6ff]/20 text-[#4da6ff] shadow-[0_0_12px_rgba(77,166,255,0.28)]'
                      : 'border-slate-700/70 bg-[#0c254a]/70 text-slate-300 hover:border-[#4da6ff]/50 hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Konten Tab */}
          <div className="hud-scroll flex-1 overflow-y-auto p-4 space-y-4">
            {infoTab === 'spec' && (
              <>
                <div className="rounded-xl border border-[#4da6ff]/20 bg-[#0b2245]/70 p-3.5">
                  <h3 className="font-display text-xs font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                    PERAN OPERASIONAL
                  </h3>
                  <p className="mt-1.5 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                    {unit.role}
                  </p>
                </div>

                {/* 4 Kartu Metrik Utama */}
                <div className="grid grid-cols-2 gap-2.5">
                  <MetricCard icon={Gauge} label="Kecepatan Maks" value={unit.specs.maxSpeed} />
                  <MetricCard icon={Compass} label="Jangkauan" value={unit.specs.range} />
                  <MetricCard icon={Mountain} label="Ketinggian" value={unit.specs.ceiling} />
                  <MetricCard icon={Crosshair} label="Persenjataan / Muatan" value={unit.specs.armament} />
                </div>

                {/* Pintasan Komponen Hotspot */}
                <div>
                  <h3 className="mb-2 flex items-center gap-1.5 font-display text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                    <MapPin className="h-3.5 w-3.5" />
                    KOMPONEN UTAMA ({unit.hotspots.length} PIN 3D)
                  </h3>
                  <div className="space-y-2">
                    {unit.hotspots.map((h) => {
                      const active = activeHotspot === h.id;
                      return (
                        <button
                          key={h.id}
                          type="button"
                          onClick={() => focusHotspot(h.id)}
                          className={`w-full min-h-[48px] flex items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all cursor-pointer ${
                            active
                              ? 'border-[#ffb703] bg-[#ffb703]/15 text-white shadow-amber'
                              : 'border-slate-700/70 bg-[#0d264d]/70 text-slate-200 hover:border-[#4da6ff]/60 hover:bg-[#13376e]'
                          }`}
                        >
                          <span
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
                              active
                                ? 'bg-[#ffb703] text-[#0a1e3c]'
                                : 'border border-[#4da6ff]/70 bg-[#4da6ff]/15 text-[#4da6ff]'
                            }`}
                          >
                            {h.id}
                          </span>
                          <span className="flex-1 text-xs font-medium leading-tight">{h.name}</span>
                          {h.partType && (
                            <span
                              className={`shrink-0 rounded px-1.5 py-0.5 font-display text-[9px] font-bold tracking-wider uppercase ${
                                h.partType === 'Sistem Internal'
                                  ? 'bg-cyan-400/15 text-cyan-200 border border-cyan-300/40'
                                  : h.partType === 'Senjata'
                                    ? 'bg-rose-500/15 text-rose-200 border border-rose-400/40'
                                    : 'bg-[#4da6ff]/15 text-[#75bcff] border border-[#4da6ff]/30'
                              }`}
                            >
                              {h.partType}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {infoTab === 'ops' && (
              <>
                <div className="rounded-xl border border-[#4da6ff]/25 bg-[#0b2245]/75 p-3.5">
                  <h3 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                    <Shield className="h-4 w-4" />
                    SKADRON & SEJARAH OPERASIONAL
                  </h3>
                  <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                    {unit.history.operational}
                  </p>
                </div>

                <div className="rounded-xl border border-[#ffb703]/30 bg-[#1a1608]/40 p-3.5">
                  <h3 className="flex items-center gap-1.5 font-display text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                    <Target className="h-4 w-4" />
                    KEUNGGULAN TAKTIS
                  </h3>
                  <p className="mt-2 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                    {unit.history.tactical}
                  </p>
                </div>

                <div className="rounded-xl border border-[#4da6ff]/20 bg-[#0b2245]/70 p-3.5">
                  <h3 className="font-display text-xs font-bold tracking-[0.16em] text-[#4da6ff] uppercase">
                    MISI UTAMA TNI AU
                  </h3>
                  <ul className="mt-2 space-y-2">
                    {unit.history.missions.map((m, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-200">
                        <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#4da6ff]" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {infoTab === 'quiz' && (
              <div className="space-y-4">
                {quiz.status === 'idle' && (
                  <div className="rounded-xl border border-[#4da6ff]/30 bg-[#0c264f]/80 p-4 text-center space-y-3">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#4da6ff]/50 bg-[#4da6ff]/15 text-[#4da6ff]">
                      <Target className="h-7 w-7" />
                    </div>
                    <h3 className="font-display text-lg font-bold tracking-wider text-white uppercase">
                      KUIS EKSPLORASI 3D
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-300">
                      Uji pengetahuanmu mengenai <strong className="text-white">{unit.name}</strong>! Putar model 3D,
                      amati komponennya, lalu ketuk nomor pin yang tepat langsung pada badan pesawat.
                    </p>
                    <div className="rounded-lg border border-slate-700/70 bg-[#091c3a]/70 p-2.5 text-xs text-slate-300">
                      Total Soal: <strong className="text-[#ffb703]">5 Soal Acak</strong> (dari {unit.hotspots.length} komponen)
                    </div>
                    <button
                      type="button"
                      onClick={startQuiz}
                      className="hud-btn w-full border-[#4da6ff] bg-[#4da6ff] font-display text-sm font-bold tracking-[0.15em] text-[#0a1e3c] uppercase shadow-glow hover:bg-[#75bcff]"
                    >
                      MULAI KUIS 3D
                    </button>
                  </div>
                )}

                {quiz.status === 'active' && currentQuestionHotspot && (
                  <div className="space-y-3">
                    {/* Progress & Skor */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-display font-bold tracking-wider text-[#4da6ff] uppercase">
                        SOAL {quiz.index + 1} / {quiz.order.length}
                      </span>
                      <span className="font-display font-bold tracking-wider text-[#ffb703] uppercase">
                        SKOR: {quiz.score}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full bg-[#4da6ff] transition-all duration-300"
                        style={{ width: `${((quiz.index + (quiz.feedback ? 1 : 0)) / quiz.order.length) * 100}%` }}
                      />
                    </div>

                    {/* Pertanyaan */}
                    <div className="rounded-xl border border-[#ffb703]/45 bg-[#1b1608]/50 p-4">
                      <p className="font-display text-[11px] font-bold tracking-[0.16em] text-[#ffb703] uppercase">
                        TEMUKAN & KLIK PIN PADA MODEL 3D:
                      </p>
                      <p className="mt-1.5 text-sm font-semibold leading-snug text-white">
                        Klik pin yang menunjukkan <span className="text-[#4da6ff]">{currentQuestionHotspot.name}</span>{' '}
                        pada {unit.name} ini!
                      </p>
                    </div>

                    {/* Umpan Balik Instan */}
                    {quiz.feedback ? (
                      <div
                        className={`rounded-xl border p-3.5 space-y-2 ${
                          quiz.feedback.correct
                            ? 'border-emerald-400/60 bg-emerald-950/50 text-emerald-100'
                            : 'border-rose-500/60 bg-rose-950/50 text-rose-100'
                        }`}
                      >
                        <div className="flex items-center gap-2 font-display text-sm font-bold tracking-wider uppercase">
                          {quiz.feedback.correct ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                              <span>TEPAT SEKALI! (+1 POIN)</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-rose-400" />
                              <span>KURANG TEPAT (JAWABAN: PIN {quiz.feedback.questionId})</span>
                            </>
                          )}
                        </div>
                        <p className="text-xs leading-relaxed text-slate-200">{currentQuestionHotspot.desc}</p>
                        <button
                          type="button"
                          onClick={nextQuestion}
                          className="hud-btn mt-2 w-full border-[#4da6ff] bg-[#4da6ff]/20 font-display text-sm font-bold tracking-widest text-[#4da6ff] uppercase hover:bg-[#4da6ff] hover:text-[#0a1e3c]"
                        >
                          {quiz.index + 1 >= quiz.order.length ? 'LIHAT SKOR AKHIR' : 'SOAL BERIKUTNYA'}
                        </button>
                      </div>
                    ) : (
                      <p className="rounded-lg border border-slate-700/70 bg-[#091c3a]/70 p-3 text-center text-xs text-slate-300">
                        Ketuk salah satu pin angka <strong className="text-[#4da6ff]">1–{unit.hotspots.length}</strong>{' '}
                        yang menempel di pesawat 3D.
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={exitQuiz}
                      className="hud-btn w-full border-slate-700 bg-transparent font-display text-xs font-semibold tracking-widest text-slate-400 uppercase hover:border-slate-500 hover:text-white"
                    >
                      Batalkan Kuis
                    </button>
                  </div>
                )}

                {quiz.status === 'finished' && (
                  <div className="rounded-xl border border-[#ffb703]/50 bg-[#071526]/90 p-5 text-center space-y-3">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#ffb703] bg-[#ffb703]/15 text-[#ffb703] shadow-amber">
                      <Award className="h-8 w-8" />
                    </div>
                    <h3 className="font-display text-lg font-bold tracking-wider text-white uppercase">
                      KUIS SELESAI!
                    </h3>
                    <div className="font-display text-4xl font-bold text-[#4da6ff]">
                      {Math.round((quiz.score / Math.max(1, quiz.order.length)) * 100)}
                      <span className="text-lg text-slate-400"> / 100</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Kamu menjawab benar <strong className="text-[#ffb703]">{quiz.score}</strong> dari{' '}
                      <strong className="text-white">{quiz.order.length}</strong> komponen {unit.name}.
                    </p>
                    <div className="space-y-1.5 pt-2 text-left">
                      {quiz.answers.map((a, idx) => {
                        const h = unit.hotspots.find((x) => x.id === a.questionId);
                        return (
                          <div
                            key={idx}
                            className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-[#091c3a]/80 px-2.5 py-1.5 text-xs"
                          >
                            <span className="truncate text-slate-200">{h?.name}</span>
                            {a.correct ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                            ) : (
                              <XCircle className="h-4 w-4 shrink-0 text-rose-400" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowCert(true)}
                      className="hud-btn w-full gap-2 border-[#ffb703] bg-[#ffb703]/20 font-display text-xs font-bold tracking-widest text-[#ffb703] uppercase hover:bg-[#ffb703] hover:text-[#0a1e3c] shadow-amber"
                    >
                      <Download className="h-4 w-4" />
                      UNDUH SERTIFIKAT KADET TNI AU
                    </button>
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={startQuiz}
                        className="hud-btn flex-1 gap-1.5 border-[#4da6ff] bg-[#4da6ff] font-display text-xs font-bold tracking-widest text-[#0a1e3c] uppercase hover:bg-[#75bcff]"
                      >
                        <RotateCcw className="h-4 w-4" />
                        ULANGI
                      </button>
                      <button
                        type="button"
                        onClick={exitQuiz}
                        className="hud-btn flex-1 border-slate-600 bg-slate-800/60 font-display text-xs font-bold tracking-widest text-slate-200 uppercase hover:border-[#4da6ff]"
                      >
                        SELESAI
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      {showCert && (
        <QuizCertificateModal
          score={quiz.score}
          total={quiz.order.length}
          onClose={() => setShowCert(false)}
        />
      )}
    </aside>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Gauge; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#4da6ff]/25 bg-[#0b2347]/80 p-3">
      <div className="flex items-center gap-1.5 text-[#4da6ff]">
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span className="font-display text-[10px] font-bold tracking-[0.12em] uppercase truncate">{label}</span>
      </div>
      <p className="mt-1.5 font-display text-sm font-bold leading-snug text-white">{value}</p>
    </div>
  );
}
