// deno-lint-ignore-file no-explicit-any
import { Command } from "../deps.ts";
import { DenoManageCommand, Flags } from "../mod.ts";

const REQUIRED_COMMAND_KEYS = ["name", "description", "action"];

export function isValidCommand(
  value: unknown,
): value is DenoManageCommand<any> {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  return REQUIRED_COMMAND_KEYS.every((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

export function toCliffyCommand(command: DenoManageCommand<Flags>) {
  const cmd = new Command().name(command.name).description(command.description);

  if (command.flags) {
    for (const k in command.flags) {
      const flag = command.flags[k];

      cmd.option(`-${flag.abbreviation}, --${flag.name}`, flag.description, flag.options);
    }
  }

  // @ts-ignore: ¯\_(ツ)_/¯
  cmd.action(command.action);

  return cmd;
}
