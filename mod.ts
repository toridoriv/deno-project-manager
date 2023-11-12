// deno-lint-ignore-file no-explicit-any ban-types

/**
 * Defines a DenoManage command.
 *
 * This function is used to define a command for the DenoManage CLI. It takes a
 * DenoManageCommand object containing the definition and returns the same object.
 *
 * The purpose is to provide a consistent way to define commands that can be
 * discovered and registered with the CLI.
 *
 * The command definition includes properties like the name, description, action
 * function, arguments, and flags. The action function will receive the parsed
 * CLI options based on any defined flags when the command is executed.
 *
 * @param command - The command definition object
 * @returns The same command object that was passed in
 *
 * @example
 *
 * ```ts
 * const command = defineCommand({
 *   name: 'build',
 *   description: 'Build the project',
 *   action: () => {
 *     // Command logic
 *   }
 * });
 * ```
 */
export function defineCommand<
  F extends DenoManageFlags,
  A extends DenoManageArguments,
>(command: DenoManageCommand<F, A>) {
  return command;
}

/**
 * Defines a DenoManage command.
 *
 * This interface represents a command definition for DenoManage.
 * The action function will receive the parsed CLI options based on any defined flags.
 */
export interface DenoManageCommand<F, A> {
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
  action: Action<F, A>;
  /**
   * Optional array of command line arguments for the command.
   * Each argument is defined using the {@link DenoManageArgument} interface.
   */
  arguments?: A extends DenoManageArguments ? A : never;
  /**
   * Optional CLI flags for the command.
   */
  flags?: F extends DenoManageFlags ? F : never;
}

/**
 * Defines an argument for a DenoManage command.
 *
 * This interface represents a single argument definition.
 * A command can define multiple arguments by creating a {@link DenoManageArguments} array.
 *
 * @example
 *
 * ```ts
 * const arg: DenoManageArgument = {
 *   name: 'path',
 *   type: 'string'
 * };
 * ```
 */
export interface DenoManageArgument {
  /**
   * The name property defines the argument name.
   */
  name: string;
  /**
   * The type property defines the expected type for the argument value.
   *
   * It should be one of the types from the {@link TypeMap}.
   */
  type: KeyOf<TypeMap>;
}

/**
 * Array of DenoManageArgument definitions.
 *
 * This type represents an array of {@link DenoManageArgument} objects,
 * which define the arguments accepted by a DenoManage command.
 *
 * Commands can specify arguments by creating an array of argument definitions.
 * The DenoManage CLI will parse the arguments based on the definitions
 * and pass them to the command's action function.
 *
 * @example
 *
 * ```ts
 * const args: DenoManageArguments = [
 *   { name: 'path', type: 'string' },
 *   { name: 'force', type: 'boolean' }
 * ];
 * ```
 */
export type DenoManageArguments = DenoManageArgument[];

/**
 * Global options passed to all DenoManage commands.
 *
 * This interface defines the global options that are passed to every subcommand's action function.
 */
export type DenoManageGlobalOptions = {
  /**
   * The path to the DenoManage bin directory.
   */
  binDir: string;
  /**
   * The Deno Deploy project ID.
   */
  projectId: string;
  /**
   * The Deno Deploy access token.
   */
  deployToken: string;
  /**
   * Whether to do a dry run (don't execute side effects).
   */
  dryRun: boolean;
  /**
   * A comma-separated list of globs that should be excluded from deployment.
   * Any files/directories matching these globs will not be uploaded during deployment.
   */
  deployExclusions: string;
};

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

type Action<F, A = unknown> = (
  options: ActionParametersWithFlags<F>[0],
  ...args: ActionParametersWithArguments<A>
) => void | Promise<void>;

type ActionParametersWithFlags<F> = F extends DenoManageFlags
  ? [options: Expand<InferOptionsFromFlag<F> & DenoManageGlobalOptions>]
  : [options: DenoManageGlobalOptions];

type ActionParametersWithArguments<A> = A extends DenoManageArguments
  ? UnionToTuple<InferParametersFromArguments<A>>
  : [];

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

type InferParametersFromArguments<
  A extends DenoManageArguments,
> = A extends [...infer V]
  ? V extends DenoManageArgument[] ? TypeMap[A[number]["type"]] : never
  : never;

type UnionToIntersection<T> = (T extends T ? (params: T) => any : never) extends
  (params: infer P) => any ? P : never;
type UnionToTuple<T, Res extends any[] = []> =
  UnionToIntersection<T extends any ? () => T : never> extends () => infer ReturnType
    ? UnionToTuple<Exclude<T, ReturnType>, [ReturnType, ...Res]>
    : Res;

type KeyOf<T> = T extends Record<infer K, any> ? K & {} : never;

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
  file: string;
  integer: number;
};
