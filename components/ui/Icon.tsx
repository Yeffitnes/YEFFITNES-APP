// Iconos de marca (trazo fino, 20×20, color heredado). Sustituyen a los emojis del sistema,
// que cambian de aspecto en cada teléfono y rompen el estilo premium de la app.
const PATHS = {
  check: <path d="M4.5 10.5l3.7 3.7L15.5 6.3" />,
  close: <path d="M5.5 5.5l9 9M14.5 5.5l-9 9" />,
  lock: <><rect x="4.5" y="9" width="11" height="7.5" rx="2" /><path d="M7 9V6.8a3 3 0 0 1 6 0V9" /></>,
  camera: <><path d="M3.5 7.2A1.7 1.7 0 0 1 5.2 5.5h1.1l.9-1.4h5.6l.9 1.4h1.1a1.7 1.7 0 0 1 1.7 1.7v6.6a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7V7.2z" /><circle cx="10" cy="10.4" r="2.7" /></>,
  video: <><rect x="3" y="5.5" width="10.5" height="9" rx="2.2" /><path d="M13.5 9l3.5-2v6l-3.5-2" /></>,
  play: <path d="M7 4.8l8 5.2-8 5.2V4.8z" fill="currentColor" />,
  pin: <><path d="M12.6 3.5l3.9 3.9-2 .8-2.4 2.9.3 2.6-1 1-2.8-2.8-4.3 4.3" /><path d="M8.4 6.1l1-1 5.5 5.5" /></>,
  download: <><path d="M10 3.8v8.6M6.4 9l3.6 3.6L13.6 9" /><path d="M4 15.6h12" /></>,
  bell: <><path d="M5 8a5 5 0 0 1 10 0c0 3.2 1 4.4 1 4.4H4S5 11.2 5 8z" /><path d="M8.2 15.4a1.9 1.9 0 0 0 3.6 0" /></>,
  clock: <><circle cx="10" cy="10" r="6.6" /><path d="M10 6.4V10l2.5 1.6" /></>,
  dumbbell: <><path d="M6 7v6M14 7v6M3.5 8.5v3M16.5 8.5v3M6 10h8" /></>,
  chart: <path d="M4.5 15.5v-4.5M10 15.5V5.5M15.5 15.5V8.5" />,
  calendar: <><rect x="3.2" y="4.2" width="13.6" height="12.3" rx="2.5" /><path d="M3.2 8h13.6M6.8 2.8v3M13.2 2.8v3" /></>,
  image: <><rect x="3.2" y="4.2" width="13.6" height="11.6" rx="2.2" /><circle cx="7.6" cy="8.4" r="1.4" /><path d="M3.6 14l4-3.8 3 2.8 2.2-2 3.6 3.2" /></>,
  message: <path d="M4.2 5h11.6a1.2 1.2 0 0 1 1.2 1.2v6.1a1.2 1.2 0 0 1-1.2 1.2H9.6L6.2 16.4v-2.9H4.2A1.2 1.2 0 0 1 3 12.3V6.2A1.2 1.2 0 0 1 4.2 5z" />,
  chevron: <path d="M7.6 5l5 5-5 5" />,
  chevronLeft: <path d="M12.4 5l-5 5 5 5" />,
  arrow: <path d="M4 10h12M11.2 5.2L16 10l-4.8 4.8" />,
  back: <path d="M16 10H4M8.8 5.2L4 10l4.8 4.8" />,
  up: <path d="M10 15V5M5.5 9.5L10 5l4.5 4.5" />,
  down: <path d="M10 5v10M5.5 10.5L10 15l4.5-4.5" />,
  target: <><circle cx="10" cy="10" r="6.6" /><circle cx="10" cy="10" r="3.2" /><circle cx="10" cy="10" r=".6" fill="currentColor" /></>,
  megaphone: <><path d="M4 8.5v3l8 3.5V5L4 8.5z" /><path d="M6 11.7l.8 3.3h2" /><path d="M15 8.2a2.4 2.4 0 0 1 0 3.6" /></>,
} as const;
export type IconName = keyof typeof PATHS;
export function Icon({ name, size = 16, stroke = 1.7, className, style }: { name: IconName; size?: number; stroke?: number; className?: string; style?: React.CSSProperties }) {
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 20 20" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className} style={{ flex: "none", verticalAlign: "-0.18em", ...style }}>{PATHS[name]}</svg>;
}
