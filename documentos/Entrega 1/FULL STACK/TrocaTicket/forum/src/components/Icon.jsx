// Ícones em SVG inline (traço no estilo "outline"), sem dependências externas.
const P = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  flame: "M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5.3 1.6 1.2 2.5 2 2.5-.5-3 .2-5.8 1-8z",
  clock: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 7v5l3 2"],
  users: ["M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1", "M16 3.5a4 4 0 0 1 0 7.5", "M19 14a6 6 0 0 1 3 5.5V21"],
  bookmark: "M6 3h12v18l-6-4-6 4z",
  file: ["M6 3h9l4 4v14H6z", "M9 12h7M9 16h7M9 8h3"],
  plus: "M12 5v14M5 12h14",
  plusCircle: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 8v8M8 12h8"],
  search: ["M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14z", "m20 20-4-4"],
  bell: ["M6 16V11a6 6 0 1 1 12 0v5l2 2H4z", "M10 21h4"],
  chat: "M4 5h16v11H9l-5 4z",
  chevronDown: "m6 9 6 6 6-6",
  chevronUp: "m6 15 6-6 6 6",
  chevronRight: "m9 6 6 6-6 6",
  arrowLeft: "M19 12H5m6-6-6 6 6 6",
  arrowRight: "M5 12h14m-6-6 6 6-6 6",
  arrowUp: "M12 19V5m-6 6 6-6 6 6",
  arrowDown: "M12 5v14m-6-6 6 6 6-6",
  share: ["M18 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM18 22a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", "m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"],
  more: "M5 12h.01M12 12h.01M19 12h.01",
  shield: "M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z",
  shieldCheck: ["M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z", "m9 12 2 2 4-4"],
  lock: ["M6 11h12v10H6z", "M8 11V7a4 4 0 0 1 8 0v4"],
  pin: ["M12 21s-7-6.5-7-12a7 7 0 0 1 14 0c0 5.5-7 12-7 12z", "M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"],
  pinned: ["M9 3h6l-1 6 4 4H6l4-4z", "M12 13v8"],
  star: "m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  music: ["M9 18V5l11-2v13", "M6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM17 19a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  ticket: ["M3 8a2 2 0 0 0 0 4v0a2 2 0 0 0 0 4v2h18v-2a2 2 0 0 1 0-4 2 2 0 0 1 0-4V6H3z", "M14 6v12"],
  trophy: ["M8 4h8v5a4 4 0 0 1-8 0z", "M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 21h8M9 17h6v4H9z"],
  trending: ["m3 17 6-6 4 4 8-8", "M15 7h6v6"],
  heart: "M12 20s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.5-8 11-8 11z",
  sliders: "M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4",
  image: ["M4 4h16v16H4z", "m4 16 5-5 4 4 2-2 5 5", "M15 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z"],
  link: ["M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1", "M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"],
  chart: "M5 21V10M12 21V4M19 21v-7",
  bold: "M7 4h6a4 4 0 0 1 0 8H7zM7 12h7a4 4 0 0 1 0 8H7z",
  italic: "M15 4h-5M14 20H9M14 4l-4 16",
  list: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01",
  listOrdered: "M10 6h10M10 12h10M10 18h10M4 4v4M3 8h2M3 14h3l-3 4h3",
  quote: "M7 7H4v6h3l-1 4M17 7h-3v6h3l-1 4",
  code: "m8 7-5 5 5 5M16 7l5 5-5 5",
  moon: "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10z",
  sun: ["M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z", "M12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"],
  x: "M6 6l12 12M18 6 6 18",
  check: "m5 12 5 5 9-10",
  flag: ["M5 21V4", "M5 4h11l-2 4 2 4H5"],
  menu: "M4 6h16M4 12h16M4 18h16",
  camera: ["M4 7h4l2-3h4l2 3h4v13H4z", "M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  cards: "M4 4h16v7H4zM4 15h16v5H4z",
  rows: "M4 6h16M4 10h16M4 14h16M4 18h16",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  info: ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z", "M12 11v5M12 8h.01"],
  lightbulb: ["M9 18h6M10 21h4", "M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"],
  calendar: ["M4 6h16v15H4z", "M4 10h16M8 3v4M16 3v4"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  logout: ["M15 4h4v16h-4", "M10 12h10M6 8l-4 4 4 4"],
  trash: ["M4 7h16M10 11v6M14 11v6", "M6 7l1 13h10l1-13M9 7V4h6v3"],
  edit: ["M4 20h4L19 9l-4-4L4 16z", "m13 7 4 4"],
  eye: ["M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
};

export default function Icon({ name, size = 18, stroke = 2, className, fill = "none", title }) {
  const d = P[name];
  if (!d) return null;
  const paths = Array.isArray(d) ? d : [d];
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title && <title>{title}</title>}
      {paths.map((p, i) => (
        <path key={i} d={p} />
      ))}
    </svg>
  );
}
