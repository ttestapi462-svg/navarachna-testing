import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
  Animated,
  StyleProp,
  ViewStyle,
  TextStyle,
} from "react-native";
import { WebView } from "react-native-webview";

export interface StudioLoaderProps {
  /**
   * Layout presentation:
   * - "screen" (default): full-screen launch / loading view
   * - "inline": compact horizontal layout
   * - "logoOnly": just the animated emblem
   */
  variant?: "screen" | "inline" | "logoOnly";
  /**
   * Size of the animated SVG emblem in pixels.
   * Defaults to 104 for mobile screen, 36 for inline, 48 for logoOnly.
   */
  size?: number;
  /**
   * Optional status text (e.g. "Verifying Active Session...").
   */
  statusText?: string;
  /**
   * Whether to display the brand wordmark text. Defaults to true.
   */
  showTitle?: boolean;
  /**
   * Background color of the container. Defaults to "#FAF7F2".
   */
  backgroundColor?: string;
  /**
   * Container style overrides.
   */
  style?: StyleProp<ViewStyle>;
  /**
   * Status text style overrides.
   */
  statusStyle?: StyleProp<TextStyle>;
}

const ANIMATED_SVG_HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%;
      height: 100%;
      background: transparent !important;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    svg {
      width: 100%;
      height: 100%;
      max-width: 100%;
      max-height: 100%;
      background: transparent;
      overflow: visible;
    }
    .nav-thread-edge,
    .nav-thread-core,
    .nav-thread-highlight {
      stroke-dasharray: 1000 1200;
      stroke-dashoffset: 1025;
      animation: nav-thread-draw 3.4s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
    }
    .nav-needle-assembly {
      transform-origin: 524.3px 293.6px;
      animation: nav-needle-response 3.4s ease-in-out infinite;
    }
    .nav-eye-glint {
      transform-origin: 524.3px 293.6px;
      animation: nav-eye-spark 3.4s ease-out infinite;
    }
    @keyframes nav-thread-draw {
      0% { stroke-dashoffset: 1025; opacity: 0; }
      4% { stroke-dashoffset: 1020; opacity: 1; }
      46% { stroke-dashoffset: 425; opacity: 1; }
      76% { stroke-dashoffset: 0; opacity: 1; filter: brightness(1); }
      85% { stroke-dashoffset: 0; opacity: 1; filter: brightness(1.12); }
      92% { stroke-dashoffset: 0; opacity: 1; filter: brightness(1); }
      98% { stroke-dashoffset: 0; opacity: 0; }
      100% { stroke-dashoffset: 1025; opacity: 0; }
    }
    @keyframes nav-needle-response {
      0%, 40% { transform: translate(0px, 0px) rotate(0deg); filter: brightness(1); }
      46% { transform: translate(0.9px, -0.6px) rotate(0.35deg); filter: brightness(1.08); }
      54%, 76% { transform: translate(0px, 0px) rotate(0deg); filter: brightness(1); }
      85% { filter: brightness(1.1); }
      93%, 100% { transform: translate(0px, 0px) rotate(0deg); filter: brightness(1); }
    }
    @keyframes nav-eye-spark {
      0%, 41% { opacity: 0; transform: scale(0.45); }
      46% { opacity: 0.9; transform: scale(1.15); }
      53%, 100% { opacity: 0; transform: scale(0.5); }
    }
  </style>
</head>
<body>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="140 190 620 620" fill="none" role="img" aria-label="Navarachna Designer Studio Animated Needle and Thread Loader">
    <defs>
      <linearGradient id="nav-gold-foil" x1="14%" y1="12%" x2="86%" y2="88%">
        <stop offset="0%" stop-color="#F0CF6E" />
        <stop offset="25%" stop-color="#D4A83A" />
        <stop offset="50%" stop-color="#FFF2B2" />
        <stop offset="75%" stop-color="#D4A83A" />
        <stop offset="100%" stop-color="#A67C1E" />
      </linearGradient>
      <linearGradient id="nav-gold-bevel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#C2942E" />
        <stop offset="50%" stop-color="#A67C1E" />
        <stop offset="100%" stop-color="#845F12" />
      </linearGradient>
      <linearGradient id="nav-gold-crest" x1="18%" y1="10%" x2="82%" y2="90%">
        <stop offset="0%" stop-color="#FFF5C0" stop-opacity="0.88" />
        <stop offset="50%" stop-color="#F0CF6E" stop-opacity="0.68" />
        <stop offset="100%" stop-color="#FFF5C0" stop-opacity="0.85" />
      </linearGradient>
      <linearGradient id="nav-needle-foil" x1="0%" y1="0%" x2="100%" y2="15%">
        <stop offset="0%" stop-color="#A67C1E" />
        <stop offset="28%" stop-color="#D4A83A" />
        <stop offset="52%" stop-color="#F0CF6E" />
        <stop offset="75%" stop-color="#D4A83A" />
        <stop offset="100%" stop-color="#A67C1E" />
      </linearGradient>
      <radialGradient id="nav-eye-glint-grad" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#FFF7CC" stop-opacity="0.95" />
        <stop offset="45%" stop-color="#F0CF6E" stop-opacity="0.55" />
        <stop offset="100%" stop-color="#D4A83A" stop-opacity="0" />
      </radialGradient>
      <filter id="nav-foil-shadow" x="-12%" y="-12%" width="124%" height="124%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="2.8" flood-color="#2A1B05" flood-opacity="0.28" />
      </filter>
      <clipPath id="nav-needle-foreground-clip">
        <rect x="-24" y="10" width="24" height="126" />
        <rect x="-24" y="180" width="48" height="400" />
      </clipPath>
      <g id="nav-needle-shape">
        <path fill-rule="evenodd" clip-rule="evenodd"
          d="M 0,0 C 7.8,0 13,22 13,71 C 13,115 9.8,142 8.6,185 C 6.2,275 3.2,430 0,570 C -3.2,430 -6.2,275 -8.6,185 C -9.8,142 -13,115 -13,71 C -13,22 -7.8,0 0,0 Z M 0,14 C 3.4,14 5.2,34 5.2,71 C 5.2,106 3.4,132 0,132 C -3.4,132 -5.2,106 -5.2,71 C -5.2,34 -3.4,14 0,14 Z"
          fill="url(#nav-needle-foil)"
          stroke="url(#nav-gold-bevel)"
          stroke-width="1.3" />
        <path d="M -8.6,22 C -9.6,46 -9.6,96 -8.4,126" stroke="#FFF2B2" stroke-width="1.5" stroke-linecap="round" opacity="0.78" />
        <path d="M 8.6,22 C 9.6,46 9.6,96 8.4,126" stroke="#FFF2B2" stroke-width="1.2" stroke-linecap="round" opacity="0.52" />
        <path d="M -1.8,142 L 0,545" stroke="#FFF2B2" stroke-width="1.9" stroke-linecap="round" opacity="0.72" />
      </g>
    </defs>
    <g filter="url(#nav-foil-shadow)">
      <g class="nav-needle-assembly">
        <g transform="translate(505.7, 225) rotate(-15.16)">
          <use href="#nav-needle-shape" />
        </g>
      </g>
      <g>
        <path class="nav-thread-edge" pathLength="1000"
          d="M 184,300 C 245,248 340,256 401,331 C 446,386 462,465 450,532 C 436,596 392,626 352,620 C 296,612 274,542 292,464 C 308,395 352,356 401,331 C 450,306 488,293.6 524.3,293.6 C 590,293.6 718,342 718,468 C 718,566 648,622 575,621 C 512,620 486,562 508,512 C 518,490 535,480 552,476"
          stroke="url(#nav-gold-bevel)"
          stroke-width="15.2"
          stroke-linecap="round"
          stroke-linejoin="round" />
        <path class="nav-thread-core" pathLength="1000"
          d="M 184,300 C 245,248 340,256 401,331 C 446,386 462,465 450,532 C 436,596 392,626 352,620 C 296,612 274,542 292,464 C 308,395 352,356 401,331 C 450,306 488,293.6 524.3,293.6 C 590,293.6 718,342 718,468 C 718,566 648,622 575,621 C 512,620 486,562 508,512 C 518,490 535,480 552,476"
          stroke="url(#nav-gold-foil)"
          stroke-width="13"
          stroke-linecap="round"
          stroke-linejoin="round" />
        <path class="nav-thread-highlight" pathLength="1000"
          d="M 184,300 C 245,248 340,256 401,331 C 446,386 462,465 450,532 C 436,596 392,626 352,620 C 296,612 274,542 292,464 C 308,395 352,356 401,331 C 450,306 488,293.6 524.3,293.6 C 590,293.6 718,342 718,468 C 718,566 648,622 575,621 C 512,620 486,562 508,512 C 518,490 535,480 552,476"
          stroke="url(#nav-gold-crest)"
          stroke-width="3.2"
          stroke-linecap="round"
          stroke-linejoin="round" />
      </g>
      <g class="nav-needle-assembly">
        <g transform="translate(505.7, 225) rotate(-15.16)" clip-path="url(#nav-needle-foreground-clip)">
          <use href="#nav-needle-shape" />
        </g>
      </g>
      <circle class="nav-eye-glint" cx="524.3" cy="293.6" r="16" fill="url(#nav-eye-glint-grad)" />
    </g>
  </svg>
</body>
</html>`;

/**
 * Authentic animated needle & thread embroidery monogram.
 * Pure transparent background with instant fallback backdrop.
 */
export function StudioAnimatedLogo({
  size = 104,
  style,
}: {
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "transparent",
        },
        style,
      ]}
    >
      {/* Hardware-accelerated SVG Web Animation */}
      {Platform.OS === "web" ? (
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore - React Native Web supports iframe
        <iframe
          srcDoc={ANIMATED_SVG_HTML}
          style={{
            width: size,
            height: size,
            border: "none",
            backgroundColor: "transparent",
            pointerEvents: "none",
            overflow: "hidden",
          }}
          title="Navarachna Studio Animated Emblem"
        />
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html: ANIMATED_SVG_HTML }}
          scrollEnabled={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          androidLayerType="software"
          style={{
            width: size,
            height: size,
            backgroundColor: "transparent",
          }}
          containerStyle={{
            backgroundColor: "transparent",
          }}
          pointerEvents="none"
        />
      )}
    </View>
  );
}

/**
 * Mobile Studio Loader Component:
 * - Animated gold needle & thread monogram (exact SVG from web)
 * - Authentic 3D antique gold client wordmark ("Navarachna Designer Studio")
 * - Subtle, pulsing gold status text
 * - Calibrated specifically for mobile viewports
 */
export function StudioLoader({
  variant = "screen",
  size,
  statusText = "Verifying Active Session...",
  showTitle = true,
  backgroundColor = "#FAF7F2",
  style,
  statusStyle,
}: StudioLoaderProps) {
  // Sizing calibrated specifically for mobile
  const effectiveLogoSize = size ?? (variant === "screen" ? 104 : variant === "inline" ? 36 : 48);
  const wordmarkHeight = Math.round(effectiveLogoSize * 0.35); // ~36px when emblem is 104px
  const wordmarkWidth = Math.round(wordmarkHeight * 3.92);    // ~141px

  // Subtle pulsing animation for status text
  const pulseAnim = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.45,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();
    return () => pulseLoop.stop();
  }, [pulseAnim]);

  // Variant: logoOnly
  if (variant === "logoOnly") {
    return <StudioAnimatedLogo size={effectiveLogoSize} style={style} />;
  }

  // Variant: inline
  if (variant === "inline") {
    return (
      <View style={[styles.inlineContainer, style]}>
        <StudioAnimatedLogo size={effectiveLogoSize} />
        {showTitle && (
          <Image
            source={require("../../assets/navarachna-wordmark-gold.png")}
            style={{ height: 22, width: Math.round(22 * 3.92) }}
            resizeMode="contain"
          />
        )}
        {statusText ? (
          <Animated.Text style={[styles.inlineStatusText, { opacity: pulseAnim }, statusStyle]}>
            {statusText}
          </Animated.Text>
        ) : null}
      </View>
    );
  }

  // Variant: screen (Default — Launch screen & full viewport loading)
  return (
    <View style={[styles.screenContainer, { backgroundColor }, style]}>
      <View style={styles.centerCard}>
        {/* Animated Needle & Thread Monogram Logo */}
        <View style={styles.logoWrap}>
          <StudioAnimatedLogo size={effectiveLogoSize} />
        </View>

        {/* Authentic Client Wordmark Following Official Logo Styling */}
        {showTitle && (
          <View style={styles.wordmarkWrap}>
            <Image
              source={require("../../assets/navarachna-wordmark-gold.png")}
              style={{
                height: wordmarkHeight,
                width: wordmarkWidth,
                maxWidth: 280,
              }}
              resizeMode="contain"
            />
          </View>
        )}

        {/* Subtle, Elegant Status Text */}
        {statusText ? (
          <Animated.Text style={[styles.statusText, { opacity: pulseAnim }, statusStyle]}>
            {statusText}
          </Animated.Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  centerCard: {
    alignItems: "center",
    justifyContent: "center",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  wordmarkWrap: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  statusText: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "600",
    color: "#8E6339",
    letterSpacing: 1.6,
    textAlign: "center",
  },
  inlineContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  inlineStatusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#8E6339",
    letterSpacing: 0.8,
  },
});
