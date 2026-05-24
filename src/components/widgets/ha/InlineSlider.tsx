"use client";

import React, { useRef, useState, useEffect } from "react";

interface InlineSliderProps {
    value: number;
    min?: number;
    max?: number;
    color: string;
    isLight?: boolean;
    onChange?: (val: number) => void;
    onFinalChange?: (val: number) => void;
}

export default function InlineSlider({ value, min = 0, max = 100, color, isLight, onChange, onFinalChange }: InlineSliderProps) {
    const [localVal, setLocalVal] = useState(value);
    const trackRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    useEffect(() => {
        if (!isDragging) {
            setLocalVal(value);
        }
    }, [value, isDragging]);

    const handleMove = (clientX: number) => {
        if (!trackRef.current) return;
        const rect = trackRef.current.getBoundingClientRect();
        let pc = (clientX - rect.left) / rect.width;
        if (pc < 0) pc = 0;
        if (pc > 1) pc = 1;
        const newVal = Math.round(min + pc * (max - min));
        setLocalVal(newVal);
        onChange?.(newVal);
    };

    const handlePointerDown = (e: React.PointerEvent) => {
        e.stopPropagation();
        setIsDragging(true);
        handleMove(e.clientX);
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (isDragging) handleMove(e.clientX);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        if (!isDragging) return;
        setIsDragging(false);
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
        onFinalChange?.(localVal);
    };

    const percent = ((localVal - min) / (max - min)) * 100;
    
    // In light mode, the unoccupied track is black/10. In dark mode, it's white/10.
    const trackBg = color === '#ffffff' || color === '#fff' 
           ? (isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.15)')
           : `${color}40`; // 25% opacity for custom color track

    return (
        <div 
            ref={trackRef}
            className="relative h-full w-full rounded-[1em] cursor-pointer overflow-hidden touch-none"
            style={{ backgroundColor: trackBg }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
            <div 
                className="absolute top-0 left-0 h-full rounded-[1em] shadow-sm pointer-events-none"
                style={{ 
                    width: `${percent}%`, 
                    backgroundColor: color,
                    transition: isDragging ? 'none' : 'width 0.3s ease-out'
                }}
            >
                {/* Thumb indicator like in user's screenshot */}
                {percent > 5 && (
                    <div className="absolute right-[0.4em] top-1/2 -translate-y-1/2 w-[0.15em] h-1/3 bg-black/20 rounded-full" />
                )}
            </div>
        </div>
    );
}
