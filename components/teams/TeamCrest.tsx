import Image from "next/image";

export function TeamCrest({
  shieldUrl,
  color,
  size = 20,
}: {
  shieldUrl?: string | null;
  color?: string | null;
  size?: number;
}) {
  if (shieldUrl) {
    return (
      <span
        className="relative shrink-0 inline-block"
        style={{ width: size, height: size }}
      >
        <Image src={shieldUrl} alt="" fill className="object-contain" unoptimized />
      </span>
    );
  }

  if (color) {
    const dotSize = Math.max(8, Math.round(size * 0.45));
    return (
      <span
        className="rounded-full border border-black/10 shrink-0 inline-block"
        style={{ width: dotSize, height: dotSize, background: color }}
      />
    );
  }

  return null;
}
