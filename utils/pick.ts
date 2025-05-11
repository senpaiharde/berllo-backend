export const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Partial<T> =>
  keys.reduce((acc, k) => (obj[k] === undefined ? acc : { ...acc, [k]: obj[k] }), {});
