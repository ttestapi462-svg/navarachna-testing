"use client";

import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface StudioLogoIconProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Authentic Navarachna Designer Studio monogram emblem:
 * Needle tilted diagonally, threaded with a continuous crimson-to-navy ribbon
 * weaving the initials "N", "D", and "S".
 */
export function StudioLogoIcon({
  size = 36,
  className,
  priority = false,
}: StudioLogoIconProps) {
  return (
    <div
      className={cn("relative shrink-0 select-none flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/emblem-transparent.png"
        alt="Navarachna Designer Studio Emblem"
        width={size * 2}
        height={size * 2}
        className="w-full h-full object-contain"
        priority={priority}
      />
    </div>
  );
}

interface StudioAppIconProps {
  size?: number;
  className?: string;
  badgeClassName?: string;
  priority?: boolean;
  withText?: boolean;
}

/**
 * App Icon:
 * Renders the official app icon containing the authentic logo artwork
 * (needle, thread monogram, and "Navarachna Designers Studio" with exact stencil font and coloring).
 */
export function StudioAppIcon({
  size = 40,
  className,
  badgeClassName,
  priority = false,
  withText = false,
}: StudioAppIconProps) {
  if (withText) {
    return (
      <div
        className={cn(
          "relative shrink-0 flex items-center justify-center bg-white rounded-xl border border-rose-100 shadow-xs overflow-hidden select-none",
          badgeClassName
        )}
        style={{ width: size, height: size }}
      >
        <Image
          src="/icon.png"
          alt="Navarachna Designers Studio App Icon"
          width={size * 2}
          height={size * 2}
          className={cn("w-full h-full object-contain p-1", className)}
          priority={priority}
        />
      </div>
    );
  }

  const iconPadding = Math.max(3, Math.round(size * 0.1));
  const emblemSize = size - iconPadding * 2;

  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center bg-white rounded-xl border border-rose-100 shadow-xs overflow-hidden select-none",
        badgeClassName
      )}
      style={{ width: size, height: size }}
    >
      <StudioLogoIcon
        size={emblemSize}
        className={className}
        priority={priority}
      />
    </div>
  );
}

interface StudioBrandMarkProps {
  variant?: "horizontal" | "stacked" | "compact" | "textOnly";
  height?: number;
  gap?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Authentic Brand Logo Mark:
 * Renders the authentic original artwork with 100% pixel fidelity:
 * exact stencil cuts, exact font weight, exact proportions, and exact crimson-to-navy gradient.
 */
export function StudioBrandMark({
  variant = "horizontal",
  height,
  gap,
  className,
  priority = false,
}: StudioBrandMarkProps) {
  const defaultHeight = variant === "stacked" ? 72 : 36;
  const effectiveHeight = height ?? defaultHeight;

  if (variant === "stacked") {
    // Aspect ratio of full stacked logo: width ~1760, height ~735 (ratio 2.39:1)
    const width = Math.round(effectiveHeight * 2.39);
    return (
      <div
        className={cn("relative shrink-0 select-none flex items-center justify-center", className)}
        style={height ? { height: effectiveHeight } : undefined}
      >
        <Image
          src="/logo-transparent.png"
          alt="Navarachna Designers Studio"
          width={width * 2}
          height={effectiveHeight * 2}
          className="h-full w-auto object-contain"
          priority={priority}
        />
      </div>
    );
  }

  if (variant === "textOnly") {
    // Aspect ratio of text: width ~1760, height ~302 (ratio 5.83:1)
    const width = Math.round(effectiveHeight * 5.83);
    return (
      <div
        className={cn("relative shrink-0 select-none flex items-center justify-center", className)}
        style={height ? { height: effectiveHeight } : undefined}
      >
        <Image
          src="/logo-text-transparent.png"
          alt="Navarachna Designers Studio"
          width={width * 2}
          height={effectiveHeight * 2}
          className="h-full w-auto object-contain"
          priority={priority}
        />
      </div>
    );
  }

  // Default: Horizontal Lockup (Emblem on left + Generous Breathing Gap + Balanced 2-line Text on right)
  // Emblem aspect ratio ~ 448 : 454 (0.987:1)
  const emblemHeight = effectiveHeight;
  const emblemWidth = Math.round(emblemHeight * 0.987);

  // Text is 1765 x 302 (ratio ~5.844:1)
  // Optically balanced to match emblem loop visual center
  const textHeight = Math.round(effectiveHeight * 0.70);
  const textWidth = Math.round(textHeight * 5.844);

  // Proportional gap: allows direct override via prop, defaults to comfortable breathing room (~45% of emblem height)
  const effectiveGap = gap ?? Math.max(16, Math.round(effectiveHeight * 0.45));

  return (
    <div
      className={cn("relative select-none flex items-center shrink-0 min-w-0", className)}
      style={{ height: effectiveHeight, gap: effectiveGap }}
    >
      <div
        className="relative shrink-0 flex items-center justify-center"
        style={{ width: emblemWidth, height: emblemHeight }}
      >
        <Image
          src="/emblem-transparent.png"
          alt="Navarachna Designer Studio Emblem"
          width={emblemWidth * 2}
          height={emblemHeight * 2}
          className="w-full h-full object-contain"
          priority={priority}
        />
      </div>
      <div
        className="relative shrink-0 flex items-center"
        style={{ width: textWidth, height: textHeight }}
      >
        <Image
          src="/logo-text-transparent.png"
          alt="Navarachna Designers Studio"
          width={textWidth * 2}
          height={textHeight * 2}
          className="w-full h-full object-contain object-left"
          priority={priority}
        />
      </div>
    </div>
  );
}

export {
  StudioAnimatedLogo,
  StudioLoader,
  type StudioAnimatedLogoProps,
  type StudioLoaderProps,
} from "./studio-loader";

