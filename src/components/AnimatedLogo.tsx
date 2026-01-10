import { useState, useEffect } from 'react';

interface AnimatedLogoProps {
  className?: string;
  size?: number;
}

/**
 * Animated AI logo component
 *
 * Renders the logo as inline SVG with animations triggered after mount.
 * This ensures reliable animation playback across all devices and connection speeds,
 * unlike external SVG files loaded via <img> which can have animation issues on mobile.
 */
export function AnimatedLogo({ className = '', size = 128 }: AnimatedLogoProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM is ready and component is painted
    const timer = requestAnimationFrame(() => {
      // Use another rAF to ensure we're in the next frame
      requestAnimationFrame(() => {
        setAnimate(true);
      });
    });

    return () => cancelAnimationFrame(timer);
  }, []);

  // Calculate viewBox-relative sizing (viewBox is 200x120)
  const aspectRatio = 120 / 200; // height/width from original viewBox

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 120"
      width={size}
      height={size * aspectRatio}
      className={className}
      aria-label="AI Timeline logo"
      role="img"
    >
      <style>
        {`
          .logo-element {
            will-change: opacity;
            transform: translateZ(0);
          }
          .logo-left-brace {
            opacity: 0;
            transition: opacity 0.4s ease-out;
          }
          .logo-left-brace.animate {
            opacity: 1;
          }
          .logo-right-brace {
            opacity: 0;
            transition: opacity 0.4s ease-out 0.3s;
          }
          .logo-right-brace.animate {
            opacity: 1;
          }
          .logo-dot1 {
            opacity: 0;
            transition: opacity 0.3s ease-out 0.6s;
          }
          .logo-dot1.animate {
            opacity: 1;
          }
          .logo-dot2 {
            opacity: 0;
            transition: opacity 0.3s ease-out 0.8s;
          }
          .logo-dot2.animate {
            opacity: 1;
          }
          .logo-sparkle {
            opacity: 0;
            transition: opacity 0.3s ease-out 1s;
          }
          .logo-sparkle.animate {
            opacity: 1;
            animation: logo-pulse 2s ease-in-out 1.3s infinite;
          }
          @keyframes logo-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>

      {/* Left curly brace { */}
      <path
        className={`logo-element logo-left-brace ${animate ? 'animate' : ''}`}
        d="M35 25 Q25 25 25 35 L25 50 Q25 60 15 60 Q25 60 25 70 L25 85 Q25 95 35 95"
        fill="none"
        stroke="#E5E5E5"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* Right curly brace } */}
      <path
        className={`logo-element logo-right-brace ${animate ? 'animate' : ''}`}
        d="M165 25 Q175 25 175 35 L175 50 Q175 60 185 60 Q175 60 175 70 L175 85 Q175 95 165 95"
        fill="none"
        stroke="#E5E5E5"
        strokeWidth="8"
        strokeLinecap="round"
      />

      {/* First orange dot */}
      <circle
        className={`logo-element logo-dot1 ${animate ? 'animate' : ''}`}
        cx="70"
        cy="60"
        r="12"
        fill="#F97316"
      />

      {/* Second orange dot */}
      <circle
        className={`logo-element logo-dot2 ${animate ? 'animate' : ''}`}
        cx="105"
        cy="60"
        r="12"
        fill="#F97316"
      />

      {/* AI sparkle (4-pointed star) */}
      <path
        className={`logo-element logo-sparkle ${animate ? 'animate' : ''}`}
        d="M140 45 Q143 57 155 60 Q143 63 140 75 Q137 63 125 60 Q137 57 140 45 Z"
        fill="#F97316"
      />
    </svg>
  );
}
