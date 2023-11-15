import "https://deno.land/std@0.206.0/dotenv/load.ts";

import { Command } from "https://deno.land/x/cliffy@v1.0.0-rc.3/command/command.ts";
import { DenoManageArguments, DenoManageCommand, DenoManageFlags } from "./mod.ts";
import { getRemotePaths } from "./tools/async.ts";
import debug from "./tools/debug.ts";
import { getDefaultImports, getLocalPaths, isThisDirectory } from "./tools/filesystem.ts";

const IS_LOCAL = import.meta.url.startsWith("file:");
const MANAGE_BIN_DIR = Deno.env.get("DENO_MANAGE_BIN_DIR");
const BUILT_IN_BIN_PATH = import.meta.resolve("./bin");
const WALK_SYNC_OPTIONS = {
  exts: [".ts", ".js", ".mjs"],
  skip: [/_/, /\.test/],
  maxDepth: 10,
  includeDirs: false,
};

debug("IS_LOCAL=%j", IS_LOCAL);
debug("MANAGE_BIN_DIR=%s", MANAGE_BIN_DIR);
debug("BUILT_IN_BIN_PATH=%s", BUILT_IN_BIN_PATH);

const subcommands =
  await (IS_LOCAL
    ? getLocalPaths(BUILT_IN_BIN_PATH.replace("file://", ""), WALK_SYNC_OPTIONS)
    : getRemotePaths(
      BUILT_IN_BIN_PATH,
    ))
    .then(getDefaultImports)
    .then(parseRawCommands);

if (!isThisDirectory(import.meta.url) && MANAGE_BIN_DIR) {
  const directory = Deno.cwd() + MANAGE_BIN_DIR.replace("./", "/");
  const additionalSubcommands = await getLocalPaths(
    directory,
    WALK_SYNC_OPTIONS,
  )
    .then(getDefaultImports)
    .then(parseRawCommands);

  subcommands.push(...additionalSubcommands);
}

/**
 * Creates the root DenoManage CLI command.
 *
 * This constructs the main DenoManage command instance using the {@link Command} class from {@link [Cliffy](https://cliffy.io)}.
 *
 * It sets up the command name, description, version, and global options.
 * If no argument is passed, it shows the help screen.
 *
 * Additional subcommands can be registered to this root command using the
 * registerSubcommands() function.
 *
 * @example
 *
 * ```
 * import { DenoManage } from "./deno-manage.ts";
 *
 * DenoManage.parse(Deno.args);
 * ```
 */
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
  .env("GITHUB_OUTPUT=<path:file>", "The project's import map, if any.", {
    required: false,
    global: true,
  })
  .option("-n, --dry-run", "Dry run the process of a given command.", {
    default: false,
    global: true,
  })
  .action(function () {
    this.showHelp();
  });

registerSubcommands(DenoManage, subcommands);

if (import.meta.main) {
  DenoManage.parse(Deno.args);
}

export default DenoManage;

function toCliffy(
  manageCmd: DenoManageCommand<DenoManageFlags, DenoManageArguments>,
) {
  const command = new Command()
    .name(manageCmd.name)
    .description(manageCmd.description);

  if (manageCmd.flags) {
    for (const k in manageCmd.flags) {
      const flag = manageCmd.flags[k];

      if (flag.type === "boolean") {
        command.option(
          `-${flag.abbreviation}, --${flag.name}`,
          flag.description,
          flag.options,
        );
      } else {
        command.option(
          `-${flag.abbreviation}, --${flag.name} <${flag.name}:${flag.type}>`,
          flag.description,
          flag.options,
        );
      }
    }
  }

  if (manageCmd.arguments) {
    manageCmd.arguments.forEach((arg) => {
      command.arguments(`<${arg.name}:${arg.type}>`);
    });
  }

  // @ts-ignore: ¯\_(ツ)_/¯
  command.action(manageCmd.action);

  return command;
}

function parseRawCommands(
  manageCommands: DenoManageCommand<DenoManageFlags, DenoManageArguments>[],
) {
  return manageCommands.map(toCliffy);
}

function registerSubcommands(
  // deno-lint-ignore no-explicit-any
  command: Command<any, any, any>,
  subcommands: Command[],
) {
  subcommands.forEach((subcommand) => {
    command.command(subcommand.getName(), subcommand);
  });
}
