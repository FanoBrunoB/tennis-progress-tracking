export const themes = {
  hard: {
    name: 'Hard court season', bg: '#146FAE', card: '#0F5E98', card2: '#1A7BC0',
    accent: '#8FD8F8', onAccent: '#06345C', text: '#FFFFFF', muted: '#E4F3FD', deep: '#0A4677', border: 'rgba(255,255,255,0.18)',
  },
  clay: {
    name: 'Clay season', bg: '#8C3619', card: '#A2441F', card2: '#B3522B',
    accent: '#0F5B3B', onAccent: '#FFFFFF', text: '#FFF6EE', muted: '#F6D2BD', deep: '#5E220E', border: 'rgba(255,255,255,0.18)',
  },
  grass: {
    name: 'Grass season', bg: '#1E4A24', card: '#285D2F', card2: '#326D39',
    accent: '#5C2D84', onAccent: '#FFFFFF', text: '#F4FFF3', muted: '#C3E0C2', deep: '#123117', border: 'rgba(255,255,255,0.14)',
  },
  indoors: {
    name: 'Indoors season', bg: '#0E1C3D', card: '#172A57', card2: '#22386C',
    accent: '#E3B341', onAccent: '#0E1C3D', text: '#FFFFFF', muted: '#B4C3E6', deep: '#08122A', border: 'rgba(255,255,255,0.14)',
  },
};
export type Season = keyof typeof themes;
export type Theme = (typeof themes)[Season];
export function getSeasonTheme(date: Date): Theme {
  const day = (date.getMonth() + 1) * 100 + date.getDate();
  if (day <= 328) return themes.hard;
  if (day <= 606) return themes.clay;
  if (day <= 725) return themes.grass;
  return themes.indoors;
}
export function contrastRatio(first: string, second: string): number {
  const luminance = (hex: string) => {
    if (!/^#[\da-f]{6}$/i.test(hex)) throw new Error('Contrast colors must use six-digit hex.');
    const channels = [1, 3, 5].map(i => {
      const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
      return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const a = luminance(first), b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function readableText(preferred: string, background: string, fallback: string): string {
  // DECISION: use the season's primary text where its specified muted color fails 4.5:1.
  return contrastRatio(preferred, background) >= 4.5 ? preferred : fallback;
}
