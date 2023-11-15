// @deno-types="npm:@types/debug"
import debug from "npm:debug";
import packageJson from "../package.json" assert { type: "json" };

/**
 * Main debug logger instance for this application.
 *
 * This exports a preconfigured debug instance for the `deno-project-manager`
 * namespace. It can be used to create log statements prefixed with the namespace.
 *
 * Debug should be used for logging diagnostic information during development.
 * The log level can be controlled via the DEBUG environment variable.
 *
 * @link [Debug Documentation](https://github.com/debug-js/debug)
 *
 * @example
 *
 * ```ts
 * import debug from './debug.ts';
 *
 * const log = debug.extend('some-module');
 *
 * log('Hello World');
 * // [deno-project-manager:some-module] Hello World
 * ```
 */
const mainDebug = debug(packageJson.name);

export default mainDebug;
