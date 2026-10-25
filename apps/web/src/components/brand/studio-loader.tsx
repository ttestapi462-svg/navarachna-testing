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
   * Animation cycle duration in seconds. Defaults to 3.6s.
   */
  duration?: number;
  /**
   * When true (default), uses a tightly cropped square viewBox (160 70 880 810)
   * which eliminates horizontal dead space so the emblem scales boldly.
   * When false, uses the native canvas (0 0 1200 896).
   */
  tightFit?: boolean;
}

/**
 * Authentic Navarachna Designer Studio animated monogram SVG:
 * - Handcrafted sewing needle tilted diagonally at -15.28 degrees
 * - Multi-stop crimson-to-navy gradient silk thread weaving through the needle eye
 * - Fluid embroidery stitching draw-in animation with smooth looping
 * - Pure transparent background without any bounding boxes
 */
export function StudioAnimatedLogo({
  size = 96,
  className,
  duration = 3.6,
  tightFit = true,
}: StudioAnimatedLogoProps) {
  // Unique gradient IDs to prevent collisions if multiple instances are mounted
  const id = React.useId().replace(/:/g, "_");
  const threadGradId = `threadGrad_${id}`;
  const needleGradId = `needleGrad_${id}`;

  const durStr = `${duration}s`;
  const viewBox = tightFit ? "160 70 880 810" : "0 0 1200 896";

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
      <defs>
        <linearGradient
          id={threadGradId}
          x1="212"
          y1="420"
          x2="988"
          y2="420"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#BA1D39" />
          <stop offset="28%" stopColor="#8B223E" />
          <stop offset="52%" stopColor="#4A2148" />
          <stop offset="72%" stopColor="#242756" />
          <stop offset="100%" stopColor="#14163A" />
        </linearGradient>

        <linearGradient
          id={needleGradId}
          x1="0"
          y1="0"
          x2="0"
          y2="768"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#3C1E42" />
          <stop offset="25%" stopColor="#261F46" />
          <stop offset="100%" stopColor="#101334" />
        </linearGradient>
      </defs>

      {/* Needle Back Layer */}
      <g transform="translate(684.5, 109.0) rotate(-15.28)">
        <path
          fill={`url(#${needleGradId})`}
          fillRule="evenodd"
          d="M 0,0 C 11.5,0 18.8,11.0 19.5,28.0 C 20.2,55.0 20.2,95.0 19.2,135.0 C 17.8,195.0 14.2,310.0 9.5,510.0 C 6.2,645.0 2.8,735.0 0.0,768.2 C -2.8,735.0 -6.2,645.0 -9.5,510.0 C -14.2,310.0 -17.8,195.0 -19.2,135.0 C -20.2,95.0 -20.2,55.0 -19.5,28.0 C -18.8,11.0 -11.5,0 0,0 Z M 0,24.0 C -4.8,24.0 -7.6,46.0 -7.6,84.0 C -7.6,120.0 -4.5,146.0 0.0,154.0 C 4.5,146.0 7.6,120.0 7.6,84.0 C 7.6,46.0 4.8,24.0 0,24.0 Z"
        />
      </g>

      {/* Animated Monogram Thread */}
      <path
        fill="none"
        stroke={`url(#${threadGradId})`}
        strokeWidth={17.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength="2520"
        strokeDasharray="2520"
        strokeDashoffset="2520"
        d="M 221.5 214.6 C 258.5 193.6, 305.6 172.8, 352.2 168.9 C 398.7 164.9, 444.2 181.2, 481.8 209.5 C 519.4 237.8, 547.8 276.1, 568.0 318.2 C 588.2 360.3, 602.3 406.2, 606.8 452.3 C 611.3 498.5, 604.7 547.9, 580.1 587.5 C 555.6 627.2, 509.0 652.8, 461.7 649.6 C 414.5 646.4, 377.9 604.0, 369.5 559.6 C 361.1 515.2, 374.5 466.4, 393.0 422.8 C 411.5 379.1, 436.8 340.0, 469.8 307.8 C 502.9 275.5, 543.7 250.0, 587.3 232.7 C 630.9 215.3, 676.8 205.8, 709.5 206.3 C 758.0 207.0, 816.6 218.0, 858.1 240.0 C 899.7 261.9, 933.9 295.7, 954.9 336.9 C 975.9 378.1, 984.1 426.4, 977.6 473.1 C 971.1 519.8, 949.9 564.7, 916.4 596.8 C 882.8 629.0, 837.6 647.7, 790.5 642.7 C 743.3 637.7, 691.9 611.0, 679.9 567.9 C 667.9 524.7, 702.5 474.7, 743.6 456.9"
      >
        <animate
          attributeName="stroke-dashoffset"
          values="2520; 0; 0; 2520"
          keyTimes="0; 0.62; 0.98; 1"
          keySplines="0.35 0.0 0.20 1.0; 0 0 1 1; 0 0 1 1"
          calcMode="spline"
          dur={durStr}
          repeatCount="indefinite"
        />
        <animate
          attributeName="opacity"
          values="0; 1; 1; 0; 0"
          keyTimes="0; 0.05; 0.86; 0.97; 1"
          keySplines="0.4 0 0.2 1; 0 0 1 1; 0.4 0 0.6 1; 0 0 1 1"
          calcMode="spline"
          dur={durStr}
          repeatCount="indefinite"
        />
      </path>

      {/* Needle Front Lip (renders needle eye in 3D around the thread) */}
      <g transform="translate(684.5, 109.0) rotate(-15.28)">
        <path
          fill={`url(#${needleGradId})`}
          d="M 4.8,24.0 C 7.6,46.0 7.6,84.0 7.6,84.0 C 7.6,120.0 4.5,146.0 0.0,154.0 L 19.0,154.0 C 19.8,115.0 20.2,75.0 19.5,28.0 L 4.8,24.0 Z"
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
   * Defaults to 104 for screen, 28 for inline, 48 for logoOnly.
   */
  size?: number;
  /**
   * Primary brand label. Defaults to "Navarachna Designer Studio".
   */
  title?: string;
  /**
   * Optional status text. Defaults to undefined (clean, no extra text).
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
   * Duration of the embroidery animation loop in seconds (default 3.6s).
   */
  duration?: number;
}

/**
 * Neat & Clean Atelier Studio Loader:
 * - Direct, floating animated SVG monogram with no background container
 * - Pure brand identity: needle & silk thread embroidery animation
 * - No redundant spinner or extra loader
 */
export function StudioLoader({
  variant = "screen",
  size,
  title = "Navarachna Designer Studio",
  statusText,
  showTitle = true,
  className,
  statusClassName,
  duration = 3.6,
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
    const inlineSize = size ?? 28;
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 text-foreground select-none",
          className
        )}
      >
        <StudioAnimatedLogo size={inlineSize} duration={duration} />
        {showTitle && (
          <span className="text-xs font-semibold leading-tight tracking-wide">
            {title}
          </span>
        )}
        {statusText && (
          <span
            className={cn(
              "text-[11px] text-muted-foreground font-normal leading-tight",
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
  const logoSize = size ?? 104;

  return (
    <div
      className={cn(
        "h-svh max-h-svh w-full bg-background flex flex-col items-center justify-center p-4 overflow-hidden select-none",
        className
      )}
    >
      <div className="flex flex-col items-center justify-center text-center">
        {/* Pure animated SVG with no background box or border */}
        <div className="flex items-center justify-center mb-3">
          <StudioAnimatedLogo size={logoSize} duration={duration} />
        </div>

        {/* Clean, elegant brand typography */}
        {showTitle && (
          <p className="text-sm font-semibold text-foreground tracking-wide select-none">
            {title}
          </p>
        )}

        {/* Optional subtle status (no extra spinner) */}
        {statusText && (
          <p
            className={cn(
              "text-xs text-muted-foreground mt-1.5 font-normal tracking-wide select-none",
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
