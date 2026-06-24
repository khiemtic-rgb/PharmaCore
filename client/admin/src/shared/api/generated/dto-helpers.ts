/** Strip null; keep optional fields as T | undefined (not null). */
type Clean<T> = {
  [K in keyof T]: undefined extends T[K]
    ? Exclude<T[K], null>
    : NonNullable<T[K]> extends readonly (infer U)[]
      ? Clean<U>[]
      : NonNullable<T[K]> extends object
        ? Clean<NonNullable<T[K]>>
        : NonNullable<T[K]>;
};

/** Required keys on API rows after client normalization. */
export type Req<T, K extends keyof T> = Required<Pick<Clean<T>, K>> & Omit<Clean<T>, K>;
