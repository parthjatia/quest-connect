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

/** Match tokens across multiple string fields flattened. Accepts arrays or strings interleaved with tokens. */
export function fieldsHaveAny(...args: Array<string | string[]>): boolean {
  const flat: string[] = [];
  const tokens: string[] = [];
  // Heuristic: arrays are fields, trailing strings are tokens.
  let seenString = false;
  for (const a of args) {
    if (Array.isArray(a)) {
      if (seenString) tokens.push(...a);
      else flat.push(...a);
    } else {
      seenString = true;
      tokens.push(a);
    }
  }
  return arrHasAny(flat, ...tokens);
}

export function allFields(...groups: string[][]): string[] {
  return groups.flat();
}
