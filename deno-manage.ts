// deno-lint-ignore-file no-explicit-any
import "https://deno.land/std@0.206.0/dotenv/load.ts";

import {
  type WalkEntry,
  type WalkOptions,
  walkSync,
} from "https://deno.land/std@0.206.0/fs/walk.ts";
import { fromFileUrl, relative } from "https://deno.land/std@0.206.0/path/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { DenoManageArguments, DenoManageCommand, DenoManageFlags } from "./mod.ts";
import { BUILT_IN_SUBCOMMANDS } from "./subcommands.ts";

const BASE_META_URL = import.meta.url.replace("/deno-manage.ts", "/bin");
const BUILT_IN_BIN_PATH = BASE_META_URL.startsWith("https://")
  ? BASE_META_URL
  : fromFileUrl(import.meta.url);

/**
 * An utility module for filesystem operations.
 */
const filesystem = (() => {
  const WALK_SYNC_OPTIONS: WalkOptions = {
    exts: [".ts", ".js", ".mjs"],
    skip: [/_/, /\.test/],
    maxDepth: 10,
    includeDirs: false,
  };

  function getEntryPath(entry: WalkEntry) {
    return entry.path;
  }

  return {
    /**
     * Imports the default export from a given module path.
     *
     * This function takes a module path, constructs the full import path based on the current file location,
     * imports the module, and returns the default export.
     *
     * It replaces the "file://" prefix and "/deno-manage.ts" suffix from the current file URL
     * to build the relative path to the target module.
     *
     * @param path - The module path to import
     * @returns The default export from the imported module
     *
     * @example
     * ```ts
     * const myModule = await filesystem.getDefaultImport('./path/to/module.ts');
     * ```
     */
    async getDefaultImport(path: string) {
      if (path.includes(BUILT_IN_BIN_PATH)) {
        const module = await import(path);

        return module.default;
      }

      const here = import.meta.url
        .replace("file://", "")
        .replace("/deno-manage.ts", "");
      const there = Deno.cwd();
      const rel = relative(here, there);
      const module = await import(`${rel}/${path}`);

      return module.default;
    },
    /**
     * Retrieves all public file paths within a directory.
     *
     * This function walks the given directory recursively using walkSync()
     * and returns an array of all discovered file paths that match the criteria.
     *
     * It uses the WALK_SYNC_OPTIONS constant to define the walk criteria:
     * - Only includes files with .ts, .js, or .mjs extensions
     * - Skips files starting with _ or ending in .test
     * - Searches up to 10 levels deep
     * - Does not include directories in results
     *
     * @param directory - The directory path to search
     * @returns An array of all matching file paths
     *
     * @example
     * ```ts
     * const files = filesystem.getPublicPaths('./src');
     * // -> ['src/file1.ts', 'src/file2.js']
     * ```
     */
    getPublicPaths(directory: string) {
      if (directory.startsWith("https://")) {
        return BUILT_IN_SUBCOMMANDS.map((v) => directory + "/" + v);
      }

      const entries = walkSync(directory, WALK_SYNC_OPTIONS);

      return Array.from(entries).map(getEntryPath);
    },
    /**
     * Checks if the current module is in the same directory as the entrypoint.
     *
     * This function checks if the import.meta.url of the current module
     * contains the Deno working directory returned by `Deno.cwd()`.
     *
     * It is used to determine if the module is being loaded from the same
     * directory as the entrypoint script, or from an external dependency.
     *
     * @returns `true` if the current module is in the same directory, `false` otherwise.
     *
     * @example
     *
     * ```ts
     * if (filesystem.isThisDirectory()) {
     *   // Module is loaded from same directory
     * } else {
     *   // Module is loaded from external dependency
     * }
     * ```
     */
    isThisDirectory() {
      return import.meta.url.includes(Deno.cwd());
    },
  };
})();

/**
 * An utility module for subcommand related operations.
 */
const subcommand = (() => {
  const REQUIRED_PROPERTIES = ["name", "description", "action"];

  return {
    /**
     * Validates if a value is a valid {@link DenoManageCommand} object.
     *
     * This function checks if the given value is an object, not null,
     * and has all the required properties for a command definition.
     *
     * The required properties are defined in the constant {@link REQUIRED_PROPERTIES}.
     *
     * @param value - The value to validate
     * @returns True if value is a valid command, false otherwise.
     *
     * @example
     * ```ts
     * const cmd = {
     *   name: 'build',
     *   description: 'Build the project',
     *   action: () => {}
     * };
     *
     * if (subcommand.isValid(cmd)) {
     *   // cmd is a valid command
     * }
     * ```
     */
    isValid(value: unknown): value is DenoManageCommand<any, any> {
      if (typeof value !== "object" || value === null) {
        return false;
      }

      return REQUIRED_PROPERTIES.every((key) =>
        Object.prototype.hasOwnProperty.call(value, key)
      );
    },
    /**
     * Converts a {@link DenoManageCommand} to a Cliffy {@link Command}.
     *
     * This function takes a {@link DenoManageCommand} object containing the definition of a subcommand,
     * and returns a Cliffy {@link Command} instance for that subcommand.
     *
     * It copies over the name, description, and action from the {@link DenoManageCommand}.
     *
     * If the {@link DenoManageCommand} has flags, it loops through and registers them with the Cliffy {@link Command}
     * using the .option() method.
     *
     * Finally, it ignores the types and attaches the action function to the Cliffy {@link Command}.
     *
     * @param command - The {@link DenoManageCommand} to convert
     * @returns A Cliffy {@link Command} instance for the subcommand
     *
     * @example
     * ```ts
     * const denoCommand = {
     *   name: 'build',
     *   // ...
     * };
     *
     * const cliffyCommand = subcommand.toCliffy(denoCommand);
     * ```
     */
    toCliffy(command: DenoManageCommand<DenoManageFlags, DenoManageArguments>) {
      const cmd = new Command()
        .name(command.name)
        .description(command.description);

      if (command.flags) {
        for (const k in command.flags) {
          const flag = command.flags[k];

          if (flag.type === "boolean") {
            cmd.option(
              `-${flag.abbreviation}, --${flag.name}`,
              flag.description,
              flag.options,
            );
          } else {
            cmd.option(
              `-${flag.abbreviation}, --${flag.name} <${flag.name}:${flag.type}>`,
              flag.description,
              flag.options,
            );
          }
        }
      }

      if (command.arguments) {
        command.arguments.forEach((arg) => {
          cmd.arguments(`<${arg.name}:${arg.type}>`);
        });
      }

      // @ts-ignore: ¯\_(ツ)_/¯
      cmd.action(command.action);

      return cmd;
    },
  };
})();

/**
 * Main utility functions for `deno-manage`.
 */
const main = (() => {
  return {
    /**
     * The path to the directory containing subcommand scripts.
     *
     * This constant contains the path to the directory where the subcommand
     * script files are located.
     *
     * It first checks the DENO_MANAGE_BIN_DIR environment variable, and falls back
     * to "./bin" if not set.
     */
    MANAGE_BIN_DIR: Deno.env.get("DENO_MANAGE_BIN_DIR"),
    /**
     * Retrieves subcommand modules from a directory.
     *
     * This function takes a directory path and returns an array of subcommand modules.
     *
     * It uses the filesystem utility to get all matching file paths in the directory.
     *
     * It then maps over the paths, calling {@link filesystem.getDefaultImport} on each to import the default export.
     *
     * Finally, it filters the imported modules down to valid subcommands using the {@link subcommand.isValid} utility.
     *
     * The resulting array contains imported subcommand modules that are valid for registration.
     *
     * @param directory - The directory path to search for subcommands
     * @returns Array of imported subcommand modules
     *
     * @example
     *
     * ```ts
     * const subcommands = await getSubcommands('./subcommands');
     * ```
     */
    async getSubcommands(directory: string) {
      const modules = await Promise.all(
        filesystem.getPublicPaths(directory).map(filesystem.getDefaultImport),
      );

      return modules.filter(subcommand.isValid).map(subcommand.toCliffy);
    },
    /**
     * Registers subcommand Command objects with the main Command.
     *
     * This function takes the main Command instance and an array of subcommand
     * Command objects. It loops through the subcommand array and registers each one
     * with the main command using the .command() method.
     *
     * This allows attaching the subcommand Command objects to the main CLI Command
     * so they can be executed.
     *
     * @param command - The main Command instance
     * @param subcommands - Array of subcommand Command objects
     *
     * @example
     *
     * ```ts
     * import { Command } from 'cliffy';
     *
     * const main = new Command();
     * const sub1 = new Command();
     * const sub2 = new Command();
     *
     * const subcommands = [sub1, sub2];
     *
     * registerSubcommands(main, subcommands);
     * ```
     */
    registerSubcommands(
      command: Command<any, any, any>,
      subcommands: Command[],
    ) {
      subcommands.forEach((subcommand) => {
        command.command(subcommand.getName(), subcommand);
      });
    },
  };
})();

export const DenoManage = new Command()
  .name("deno-manage")
  .description("A CLI project manager for Deno.")
  .version("0.1.0")
  .env(
    "DENO_MANAGE_BIN_DIR=<path:string>",
    "The scripts directory of your project",
    { prefix: "DENO_MANAGE_", required: false, global: true },
  )
  .env(
    "DENO_MANAGE_PROJECT_ID=<id:string>",
    "The id of your project in Deno Deploy.",
    { prefix: "DENO_MANAGE_", required: true, global: true },
  )
  .env(
    "DENO_MANAGE_DEPLOY_EXCLUSIONS=<paths:string>",
    "A list of comma separated paths to exclude from a deploy.",
    { prefix: "DENO_MANAGE_", required: true, global: true },
  )
  .env(
    "DENO_DEPLOY_TOKEN=<token:string>",
    "The API token to use in Deno Deploy.",
    { prefix: "DENO_", required: true, global: true },
  )
  .env(
    "DENO_MANAGE_IMPORT_MAP_PATH=<path:file>",
    "The project's import map, if any.",
    { prefix: "DENO_MANAGE_", required: false, global: true },
  )
  .env(
    "GITHUB_OUTPUT=<path:file>",
    "The project's import map, if any.",
    { required: false, global: true },
  )
  .arguments("<name:string> [dirs:string[]]")
  .option("-n, --dry-run", "Dry run the process of a given command.", {
    default: false,
    global: true,
  })
  .action(function () {
    this.showHelp();
  });

const subcommands = await main.getSubcommands(BUILT_IN_BIN_PATH);

if (!filesystem.isThisDirectory()) {
  if (main.MANAGE_BIN_DIR) {
    const additionalSubcommands = await main.getSubcommands(main.MANAGE_BIN_DIR);

    subcommands.push(...additionalSubcommands);
  }
}

main.registerSubcommands(DenoManage, subcommands);

if (import.meta.main) {
  DenoManage.parse(Deno.args);
}

export default DenoManage;
