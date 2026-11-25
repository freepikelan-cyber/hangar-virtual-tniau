import { useState } from 'react';
import {
  Activity,
  Check,
  ChevronUp,
  Crosshair,
  FileText,
  Flame,
  Fuel,
  Lock,
  Mail,
  MapPin,
  Phone,
  PlaneLanding,
  PlaneTakeoff,
  Rotate3d,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Square,
  Waves,
  Wind,
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

  const toggle = useHangarStore((s) => s.toggle);
  const toggleInfographic = useHangarStore((s) => s.toggleInfographic);
  const triggerTakeOff = useHangarStore((s) => s.triggerTakeOff);
  const triggerManeuver = useHangarStore((s) => s.triggerManeuver);
  const triggerLanding = useHangarStore((s) => s.triggerLanding);
  const triggerAar = useHangarStore((s) => s.triggerAar);
  const triggerMission = useHangarStore((s) => s.triggerMission);
  const enterCockpitSim = useHangarStore((s) => s.enterCockpitSim);
  const toggleEngineSim = useHangarStore((s) => s.toggleEngineSim);
  const setFlightState = useHangarStore((s) => s.setFlightState);
  const resetCamera = useHangarStore((s) => s.resetCamera);

  const [simMenuOpen, setSimMenuOpen] = useState(false);

  const isGSuit = selectedId === 'gsuit';
  const isHelmet = selectedId === 'pilot-helmet';
  const isEquipment = isGSuit || isHelmet;
  const isVvip = selectedId === 'b737vip' || selectedId === 'falcon8x';
  const missionBtnLabel =
    unit.category === 'Helikopter'
      ? 'SAR Hoist Laut'
      : unit.category === 'Angkut & VIP'
        ? 'Drop Barang & Terjun Payung'
        : 'Flare Tempur';
  const isFlightActive = !isEquipment && flightMode !== 'parked';
  const isSimPanelActive = !isEquipment && (simMenuOpen || isFlightActive);
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
                active: simMenuOpen || flightMode !== 'parked' || oxygenMode,
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
              {
                id: 'safety',
                label: 'Safety',
                short: 'Safety',
                icon: ShieldAlert,
                active: safetyMode,
                accent: 'rose' as const,
                onClick: () => {
                  setSimMenuOpen(false);
                  toggle('safetyMode');
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

  return (
    <div className="pointer-events-none fixed bottom-1.5 sm:bottom-2 left-0 right-0 z-30 flex flex-col items-center gap-1 sm:gap-1.5 px-2 sm:px-3">
      {/* Indikator Fase Penerbangan / Safety */}
      {flightLabel && (
        <div className="hud-panel pointer-events-none rounded-full border-[#ffb703]/60 px-3.5 py-1 font-display text-[11px] sm:text-xs font-bold tracking-[0.16em] text-[#ffb703] uppercase shadow-amber animate-slidein">
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

      {/* Bar Menu "SIMULASI" Langsung Terbuka Saat Aktif (tanpa perlu klik Simulasi lagi, tutup via Stop) */}
      {isSimPanelActive && (
        <div className="hud-panel pointer-events-auto flex flex-col items-center gap-1.5 rounded-2xl border-[#ffb703]/50 bg-[#091c3a]/95 px-3 py-2 shadow-[0_12px_32px_rgba(2,10,28,0.85)] animate-slidein">
          <div className="text-[10px] sm:text-[11px] font-medium tracking-wider text-slate-300">
            {flightMode === 'parked' && 'Tahapan Terbang: 1. Take Off → 2. Manuver → 3. Landing'}
            {flightMode === 'takeoff' && 'Pesawat sedang lepas landas di Runway... tunggu mengudara'}
            {flightMode === 'airborne' && 'Pesawat sudah mengudara! Lanjut klik 2. Manuver atau 3. Landing'}
            {flightMode === 'maneuver' && 'Manuver udara aktif! Klik 3. Landing untuk mendarat di Runway'}
            {flightMode === 'landing' && 'Pesawat sedang melakukan pendaratan ke Runway...'}
            {flightMode === 'mission' && `Misi aktif (${missionBtnLabel})! Langsung klik 3. Landing untuk mendarat di Runway`}
            {flightMode === 'aar' && 'AAR Refueling aktif! Langsung klik 3. Landing untuk mendarat di Runway'}
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
              {isAirborneReady ? <Flame className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
              2. Manuver
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
                title="Jalankan Simulasi Misi Operasi TNI AU (Flare / Drop Barang & Terjun Payung / SAR Hoist Laut)"
                onClick={() => {
                  triggerMission();
                  setSimMenuOpen(false);
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                  flightMode === 'mission'
                    ? 'border-amber-400 bg-amber-400 text-[#0a1e3c]'
                    : 'border-amber-400/55 bg-[#0e2a54] text-amber-300 hover:bg-amber-400/20'
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {missionBtnLabel}
              </button>
            )}

            <button
              type="button"
              title="Air-to-Air Refueling (Pengisian Bahan Bakar di Udara dengan Tanker KC-130B Skadron 32)"
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
              <Fuel className="h-4 w-4" />
              AAR Refueling
            </button>

            <button
              type="button"
              onClick={() => {
                toggle('oxygenMode');
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase transition-all cursor-pointer active:scale-95 ${
                oxygenMode
                  ? 'border-cyan-400 bg-cyan-400 text-[#0a1e3c]'
                  : 'border-cyan-400/45 bg-[#0e2a54] text-cyan-300 hover:bg-cyan-400/20'
              }`}
            >
              <Waves className="h-4 w-4" />
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
          className="hud-panel pointer-events-auto flex max-w-full items-center gap-1 sm:gap-2 overflow-x-auto rounded-2xl px-1.5 sm:px-3 py-1.5 sm:py-2"
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

      {/* Footer Kredit & Kontak di Bagian Bawah Aplikasi */}
      <footer className="hud-panel pointer-events-auto flex flex-wrap items-center justify-center gap-x-2.5 sm:gap-x-3 gap-y-0.5 rounded-full px-3 sm:px-4 py-1 text-[10px] sm:text-xs text-slate-300">
        <a
          href="mailto:bangelan@gmail.com"
          title="Kirim email ke bangelan@gmail.com"
          className="inline-flex items-center gap-1 text-[#ffb703] hover:text-[#ffd166] hover:underline transition-colors"
        >
          <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span>
            Created By : <strong className="font-semibold">Abang Elan</strong>
          </span>
        </a>
        <span className="text-[#4da6ff]/45">•</span>
        <a
          href="tel:+6281314127822"
          title="Hubungi +6281314127822"
          className="inline-flex items-center gap-1 text-[#4da6ff] hover:text-white hover:underline transition-colors"
        >
          <Phone className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span>+6281314127822</span>
        </a>
      </footer>
    </div>
  );
}
