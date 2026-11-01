"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface StudioAnimatedLogoProps {
  /**
   * Rendered pixel width/height when maintaining aspect ratio.
   * Defaults to 96.
   */
  size?: number | string;
  /**
   * Additional CSS classes applied to the root <svg>.
   */
  className?: string;
  /**
   * Animation cycle duration in seconds. Defaults to 3.4s.
   */
  duration?: number;
  /**
   * When true (default), uses a tightly cropped square viewBox (140 190 620 620)
   * which eliminates canvas dead space so the emblem scales boldly.
   * When false, uses the native canvas (0 0 1024 1024).
   */
  tightFit?: boolean;
}

/**
 * Authentic Navarachna Designer Studio animated monogram SVG:
 * - Handcrafted 3D metallic gold foil needle tilted at -15.16 degrees with true hollow eye
 * - Antique gold foil silk thread weaving continuously through the hollow eye at (524.3, 293.6)
 * - Fluid embroidery stitching draw-in animation with smooth 3.4s loop
 * - Pure transparent background without any bounding boxes
 */
export function StudioAnimatedLogo({
  size = 96,
  className,
  duration = 3.4,
  tightFit = true,
}: StudioAnimatedLogoProps) {
  // Unique gradient and element IDs to prevent collisions if multiple instances are mounted
  const rawId = React.useId();
  const id = React.useMemo(() => rawId.replace(/[^a-zA-Z0-9_-]/g, "_"), [rawId]);

  const goldFoilId = `nav_gold_foil_${id}`;
  const goldBevelId = `nav_gold_bevel_${id}`;
  const goldCrestId = `nav_gold_crest_${id}`;
  const needleFoilId = `nav_needle_foil_${id}`;
  const eyeGlintGradId = `nav_eye_glint_${id}`;
  const foilShadowId = `nav_foil_shadow_${id}`;
  const needleClipId = `nav_needle_clip_${id}`;
  const needleShapeId = `nav_needle_shape_${id}`;

  const durStr = `${duration}s`;
  const viewBox = tightFit ? "140 190 620 620" : "0 0 1024 1024";

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={viewBox}
      width={size}
      height={size}
      fill="none"
      className={cn("shrink-0 select-none", className)}
      role="img"
      aria-label="Navarachna Designer Studio Animated Emblem"
    >
      <style>{`
        .nav-thread-edge_${id},
        .nav-thread-core_${id},
        .nav-thread-highlight_${id} {
          stroke-dasharray: 1000 1200;
          stroke-dashoffset: 1025;
          animation: nav-thread-draw_${id} ${durStr} cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
        }

        .nav-needle-assembly_${id} {
          transform-origin: 524.3px 293.6px;
          animation: nav-needle-response_${id} ${durStr} ease-in-out infinite;
        }

        .nav-eye-glint_${id} {
          transform-origin: 524.3px 293.6px;
          animation: nav-eye-spark_${id} ${durStr} ease-out infinite;
        }

        @keyframes nav-thread-draw_${id} {
          0% {
            stroke-dashoffset: 1025;
            opacity: 0;
          }
          4% {
            stroke-dashoffset: 1020;
            opacity: 1;
          }
          46% {
            stroke-dashoffset: 425;
            opacity: 1;
          }
          76% {
            stroke-dashoffset: 0;
            opacity: 1;
            filter: brightness(1);
          }
          85% {
            stroke-dashoffset: 0;
            opacity: 1;
            filter: brightness(1.12);
          }
          92% {
            stroke-dashoffset: 0;
            opacity: 1;
            filter: brightness(1);
          }
          98% {
            stroke-dashoffset: 0;
            opacity: 0;
          }
          100% {
            stroke-dashoffset: 1025;
            opacity: 0;
          }
        }

        @keyframes nav-needle-response_${id} {
          0%, 40% {
            transform: translate(0px, 0px) rotate(0deg);
            filter: brightness(1);
          }
          46% {
            transform: translate(0.9px, -0.6px) rotate(0.35deg);
            filter: brightness(1.08);
          }
          54%, 76% {
            transform: translate(0px, 0px) rotate(0deg);
            filter: brightness(1);
          }
          85% {
            filter: brightness(1.1);
          }
          93%, 100% {
            transform: translate(0px, 0px) rotate(0deg);
            filter: brightness(1);
          }
        }

        @keyframes nav-eye-spark_${id} {
          0%, 41% {
            opacity: 0;
            transform: scale(0.45);
          }
          46% {
            opacity: 0.9;
            transform: scale(1.15);
          }
          53%, 100% {
            opacity: 0;
            transform: scale(0.5);
          }
        }
      `}</style>

      <defs>
        {/* Authentic Metallic Gold Foil Gradient */}
        <linearGradient id={goldFoilId} x1="14%" y1="12%" x2="86%" y2="88%">
          <stop offset="0%" stopColor="#F0CF6E" />
          <stop offset="25%" stopColor="#D4A83A" />
          <stop offset="50%" stopColor="#FFF2B2" />
          <stop offset="75%" stopColor="#D4A83A" />
          <stop offset="100%" stopColor="#A67C1E" />
        </linearGradient>

        {/* Deep Antique Gold Bevel / Rim Gradient */}
        <linearGradient id={goldBevelId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C2942E" />
          <stop offset="50%" stopColor="#A67C1E" />
          <stop offset="100%" stopColor="#845F12" />
        </linearGradient>

        {/* Fine Specular Gold Foil Crest Highlight */}
        <linearGradient id={goldCrestId} x1="18%" y1="10%" x2="82%" y2="90%">
          <stop offset="0%" stopColor="#FFF5C0" stopOpacity="0.88" />
          <stop offset="50%" stopColor="#F0CF6E" stopOpacity="0.68" />
          <stop offset="100%" stopColor="#FFF5C0" stopOpacity="0.85" />
        </linearGradient>

        {/* Needle Metallic Shaft Sheen */}
        <linearGradient id={needleFoilId} x1="0%" y1="0%" x2="100%" y2="15%">
          <stop offset="0%" stopColor="#A67C1E" />
          <stop offset="28%" stopColor="#D4A83A" />
          <stop offset="52%" stopColor="#F0CF6E" />
          <stop offset="75%" stopColor="#D4A83A" />
          <stop offset="100%" stopColor="#A67C1E" />
        </linearGradient>

        {/* Radial Golden Glint at Needle Eye */}
        <radialGradient id={eyeGlintGradId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFF7CC" stopOpacity="0.95" />
          <stop offset="45%" stopColor="#F0CF6E" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#D4A83A" stopOpacity="0" />
        </radialGradient>

        {/* Clean Soft Drop Shadow Suitable for Transparent Backgrounds */}
        <filter id={foilShadowId} x="-12%" y="-12%" width="124%" height="124%">
          <feDropShadow dx="0" dy="2.5" stdDeviation="2.8" floodColor="#2A1B05" floodOpacity="0.28" />
        </filter>

        {/* Foreground Occlusion ClipPath (in Needle Local Space) */}
        <clipPath id={needleClipId}>
          <rect x="-24" y="10" width="24" height="126" />
          <rect x="-24" y="180" width="48" height="400" />
        </clipPath>

        {/* True Hollow-Eyed Needle Geometry */}
        <g id={needleShapeId}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 0,0 C 7.8,0 13,22 13,71 C 13,115 9.8,142 8.6,185 C 6.2,275 3.2,430 0,570 C -3.2,430 -6.2,275 -8.6,185 C -9.8,142 -13,115 -13,71 C -13,22 -7.8,0 0,0 Z M 0,14 C 3.4,14 5.2,34 5.2,71 C 5.2,106 3.4,132 0,132 C -3.4,132 -5.2,106 -5.2,71 C -5.2,34 -3.4,14 0,14 Z"
            fill={`url(#${needleFoilId})`}
            stroke={`url(#${goldBevelId})`}
            strokeWidth="1.3"
          />
          {/* Foil Bevel Highlights on Needle */}
          <path d="M -8.6,22 C -9.6,46 -9.6,96 -8.4,126" stroke="#FFF2B2" strokeWidth="1.5" strokeLinecap="round" opacity="0.78" />
          <path d="M 8.6,22 C 9.6,46 9.6,96 8.4,126" stroke="#FFF2B2" strokeWidth="1.2" strokeLinecap="round" opacity="0.52" />
          <path d="M -1.8,142 L 0,545" stroke="#FFF2B2" strokeWidth="1.9" strokeLinecap="round" opacity="0.72" />
        </g>
      </defs>

      {/* Master Foil Shadow Group */}
      <g filter={`url(#${foilShadowId})`}>
        {/* LAYER 1 (BOTTOM): Full Needle with Hollow Eye */}
        <g className={`nav-needle-assembly_${id}`}>
          <g transform="translate(505.7, 225) rotate(-15.16)">
            <use href={`#${needleShapeId}`} />
          </g>
        </g>

        {/* LAYER 2 (MIDDLE): G1-Continuous Gold Foil Thread Path */}
        <g>
          {/* Antique Gold Bevel Base */}
          <path
            className={`nav-thread-edge_${id}`}
            pathLength={1000}
            d="M 184,300 C 245,248 340,256 401,331 C 446,386 462,465 450,532 C 436,596 392,626 352,620 C 296,612 274,542 292,464 C 308,395 352,356 401,331 C 450,306 488,293.6 524.3,293.6 C 590,293.6 718,342 718,468 C 718,566 648,622 575,621 C 512,620 486,562 508,512 C 518,490 535,480 552,476"
            stroke={`url(#${goldBevelId})`}
            strokeWidth={15.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Primary Metallic Gold Foil Body */}
          <path
            className={`nav-thread-core_${id}`}
            pathLength={1000}
            d="M 184,300 C 245,248 340,256 401,331 C 446,386 462,465 450,532 C 436,596 392,626 352,620 C 296,612 274,542 292,464 C 308,395 352,356 401,331 C 450,306 488,293.6 524.3,293.6 C 590,293.6 718,342 718,468 C 718,566 648,622 575,621 C 512,620 486,562 508,512 C 518,490 535,480 552,476"
            stroke={`url(#${goldFoilId})`}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Specular Foil Bevel Highlight Filament */}
          <path
            className={`nav-thread-highlight_${id}`}
            pathLength={1000}
            d="M 184,300 C 245,248 340,256 401,331 C 446,386 462,465 450,532 C 436,596 392,626 352,620 C 296,612 274,542 292,464 C 308,395 352,356 401,331 C 450,306 488,293.6 524.3,293.6 C 590,293.6 718,342 718,468 C 718,566 648,622 575,621 C 512,620 486,562 508,512 C 518,490 535,480 552,476"
            stroke={`url(#${goldCrestId})`}
            strokeWidth={3.2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* LAYER 3 (TOP FOREGROUND OCCLUSION): Left Eye Wall + Lower Needle Shaft */}
        <g className={`nav-needle-assembly_${id}`}>
          <g transform="translate(505.7, 225) rotate(-15.16)" clipPath={`url(#${needleClipId})`}>
            <use href={`#${needleShapeId}`} />
          </g>
        </g>

        {/* Subtle Golden Eye-Threading Glint at (524.3, 293.6) */}
        <circle
          className={`nav-eye-glint_${id}`}
          cx={524.3}
          cy={293.6}
          r={16}
          fill={`url(#${eyeGlintGradId})`}
        />
      </g>
    </svg>
  );
}

export interface StudioLoaderProps {
  /**
   * Layout presentation:
   * - "screen" (default): full-viewport minimalist loader
   * - "inline": compact horizontal layout
   * - "logoOnly": just the raw animated logo SVG
   */
  variant?: "screen" | "inline" | "logoOnly";
  /**
   * Size of the animated SVG logo in pixels.
   * Defaults to 120 for screen, 32 for inline, 48 for logoOnly.
   */
  size?: number;
  /**
   * Primary brand label. Defaults to "Navarachna Designer Studio".
   */
  title?: string;
  /**
   * Optional status text (e.g. "Verifying Active Session..."). Defaults to undefined.
   */
  statusText?: string;
  /**
   * Whether to display the brand title. Defaults to true.
   */
  showTitle?: boolean;
  /**
   * Additional className for the root wrapper.
   */
  className?: string;
  /**
   * Additional className for the status text.
   */
  statusClassName?: string;
  /**
   * Duration of the embroidery animation loop in seconds (default 3.4s).
   */
  duration?: number;
}

/**
 * Authentic Navarachna Atelier Studio Loader:
 * - Direct, floating animated SVG monogram with pure transparent background
 * - 3D Antique Gold Foil needle and silk thread embroidery animation
 * - Authentic brand typography following official Comfortaa & Marcellus logo font styling
 * - Clean, elegant presentation with zero redundant spinners
 */
export function StudioLoader({
  variant = "screen",
  size,
  title = "Navarachna Designer Studio",
  statusText,
  showTitle = true,
  className,
  statusClassName,
  duration = 3.4,
}: StudioLoaderProps) {
  if (variant === "logoOnly") {
    return (
      <StudioAnimatedLogo
        size={size ?? 48}
        className={className}
        duration={duration}
      />
    );
  }

  if (variant === "inline") {
    const inlineSize = size ?? 32;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 text-foreground select-none",
          className
        )}
      >
        <StudioAnimatedLogo size={inlineSize} duration={duration} />
        {showTitle && (
          title === "Navarachna Designer Studio" ? (
            <img
              src="/assets/navarachna-wordmark-gold.png"
              alt="Navarachna Designer Studio"
              style={{ height: 22, width: "auto" }}
              className="h-5.5 w-auto object-contain select-none"
              loading="eager"
              decoding="async"
            />
          ) : (
            <span className="font-brand font-semibold text-xs studio-gold-text select-none">
              {title}
            </span>
          )
        )}
        {statusText && (
          <span
            className={cn(
              "font-subtitle text-[11px] text-[#8E6339] dark:text-[#E0B159] tracking-wider",
              statusClassName
            )}
          >
            {statusText}
          </span>
        )}
      </div>
    );
  }

  // variant === "screen"
  const logoSize = size ?? 120;

  return (
    <div
      className={cn(
        "h-svh max-h-svh w-full bg-background flex flex-col items-center justify-center p-4 overflow-hidden select-none",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {/* Pure animated SVG with transparent background */}
        <div className="flex items-center justify-center mb-3">
          <StudioAnimatedLogo size={logoSize} duration={duration} />
        </div>

        {/* Authentic Brand Wordmark following official logo font styling */}
        {showTitle && (
          <div className="flex flex-col items-center justify-center select-none mt-1">
            {title === "Navarachna Designer Studio" ? (
              <img
                src="/assets/navarachna-wordmark-gold.png"
                alt="Navarachna Designer Studio"
                style={{ height: 40, width: "auto" }}
                className="h-10 w-auto max-w-[270px] sm:max-w-[300px] object-contain select-none drop-shadow-[0_2px_8px_rgba(74,13,27,0.12)]"
                loading="eager"
                decoding="async"
              />
            ) : (
              <div className="flex flex-col items-center select-none">
                <span className="font-brand font-semibold text-lg sm:text-xl tracking-tight studio-gold-text select-none">
                  {title}
                </span>
                <div className="flex items-center gap-2 mt-1 select-none">
                  <span className="h-px w-6 sm:w-8 bg-gradient-to-r from-transparent via-[#C59B4E]/60 to-[#C59B4E]" />
                  <span className="text-[9px] sm:text-[10px] text-[#C59B4E]">✦</span>
                  <span className="font-subtitle studio-subtitle-text text-[10px] sm:text-[11px] uppercase tracking-[0.22em] select-none">
                    Designer Studio
                  </span>
                  <span className="text-[9px] sm:text-[10px] text-[#C59B4E]">✦</span>
                  <span className="h-px w-6 sm:w-8 bg-gradient-to-l from-transparent via-[#C59B4E]/60 to-[#C59B4E]" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Subtle, elegant status text matching brand typography & gold tone */}
        {statusText && (
          <p
            className={cn(
              "font-subtitle text-xs text-[#8E6339] dark:text-[#E0B159] mt-3 font-medium tracking-widest select-none animate-pulse",
              statusClassName
            )}
          >
            {statusText}
          </p>
        )}
      </div>
    </div>
  );
}
