import React from 'react';

export default function MagicFrameLogo({ className = "w-12 h-12" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{stopColor:'#3b82f6'}} />
            <stop offset="100%" style={{stopColor:'#a855f7'}} />
            </linearGradient>
        </defs>

        <rect x="5" y="5" width="110" height="150" rx="22" fill="url(#brandGrad)" />
        <rect x="14" y="14" width="92" height="132" rx="14" fill="#0f172a" />
        
        <path d="M14 115 L38 80 L60 100 L88 70 L106 90 V146 H14 Z" fill="url(#brandGrad)" fillOpacity="0.4" />
        
        <rect x="25" y="28" width="45" height="16" rx="5" fill="white" />
        <rect x="75" y="28" width="20" height="16" rx="5" fill="white" fillOpacity="0.3" />
        <rect x="25" y="50" width="60" height="6" rx="3" fill="white" fillOpacity="0.2" />
        
        <path d="M100 20C100 20 98 17 95 17C98 17 100 14 100 14C100 14 102 17 105 17C102 17 100 20 100 20Z" fill="#fbbf24" stroke="#0f172a" strokeWidth="1.5" />
    </svg>
  );
}
