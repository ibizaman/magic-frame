"use client";

import React from "react";

type SparklineProps = {
  values: number[];
  color?: string;
  height?: number; // viewBox-Höhe, NICHT css px
  strokeWidth?: number;
  className?: string;
};

/**
 * Minimalistischer SVG-Sparkline.
 * - preserveAspectRatio="none" → streckt sich auf die Eltern-Größe.
 * - vectorEffect="non-scaling-stroke" → Linie bleibt optisch 1px egal
 *   wie groß das Widget wird.
 */
export default function Sparkline({
  values,
  color = "currentColor",
  height = 30,
  strokeWidth = 1.5,
  className = "",
}: SparklineProps) {
  if (!values || values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 100;
  const H = height;
  const step = W / (values.length - 1);

  const points = values.map((v, i) => {
    const x = i * step;
    const y = H - ((v - min) / range) * H;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  const linePath = `M ${points.join(" L ")}`;
  const areaPath = `M 0,${H} L ${points.join(" L ")} L ${W},${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`${className}`}
      aria-hidden="true"
    >
      <path d={areaPath} fill={color} fillOpacity="0.18" />
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeOpacity="0.75"
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
