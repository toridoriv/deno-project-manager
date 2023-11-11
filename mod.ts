// deno-lint-ignore-file no-explicit-any ban-types

/**
 * Global options passed to all DenoManage commands.
 *
 * This interface defines the global options that are passed to every subcommand's action function.
 */
export type DenoManageGlobalOptions = {
  /**
   * The path to the DenoManage bin directory.
   */
  manageBinDir: string;
  /**
   * The Deno Deploy project ID.
   */
  manageProjectId: string;
  /**
   * The Deno Deploy access token.
   */
  deployToken: string;
  /**
   * Whether to do a dry run (don't execute side effects).
   */
  dryRun: boolean;
};

/**
 * Defines a DenoManage command.
 *
 * This interface represents a command definition for DenoManage.
 * The action function will receive the parsed CLI options based on any defined flags.
 */
export interface DenoManageCommand<F> {
  /**
   * The name of the command.
   */
  name: string;
  /**
   *  A description of what the command does.
   */
  description: string;
  /**
   * The function to run for the command.
   */
  action: Action<F>;
  /**
   * Optional CLI flags for the command.
   */
  flags?: F extends DenoManageFlags ? F : never;
}

/**
 * Defines a flag for a DenoManage command.
 *
 * This interface represents a single flag definition.
 * A command can define multiple flags by creating a {@link DenoManageFlags} record.
 *
 * @example
 *
 * ```ts
 * const forceFlag: DenoManageFlag = {
 *    name: "force",
 *    abbreviation: "f",
 *    type: "boolean",
 *    description: "Force overwriting existing files",
 *    options: {
 *      default: false,
 *    }
 * };
 * ```
 */
export interface DenoManageFlag {
  /**
   * The full name of the flag.
   */
  name: string;
  /**
   * A short one letter abbreviation for the flag.
   */
  abbreviation: string;
  /**
   * The type of the flag value.
   */
  type: KeyOf<TypeMap>;
  /**
   * A description of the flag.
   */
  description: string;
  /**
   * Additional options like default value.
   */
  options?: FlagOptions;
}

/**
 * Record of {@link DenoManageFlag} definitions for a command.
 *
 * This type defines the shape of the `flags` property on a {@link DenoManageCommand}.
 *
 * It is a Record with the keys as flag names and values as {@link DenoManageFlag} objects.
 *
 * This allows easily defining multiple flags for a command in one object.
 *
 * @example
 *
 * ```ts
 * const command: DenoManageCommand<Flags> = {
 *  build: {
 *    name: "build",
 *    abbreviation: "b",
 *    ...
 *  },
 * };
 * ```
 */
export type DenoManageFlags = Record<string, DenoManageFlag>;

/**
 * Defines a DenoManage command.
 *
 * This function takes a {@link DenoManageCommand} definition and returns it.
 *
 * It allows creating a command definition object that can be passed to the CLI.
 *
 * The command definition contains the metadata like name, description, and action.
 *
 * It also allows defining optional CLI {@link DenoManageFlags} for the command.
 *
 * @param command - The command definition
 * @returns The command definition object
 *
 * @example
 *
 * ```ts
 * export default defineCommand({
 *   name: 'build',
 *   description: 'Build the project',
 *   action: () => {},
 *   flags: {
 *     // flag definitions
 *   }
 * });
 * ```
 */
export function defineCommand<F extends DenoManageFlags>(
  command: DenoManageCommand<F>,
) {
  return command;
}

type Action<F> = F extends DenoManageFlags ? (
    options: Expand<InferOptionsFromFlag<F> & DenoManageGlobalOptions>,
  ) => void | Promise<void>
  : (options: DenoManageGlobalOptions) => void | Promise<void>;

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type FlagOptions = {
  hidden?: boolean;
  default?: unknown;
  required?: boolean;
  standalone?: boolean;
  depends?: string[];
  collect?: boolean;
};

type InferOptionsFromFlag<F extends DenoManageFlags> = {
  [K in keyof F]: TypeMap[F[K]["type"]];
};

type KeyOf<T> = T extends Record<infer K, any> ? K & {} : never;

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};
