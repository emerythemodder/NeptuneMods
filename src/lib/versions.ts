const RELEASE = /^\d+\.\d+(\.\d+)?$/;

export function compareVersions(a: string, b: string): number {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

/** Release versions only (no snapshots), newest first, without duplicates. */
export function releasesDesc(vs: string[]): string[] {
  return [...new Set(vs.filter((v) => RELEASE.test(v)))].sort(compareVersions).reverse();
}
