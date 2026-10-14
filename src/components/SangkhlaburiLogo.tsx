import React, { useState } from 'react';

interface SangkhlaburiLogoProps {
  className?: string;
  size?: number;
}

export const SangkhlaburiLogo: React.FC<SangkhlaburiLogoProps> = ({ className = 'w-12 h-12', size = 48 }) => {
  const [imageError, setImageError] = useState(false);

  // If image loads successfully, show user-provided asset, else fallback to pristine vector SVG
  if (!imageError) {
    return (
      <img
        src="/Logo SK.png"
        alt="ตราสัญลักษณ์โรงพยาบาลสังขละบุรี"
        className={`${className} object-contain rounded-full shadow-xs`}
        style={{ width: size, height: size }}
        onError={() => setImageError(true)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} shrink-0`}
      style={{ width: size, height: size }}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="ตราสัญลักษณ์โรงพยาบาลสังขละบุรี"
    >
      {/* Outer green ring */}
      <circle cx="100" cy="100" r="96" fill="#0E6B38" stroke="#094A26" strokeWidth="3" />
      <circle cx="100" cy="100" r="88" fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
      <circle cx="100" cy="100" r="64" fill="#0A522B" stroke="#FFFFFF" strokeWidth="2" />

      {/* Hospital Name Thai Top Arch */}
      <path id="curveThai" d="M 32 100 A 68 68 0 0 1 168 100" fill="none" />
      <text fill="#FFFFFF" fontSize="13.5" fontWeight="700" letterSpacing="1.2">
        <textPath href="#curveThai" startOffset="50%" textAnchor="middle">
          โรงพยาบาลสังขละบุรี
        </textPath>
      </text>

      {/* Hospital Name English Bottom Arch */}
      <path id="curveEng" d="M 170 106 A 70 70 0 0 1 30 106" fill="none" />
      <text fill="#FFFFFF" fontSize="10.5" fontWeight="700" letterSpacing="1.5">
        <textPath href="#curveEng" startOffset="50%" textAnchor="middle">
          SANGKHLABURI HOSPITAL
        </textPath>
      </text>

      {/* Center Medical Torch & Naga/Serpents (Thai Ministry of Public Health Caduceus) */}
      {/* Torch Flame */}
      <path
        d="M100 48 C96 56 94 62 97 67 C99 71 101 71 103 67 C106 62 104 56 100 48 Z"
        fill="#FFFFFF"
      />
      <path
        d="M93 54 C91 60 93 65 96 68 C94 65 92 61 93 54 Z"
        fill="#FFFFFF"
        opacity="0.85"
      />
      <path
        d="M107 54 C109 60 107 65 104 68 C106 65 108 61 107 54 Z"
        fill="#FFFFFF"
        opacity="0.85"
      />

      {/* Torch Body */}
      <path
        d="M96 68 L104 68 L103 138 L97 138 Z"
        fill="#FFFFFF"
      />
      {/* Torch capital / head */}
      <path
        d="M94 67 L106 67 L103 72 L97 72 Z"
        fill="#FFFFFF"
      />
      {/* Torch base ring */}
      <polygon points="95,138 105,138 103,144 97,144" fill="#FFFFFF" />
      <circle cx="100" cy="147" r="2.5" fill="#FFFFFF" />

      {/* Wings / Twin Nagas intertwined */}
      <path
        d="M100 76 C85 68 68 76 66 84 C64 92 78 95 86 92 C94 89 97 83 100 81 C103 83 106 89 114 92 C122 95 136 92 134 84 C132 76 115 68 100 76 Z"
        fill="#FFFFFF"
      />
      {/* Naga lower loops */}
      <path
        d="M100 95 C88 95 80 102 82 109 C84 116 93 118 100 115 C107 118 116 116 118 109 C120 102 112 95 100 95 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.5"
      />
      <path
        d="M100 116 C90 116 86 124 90 128 C94 132 98 131 100 127 C102 131 106 132 110 128 C114 124 110 116 100 116 Z"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="2.8"
      />
    </svg>
  );
};
