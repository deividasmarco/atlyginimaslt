// ─────────────────────────────────────────────────────────────
// App Color Palette
// ─────────────────────────────────────────────────────────────

export const Colors = {
  // Backgrounds
  bg:         '#080C14',
  surface1:   '#0E1420',
  surface2:   '#141B2B',
  surface3:   '#1C2538',

  // Borders
  border:     'rgba(255,255,255,0.07)',
  border2:    'rgba(255,255,255,0.12)',

  // Accent
  blue:       '#4F8EF7',
  blueDim:    'rgba(79,142,247,0.15)',
  blueGlow:   'rgba(79,142,247,0.25)',

  green:      '#2DD4BF',
  greenDim:   'rgba(45,212,191,0.12)',

  amber:      '#F59E0B',
  amberDim:   'rgba(245,158,11,0.12)',

  red:        '#F87171',
  redDim:     'rgba(248,113,113,0.12)',

  purple:     '#A78BFA',
  purpleDim:  'rgba(167,139,250,0.12)',

  orange:     '#FB923C',

  // Text
  text1:      '#F0F4FF',
  text2:      '#8B97B0',
  text3:      '#4A5568',

  // Semantic
  income:     '#2DD4BF',
  expense:    '#F87171',
  tax:        '#F59E0B',
  neutral:    '#8B97B0',
} as const;

export type ColorKey = keyof typeof Colors;
