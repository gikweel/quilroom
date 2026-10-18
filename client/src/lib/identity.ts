const NAME_KEY = 'quilroom_display_name';
const COLOR_KEY = 'quilroom_color';
const MODE_KEY = 'quilroom_identity_mode'; // 'named' | 'anonymous'

const COLORS = [
  '#0D9488',
  '#2563EB',
  '#7C3AED',
  '#DB2777',
  '#EA580C',
  '#16A34A',
  '#CA8A04',
  '#DC2626',
];

export type IdentityMode = 'named' | 'anonymous';

export function getIdentityMode(): IdentityMode {
  const mode = localStorage.getItem(MODE_KEY);
  if (mode === 'named' || mode === 'anonymous') return mode;
  // Legacy: if a name exists, treat as named
  return getDisplayName() ? 'named' : 'anonymous';
}

export function setIdentityMode(mode: IdentityMode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function getDisplayName(): string | null {
  return localStorage.getItem(NAME_KEY);
}

export function setDisplayName(name: string) {
  const trimmed = name.trim();
  if (trimmed) localStorage.setItem(NAME_KEY, trimmed);
  else localStorage.removeItem(NAME_KEY);
}

export function getColor(): string {
  let color = localStorage.getItem(COLOR_KEY);
  if (!color) {
    color = COLORS[Math.floor(Math.random() * COLORS.length)];
    localStorage.setItem(COLOR_KEY, color);
  }
  return color;
}

/** Name shown in presence: real name or "Anonymous" */
export function getAwarenessUser() {
  const mode = getIdentityMode();
  const name =
    mode === 'named' && getDisplayName()
      ? getDisplayName()!
      : 'Anonymous';
  return {
    name,
    color: getColor(),
  };
}

export function getIdentityLabel(): string {
  const mode = getIdentityMode();
  if (mode === 'named' && getDisplayName()) return getDisplayName()!;
  return 'Anonymous';
}
