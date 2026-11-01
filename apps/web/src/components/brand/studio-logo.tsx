"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface StudioLogoIconProps {
  size?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Authentic Navarachna Needle & Thread Monogram Emblem
 * Exactly extracted from the official logo artwork with 100% pixel fidelity and crystal-clear alpha.
 */
export function StudioLogoIcon({
  size = 36,
  className,
}: StudioLogoIconProps) {
  return (
    <div
      className={cn("relative shrink-0 select-none flex items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <img
        src="/assets/navarachna-monogram-gold.png"
        alt="Navarachna Needle & Thread Monogram"
        width={size}
        height={size}
        className="w-full h-full object-contain select-none"
        loading="eager"
        decoding="async"
      />
    </div>
  );
}

interface StudioBrandMarkProps {
  variant?: "horizontal" | "stacked" | "full" | "textOnly";
  height?: number;
  gap?: number;
  className?: string;
  priority?: boolean;
}

/**
 * Authentic Navarachna Designer Studio Brand Mark
 * Exact 100% reproduction of the official logo artwork:
 * - 3D Embossed Brushed Antique Gold (#FFE7C4 / #E0B159 / #C59B4E / #8E6339)
 * - Needle & Thread Monogram with authentic metallic tilt and ribbon loops
 * - "Navarachna" wordmark with exact Comfortaa geometry and 3D bevels
 * - Horizontal tapering hairline rules flanking 4-petal diamond florets & "Designer Studio"
 * - Traditional lotus blossom filigree
 */
export function StudioBrandMark({
  variant = "horizontal",
  height,
  gap,
  className,
}: StudioBrandMarkProps) {
  // 1. FULL STACKED LOGO (For Login Page, Splash Screen, Brand Showcase)
  if (variant === "full" || variant === "stacked") {
    const effectiveHeight = height ?? 210;
    return (
      <div className={cn("relative select-none flex flex-col items-center justify-center", className)}>
        <img
          src="/assets/navarachna-full-crest-gold.png"
          alt="Navarachna Designer Studio Official Logo"
          style={{ height: effectiveHeight, width: "auto" }}
          className="h-full w-auto max-w-full object-contain select-none drop-shadow-[0_4px_16px_rgba(74,13,27,0.18)]"
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  // 2. TEXT ONLY VARIANT
  if (variant === "textOnly") {
    const effectiveHeight = height ?? 44;
    return (
      <div className={cn("relative select-none flex items-center justify-center", className)}>
        <img
          src="/assets/navarachna-wordmark-gold.png"
          alt="Navarachna Designer Studio Wordmark"
          style={{ height: effectiveHeight, width: "auto" }}
          className="h-full w-auto max-w-full object-contain select-none"
          loading="eager"
          decoding="async"
        />
      </div>
    );
  }

  // 3. HORIZONTAL LOCKUP (Default — For Sidebar & Navbar)
  // Perfectly calibrated: Monogram emblem on left with balanced presence,
  // 3D text with divider and florets on right (text size completely unchanged).
  const textHeight = height ?? 30;
  // Calibrated logo emblem size: optimal optical balance with wordmark text
  const logoEmblemSize = Math.round(textHeight * 1.16); // ~35px when text is 30px
  const spacing = gap ?? 8;

  return (
    <div
      className={cn("relative select-none flex items-center shrink-0 min-w-0", className)}
      style={{ gap: spacing }}
    >
      {/* Logo Monogram Emblem — Calibrated size per user specification */}
      <img
        src="/assets/navarachna-monogram-gold.png"
        alt="Navarachna Monogram Emblem"
        style={{ height: logoEmblemSize, width: "auto" }}
        className="h-auto w-auto max-h-none shrink-0 object-contain select-none transition-transform duration-200 hover:scale-105"
        loading="eager"
        decoding="async"
      />

      {/* Logo Text Wordmark — Size completely unchanged */}
      <img
        src="/assets/navarachna-wordmark-gold.png"
        alt="Navarachna Designer Studio"
        style={{ height: textHeight, width: "auto" }}
        className="h-auto w-auto max-h-none shrink-0 object-contain select-none"
        loading="eager"
        decoding="async"
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
 * Renders an elegant couture badge containing the authentic Needle & Thread monogram emblem.
 */
export function StudioAppIcon({
  size = 40,
  className,
  badgeClassName,
}: StudioAppIconProps) {
  const iconPadding = Math.max(3, Math.round(size * 0.12));
  const emblemSize = size - iconPadding * 2;

  return (
    <div
      className={cn(
        "relative shrink-0 flex items-center justify-center bg-white rounded-xl border border-border/80 shadow-xs overflow-hidden select-none",
        badgeClassName
      )}
      style={{ width: size, height: size }}
    >
      <StudioLogoIcon size={emblemSize} className={className} />
    </div>
  );
}
