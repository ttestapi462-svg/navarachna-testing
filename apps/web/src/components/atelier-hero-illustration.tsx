"use client";

import React from "react";

export function AtelierHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto drop-shadow-sm select-none ${className}`}
    >
      <defs>
        {/* Soft Radial Ambient Aura */}
        <radialGradient id="auraGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="70%" stopColor="var(--primary)" stopOpacity="0.04" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
        </radialGradient>

        {/* Couture Fabric Gradient */}
        <linearGradient id="fabricRose" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="100%" stopColor="#be123c" />
        </linearGradient>

        <linearGradient id="silkShine" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fda4af" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.3" />
        </linearGradient>

        <linearGradient id="measuringTapeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#fde047" />
        </linearGradient>

        {/* Drafting Paper Gradient */}
        <linearGradient id="paperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f8fafc" />
        </linearGradient>
      </defs>

      {/* Background Soft Halo & Circles */}
      <circle cx="260" cy="210" r="190" fill="url(#auraGlow)" />
      <circle
        cx="260"
        cy="210"
        r="165"
        stroke="var(--primary)"
        strokeOpacity="0.15"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
      <circle
        cx="260"
        cy="210"
        r="135"
        stroke="var(--primary)"
        strokeOpacity="0.1"
        strokeWidth="1.5"
      />

      {/* Subtle Golden Ratio Arc */}
      <g stroke="var(--primary)" strokeOpacity="0.25" strokeWidth="1.2">
        <path
          d="M 110 300 C 130 300 150 280 150 260 C 150 245 140 235 125 235 C 115 235 110 240 110 250"
          strokeDasharray="2 3"
          fill="none"
        />
      </g>

      {/* Studio Worktable / Pedestal Surface */}
      <ellipse cx="260" cy="355" rx="195" ry="18" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.5" />
      <ellipse cx="260" cy="358" rx="160" ry="10" fill="#e2e8f0" />

      {/* Left Stack: Fashion Sketches & Portfolio Sheets */}
      <g transform="translate(90, 190)">
        {/* Sheet 3 (Bottom) */}
        <rect
          x="10"
          y="15"
          width="110"
          height="145"
          rx="6"
          fill="url(#paperGrad)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          transform="rotate(-10 65 87)"
        />

        {/* Sheet 2 */}
        <rect
          x="15"
          y="8"
          width="110"
          height="145"
          rx="6"
          fill="url(#paperGrad)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          transform="rotate(4 70 80)"
        />

        {/* Sheet 1 (Top Active Couture Sketch) */}
        <rect
          x="20"
          y="0"
          width="110"
          height="145"
          rx="6"
          fill="url(#paperGrad)"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.04))"
        />

        {/* Sketch Drawing Inside Top Sheet */}
        {/* Mini Gown Silhouette */}
        <path
          d="M 65 30 Q 75 40 70 58 Q 85 95 85 110 L 65 110 L 45 110 Q 45 95 60 58 Q 55 40 65 30 Z"
          fill="#ffe4e6"
          stroke="#f43f5e"
          strokeWidth="1.5"
        />
        {/* Technical annotation lines */}
        <line x1="30" y1="20" x2="60" y2="20" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="25" x2="50" y2="25" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="125" x2="80" y2="125" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="30" y1="131" x2="65" y2="131" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
        
        {/* Atelier Seal Stamp */}
        <circle cx="108" cy="125" r="9" fill="#f43f5e" fillOpacity="0.12" stroke="#f43f5e" strokeWidth="1" />
        <path d="M 105 125 L 107 127 L 112 122" stroke="#f43f5e" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Center: Bespoke Couture Mannequin / Tailor's Dress Form */}
      <g id="mannequinGroup">
        {/* Wooden Stand Pole & Base */}
        <rect x="257" y="270" width="6" height="85" fill="#475569" rx="3" />
        <path d="M 235 355 L 260 340 L 285 355" stroke="#334155" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="260" cy="355" rx="8" ry="3" fill="#1e293b" />

        {/* Neck Finial / Wooden Cap */}
        <circle cx="260" cy="85" r="8" fill="#d97706" stroke="#92400e" strokeWidth="1.5" />
        <rect x="256" y="93" width="8" height="12" fill="#d97706" rx="2" />

        {/* Tailor's Torso Body */}
        <path
          d="M 242 105 
             C 246 103, 274 103, 278 105 
             C 287 115, 292 135, 290 155 
             C 288 175, 280 185, 276 195 
             C 272 205, 278 220, 280 240 
             C 282 260, 274 275, 260 275 
             C 246 275, 238 260, 240 240 
             C 242 220, 248 205, 244 195 
             C 240 185, 232 175, 230 155 
             C 228 135, 233 115, 242 105 Z"
          fill="#ffffff"
          stroke="#334155"
          strokeWidth="2"
        />

        {/* Sartorial Tailoring Guidelines (Dotted seam lines on dress form) */}
        <path d="M 260 105 L 260 275" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M 235 155 C 248 162 272 162 285 155" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M 244 195 C 252 200 268 200 276 195" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />
        <path d="M 240 240 C 248 246 272 246 280 240" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 3" />

        {/* Draped Haute Couture Rose Silk Fabric Over One Shoulder */}
        <path
          d="M 242 105 
             C 255 110, 272 125, 278 145 
             C 282 160, 275 190, 270 205 
             C 260 225, 255 240, 265 265 
             C 250 260, 242 240, 244 215 
             C 245 195, 238 180, 234 165 
             C 230 145, 235 120, 242 105 Z"
          fill="url(#fabricRose)"
          stroke="#9f1239"
          strokeWidth="1.5"
          filter="drop-shadow(0 4px 6px rgba(225,29,72,0.2))"
        />

        {/* Silk fold highlights */}
        <path
          d="M 248 120 C 256 135 264 165 260 190"
          stroke="url(#silkShine)"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Golden Tailor's Measuring Tape Wrapped Around Waist */}
        <g id="measuringTape">
          <path
            d="M 238 193 
               C 246 204, 274 204, 282 193 
               C 285 197, 281 206, 276 209 
               C 264 215, 246 215, 234 204 Z"
            fill="url(#measuringTapeGrad)"
            stroke="#b45309"
            strokeWidth="1.2"
          />
          {/* Tape tick marks */}
          <line x1="244" y1="198" x2="245" y2="204" stroke="#78350f" strokeWidth="1" />
          <line x1="250" y1="200" x2="251" y2="206" stroke="#78350f" strokeWidth="1" />
          <line x1="256" y1="201" x2="257" y2="207" stroke="#78350f" strokeWidth="1.2" />
          <line x1="262" y1="201" x2="263" y2="207" stroke="#78350f" strokeWidth="1" />
          <line x1="268" y1="200" x2="269" y2="206" stroke="#78350f" strokeWidth="1" />
          <line x1="274" y1="198" x2="275" y2="204" stroke="#78350f" strokeWidth="1" />

          {/* Hanging Tape Ribbon */}
          <path
            d="M 240 201 C 235 220, 240 245, 234 265"
            stroke="url(#measuringTapeGrad)"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </g>
      </g>

      {/* Right: Golden Tailor Shears / Scissors on Stand */}
      <g transform="translate(350, 220)">
        {/* Scissor Blades */}
        <path
          d="M 20 20 L 70 85"
          stroke="#475569"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        <path
          d="M 65 25 L 25 80"
          stroke="#64748b"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
        {/* Pivot screw */}
        <circle cx="44" cy="52" r="3.5" fill="#f59e0b" stroke="#b45309" strokeWidth="1" />

        {/* Golden Ergonomic Handles */}
        <circle cx="16" cy="16" r="11" fill="none" stroke="#f59e0b" strokeWidth="3" />
        <circle cx="69" cy="20" r="11" fill="none" stroke="#f59e0b" strokeWidth="3" />

        {/* Spool of Rose Thread */}
        <g transform="translate(15, 80)">
          <rect x="0" y="8" width="30" height="24" rx="4" fill="#f43f5e" stroke="#be123c" strokeWidth="1.5" />
          <ellipse cx="15" cy="8" rx="15" ry="4" fill="#ffe4e6" stroke="#be123c" strokeWidth="1.2" />
          <ellipse cx="15" cy="32" rx="15" ry="4" fill="#fda4af" stroke="#be123c" strokeWidth="1.2" />
          <line x1="0" y1="14" x2="30" y2="14" stroke="#ffe4e6" strokeWidth="1" />
          <line x1="0" y1="20" x2="30" y2="20" stroke="#ffe4e6" strokeWidth="1" />
          <line x1="0" y1="26" x2="30" y2="26" stroke="#ffe4e6" strokeWidth="1" />

          {/* Loose Thread Floating Upwards */}
          <path
            d="M 30 20 C 45 25, 40 -10, 55 -25 C 65 -35, 55 -60, 70 -75"
            stroke="#f43f5e"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="2 2"
            fill="none"
          />
        </g>
      </g>

      {/* Floating Couture Accents & Sparkles */}
      {/* Sparkle 1 */}
      <g transform="translate(190, 75)">
        <path
          d="M 12 0 C 12 6, 18 12, 24 12 C 18 12, 12 18, 12 24 C 12 18, 6 12, 0 12 C 6 12, 12 6, 12 0 Z"
          fill="#f43f5e"
        />
      </g>
      {/* Sparkle 2 */}
      <g transform="translate(340, 110) scale(0.65)">
        <path
          d="M 12 0 C 12 6, 18 12, 24 12 C 18 12, 12 18, 12 24 C 12 18, 6 12, 0 12 C 6 12, 12 6, 12 0 Z"
          fill="#f59e0b"
        />
      </g>
      {/* Sparkle 3 */}
      <g transform="translate(85, 280) scale(0.5)">
        <path
          d="M 12 0 C 12 6, 18 12, 24 12 C 18 12, 12 18, 12 24 C 12 18, 6 12, 0 12 C 6 12, 12 6, 12 0 Z"
          fill="#f43f5e"
        />
      </g>

      {/* Needle with Thread Eye */}
      <g transform="translate(385, 140) rotate(-45)">
        <path d="M 0 0 L 0 50 L 2 54 L 4 50 L 4 0 Z" fill="#94a3b8" stroke="#475569" strokeWidth="1" />
        <ellipse cx="2" cy="8" rx="0.8" ry="3" fill="#ffffff" />
      </g>
    </svg>
  );
}
