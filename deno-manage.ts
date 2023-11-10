import { relative } from "https://deno.land/std@0.206.0/path/relative.ts";
import { Command } from "./deps.ts";
import { isValidCommand, toCliffyCommand } from "./src/command.ts";
import { getPublicFilePaths } from "./src/filesystem.ts";

export const DenoManage = new Command()
  .name("deno-manage")
  .env(
    "DENO_MANAGE_BIN_DIR=<path:string>",
    "The scripts directory of your project",
    { prefix: "DENO_", required: true },
  )
  .option("", "", {})
  .action(async function (options) {
    const modules = await Promise.all(
      getPublicFilePaths(options.manageBinDir).map(getDefaultImport),
    );
    const subcommands = modules.filter(isValidCommand).map(toCliffyCommand);

    subcommands.forEach((subcommand) => {
      this.command(subcommand.getName(), subcommand);
    });

    this.showHelp();
  });

if (import.meta.main) {
  DenoManage.parse(Deno.args);
}

export default DenoManage;

export async function getDefaultImport(path: string) {
  const here = import.meta.url.replace("file://", "").replace("/deno-manage.ts", "");
  const there = Deno.cwd();
  const rel = relative(here, there);
  const module = await import(`${rel}/${path}`);

  return module.default;
}
