import React from 'react';

const STANDARD_CLOUD_PATH = "M75 65C75 53.9543 66.0457 45 55 45C52.4836 45 50.0766 45.464 47.8549 46.3129C44.7578 36.6853 35.6669 30 25 30C11.1929 30 0 41.1929 0 55C0 67.653 9.40455 78.1098 21.5794 79.8242H22V80H75C86.0457 80 95 71.0457 95 60C95 48.9543 86.0457 40 75 40V65Z";

export const SolidSun = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <g style={{ filter: "drop-shadow(0 2px 8px rgba(250, 204, 21, 0.5))" }}>
      <circle cx="50" cy="50" r="30" fill="#FACC15" />
      <path d="M50 10L50 5 M50 95L50 90 M10 50L5 50 M95 50L90 50 M21.7 21.7L18.2 18.2 M78.3 78.3L81.8 81.8 M21.7 78.3L18.2 81.8 M78.3 21.7L81.8 18.2" stroke="#FACC15" strokeWidth="8" strokeLinecap="round" />
    </g>
  </svg>
);

export const SolidMoon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M60 20A40 40 0 1 0 80 75 30 30 0 1 1 60 20z" fill="#93C5FD" />
  </svg>
);

export const SolidCloud = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path d="M75 55C75 43.9543 66.0457 35 55 35C52.4836 35 50.0766 35.464 47.8549 36.3129C44.7578 26.6853 35.6669 20 25 20C11.1929 20 0 31.1929 0 45C0 57.653 9.40455 68.1098 21.5794 69.8242H22V70H75C86.0457 70 95 61.0457 95 50C95 38.9543 86.0457 30 75 30V55Z" fill="#64748B" transform="translate(15, -5) scale(0.8)" opacity="0.8"/>
    <path d={STANDARD_CLOUD_PATH} fill="#F8FAFC" />
  </svg>
);

export const SolidCloudRain = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path transform="translate(0, -15)" d={STANDARD_CLOUD_PATH} fill="#94A3B8" />
    <path d="M30 70L22 92 M50 70L42 92 M70 70L62 92" stroke="#60A5FA" strokeWidth="6" strokeLinecap="round" />
  </svg>
);

export const SolidCloudSnow = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path transform="translate(0, -15)" d={STANDARD_CLOUD_PATH} fill="#94A3B8" />
    <circle cx="30" cy="80" r="5" fill="#FFFFFF" />
    <circle cx="50" cy="74" r="6" fill="#FFFFFF" />
    <circle cx="70" cy="82" r="5" fill="#FFFFFF" />
  </svg>
);

export const SolidCloudLightning = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path transform="translate(0, -15)" d={STANDARD_CLOUD_PATH} fill="#475569" />
    <path d="M50 60L35 80H55L45 100L65 75H45L50 60Z" fill="#FACC15" />
  </svg>
);

export const SolidCloudFog = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path transform="translate(0, -15)" d={STANDARD_CLOUD_PATH} fill="#E2E8F0" />
    <path d="M15 75H85 M25 85H75 M35 95H65" stroke="#CBD5E1" strokeWidth="8" strokeLinecap="round" />
  </svg>
);

export const SolidCloudDrizzle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
    <path transform="translate(0, -15)" d={STANDARD_CLOUD_PATH} fill="#CBD5E1" />
    <path d="M30 70L27 85 M50 70L47 85 M70 70L67 85 M40 75L37 90 M60 75L57 90" stroke="#93C5FD" strokeWidth="4" strokeLinecap="round" />
  </svg>
);
