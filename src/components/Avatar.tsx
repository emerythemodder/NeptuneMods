import { useState } from "react";
import { BANNER_GRADIENTS } from "../lib/appearance";
import type { Profile } from "../lib/store";

export function displayName(p: Profile): string {
  return p.displayName.trim() || p.handle.trim() || "Player";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : parts[0].slice(0, 2)).toUpperCase();
}

export function avatarUrl(p: Profile, size: number): string | null {
  if (p.avatar.kind === "image" && p.avatar.image) return p.avatar.image;
  if (p.avatar.kind === "minecraft" && p.avatar.minecraftName.trim()) {
    return `https://mc-heads.net/avatar/${encodeURIComponent(p.avatar.minecraftName.trim())}/${Math.max(64, size * 2)}`;
  }
  return null;
}

export function Avatar({ profile, size = 32, className = "" }: { profile: Profile; size?: number; className?: string }) {
  const [broken, setBroken] = useState<string | null>(null);
  const url = avatarUrl(profile, size);
  const rounded = profile.avatar.kind === "minecraft" ? "rounded-md" : "rounded-full";
  const style = { width: size, height: size };
  if (url && broken !== url) {
    return (
      <img
        src={url}
        alt=""
        style={{ ...style, imageRendering: profile.avatar.kind === "minecraft" ? "pixelated" : undefined }}
        className={`${rounded} object-cover bg-surface-2 shrink-0 ${className}`}
        onError={() => setBroken(url)}
      />
    );
  }
  return (
    <div
      style={{ ...style, fontSize: size * 0.38 }}
      className={`${rounded} shrink-0 flex items-center justify-center bg-accent-soft text-accent font-semibold ${className}`}
    >
      {initials(displayName(profile))}
    </div>
  );
}

export function bannerStyle(p: Profile): React.CSSProperties {
  const b = p.banner;
  if (b.kind === "image" && b.image) return { backgroundImage: `url("${b.image}")`, backgroundSize: "cover", backgroundPosition: "center" };
  if (b.kind === "color") return { background: b.color };
  return { background: (BANNER_GRADIENTS[b.gradient] ?? BANNER_GRADIENTS.neptune).css };
}
