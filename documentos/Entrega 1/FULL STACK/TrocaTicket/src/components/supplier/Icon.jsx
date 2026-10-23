import React from 'react';

// Ícones de traço simples (24x24). Herdam a cor do texto via currentColor.
const PATHS = {
  search: (<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>),
  calendar: (<><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></>),
  pin: (<><path d="M12 21s-7-5.2-7-11a7 7 0 1 1 14 0c0 5.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>),
  clock: (<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>),
  filter: <path d="M4 6h16M7 12h10M10 18h4" />,
  plus: <path d="M12 5v14M5 12h14" />,
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />,
  camera: (<><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></>),
  user: (<><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>),
  settings: (<><circle cx="12" cy="12" r="3.5" /><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" /></>),
  check: <path d="M5 12l5 5 9-10" />,
  star: <path d="M12 3l2.8 6 6.2.6-4.7 4.2 1.4 6.2L12 16.8 6.3 20l1.4-6.2L3 9.6 9.2 9z" />,
  building: (<><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>),
  eye: (<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>),
  pencil: <path d="M4 20h4L19 9l-4-4L4 16z" />,
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>),
  lock: (<><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>),
  file: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>),
  'chevron-right': <path d="M9 6l6 6-6 6" />,
  'arrow-right': <path d="M5 12h14M13 6l6 6-6 6" />,
  more: (<><circle cx="12" cy="5" r="1" /><circle cx="12" cy="12" r="1" /><circle cx="12" cy="19" r="1" /></>),
  x: <path d="M6 6l12 12M18 6L6 18" />,
  mail: (<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>),
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
  'shield-check': (<><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-5" /></>),
  glass: (<><path d="M5 4h14l-7 9z" /><path d="M12 13v7M8 20h8" /></>),
  bulb: (<><path d="M9 18h6M10 21h4" /><path d="M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z" /></>),
  stage: (<><path d="M3 9l9-5 9 5-9 5z" /><path d="M3 14l9 5 9-5" /></>),
  utensils: <path d="M6 3v8M9 3v8M6 7h3M7.5 11v10M17 3c-2 2-3 5-3 8h3v10" />,
  speaker: (<><rect x="6" y="3" width="12" height="18" rx="2" /><circle cx="12" cy="15" r="3" /><circle cx="12" cy="7" r="1" /></>),
  box: (<><path d="M3 8l9-5 9 5v8l-9 5-9-5z" /><path d="M3 8l9 5 9-5M12 13v8" /></>),
  history: (<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5M12 7v5l3 2" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
  alert: (<><path d="M12 3l10 18H2z" /><path d="M12 10v5M12 18h.01" /></>),
};

// Ícone para cada categoria do inventário
export const categoryIcon = {
  'Bebidas & Bar': 'glass',
  'Iluminação': 'bulb',
  'Estrutura & Palco': 'stage',
  'Alimentação & Buffet': 'utensils',
  'Som & Acústica': 'speaker',
  'Segurança & Apoio': 'shield',
};

export default function Icon({ name, size = 16, className = '', strokeWidth = 1.8 }) {
  return (
    <svg
      className={`sp-icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] || PATHS.box}
    </svg>
  );
}
