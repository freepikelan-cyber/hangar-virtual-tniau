import { useEffect, useState } from 'react';
import {
  CheckCircle2,
  DoorClosed,
  DoorOpen,
  Flame,
  PlaneLanding,
  PlaneTakeoff,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useHangarStore, useSelectedUnit } from '../../store/useHangarStore';
import { aircraftAudio } from '../../utils/aircraftAudio';

export function PilotRoomOverlay() {
  const unit = useSelectedUnit();
  const pilotRoomOpen = useHangarStore((s) => s.pilotRoomOpen);
  const pilotRoomStage = useHangarStore((s) => s.pilotRoomStage);
  const canopyOpen = useHangarStore((s) => s.canopyOpen);
  const flightMode = useHangarStore((s) => s.flightMode);
  const closePilotRoom = useHangarStore((s) => s.closePilotRoom);
  const setPilotRoomStage = useHangarStore((s) => s.setPilotRoomStage);
  const toggleCanopy = useHangarStore((s) => s.toggleCanopy);
  const triggerTakeOff = useHangarStore((s) => s.triggerTakeOff);
  const triggerManeuver = useHangarStore((s) => s.triggerManeuver);
  const triggerLanding = useHangarStore((s) => s.triggerLanding);

  const [gear, setGear] = useState({ suit: false, vest: false, helmet: false });
  const [hudTick, setHudTick] = useState(0);

  useEffect(() => {
    if (!pilotRoomOpen) {
      setGear({ suit: false, vest: false, helmet: false });
      return;
    }
    const id = window.setInterval(() => setHudTick((v) => v + 1), 180);
    return () => window.clearInterval(id);
  }, [pilotRoomOpen]);

  if (!pilotRoomOpen || unit.id === 'gsuit' || unit.id === 'pilot-helmet') return null;

  const isFighter = unit.category === 'Tempur' || unit.category === 'Latih';
  const isHeli = unit.category === 'Helikopter';

  const gearItems = isFighter
    ? [
        { key: 'suit' as const, title: 'Flight Suit Nomex TNI AU', desc: 'Seragam penerbang tempur tahan api hijau zaitun.' },
        { key: 'vest' as const, title: 'Anti-G Suit (9G) & Harness', desc: '5 kantung pneumatik penahan gaya G hingga 9G.' },
        { key: 'helmet' as const, title: 'Helm JHMCS & Masker MBU-20/P', desc: 'Helm HUD penargetan & suplai oksigen OBOGS.' },
      ]
    : isHeli
      ? [
          { key: 'suit' as const, title: 'Flight Suit Taktis Helikopter', desc: 'Seragam kru udara taktis Skadron Helikopter.' },
          { key: 'vest' as const, title: 'Rompi SAR & Pelampung Laut', desc: 'Survival vest dengan beacon ELT & pelampung CO2.' },
          { key: 'helmet' as const, title: 'Helm Helikopter ANR & NVG', desc: 'Helm peredam bising rotor & penglihatan malam.' },
        ]
      : [
          { key: 'suit' as const, title: 'Seragam Penerbang Angkut/VIP', desc: 'Seragam kru pesawat angkut berat / VVIP TNI AU.' },
          { key: 'vest' as const, title: 'Life Vest & Sabuk Pengaman', desc: 'Pelampung keselamatan operasi lintas perairan.' },
          { key: 'helmet' as const, title: 'Headset Aviasi ANR & Mic', desc: 'Komunikasi jernih dengan menara ATC & kru kabin.' },
        ];

  const allEquipped = gear.suit && gear.vest && gear.helmet;

  // Telemetri HUD dinamis mengikuti fase penerbangan POV
  const speedKts =
    flightMode === 'parked'
      ? 0
      : flightMode === 'takeoff'
        ? 185 + (hudTick % 60) * 2
        : flightMode === 'maneuver'
          ? 440 + Math.round(Math.sin(hudTick * 0.4) * 35)
          : flightMode === 'landing'
            ? Math.max(0, 145 - (hudTick % 45) * 3)
            : 320 + Math.round(Math.sin(hudTick * 0.25) * 12);

  const altFt =
    flightMode === 'parked'
      ? 0
      : flightMode === 'takeoff'
        ? Math.min(8500, (hudTick % 50) * 180)
        : flightMode === 'maneuver'
          ? 14200 + Math.round(Math.sin(hudTick * 0.35) * 950)
          : flightMode === 'landing'
            ? Math.max(0, 2400 - (hudTick % 40) * 65)
            : 12500 + Math.round(Math.cos(hudTick * 0.2) * 180);

  const gLoad =
    flightMode === 'maneuver' ? (3.8 + Math.abs(Math.sin(hudTick * 0.35)) * 4.4).toFixed(1) : flightMode === 'parked' ? '1.0' : '1.2';

  const horizonTilt = flightMode === 'maneuver' ? Math.sin(hudTick * 0.3) * 24 : flightMode === 'airborne' ? Math.sin(hudTick * 0.15) * 4 : 0;

  // =========================================================================
  // TAHAP 1: CREW ROOM / LOCKER PERSIAPAN PILOT
  // =========================================================================
  if (pilotRoomStage === 'gear') {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#040d1e]/82 backdrop-blur-md p-3 sm:p-5 animate-slidein">
        <div className="hud-panel relative w-full max-w-2xl rounded-2xl border-[#4da6ff]/60 bg-[#081b38]/95 p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-start justify-between gap-3 border-b border-[#4da6ff]/25 pb-3">
            <div>
              <span className="font-display text-[11px] font-bold tracking-[0.18em] text-[#ffb703] uppercase">
                PILOT ROOM • TAHAP 1: PERSIAPAN PERLENGKAPAN PENERBANG
              </span>
              <h2 className="mt-0.5 font-display text-xl sm:text-2xl font-bold text-white uppercase">
                Crew Briefing — {unit.name}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Kenakan perlengkapan terbang sesuai jenis pesawat sebelum naik ke kokpit.
              </p>
            </div>
            <button
              type="button"
              onClick={closePilotRoom}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-300 hover:text-white cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {gearItems.map((item, idx) => {
              const done = gear[item.key];
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setGear((g) => ({ ...g, [item.key]: !g[item.key] }))}
                  className={`flex flex-col items-start text-left rounded-xl border p-3.5 transition-all cursor-pointer active:scale-[0.98] ${
                    done
                      ? 'border-emerald-400 bg-emerald-500/15 shadow-[0_0_18px_rgba(52,211,153,0.22)]'
                      : 'border-slate-700/80 bg-[#0d264d]/80 hover:border-[#4da6ff]/70'
                  }`}
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="font-display text-[10px] font-bold tracking-widest text-[#4da6ff] uppercase">
                      ITEM 0{idx + 1}
                    </span>
                    <CheckCircle2 className={`h-4 w-4 ${done ? 'text-emerald-400' : 'text-slate-600'}`} />
                  </div>
                  <div className="mt-2 font-display text-sm font-bold text-white leading-snug">{item.title}</div>
                  <p className="mt-1 text-[11px] text-slate-300 leading-snug">{item.desc}</p>
                  <span
                    className={`mt-3 rounded px-2 py-0.5 font-display text-[10px] font-bold tracking-wider uppercase ${
                      done ? 'bg-emerald-400/20 text-emerald-300' : 'bg-[#ffb703]/15 text-[#ffb703]'
                    }`}
                  >
                    {done ? 'TERPASANG ✓' : 'KLIK UNTUK PAKAI'}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <button
              type="button"
              onClick={() => setGear({ suit: true, vest: true, helmet: true })}
              className="rounded-lg border border-[#4da6ff]/50 bg-[#0e2a54] px-3.5 py-2 font-display text-xs font-bold tracking-wider text-[#75bcff] uppercase hover:bg-[#4da6ff]/20 cursor-pointer"
            >
              Pasang Semua Cepat
            </button>
            <button
              type="button"
              disabled={!allEquipped}
              onClick={() => {
                aircraftAudio.unlock();
                setPilotRoomStage('cockpit');
              }}
              className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 font-display text-xs sm:text-sm font-bold tracking-wider uppercase transition-all ${
                allEquipped
                  ? 'border-[#ffb703] bg-[#ffb703] text-[#081933] hover:bg-amber-300 cursor-pointer shadow-amber active:scale-95'
                  : 'border-slate-700 bg-slate-800/70 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              Naik ke Kokpit (Buka Kanopi) →
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAHAP 2: FIRST-PERSON POV KOKPIT + HUD HIJAU + 3 LAYAR MFD + KANOPI BUKA-TUTUP
  // =========================================================================
  const canTakeOff = flightMode === 'parked' && !canopyOpen;
  const isAirborne = flightMode === 'airborne' || flightMode === 'maneuver';

  return (
    <div className="pointer-events-none fixed inset-0 z-35 flex flex-col justify-between overflow-hidden">
      {/* Bingkai Kanopi Atas (bergeser naik saat Kanopi Terbuka, turun menutup saat Kanopi Tertutup!) */}
      <div
        className={`pointer-events-none w-full border-b-4 border-slate-900 bg-gradient-to-b from-[#060d18]/90 via-[#0b1728]/55 to-transparent transition-all duration-700 ${
          canopyOpen ? 'h-6 opacity-45' : 'h-16 sm:h-20 opacity-95'
        }`}
      >
        <div className="flex items-center justify-between px-4 pt-2">
          <span className="rounded-md border border-emerald-400/50 bg-[#061529]/85 px-2.5 py-1 font-display text-[10px] sm:text-xs font-bold tracking-[0.16em] text-emerald-300 uppercase">
            POV KOKPIT • {unit.name} • {canopyOpen ? 'KANOPI TERBUKA' : 'KANOPI TERTUTUP & TERKUNCI'}
          </span>
          <button
            type="button"
            onClick={closePilotRoom}
            className="pointer-events-auto inline-flex items-center gap-1 rounded-lg border border-rose-400/60 bg-rose-950/85 px-3 py-1.5 font-display text-[11px] font-bold tracking-wider text-rose-200 uppercase hover:bg-rose-500 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" /> Keluar Kokpit
          </button>
        </div>
      </div>

      {/* Tengah: Kaca Proyeksi HUD Hijau Real-Time (Artificial Horizon, Speed, Altitude, G-Force) */}
      <div className="pointer-events-none relative flex-1 flex items-center justify-center">
        <div className="relative h-[220px] w-[min(360px,86vw)] rounded-2xl border border-emerald-400/35 bg-emerald-950/10 shadow-[inset_0_0_32px_rgba(16,185,129,0.12)] flex items-center justify-between px-4 font-mono text-emerald-300">
          {/* Kecepatan (KTS) Kiri */}
          <div className="flex flex-col items-start">
            <span className="text-[9px] tracking-widest opacity-80">SPD KTS</span>
            <span className="rounded border border-emerald-400/70 bg-emerald-950/60 px-2 py-0.5 text-lg font-bold">
              {speedKts}
            </span>
            <span className="mt-2 text-[10px]">G: {gLoad}</span>
          </div>

          {/* Pitch Ladder / Artificial Horizon Tengah */}
          <div
            className="relative flex flex-col items-center justify-center transition-transform duration-200"
            style={{ transform: `rotate(${horizonTilt}deg)` }}
          >
            <div className="w-20 border-t border-dashed border-emerald-400/70 mb-4" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-0.5 bg-emerald-400" />
              <div className="h-3.5 w-3.5 rounded-full border-2 border-emerald-400" />
              <div className="w-8 h-0.5 bg-emerald-400" />
            </div>
            <div className="w-20 border-t border-dashed border-emerald-400/70 mt-4" />
          </div>

          {/* Ketinggian (ALT FT) Kanan */}
          <div className="flex flex-col items-end">
            <span className="text-[9px] tracking-widest opacity-80">ALT FT</span>
            <span className="rounded border border-emerald-400/70 bg-emerald-950/60 px-2 py-0.5 text-lg font-bold">
              {altFt.toLocaleString('id-ID')}
            </span>
            <span className="mt-2 text-[10px]">HDG 090</span>
          </div>
        </div>
      </div>

      {/* Bawah: Dasbor Kokpit 3D + 3 Layar MFD & Tombol Kendali Pilot */}
      <div className="pointer-events-auto w-full border-t-2 border-slate-700/90 bg-gradient-to-t from-[#050b14] via-[#0a1526]/95 to-[#0d1c33]/85 px-3 py-2.5 shadow-[0_-12px_36px_rgba(0,0,0,0.85)]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          {/* MFD Kiri: Radar Scope Mini */}
          <div className="hidden md:flex items-center gap-2.5 rounded-lg border border-emerald-500/40 bg-[#041410] px-2.5 py-1.5">
            <div className="relative h-11 w-11 rounded-full border border-emerald-400/60 flex items-center justify-center overflow-hidden">
              <div className="h-6 w-6 rounded-full border border-emerald-400/35" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-emerald-400/25 to-transparent animate-spin" />
            </div>
            <div className="font-mono text-[10px] text-emerald-300 leading-tight">
              <div className="font-bold">MFD-1 RADAR</div>
              <div className="text-emerald-400/80">RNG 40 NM • CLR</div>
            </div>
          </div>

          {/* Panel Tombol Kendali Pilot Tengah */}
          <div className="flex flex-1 flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => {
                aircraftAudio.unlock();
                toggleCanopy();
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase cursor-pointer active:scale-95 ${
                canopyOpen
                  ? 'border-[#ffb703] bg-[#ffb703]/20 text-[#ffb703]'
                  : 'border-emerald-400/60 bg-emerald-500/15 text-emerald-300'
              }`}
            >
              {canopyOpen ? <DoorOpen className="h-4 w-4" /> : <DoorClosed className="h-4 w-4" />}
              {canopyOpen ? 'Tutup Kanopi' : 'Kanopi Tertutup ✓'}
            </button>

            <button
              type="button"
              disabled={!canTakeOff}
              title={canopyOpen ? 'Tutup Kanopi terlebih dahulu sebelum Take Off!' : 'Take Off dari POV Kokpit'}
              onClick={triggerTakeOff}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase ${
                canTakeOff
                  ? 'border-[#ffb703] bg-[#ffb703] text-[#081933] cursor-pointer active:scale-95'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
              }`}
            >
              <PlaneTakeoff className="h-4 w-4" /> 1. Take Off
            </button>

            <button
              type="button"
              disabled={!isAirborne}
              onClick={triggerManeuver}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase ${
                isAirborne
                  ? 'border-[#4da6ff] bg-[#4da6ff]/20 text-[#75bcff] hover:bg-[#4da6ff]/30 cursor-pointer active:scale-95'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Flame className="h-4 w-4" /> 2. Manuver
            </button>

            <button
              type="button"
              disabled={!isAirborne}
              onClick={triggerLanding}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 font-display text-xs font-bold tracking-wider uppercase ${
                isAirborne
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 cursor-pointer active:scale-95'
                  : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
              }`}
            >
              <PlaneLanding className="h-4 w-4" /> 3. Landing
            </button>
          </div>

          {/* MFD Kanan: Status Sistem Mesin */}
          <div className="hidden md:flex flex-col rounded-lg border border-cyan-500/40 bg-[#051424] px-3 py-1.5 font-mono text-[10px] text-cyan-300 leading-tight">
            <div className="font-bold text-[#ffb703]">MFD-2 ENGINE</div>
            <div>RPM: {flightMode === 'parked' ? 'IDLE 22%' : 'MIL 98%'}</div>
            <div>FUEL: 94% • HYD OK</div>
          </div>
        </div>
      </div>
    </div>
  );
}
