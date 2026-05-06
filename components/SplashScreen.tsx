"use client";

import { useState, useEffect } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export default function SplashScreen({ onComplete }: SplashScreenProps) {
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => {
      setFading(true);
    }, 2000);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2400);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  // Calculate arc circumferences for stroke-dasharray
  const arc1Radius = 36;
  const arc2Radius = 58;
  const arc3Radius = 80;

  const arc1Length = Math.PI * arc1Radius; // half circle
  const arc2Length = Math.PI * arc2Radius;
  const arc3Length = Math.PI * arc3Radius;

  return (
    <div
      className={`fixed inset-0 bg-[#0A0A0F] flex items-center justify-center overflow-hidden transition-opacity duration-400 ease-out ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{
        zIndex: 9999,
        backgroundImage: `
          linear-gradient(90deg, transparent 0%, rgba(0, 255, 135, 0.03) 50%, transparent 100%),
          repeating-linear-gradient(0deg, rgba(0, 255, 135, 0.02) 0px, transparent 1px, transparent 2px, rgba(0, 255, 135, 0.02) 3px)
        `,
        backgroundSize: "100% 100%, 100% 4px",
        backgroundPosition: "0 0, 0 0",
      }}
    >
      {/* Animated scan sweep overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(0, 255, 135, 0.05) 50%, transparent 100%)",
          animation: "scan-sweep 3s linear infinite",
        }}
      />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center justify-center">
        {/* Logo SVG */}
        <svg
          width="200"
          height="200"
          viewBox="0 0 200 200"
          className="mb-8"
          style={{
            filter: "drop-shadow(0 0 20px rgba(0, 255, 135, 0.2))",
          }}
        >
          {/* Center dot */}
          <circle
            cx="100"
            cy="100"
            r="14"
            fill="#00FF87"
            style={{
              animation: "splash-dot-appear 0.6s ease-out forwards",
              animationDelay: "0.1s",
            }}
          />

          {/* Arc 1 - inner */}
          <path
            d={`M 100 64 A 36 36 0 0 1 136 136`}
            stroke="#00FF87"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            style={{
              opacity: 1,
              strokeDasharray: `${arc1Length}`,
              strokeDashoffset: `${arc1Length}`,
              animation: `arcDraw 0.8s ease-out forwards`,
              animationDelay: "0.2s",
            }}
          />
          <path
            d={`M 100 64 A 36 36 0 0 1 136 136`}
            stroke="#00FF87"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
            style={{
              opacity: 0.7,
              strokeDasharray: `${arc1Length}`,
              strokeDashoffset: `${arc1Length}`,
              animation: `arcDraw 0.8s ease-out forwards`,
              animationDelay: "0.2s",
              filter: "blur(0.5px)",
            }}
            transform="translate(0, 1)"
          />

          {/* Arc 2 - mid */}
          <path
            d={`M 100 42 A 58 58 0 0 1 158 158`}
            stroke="#00FF87"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            style={{
              opacity: 0.55,
              strokeDasharray: `${arc2Length}`,
              strokeDashoffset: `${arc2Length}`,
              animation: `arcDraw 0.8s ease-out forwards`,
              animationDelay: "0.35s",
            }}
          />
          <path
            d={`M 100 42 A 58 58 0 0 1 158 158`}
            stroke="#00FF87"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            style={{
              opacity: 0.35,
              strokeDasharray: `${arc2Length}`,
              strokeDashoffset: `${arc2Length}`,
              animation: `arcDraw 0.8s ease-out forwards`,
              animationDelay: "0.35s",
              filter: "blur(0.5px)",
            }}
            transform="translate(0, 1)"
          />

          {/* Arc 3 - outer */}
          <path
            d={`M 100 20 A 80 80 0 0 1 180 180`}
            stroke="#00FF87"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            style={{
              opacity: 0.3,
              strokeDasharray: `${arc3Length}`,
              strokeDashoffset: `${arc3Length}`,
              animation: `arcDraw 0.8s ease-out forwards`,
              animationDelay: "0.5s",
            }}
          />
          <path
            d={`M 100 20 A 80 80 0 0 1 180 180`}
            stroke="#00FF87"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            style={{
              opacity: 0.15,
              strokeDasharray: `${arc3Length}`,
              strokeDashoffset: `${arc3Length}`,
              animation: `arcDraw 0.8s ease-out forwards`,
              animationDelay: "0.5s",
              filter: "blur(0.5px)",
            }}
            transform="translate(0, 1)"
          />
        </svg>

        {/* Wordmark */}
        <div
          className="flex items-baseline gap-0 mb-3"
          style={{
            animation: "splash-fade-up 0.6s ease-out forwards",
            animationDelay: "0.6s",
            opacity: 0,
          }}
        >
          <span
            className="font-display text-5xl font-extrabold text-[#F0F0F5]"
            style={{ letterSpacing: "-2px" }}
          >
            Store
          </span>
          <span
            className="font-display text-5xl font-extrabold text-[#00FF87]"
            style={{ letterSpacing: "-2px", marginLeft: "8px" }}
          >
            Signal
          </span>
        </div>

        {/* Tagline */}
        <div
          className="text-xs font-mono text-[#8888A0] tracking-wider"
          style={{
            letterSpacing: "4px",
            animation: "splash-fade-up 0.6s ease-out forwards",
            animationDelay: "0.8s",
            opacity: 0,
          }}
        >
          AI REPRESENTATION OPTIMIZER
        </div>
      </div>

      {/* Loading bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-[#00FF87]"
        style={{
          width: "0%",
          animation: "splash-loading-bar 1.8s ease-out forwards",
          boxShadow: "0 0 15px rgba(0, 255, 135, 0.6)",
        }}
      />
    </div>
  );
}
