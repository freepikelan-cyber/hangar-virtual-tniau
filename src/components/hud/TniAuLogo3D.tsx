interface TniAuLogo3DProps {
  className?: string;
  animated?: boolean;
}

/**
 * Emblem 3D Resmi TNI AU (Swa Bhuwana Paksa):
 * Menggunakan PNG transparan hasil bevel logam emas 3D + perspektif 3D CSS & kilau dinamis.
 */
export function TniAuLogo3D({ className = 'h-12 w-12', animated = false }: TniAuLogo3DProps) {
  return (
    <div className={`relative flex items-center justify-center [perspective:650px] ${className}`}>
      <div
        className={`relative h-full w-full flex items-center justify-center [transform-style:preserve-3d] ${
          animated ? 'logo-3d-float' : 'logo-3d-tilt'
        }`}
      >
        <img
          src="/logo-tniau.png?v=2"
          alt="Logo 3D Resmi TNI AU Swa Bhuwana Paksa"
          className="h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(0,0,0,0.65)] drop-shadow-[0_0_10px_rgba(255,183,3,0.42)]"
        />
      </div>
    </div>
  );
}
