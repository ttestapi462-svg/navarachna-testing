"use client";

import React from "react";

export function AtelierHeroIllustration({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 540 420"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full h-auto select-none ${className}`}
    >
      <defs>
        {/* Soft Radial Ambient Aura */}
        <radialGradient id="atelierAura" cx="50%" cy="48%" r="52%">
          <stop offset="0%" stopColor="#9E1B38" stopOpacity="0.14" />
          <stop offset="60%" stopColor="#552240" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#1E2246" stopOpacity="0" />
        </radialGradient>

        {/* Master Atelier Crimson to Navy Gradient */}
        <linearGradient id="atelierGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9E1B38" />
          <stop offset="48%" stopColor="#552240" />
          <stop offset="100%" stopColor="#1E2246" />
        </linearGradient>

        {/* Couture Silk Draping Gradient */}
        <linearGradient id="silkDrape" x1="15%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#e11d48" />
          <stop offset="35%" stopColor="#9E1B38" />
          <stop offset="75%" stopColor="#552240" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </linearGradient>

        {/* Silk Highlight Reflection */}
        <linearGradient id="silkHighlight" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.2" />
        </linearGradient>

        {/* Luxury Gold Callout Gradient */}
        <linearGradient id="luxeGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>

        {/* Polished Steel Needle */}
        <linearGradient id="steelNeedle" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>

        {/* Drop Shadows */}
        <filter id="luxeShadow" x="-10%" y="-10%" width="130%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#9E1B38" floodOpacity="0.12" />
        </filter>
        <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* 1. Ambient Backdrop Glow & Golden Ratio Rings */}
      <circle cx="270" cy="205" r="190" fill="url(#atelierAura)" />
      
      {/* Precision Drafting Grid Rings */}
      <circle
        cx="270"
        cy="205"
        r="175"
        stroke="#9E1B38"
        strokeOpacity="0.12"
        strokeWidth="1.2"
        strokeDasharray="4 6"
      />
      <circle
        cx="270"
        cy="205"
        r="140"
        stroke="#552240"
        strokeOpacity="0.10"
        strokeWidth="1"
      />
      <circle
        cx="270"
        cy="205"
        r="105"
        stroke="#1E2246"
        strokeOpacity="0.08"
        strokeWidth="1"
        strokeDasharray="2 4"
      />

      {/* Crosshair Center Align Guides */}
      <line x1="90" y1="205" x2="450" y2="205" stroke="#9E1B38" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="3 5" />
      <line x1="270" y1="35" x2="270" y2="375" stroke="#9E1B38" strokeOpacity="0.07" strokeWidth="1" strokeDasharray="3 5" />

      {/* Subtle Golden Spiral Arc */}
      <path
        d="M 170 310 C 130 250, 150 140, 240 100 C 330 60, 410 130, 390 230 C 375 300, 310 330, 260 315 C 225 305, 220 265, 235 245 C 248 230, 270 235, 275 250"
        stroke="#9E1B38"
        strokeOpacity="0.14"
        strokeWidth="1.2"
        strokeDasharray="3 5"
        fill="none"
      />

      {/* 2. Studio Pedestal Base (Sleek Minimalist Marble & Brass) */}
      <ellipse cx="270" cy="365" rx="140" ry="14" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="1.2" />
      <ellipse cx="270" cy="365" rx="100" ry="8" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.8" />
      
      {/* Heavy Atelier Cast Stand */}
      <path
        d="M 252 364 L 288 364 L 282 358 L 258 358 Z"
        fill="#334155"
      />
      {/* Central Brass Column */}
      <rect x="268.5" y="170" width="3" height="188" rx="1.5" fill="#64748b" />
      <rect x="268.5" y="195" width="3" height="40" rx="1.5" fill="url(#luxeGold)" opacity="0.8" />
      <circle cx="270" cy="205" r="5" fill="#334155" stroke="url(#luxeGold)" strokeWidth="1" />

      {/* 3. The Sculpted Couture Mannequin Body Form */}
      <g filter="url(#luxeShadow)">
        {/* Core Mannequin Linen Torso (Sculpted S-Curve Silhouette) */}
        <path
          d="M 244 85 
             C 246 80, 294 80, 296 85 
             C 304 98, 316 112, 316 128
             C 316 148, 296 168, 290 190
             C 285 210, 287 232, 298 255
             C 306 272, 308 288, 304 298
             L 236 298
             C 232 288, 234 272, 242 255
             C 253 232, 255 210, 250 190
             C 244 168, 224 148, 224 128
             C 224 112, 236 98, 244 85 Z"
          fill="#ffffff"
          stroke="#e2e8f0"
          strokeWidth="1.5"
        />

        {/* Neck Cap / Finial (Polished Wood & Brass) */}
        <ellipse cx="270" cy="84" rx="26" ry="6" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="1.2" />
        <path d="M 266 82 L 274 82 L 273 70 L 267 70 Z" fill="#334155" />
        <ellipse cx="270" cy="70" rx="8" ry="4" fill="url(#luxeGold)" />
        <circle cx="270" cy="62" r="5" fill="#334155" stroke="url(#luxeGold)" strokeWidth="1" />

        {/* Mannequin Seam Lines (Princess Seams - Classic Haute Couture) */}
        <path
          d="M 256 85 C 255 115, 248 150, 255 190 C 260 220, 258 260, 252 298"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
        />
        <path
          d="M 284 85 C 285 115, 292 150, 285 190 C 280 220, 282 260, 288 298"
          stroke="#cbd5e1"
          strokeWidth="1"
          strokeDasharray="3 3"
          fill="none"
        />
        <line x1="270" y1="84" x2="270" y2="298" stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4 4" />

        {/* 4. Sculpted Haute Couture Crimson Silk Drape (Fluid Luxury Fabric) */}
        {/* Under-fold shadow */}
        <path
          d="M 252 110 
             C 275 115, 298 128, 305 150
             C 312 175, 285 205, 275 235
             C 265 265, 272 290, 282 308
             C 270 310, 254 305, 248 290
             C 238 265, 246 230, 256 200
             C 264 175, 258 140, 252 110 Z"
          fill="#4a0f1d"
          opacity="0.25"
        />

        {/* Main Draped Silk Ribbon Contour */}
        <path
          d="M 250 108 
             C 278 112, 304 125, 310 148
             C 318 175, 288 206, 278 238
             C 268 268, 275 292, 286 312
             C 268 314, 250 306, 244 290
             C 234 265, 244 230, 254 198
             C 262 172, 256 136, 250 108 Z"
          fill="url(#silkDrape)"
        />

        {/* Silk Highlight & Sheen Line */}
        <path
          d="M 254 115 
             C 278 120, 298 132, 303 152
             C 309 174, 284 204, 275 234
             C 268 258, 272 278, 278 296"
          stroke="url(#silkHighlight)"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />

        {/* Sculpted Waistband Ribbon (Atelier Ribbon Cinch) */}
        <path
          d="M 248 194 C 262 200, 278 200, 292 194 C 295 198, 294 204, 290 208 C 276 214, 260 214, 246 208 Z"
          fill="url(#luxeGold)"
          stroke="#b45309"
          strokeWidth="0.8"
        />
        <circle cx="270" cy="204" r="3.5" fill="#ffffff" stroke="#b45309" strokeWidth="1" />
      </g>

      {/* 5. Iconic Polished Steel Needle & Signature Flowing Thread */}
      {/* Thread Loop Flowing through Needle */}
      <path
        d="M 180 150 
           C 160 110, 195 70, 230 85 
           C 270 100, 265 170, 235 200 
           C 205 230, 195 280, 230 305 
           C 265 330, 310 320, 335 285 
           C 365 245, 345 160, 380 135
           C 410 115, 440 145, 420 185"
        stroke="url(#atelierGrad)"
        strokeWidth="2.8"
        strokeLinecap="round"
        fill="none"
        filter="url(#softGlow)"
        opacity="0.9"
      />

      {/* Polished Couture Needle (Tilted diagonally at authentic logo angle ~15.5°) */}
      <g transform="translate(355, 95) rotate(16)">
        {/* Needle Blade */}
        <path
          d="M -2.5 -50 
             L 2.5 -50 
             L 2 120 
             L 0 170 
             L -2 120 Z"
          fill="url(#steelNeedle)"
          stroke="#475569"
          strokeWidth="0.8"
        />
        {/* Needle Eye */}
        <ellipse cx="0" cy="-35" rx="1.2" ry="10" fill="#ffffff" stroke="#334155" strokeWidth="0.8" />
        {/* Thread Threaded Through Eye */}
        <path d="M -8 -38 C -2 -35, 2 -35, 8 -32" stroke="#9E1B38" strokeWidth="2.2" strokeLinecap="round" fill="none" />
      </g>

      {/* 6. Technical Haute Couture Measurement Annotations */}
      {/* Measurement Point A: Shoulder Line */}
      <g opacity="0.85">
        <line x1="220" y1="110" x2="160" y2="110" stroke="#9E1B38" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="220" cy="110" r="2.5" fill="#9E1B38" />
        <rect x="100" y="100" width="55" height="18" rx="4" fill="#ffffff" stroke="#fecdd6" strokeWidth="0.8" />
        <text x="127.5" y="112.5" fill="#9E1B38" fontSize="8" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">
          42.5 cm
        </text>
      </g>

      {/* Measurement Point B: Bust Drape Arc */}
      <g opacity="0.85">
        <line x1="312" y1="145" x2="385" y2="145" stroke="#552240" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="312" cy="145" r="2.5" fill="#552240" />
        <rect x="390" y="136" width="60" height="18" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
        <text x="420" y="148.5" fill="#552240" fontSize="8" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">
          Drape Arc
        </text>
      </g>

      {/* Measurement Point C: Waist Contour */}
      <g opacity="0.85">
        <line x1="248" y1="204" x2="175" y2="204" stroke="#1E2246" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="248" cy="204" r="2.5" fill="#1E2246" />
        <rect x="115" y="195" width="55" height="18" rx="4" fill="#ffffff" stroke="#e2e8f0" strokeWidth="0.8" />
        <text x="142.5" y="207.5" fill="#1E2246" fontSize="8" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">
          68.0 cm
        </text>
      </g>

      {/* Measurement Point D: Hem Arc */}
      <g opacity="0.85">
        <line x1="302" y1="298" x2="375" y2="298" stroke="#9E1B38" strokeWidth="1" strokeDasharray="2 3" />
        <circle cx="302" cy="298" r="2.5" fill="#9E1B38" />
        <rect x="380" y="289" width="62" height="18" rx="4" fill="#ffffff" stroke="#fecdd6" strokeWidth="0.8" />
        <text x="411" y="301.5" fill="#9E1B38" fontSize="8" fontWeight="700" fontFamily="sans-serif" textAnchor="middle">
          Hem · 118cm
        </text>
      </g>

      {/* Sparkle Craft Accents */}
      <path d="M 200 70 L 202 76 L 208 78 L 202 80 L 200 86 L 198 80 L 192 78 L 198 76 Z" fill="url(#luxeGold)" opacity="0.75" />
      <path d="M 330 330 L 331.5 334.5 L 336 336 L 331.5 337.5 L 330 342 L 328.5 337.5 L 324 336 L 328.5 334.5 Z" fill="url(#luxeGold)" opacity="0.6" />
    </svg>
  );
}
