export const xpForLevel = (level: number) =>
  100 * (level - 1) + 25 * (level - 1) * (level - 1);
export function progress(xp: number) {
  let level = 1;
  while (level < 100 && xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level),
    next = xpForLevel(Math.min(100, level + 1));
  return {
    level,
    xp: xp - base,
    needed: next - base,
    percent:
      level === 100 ? 100 : Math.floor(((xp - base) * 100) / (next - base)),
  };
}
// Integer arithmetic preserves fractional progress without float accumulation.
export function levelBottleXp(xp: number) {
  const p = progress(xp);
  if (p.level === 100) return xpForLevel(100);
  const denominator = p.needed * 5;
  const fraction = p.xp * 5 + p.needed;
  const carry = fraction >= denominator ? 1 : 0;
  const target = Math.min(100, p.level + 1 + carry);
  if (target === 100) return xpForLevel(100);
  return (
    xpForLevel(target) +
    Math.floor(
      ((fraction % denominator) *
        (xpForLevel(target + 1) - xpForLevel(target))) /
        denominator,
    )
  );
}
