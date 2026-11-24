import { useEffect, useRef } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { HotspotItem } from '../../data/fleetData';
import { pinRegistry, useHangarStore } from '../../store/useHangarStore';

interface HotspotPinProps {
  item: HotspotItem;
}

function HotspotPin({ item }: HotspotPinProps) {
  const groupRef = useRef<THREE.Group>(null);
  const activeHotspot = useHangarStore((s) => s.activeHotspot);
  const focusHotspot = useHangarStore((s) => s.focusHotspot);
  const quiz = useHangarStore((s) => s.quiz);
  const answerQuiz = useHangarStore((s) => s.answerQuiz);

  useEffect(() => {
    const obj = groupRef.current;
    if (obj) pinRegistry.set(item.id, obj);
    return () => {
      pinRegistry.delete(item.id);
    };
  }, [item.id]);

  const isQuizActive = quiz.status === 'active';
  const isSelected = activeHotspot === item.id;
  const fb = quiz.feedback;

  const isInternal = !isQuizActive && item.partType === 'Sistem Internal';

  let tone: 'blue' | 'internal' | 'amber' | 'green' | 'red' = isInternal ? 'internal' : 'blue';
  if (isQuizActive && fb) {
    if (item.id === fb.questionId) tone = 'green';
    else if (item.id === fb.pickedId && !fb.correct) tone = 'red';
  } else if (isSelected) {
    tone = 'amber';
  }

  const toneClasses = {
    blue: 'bg-[#0c2752]/90 border-[#4da6ff] text-[#4da6ff] shadow-[0_0_14px_rgba(77,166,255,0.65)] hover:bg-[#4da6ff] hover:text-[#0a1e3c]',
    internal: 'bg-[#0b3338]/90 border-cyan-300 text-cyan-200 shadow-[0_0_14px_rgba(34,211,238,0.65)] hover:bg-cyan-300 hover:text-[#0a1e3c]',
    amber: 'bg-[#ffb703] border-[#fff0c2] text-[#0a1e3c] shadow-[0_0_22px_rgba(255,183,3,0.9)] scale-110',
    green: 'bg-emerald-400 border-emerald-100 text-[#0a1e3c] shadow-[0_0_22px_rgba(52,211,153,0.9)] scale-110',
    red: 'bg-rose-500 border-rose-200 text-white shadow-[0_0_22px_rgba(244,63,94,0.9)]',
  }[tone];

  const ringColor = {
    blue: 'border-[#4da6ff]/70',
    internal: 'border-cyan-300/75',
    amber: 'border-[#ffb703]/80',
    green: 'border-emerald-400/80',
    red: 'border-rose-400/80',
  }[tone];

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isQuizActive) {
      answerQuiz(item.id);
    } else {
      focusHotspot(item.id);
    }
  };

  return (
    <group ref={groupRef} position={item.pos}>
      <Html center distanceFactor={19} zIndexRange={[20, 0]}>
        <div className="relative flex flex-col items-center select-none pointer-events-auto">
          <span
            className={`pointer-events-none absolute inset-0 rounded-full border-2 animate-pulsering ${ringColor}`}
            aria-hidden
          />
          <button
            type="button"
            onClick={handleClick}
            title={isQuizActive ? `Pin ${item.id}` : `${item.id}. ${item.name}${item.partType ? ` (${item.partType})` : ''}`}
            aria-label={isQuizActive ? `Pilih pin ${item.id}` : `Lihat komponen ${item.name}`}
            className={`relative flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-full border-2 font-display text-sm font-bold transition-all duration-200 cursor-pointer ${toneClasses}`}
          >
            {item.id}
          </button>
          {!isQuizActive && isSelected && (
            <div className="pointer-events-none mt-1.5 whitespace-nowrap rounded border border-[#ffb703]/70 bg-[#0a1e3c]/90 px-2 py-0.5 font-display text-xs font-semibold tracking-wider text-[#ffb703] uppercase shadow-lg">
              {item.name}
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}

export function HotspotMarkers({ hotspots }: { hotspots: HotspotItem[] }) {
  const showPins = useHangarStore((s) => s.showPins);
  const quizStatus = useHangarStore((s) => s.quiz.status);

  if (!showPins && quizStatus !== 'active') return null;

  return (
    <group name="hotspot-markers">
      {hotspots.map((h) => (
        <HotspotPin key={h.id} item={h} />
      ))}
    </group>
  );
}
