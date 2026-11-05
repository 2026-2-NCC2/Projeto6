import React from 'react';

const paths = {
  moon: <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.7 8.7 0 1 0 20.5 14.2Z" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 21v-2a7 7 0 0 1 14 0v2Z" />
    </>
  ),
  lock: (
    <>
      <rect x="3" y="11" width="13" height="10" rx="2" />
      <path d="M12 11V6a4 4 0 0 1 8 0v5M7 17l5-5" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="m3 3 18 18M10.5 5.1 12 5c6.5 0 10 7 10 7a21 21 0 0 1-3.4 4.3M6.1 6.1A23 23 0 0 0 2 12s3.5 7 10 7a11 11 0 0 0 5-1.2" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  mail: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v6a2 2 0 0 0 4 0v-2a8 8 0 1 0-3.2 6.4" />
    </>
  ),
  ticket: (
    <>
      <path d="M3 5h18v5a2 2 0 0 0 0 4v5H3v-5a2 2 0 0 0 0-4Z" />
      <path d="M9 5v2m0 3v4m0 3v2M14 9h3m-3 6h3" />
    </>
  ),
  megaphone: (
    <>
      <path d="m3 10 12-5v14L3 14Zm12-1 5-3m-5 9 5 3M7 16l1 5H5l-2-7M19 12h3" />
    </>
  ),
  box: (
    <>
      <rect x="4" y="7" width="16" height="14" rx="2" />
      <path d="M3 3h18v4H3Zm6 9h6" />
    </>
  ),
  shield: (
    <>
      <path d="m12 2 8 3v6c0 5-8 11-8 11S4 16 4 11V5Z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
};

export default function Icon({ name, size = 20, className = '' }) {
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name] || paths.user}
    </svg>
  );
}

export function ProviderIcon({ provider }) {
  return provider === 'Google' ? (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M21.8 12.2c0-.7-.1-1.5-.2-2.2H12v4.2h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.4c2-1.8 2.9-4.5 2.9-7.7Z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.8 0 5.2-.9 6.9-2.5l-3.4-2.6c-.9.6-2.1 1-3.5 1-2.7 0-5-1.8-5.8-4.2H2.7v2.7A10.4 10.4 0 0 0 12 22Z"
      />
      <path fill="#FBBC05" d="M6.2 13.7a6 6 0 0 1 0-3.4V7.6H2.7a10 10 0 0 0 0 8.8Z" />
      <path
        fill="#EA4335"
        d="M12 6.1c1.6 0 3 .6 4.1 1.6l3-3A10 10 0 0 0 2.7 7.6l3.5 2.7C7 7.9 9.3 6.1 12 6.1Z"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path
        d="M16.4 1.4c.2 1.6-.5 3.2-1.4 4.2-1 1.1-2.4 1.7-3.8 1.6-.2-1.5.5-3 1.4-4 1-1.1 2.5-1.8 3.8-1.8ZM20.5 17.6c-.5 1.2-.8 1.7-1.5 2.8-1 1.5-2.5 3.3-4.3 3.3-1.6 0-2-1.1-4.2-1.1-2.1 0-2.6 1.1-4.2 1.1-1.8.1-3.1-1.5-4.2-3C-.9 16.3-.9 10 1.2 7.5c1.5-1.8 3.8-2.1 5.5-1.6 1.7.5 2.8 1.1 4.2 1.1 1.3 0 2.2-.6 4.1-1.1 1.6-.4 3.6-.1 5 1.3-4.4 2.4-3.7 8.1.5 10.4Z"
        transform="translate(3 1) scale(.8)"
      />
    </svg>
  );
}
