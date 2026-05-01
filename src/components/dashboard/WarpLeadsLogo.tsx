'use client';

export function WarpLeadsLogo() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Outer square with rounded corners */}
      <rect width="32" height="32" rx="8" fill="#0ea5e9" />
      {/* W shape (stylised) */}
      <path
        d="M7 10L11 22L16 14L21 22L25 10"
        stroke="white"
        strokeWidth="2.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
