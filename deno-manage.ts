import { relative } from "https://deno.land/std@0.206.0/path/relative.ts";
import { Command } from "./deps.ts";
import { isValidCommand, toCliffyCommand } from "./src/command.ts";
import { getPublicFilePaths } from "./src/filesystem.ts";

const MANAGE_BIN_DIR = Deno.env.get("DENO_MANAGE_BIN_DIR") || "./";

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

await registerSubcommands();

if (import.meta.main) {
  DenoManage.parse(Deno.args);
}

export default DenoManage;

async function registerSubcommands() {
  const modules = await Promise.all(
    getPublicFilePaths(MANAGE_BIN_DIR).map(getDefaultImport),
  );
  const subcommands = modules.filter(isValidCommand).map(toCliffyCommand);

  subcommands.forEach((subcommand) => {
    DenoManage.command(subcommand.getName(), subcommand);
  });
}

async function getDefaultImport(path: string) {
  const here = import.meta.url
    .replace("file://", "")
    .replace("/deno-manage.ts", "");
  const there = Deno.cwd();
  const rel = relative(here, there);
  const module = await import(`${rel}/${path}`);

  return module.default;
}
