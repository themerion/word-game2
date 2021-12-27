export const pipe = (...fns: Array<(arg: any) => any>) => (x: any) => fns.reduce((v, f) => f(v), x);

export const fallback = <T>(val: T) => (x: T|undefined|null) => x || val;

export const replace = (pattern: string, replacement: string) => (x: string) => x.replace(pattern, replacement);