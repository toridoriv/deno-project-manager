/**
 * Creates a selector function to retrieve a property value from an object.
 *
 * This higher order function takes a property key and returns a selector function.
 * The selector function takes an object and returns the value of the given property key.
 *
 * This provides a convenient way to extract property values from objects without repeating the property access code.
 *
 * @param key - The property key to select
 * @returns A selector function for that property
 *
 * @example
 *
 * ```ts
 * const getName = createSelector('name');
 *
 * const person = { name: 'John' };
 * const name = getName(person); // 'John'
 * ```
 */
export function createSelector<K extends string>(key: K) {
  // deno-lint-ignore no-explicit-any
  return function selector<T extends Record<K & PropertyKey, any>>(value: T) {
    return value[key];
  };
}
