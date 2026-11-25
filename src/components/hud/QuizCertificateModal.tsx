import { useState } from 'react';
import { Award, Download, X } from 'lucide-react';
import { useSelectedUnit } from '../../store/useHangarStore';

interface Props {
  score: number;
  total: number;
  onClose: () => void;
}

/**
 * Generator Sertifikat Digital "KADET DIRGANTARA TNI AU" (PNG resolusi tinggi 1600×1100)
 * yang dapat langsung diunduh setelah pengguna menyelesaikan Kuis 3D!
 */
export function QuizCertificateModal({ score, total, onClose }: Props) {
  const unit = useSelectedUnit();
  const [name, setName] = useState('');

  const downloadCertificate = () => {
    const recipient = name.trim() || 'KADET DIRGANTARA';
    const c = document.createElement('canvas');
    c.width = 1600;
    c.height = 1100;
    const ctx = c.getContext('2d')!;

    // Latar belakang biru dongker resmi TNI AU
    const bg = ctx.createLinearGradient(0, 0, 1600, 1100);
    bg.addColorStop(0, '#071731');
    bg.addColorStop(0.5, '#0c2752');
    bg.addColorStop(1, '#06142b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1600, 1100);

    // Bingkai emas ganda elegan
    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 10;
    ctx.strokeRect(42, 42, 1516, 1016);
    ctx.strokeStyle = 'rgba(77, 166, 255, 0.55)';
    ctx.lineWidth = 3;
    ctx.strokeRect(64, 64, 1472, 972);

    // Header TNI AU
    ctx.fillStyle = '#4da6ff';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TENTARA NASIONAL INDONESIA ANGKATAN UDARA • EDUKASI DIRGANTARA 3D', 800, 148);

    ctx.fillStyle = '#ffb703';
    ctx.font = 'bold 68px sans-serif';
    ctx.fillText('SERTIFIKAT KADET DIRGANTARA', 800, 240);

    ctx.fillStyle = '#cbd5e1';
    ctx.font = '28px sans-serif';
    ctx.fillText('Diberikan dengan bangga kepada:', 800, 345);

    // Nama penerima
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 74px sans-serif';
    ctx.fillText(recipient.toUpperCase(), 800, 445);

    ctx.strokeStyle = '#ffb703';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(420, 472);
    ctx.lineTo(1180, 472);
    ctx.stroke();

    // Keterangan pencapaian
    ctx.fillStyle = '#e2e8f0';
    ctx.font = '30px sans-serif';
    ctx.fillText('Telah berhasil menyelesaikan Kuis Pengenalan Alutsista 3D pada unit:', 800, 560);

    ctx.fillStyle = '#4da6ff';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(`${unit.name} (${unit.tailNumber})`, 800, 628);

    // Skor
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText(`SKOR EVALUASI: ${score} / ${total}`, 800, 718);

    // Motto & Tanggal
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillStyle = '#ffb703';
    ctx.font = 'italic bold 32px sans-serif';
    ctx.fillText('"SWA BHUWANA PAKSA"', 800, 845);

    ctx.fillStyle = '#94a3b8';
    ctx.font = '24px sans-serif';
    ctx.fillText(`Hangar Virtual Pesawat TNI AU 3D • ${dateStr}`, 800, 935);
    ctx.fillText('Created By : Abang Elan', 800, 978);

    const url = c.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sertifikat-Kadet-TNIAU-${recipient.replace(/\s+/g, '-')}.png`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-slidein">
      <div className="hud-panel w-full max-w-md rounded-2xl border-[#ffb703]/60 bg-[#081b38]/95 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-[#ffb703]">
            <Award className="h-5 w-5" />
            <h3 className="font-display text-base font-bold tracking-wider uppercase">
              Sertifikat Kadet Dirgantara
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-[#0e2a54] text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Masukkan nama Anda untuk mencetak Sertifikat Digital resmi penyelesaian Kuis 3D{' '}
          <strong className="text-white">{unit.name}</strong> (Skor: <strong className="text-emerald-400">{score}/{total}</strong>).
        </p>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nama Lengkap Anda..."
          className="w-full rounded-lg border border-[#4da6ff]/40 bg-[#0a2145] px-3 py-2.5 text-sm text-white placeholder-slate-400 focus:border-[#ffb703] focus:outline-none"
        />

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 font-display text-xs font-bold tracking-wider text-slate-300 uppercase cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={downloadCertificate}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#ffb703] bg-[#ffb703] px-4 py-2 font-display text-xs font-bold tracking-wider text-[#081933] uppercase hover:bg-amber-300 cursor-pointer shadow-amber active:scale-95"
          >
            <Download className="h-4 w-4" />
            Unduh PNG
          </button>
        </div>
      </div>
    </div>
  );
}
