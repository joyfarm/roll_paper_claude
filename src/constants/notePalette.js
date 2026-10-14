export const NOTE_PALETTE = [
  { key: 'lemon', name: '레몬', bg: '#FFF59D', text: '#5D4F00' },
  { key: 'peach', name: '피치', bg: '#FFCCBC', text: '#6D2E1A' },
  { key: 'pink', name: '체리블라썸', bg: '#F8BBD0', text: '#6A1B3A' },
  { key: 'mint', name: '민트', bg: '#C8E6C9', text: '#1E4620' },
  { key: 'sky', name: '스카이', bg: '#BBDEFB', text: '#0D3C61' },
];

export const DEFAULT_COLOR = NOTE_PALETTE[0].bg;

/** 팔레트 밖의 색이 들어오면 기본(레몬)으로 대체 */
export const getSwatch = (hex) =>
  NOTE_PALETTE.find((p) => p.bg.toLowerCase() === String(hex).toLowerCase()) ?? NOTE_PALETTE[0];
