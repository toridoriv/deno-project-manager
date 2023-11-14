import {
  WalkEntry,
  WalkOptions,
  walkSync,
} from "https://deno.land/std@0.206.0/fs/walk.ts";
import { resolve } from "https://deno.land/std@0.206.0/path/resolve.ts";
import mainDebug from "./debug.ts";

const debug = mainDebug.extend("filesystem");

/**
 * Gets local file system paths recursively for a given directory.
 *
 * This function walks the directory tree starting from the provided directory path,
 * and returns a Promise resolving to an array of all discovered file system paths.
 *
 * It uses the walkSync() function from Deno's standard library to traverse the directory tree,
 * converts each entry to a full path using the getPath() helper, and returns the array of paths.
 *
 * @param directory - The root directory path to traverse
 * @param options - Options to pass to walkSync
 * @returns Promise resolving to array of discovered file system paths
 *
 * @example
 *
 * ```ts
 * const paths = await getLocalPaths('./src');
 * // paths = [
 * //   '/project/src/file1.ts',
 * //   '/project/src/folder/file2.ts'
 * // ]
 * ```
 */
export function getLocalPaths(directory: string, options?: WalkOptions) {
  debug("Fetching paths from %s with the following options: %o", directory, options);
  const iterator = walkSync(directory, options);

  return Promise.resolve(Array.from(iterator, getPath.bind(null, directory)));
}

/**
 * Imports the default export from a given module path.
 *
 * @param path - The module path to import
 * @returns The default export from the imported module
 *
 * @example
 * ```ts
 * const myModule = await getDefaultImport('./path/to/module.ts');
 * ```
 */
export async function getDefaultImport(path: string) {
  debug("Importing module %s", path);
  const module = await import(path);

  return module.default;
}

/**
 * Imports default exports from multiple module paths.
 *
 * This function takes an array of module paths, calls getDefaultImport() on each one
 * to import the default export, and returns a Promise resolving to an array
 * of the imported default exports.
 *
 * It allows batch importing default exports from multiple modules in one call instead
 * of needing to call getDefaultImport() separately on each one.
 *
 * @param paths - Array of module paths to import
 * @returns Promise resolving to array of imported default exports
 *
 * @example
 *
 * ```ts
 * const modules = await getDefaultImports([
 *   './module1.ts',
 *   './module2.ts'
 * ]);
 * ```
 */
export function getDefaultImports(paths: string[]) {
  return Promise.all(paths.map(getDefaultImport));
}

/**
 * Checks if an import URL refers to the current working directory.
 *
 * This function takes an import URL string, and checks if it contains
 * the current working directory path.
 *
 * It uses Deno.cwd() to get the current working directory, and String.includes()
 * to check if the importUrl contains it.
 *
 * This can be used to determine if an import refers to a local module in the
 * current project, or an external dependency.
 *
 * @param importUrl - The import URL string
 * @returns True if importUrl contains current working directory
 *
 * @example
 *
 * ```ts
 * const url = './local-module.ts';
 * if (isThisDirectory(url)) {
 *   // url refers to local module
 * }
 * ```
 */
export function isThisDirectory(importUrl: string) {
  return importUrl.includes(Deno.cwd());
}

function getPath(directory: string, entry: WalkEntry) {
  return resolve(directory, entry.path);
}
