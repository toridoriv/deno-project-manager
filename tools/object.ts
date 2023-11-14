export function createSelector<
  K extends string,
>(
  key: K,
) {
  return function selector<T extends Record<K & PropertyKey, any>>(value: T) {
    return value[key];
  };
}
