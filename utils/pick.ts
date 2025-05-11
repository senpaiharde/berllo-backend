// utils/pick.ts
export const pick = <T, K extends keyof T>(
  obj: T,
  keys: readonly K[]   // ← accept readonly
): Partial<T> =>
  keys.reduce((acc, k) => {
    if (obj[k] !== undefined) (acc as any)[k] = obj[k];
    return acc;
  }, {} as Partial<T>);
