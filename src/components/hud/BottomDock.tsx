import { useEffect, useState } from 'react';
import {
  Activity,
  Check,
  ChevronUp,
  Crosshair,
  FileText,
  Flame,
  Fuel,
  Lock,
  MapPin,
  PlaneLanding,
  PlaneTakeoff,
  Rotate3d,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Square,
  Waves,
  Wind,
  X,
} from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';

export function BottomDock() {
  const unit = useSelectedUnit();
  const selectedId = useHangarStore((s) => s.selectedId);
  const selectedLivery = useHangarStore((s) => s.selectedLivery);
  const setLivery = useHangarStore((s) => s.setLivery);
  const showInfographic = useHangarStore((s) => s.showInfographic);
  const showPins = useHangarStore((s) => s.showPins);
  const autoRotate = useHangarStore((s) => s.autoRotate);
  const aeroMode = useHangarStore((s) => s.aeroMode);
  const aeroManeuver = useHangarStore((s) => s.aeroManeuver);
  const setAeroManeuver = useHangarStore((s) => s.setAeroManeuver);
  const safetyMode = useHangarStore((s) => s.safetyMode);
  const oxygenMode = useHangarStore((s) => s.oxygenMode);
  const flightMode = useHangarStore((s) => s.flightMode);
  const flightLabel = useHangarStore((s) => s.flightLabel);
  const showcaseMode = useHangarStore((s) => s.showcaseMode);

  const toggle = useHangarStore((s) => s.toggle);
  const toggleInfographic = useHangarStore((s) => s.toggleInfographic);
  const triggerTakeOff = useHangarStore((s) => s.triggerTakeOff);
  const triggerManeuver = useHangarStore((s) => s.triggerManeuver);
  const triggerLanding = useHangarStore((s) => s.triggerLanding);
  const triggerAar = useHangarStore((s) => s.triggerAar);
  const triggerSalute = useHangarStore((s) => s.triggerSalute);
  const triggerMission = useHangarStore((s) => s.triggerMission);
  const enterCockpitSim = useHangarStore((s) => s.enterCockpitSim);
  const toggleEngineSim = useHangarStore((s) => s.toggleEngineSim);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const resetCamera = useHangarStore((s) => s.resetCamera);

  const [simMenuOpen, setSimMenuOpen] = useState(false);
  const [simBarCollapsed, setSimBarCollapsed] = useState(false);

  // Auto-reset collapse saat kembali ke mode parkir, & auto-hide bar simulasi setelah simulasi berjalan agar layar 3D lega!
  useEffect(() => {
    if (flightMode === 'parked' && !safetyMode) {
      setSimBarCollapsed(false);
      return;
    }
    if (flightMode === 'takeoff' || flightMode === 'maneuver' || flightMode === 'landing' || flightMode === 'mission' || flightMode === 'aar' || flightMode === 'salute' || safetyMode) {
      const timer = window.setTimeout(() => setSimBarCollapsed(true), 2200);
      return () => window.clearTimeout(timer);
    }
  }, [flightMode, safetyMode]);

  const isGSuit = selectedId === 'gsuit';
  const isHelmet = selectedId === 'pilot-helmet';
  const isEquipment = isGSuit || isHelmet;
  const isVvip = selectedId === 'b737vip' || selectedId === 'falcon8x';
  const isSaluteEligible = unit.category === 'Tempur' || selectedId === 'kt1b';
  const missionBtnLabel =
    unit.category === 'Helikopter'
      ? 'SAR Hoist Laut'
      : unit.category === 'Angkut & VIP'
        ? 'Drop Barang & Terjun Payung'
        : unit.category === 'Tempur'
          ? 'Dogfight'
          : 'Flare Latih';
  const isFlightActive = !isEquipment && flightMode !== 'parked';
  const isSimPanelActive = !isEquipment && (simMenuOpen || isFlightActive || safetyMode);
  const isAeroPanelActive = !isEquipment && aeroMode;

  const canTakeOff = flightMode === 'parked';
  const isAirborneReady =
    flightMode === 'airborne' || flightMode === 'maneuver' || flightMode === 'mission' || flightMode === 'aar';
  const takeOffDone = isAirborneReady || flightMode === 'landing';

  const stopAllSim = () => {
    aircraftAudio.stop();
    if (safetyMode) toggle('safetyMode');
    if (oxygenMode) toggle('oxygenMode');
    setFlightState('parked', null);
    setSimMenuOpen(false);
  };

  const buttons: {
    id: string;
    label: string;
    short: string;
    icon: typeof Activity;
    active: boolean;
    onClick: () => void;
    accent?: 'amber' | 'emerald' | 'rose';
    hasMenu?: boolean;
  }[] = isFlightActive
    ? [
        {
          id: 'simulasi',
          label: 'Simulasi',
          short: 'Simulasi',
          icon: Flame,
          active: true,
          onClick: () => setSimMenuOpen((v) => !v),
          accent: 'amber' as const,
          hasMenu: true,
        },
      ]
    : [
        ...(isEquipment
          ? [
              {
                id: 'sim-equip',
                label: isGSuit ? 'Simulasi 9G' : 'Simulasi HMDS',
                short: isGSuit ? 'Sim 9G' : 'HMDS',
                icon: Activity,
                active: flightMode === 'engineSim',
                onClick: toggleEngineSim,
                accent: (isGSuit ? 'amber' : 'emerald') as 'amber' | 'emerald',
              },
            ]
          : [
              {
                id: 'simulasi',
                label: 'Simulasi',
                short: 'Simulasi',
                icon: Flame,
                active: simMenuOpen || flightMode !== 'parked' || oxygenMode || safetyMode,
                onClick: () => setSimMenuOpen((v) => !v),
                accent: 'amber' as const,
                hasMenu: true,
              },
              {
                id: 'cockpit-sim',
                label: 'Masuk Kokpit',
                short: 'Kokpit',
                icon: Crosshair,
                active: true,
                accent: 'emerald' as const,
                onClick: () => {
                  setSimMenuOpen(false);
                  enterCockpitSim();
                },
              },
              {
                id: 'aero',
                label: 'Aerodinamika',
                short: 'Aero',
                icon: Wind,
                active: aeroMode,
                onClick: () => {
                  setSimMenuOpen(false);
                  toggle('aeroMode');
                },
              },
            ]),
        {
          id: 'infographic',
          label: 'Spesifikasi',
          short: 'Spek',
          icon: FileText,
          active: showInfographic,
          onClick: () => {
            setSimMenuOpen(false);
            toggleInfographic();
          },
        },
        {
          id: 'pins',
          label: 'Pin Hotspot',
          short: 'Pin',
          icon: MapPin,
          active: showPins,
          onClick: () => toggle('showPins'),
        },
        {
          id: 'rotate',
          label: 'Putar 360°',
          short: '360°',
          icon: Rotate3d,
          active: autoRotate,
          onClick: () => toggle('autoRotate'),
        },
      ];

  if (showcaseMode) return null;

  return (
    <div className="app-bottom-dock pointer-events-none fixed bottom-1.5 sm:bottom-2 left-0 right-0 z-30 flex flex-col items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
      {/* Subtitle Ringkas Atraksi / Fase Penerbangan di Bawah */}
      {flightLabel && (
        <div
          className={`pointer-events-none max-w-[92vw] text-center animate-slidein ${
            selectedId === 'kt1b' && flightMode === 'airborne'
              ? 'rounded-lg bg-slate-950/75 px-3.5 py-1 text-[11px] sm:text-xs font-medium tracking-wide text-slate-100 backdrop-blur-sm border border-white/10 shadow'
              : 'hud-panel rounded-full border-[#ffb703]/60 px-3.5 py-1 font-display text-[11px] sm:text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase shadow-amber'
          }`}
        >
          {flightLabel}
        </div>
      )}

      {/* Pilihan Warna / Livery untuk pesawat yang memiliki 2 versi cat TNI AU (hanya saat parkir & menu simulasi/aero tertutup) */}
      {unit.liveries && unit.liveries.length > 1 && !isSimPanelActive && !isAeroPanelActive && (
        <div className="hud-panel pointer-events-auto flex items-center gap-1.5 rounded-full border-[#4da6ff]/40 bg-[#091c3a]/90 px-2.5 py-1 text-[10px] sm:text-xs">
          <span className="font-display font-bold tracking-wider text-slate-300 uppercase px-1">Warna:</span>
          {unit.liveries.map((lv) => {
            const activeId = selectedLivery[unit.id] ?? unit.liveries![0].id;
            const isActive = activeId === lv.id;
            return (
              <button
                key={lv.id}
                type="button"
                onClick={() => setLivery(unit.id, lv.id)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-display font-bold tracking-wide transition-all cursor-pointer active:scale-95 ${
                  isActive
                    ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703]'
                    : 'border-slate-700/80 bg-[#0e2a54]/80 text-slate-200 hover:border-[#4da6ff]/60'
                }`}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full border border-white/40 shrink-0"
                  style={{ background: `linear-gradient(135deg, ${lv.swatch} 55%, ${lv.accent} 55%)` }}
                />
                <span className="whitespace-nowrap">{lv.name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Bar Menu "SIMULASI" — dilengkapi tombol Tutup (X) & auto-hide agar tidak menutupi pesawat 3D saat simulasi! */}
      {isSimPanelActive && simBarCollapsed && (
        <div className="pointer-events-auto flex items-center gap-1.5 animate-slidein">
          <button
            type="button"
            onClick={() => setSimBarCollapsed(false)}
            className="hud-panel inline-flex items-center gap-1.5 rounded-full border-[#ffb703]/65 bg-[#091c3a]/90 px-3 py-1.5 font-display text-[11px] font-bold tracking-wider text-[#ffb703] uppercase hover:bg-[#ffb703]/20 cursor-pointer active:scale-95 shadow-amber"
          >
            <ChevronUp className="h-3.5 w-3.5" />
            Menu Simulasi
          </button>
          <button
            type="button"
            onClick={stopAllSim}
            className="hud-panel inline-flex items-center gap-1 rounded-full border-rose-400/70 bg-rose-500/25 px-3 py-1.5 font-display text-[11px] font-bold tracking-wider text-rose-100 uppercase hover:bg-rose-500/40 cursor-pointer active:scale-95"
          >
            <Square className="h-3 w-3 fill-current" />
            Stop
          </button>
        </div>
      )}

      {isSimPanelActive && !simBarCollapsed && (
        <div className="hud-panel pointer-events-auto relative flex max-w-[96vw] flex-col items-center gap-1.5 rounded-2xl border-[#ffb703]/50 bg-[#091c3a]/95 px-3 py-2 shadow-[0_12px_32px_rgba(2,10,28,0.85)] animate-slidein">
          <div className="flex w-full items-center justify-between gap-3">
            <div className="text-[10px] sm:text-[11px] font-medium tracking-wider text-slate-300 truncate">
              {safetyMode && 'Simulasi Safety aktif! Klik Hentikan Safety untuk menghentikan demonstrasi keselamatan'}
              {!safetyMode && flightMode === 'parked' && 'Tahapan Terbang: 1. Take Off → 2. Manuver → 3. Landing'}
              {!safetyMode && flightMode === 'takeoff' && 'Pesawat sedang lepas landas di Runway... tunggu mengudara'}
              {!safetyMode && flightMode === 'airborne' && 'Pesawat sudah mengudara! Lanjut klik 2. Manuver, Safety, atau 3. Landing'}
              {!safetyMode && flightMode === 'maneuver' && 'Manuver udara aktif! Klik Hentikan Manuver atau 3. Landing'}
              {!safetyMode && flightMode === 'landing' && 'Pesawat sedang melakukan pendaratan ke Runway...'}
              {!safetyMode && flightMode === 'mission' && `Misi aktif (${missionBtnLabel})! Klik Hentikan atau 3. Landing`}
              {!safetyMode && flightMode === 'aar' && 'AAR Refueling aktif! Klik Hentikan AAR atau 3. Landing'}
              {!safetyMode && flightMode === 'salute' && 'Tradisi Hormat Teknisi (Crew Chief Salute) aktif! Klik Hentikan untuk kembali ke Hanggar'}
            </div>
            <button
              type="button"
              onClick={() => {
                if (isFlightActive || safetyMode) {
                  setSimBarCollapsed(true);
                } else {
                  setSimMenuOpen(false);
                }
              }}
              aria-label="Sembunyikan Menu Simulasi"
              title="Tutup / Sembunyikan Menu Simulasi"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-slate-600/80 bg-[#0e2a54] text-slate-300 hover:border-[#ffb703] hover:text-[#ffb703] cursor-pointer active:scale-95"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-1.5">
            <button
              type="button"
              disabled={!canTakeOff}
              title={canTakeOff ? 'Mulai lepas landas dari Runway' : 'Pesawat sudah lepas landas'}
              onClick={() => {
                if (!canTakeOff) return;
                if (safetyMode) toggle('safetyMode');
                if (oxygenMode) toggle('oxygenMode');
                triggerTakeOff();
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'takeoff'
                  ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] cursor-default'
                  : takeOffDone
                    ? 'border-emerald-400/40 bg-emerald-500/15 text-emerald-300/80 cursor-not-allowed'
                    : 'border-[#ffb703]/70 bg-[#0e2a54] text-[#ffb703] hover:bg-[#ffb703]/20 cursor-pointer active:scale-95 shadow-amber'
              }`}
            >
              {takeOffDone ? <Check className="h-3.5 w-3.5" /> : <PlaneTakeoff className="h-4 w-4" />}
              1. Take Off
            </button>

            <button
              type="button"
              disabled={!isAirborneReady}
              title={
                isAirborneReady
                  ? 'Jalankan manuver udara (Barrel Roll, High-G Break, Cobra Climb)'
                  : 'Terkunci — lakukan 1. Take Off terlebih dahulu'
              }
              onClick={() => {
                if (!isAirborneReady) return;
                if (safetyMode) toggle('safetyMode');
                if (oxygenMode) toggle('oxygenMode');
                triggerManeuver();
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'maneuver'
                  ? 'border-[#4da6ff] bg-[#4da6ff] text-[#0a1e3c] cursor-pointer active:scale-95'
                  : isAirborneReady
                    ? 'border-[#4da6ff]/80 bg-[#0e2a54] text-[#75bcff] hover:bg-[#4da6ff]/20 cursor-pointer active:scale-95 shadow-glow'
                    : 'border-slate-700/70 bg-slate-900/60 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              {flightMode === 'maneuver' ? (
                <Square className="h-3.5 w-3.5 fill-current" />
              ) : isAirborneReady ? (
                <Flame className="h-4 w-4" />
              ) : (
                <Lock className="h-3.5 w-3.5" />
              )}
              {flightMode === 'maneuver' ? 'Hentikan Manuver' : '2. Manuver'}
            </button>

            <button
              type="button"
              disabled={!isAirborneReady}
              title={
                isAirborneReady
                  ? 'Turun & mendarat kembali ke Runway'
                  : 'Terkunci — lakukan 1. Take Off terlebih dahulu'
              }
              onClick={() => {
                if (!isAirborneReady) return;
                if (safetyMode) toggle('safetyMode');
                if (oxygenMode) toggle('oxygenMode');
                triggerLanding();
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'landing'
                  ? 'border-emerald-400 bg-emerald-400 text-[#0a1e3c] cursor-default'
                  : isAirborneReady
                    ? 'border-emerald-400/75 bg-[#0e2a54] text-emerald-300 hover:bg-emerald-400/20 cursor-pointer active:scale-95'
                    : 'border-slate-700/70 bg-slate-900/60 text-slate-500 opacity-60 cursor-not-allowed'
              }`}
            >
              {isAirborneReady ? <PlaneLanding className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              3. Landing
            </button>

            <div className="mx-0.5 h-6 w-px bg-[#4da6ff]/25 hidden sm:block" />

            {!isVvip && (
              <button
                type="button"
                title={
                  unit.category === 'Tempur'
                    ? 'Simulasi Pertempuran Udara (Dogfight): Saling Kejar, Saling Tembak, Flare & Jatuhkan Musuh'
                    : 'Jalankan Simulasi Misi Operasi TNI AU (Flare Latih / Drop Barang & Terjun Payung / SAR Hoist Laut)'
                }
                onClick={() => {
                  triggerMission();
                  setSimMenuOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  flightMode === 'mission'
                    ? unit.category === 'Tempur'
                      ? 'border-rose-400 bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)]'
                      : 'border-amber-400 bg-amber-400 text-[#0a1e3c]'
                    : unit.category === 'Tempur'
                      ? 'border-rose-400/65 bg-[#0e2a54] text-rose-300 hover:bg-rose-500/20'
                      : 'border-amber-400/55 bg-[#0e2a54] text-amber-300 hover:bg-amber-400/20'
                }`}
              >
                {flightMode === 'mission' ? (
                  <Square className="h-3.5 w-3.5 fill-current" />
                ) : unit.category === 'Tempur' ? (
                  <Crosshair className="h-4 w-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {flightMode === 'mission' ? `Hentikan ${missionBtnLabel}` : missionBtnLabel}
              </button>
            )}

            <button
              type="button"
              title={
                flightMode === 'aar'
                  ? 'Klik untuk menghentikan AAR Refueling dan kembali terbang jelajah'
                  : 'Air-to-Air Refueling (Pengisian Bahan Bakar di Udara dengan Tanker KC-130B Skadron 32)'
              }
              onClick={() => {
                triggerAar();
                setSimMenuOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                flightMode === 'aar'
                  ? 'border-emerald-400 bg-emerald-400 text-[#0a1e3c]'
                  : 'border-emerald-400/55 bg-[#0e2a54] text-emerald-300 hover:bg-emerald-400/20'
              }`}
            >
              {flightMode === 'aar' ? <Square className="h-3.5 w-3.5 fill-current" /> : <Fuel className="h-4 w-4" />}
              {flightMode === 'aar' ? 'Hentikan AAR' : 'AAR Refueling'}
            </button>

            {isSaluteEligible && (
              <button
                type="button"
                title={
                  flightMode === 'salute'
                    ? 'Klik untuk menghentikan ilustrasi Hormat Teknisi'
                    : 'Ilustrasi Tradisi Hormat Teknisi (Crew Chief Salute) sebelum pesawat keluar apron menuju runway'
                }
                onClick={() => {
                  triggerSalute();
                  setSimMenuOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  flightMode === 'salute'
                    ? 'border-[#ffb703] bg-[#ffb703] text-[#0a1e3c] shadow-amber'
                    : 'border-[#ffb703]/60 bg-[#0e2a54] text-[#ffb703] hover:bg-[#ffb703]/20'
                }`}
              >
                {flightMode === 'salute' ? <Square className="h-3.5 w-3.5 fill-current" /> : <ShieldCheck className="h-4 w-4" />}
                {flightMode === 'salute' ? 'Hentikan Hormat' : 'Hormat Teknisi'}
              </button>
            )}

            <button
              type="button"
              disabled={flightMode === 'takeoff' || flightMode === 'landing'}
              title={
                safetyMode
                  ? 'Klik untuk menghentikan demonstrasi Safety'
                  : 'Demonstrasi Sistem Keselamatan (Kursi Lontar Zero-Zero / Water Ditching / Pelampung Helikopter)'
              }
              onClick={() => {
                if (flightMode === 'takeoff' || flightMode === 'landing') return;
                toggle('safetyMode');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                flightMode === 'takeoff' || flightMode === 'landing'
                  ? 'border-slate-700/70 bg-slate-900/60 text-slate-500 opacity-60 cursor-not-allowed'
                  : safetyMode
                    ? 'border-rose-400 bg-rose-500 text-white shadow-[0_0_16px_rgba(244,63,94,0.5)] cursor-pointer active:scale-95'
                    : 'border-rose-400/60 bg-[#0e2a54] text-rose-300 hover:bg-rose-500/20 cursor-pointer active:scale-95'
              }`}
            >
              {safetyMode ? <Square className="h-3.5 w-3.5 fill-current" /> : <ShieldAlert className="h-4 w-4" />}
              {safetyMode ? 'Hentikan Safety' : 'Safety'}
            </button>

            <button
              type="button"
              disabled={isFlightActive}
              title={
                isFlightActive
                  ? 'Oksigen OBOGS tidak aktif saat pesawat sedang mengudara'
                  : 'Tampilkan simulasi sistem Oksigen OBOGS'
              }
              onClick={() => {
                if (isFlightActive) return;
                toggle('oxygenMode');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all ${
                isFlightActive
                  ? 'border-slate-700/70 bg-slate-900/60 text-slate-500 opacity-60 cursor-not-allowed'
                  : oxygenMode
                    ? 'border-cyan-400 bg-cyan-400 text-[#0a1e3c] cursor-pointer active:scale-95'
                    : 'border-cyan-400/45 bg-[#0e2a54] text-cyan-300 hover:bg-cyan-400/20 cursor-pointer active:scale-95'
              }`}
            >
              {isFlightActive ? <Lock className="h-3.5 w-3.5" /> : <Waves className="h-4 w-4" />}
              Oksigen OBOGS
            </button>

            <button
              type="button"
              onClick={stopAllSim}
              title="Hentikan Simulasi & Tampilkan Kembali Menu Utama"
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-400/60 bg-rose-500/20 px-3 py-2 font-display text-xs font-bold tracking-wider text-rose-200 uppercase hover:border-rose-300 hover:bg-rose-500/35 hover:text-white cursor-pointer active:scale-95"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </button>
          </div>
        </div>
      )}

      {/* Bar Ringkas "AERODINAMIKA" — Menyembunyikan menu lain agar animasi 3D di HP sangat lega, klik Stop untuk kembali */}
      {isAeroPanelActive && !isSimPanelActive && (
        <div className="hud-panel pointer-events-auto flex max-w-full items-center gap-1 sm:gap-1.5 overflow-x-auto rounded-2xl border-cyan-400/50 bg-[#091c3a]/95 px-2 sm:px-3 py-1.5 shadow-[0_12px_32px_rgba(2,10,28,0.85)] animate-slidein">
          {(
            [
              { id: 'liftDemo', label: 'Demo Lift' },
              { id: 'climb', label: 'Menanjak' },
              { id: 'descend', label: 'Menurun' },
              { id: 'turnLeft', label: 'Kiri' },
              { id: 'turnRight', label: 'Kanan' },
            ] as const
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setAeroManeuver(item.id)}
              className={`shrink-0 rounded-lg border px-2.5 sm:px-3 py-2 font-display text-[11px] sm:text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                aeroManeuver === item.id
                  ? 'border-cyan-300 bg-cyan-400 text-[#0a1e3c] shadow-glow'
                  : 'border-slate-700/80 bg-[#0e2a54]/90 text-slate-200 hover:border-cyan-400/60 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}

          <div className="mx-0.5 h-6 w-px shrink-0 bg-cyan-400/25" />

          <button
            type="button"
            onClick={() => toggle('aeroMode')}
            title="Hentikan Aerodinamika & Kembali ke Menu Utama"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-rose-400/70 bg-rose-500/25 px-3 py-2 font-display text-[11px] sm:text-xs font-bold tracking-wider text-rose-100 uppercase hover:bg-rose-500/40 hover:text-white cursor-pointer active:scale-95"
          >
            <Square className="h-3.5 w-3.5" />
            Stop
          </button>
        </div>
      )}

      {!isSimPanelActive && !isAeroPanelActive && (
        <nav
          aria-label="Kontrol Hangar 3D"
          className="hud-panel no-scrollbar pointer-events-auto flex max-w-full items-center gap-1 sm:gap-2 overflow-x-auto rounded-2xl px-1.5 sm:px-3 py-1.5 sm:py-2"
        >
          {buttons.map((b) => {
            const Icon = b.icon;
            const activeClass =
              b.accent === 'amber'
                ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703] shadow-amber'
                : b.accent === 'emerald'
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300 shadow-[0_0_16px_rgba(52,211,153,0.4)]'
                  : b.accent === 'rose'
                    ? 'border-rose-400 bg-rose-500/20 text-rose-300 shadow-[0_0_16px_rgba(251,113,133,0.45)]'
                    : 'border-[#4da6ff] bg-[#4da6ff]/20 text-[#4da6ff] shadow-glow';
            return (
              <button
                key={b.id}
                type="button"
                onClick={b.onClick}
                aria-pressed={b.active}
                title={b.label}
                className={`min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex flex-col sm:flex-row items-center justify-center shrink-0 gap-0.5 sm:gap-2 rounded-lg border px-2 sm:px-3.5 py-1 transition-all duration-200 cursor-pointer active:scale-95 font-display text-[10px] sm:text-sm font-bold tracking-wider uppercase ${
                  b.active
                    ? activeClass
                    : 'border-slate-700/80 bg-[#0e2a54]/80 text-slate-200 hover:border-[#4da6ff]/60 hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="sm:hidden whitespace-nowrap leading-none">{b.short}</span>
                <span className="hidden sm:inline whitespace-nowrap">{b.label}</span>
                {b.hasMenu && (
                  <ChevronUp
                    className={`hidden sm:inline h-3.5 w-3.5 transition-transform ${simMenuOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>
            );
          })}

          <div className="mx-0.5 h-7 sm:h-8 w-px shrink-0 bg-[#4da6ff]/25" />

          <button
            type="button"
            onClick={() => {
              setSimMenuOpen(false);
              resetCamera();
            }}
            title="Reset Kamera"
            className="min-h-[44px] min-w-[44px] sm:min-h-[48px] sm:min-w-[48px] flex flex-col sm:flex-row items-center justify-center shrink-0 gap-0.5 sm:gap-2 rounded-lg border border-slate-700/80 bg-[#0e2a54]/80 px-2 sm:px-3.5 py-1 font-display text-[10px] sm:text-sm font-bold tracking-wider text-slate-200 uppercase hover:border-[#4da6ff]/60 hover:text-white transition-all duration-200 cursor-pointer active:scale-95"
          >
            <RotateCcw className="h-4 w-4 shrink-0 text-[#4da6ff]" />
            <span className="sm:hidden whitespace-nowrap leading-none">Reset</span>
            <span className="hidden sm:inline whitespace-nowrap">Reset Kamera</span>
          </button>
        </nav>
      )}
    </div>
  );
}
