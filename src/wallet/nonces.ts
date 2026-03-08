export type NonceSource = () => number;

export function createMonotonicNonceSource(start: number = Date.now()): NonceSource {
  let last = start;
  return () => {
    const now = Date.now();
    if (now > last) {
      last = now;
    } else {
      last += 1;
    }
    return last;
  };
}
