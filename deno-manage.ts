// deno-lint-ignore-file no-explicit-any
import "https://deno.land/std@0.206.0/dotenv/load.ts";

import {
  type WalkEntry,
  type WalkOptions,
  walkSync,
} from "https://deno.land/std@0.206.0/fs/walk.ts";
import { relative } from "https://deno.land/std@0.206.0/path/relative.ts";
import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/mod.ts";
import { DenoManageCommand, Flags } from "./mod.ts";

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
    async getDefaultImport(path: string) {
      const here = import.meta.url.replace("file://", "").replace("/deno-manage.ts", "");
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
      const entries = walkSync(directory, WALK_SYNC_OPTIONS);

      return Array.from(entries).map(getEntryPath);
    },
  };
})();

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
    isValid(value: unknown): value is DenoManageCommand<any> {
      if (typeof value !== "object" || value === null) {
        return false;
      }

      return REQUIRED_PROPERTIES.every((key) =>
        Object.prototype.hasOwnProperty.call(value, key)
      );
    },

    toCliffy(command: DenoManageCommand<Flags>) {
      const cmd = new Command().name(command.name).description(command.description);

      if (command.flags) {
        for (const k in command.flags) {
          const flag = command.flags[k];

          cmd.option(
            `-${flag.abbreviation}, --${flag.name} <${flag.name}:${flag.type}>`,
            flag.description,
            flag.options,
          );
        }
      }

      // @ts-ignore: ¯\_(ツ)_/¯
      cmd.action(command.action);

      return cmd;
    },
  };
})();

const main = (() => {
  return {
    MANAGE_BIN_DIR: Deno.env.get("DENO_MANAGE_BIN_DIR") || "./bin",
    registerSubcommands(command: Command<any, any, any>, subcommands: Command[]) {
      subcommands.forEach((subcommand) => {
        command.command(subcommand.getName(), subcommand);
      });
    },
  };
})();

export const DenoManage = new Command()
  .name("deno-manage")
  .env(
    "DENO_MANAGE_BIN_DIR=<path:string>",
    "The scripts directory of your project",
    { prefix: "DENO_", required: true },
  )
  .action(function () {
    this.showHelp();
  });

const modules = await Promise.all(
  filesystem.getPublicPaths(main.MANAGE_BIN_DIR).map(filesystem.getDefaultImport),
);

const subcommands = modules.filter(subcommand.isValid).map(subcommand.toCliffy);

main.registerSubcommands(DenoManage, subcommands);

if (import.meta.main) {
  DenoManage.parse(Deno.args);
}

export default DenoManage;
