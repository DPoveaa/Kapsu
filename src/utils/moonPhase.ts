export const MOON_PHASE_NAMES = [
  'Lua Cheia',
  'Gibosa Minguante',
  'Quarto Minguante',
  'Lua Minguante',
  'Lua Nova',
  'Lua Crescente',
  'Quarto Crescente',
  'Gibosa Crescente',
] as const;

const SYNODIC_MONTH_DAYS = 29.530588853;
const KNOWN_NEW_MOON_UTC = Date.UTC(2000, 0, 6, 18, 14, 0);

export function getBrazilMoonPhase(date = new Date()): number {
  const brazilDate = new Date(date.toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const age = (((brazilDate.getTime() - KNOWN_NEW_MOON_UTC) / 86_400_000) % SYNODIC_MONTH_DAYS + SYNODIC_MONTH_DAYS) % SYNODIC_MONTH_DAYS;
  return Math.round((age / SYNODIC_MONTH_DAYS) * 8 + 4) % 8;
}