/** Shared token matching for Vibe Map + Sponsor Radar filters. */

export function norm(s: string): string {
  return s.toLowerCase().replace(/[-_]/g, " ").trim();
}

export function hasExact(arr: string[], v: string): boolean {
  const n = norm(v);
  return arr.some((x) => norm(x) === n);
}

/** True if any array item contains any token (substring, normalized). */
export function arrHasAny(arr: string[], ...tokens: string[]): boolean {
  if (!arr.length || !tokens.length) return false;
  return arr.some((item) => {
    const ni = norm(item);
    return tokens.some((t) => {
      const nt = norm(t);
      return ni.includes(nt) || nt.includes(ni);
    });
  });
}

/** Match tokens across multiple string fields flattened. */
export function fieldsHaveAny(fields: string[], ...tokens: string[]): boolean {
  return arrHasAny(fields, ...tokens);
}

export function allFields(...groups: string[][]): string[] {
  return groups.flat();
}
