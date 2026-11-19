/** Ignore accents and case so that « tête » and « tete » are the same word. */
export function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}
