
const SATS_PER_GH = 0.0634;

export function satToGH(satPerHour: number): number {
  return satPerHour / SATS_PER_GH;
}

export function ghToSat(ghPerSec: number): number {
  return ghPerSec * SATS_PER_GH;
}

export function formatHashrate(satPerHour: number): string {
  const ghPerSec = satToGH(satPerHour);
  if (ghPerSec >= 1) {
    return `${ghPerSec.toFixed(3)} GH/s`;
  }
  const mhPerSec = ghPerSec * 1000;
  return `${mhPerSec.toFixed(2)} MH/s`;
}
