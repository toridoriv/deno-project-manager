import {
  DescribeDefinition,
  TestSuite,
} from "https://deno.land/std@0.206.0/testing/bdd.ts";
import ansicolors from "npm:ansi-colors";
import { describe } from "./dev-deps.ts";

const MESSAGE_COLORS = [ansicolors.cyan, ansicolors.yellow, ansicolors.blue];
let messageColorIndex = 0;

export const TestTheme = {
  correct: ansicolors.green,
  wrong: ansicolors.red,
  errorMessage: ansicolors.red.bold,
  code: ansicolors.bold.yellow,
};

export const Keyword = {
  true: TestTheme.correct("true"),
  false: TestTheme.wrong("false"),
};

export function colorMessage(msg: string) {
  const fn = MESSAGE_COLORS[messageColorIndex];

  if (messageColorIndex >= MESSAGE_COLORS.length - 1) {
    messageColorIndex = 0;
  } else {
    messageColorIndex = messageColorIndex + 1;
  }

  return fn.bold(msg);
}

export function test<T>(name: string, ...args: TestArgs<T>) {
  // @ts-ignore: ¯\_(ツ)_/¯
  return describe(colorMessage(name), ...args);
}

type TestArgs<T> =
  | [options: Omit<DescribeDefinition<T>, "name">]
  | [fn: () => void]
  | [fn: () => void, options: Omit<DescribeDefinition<T>, "fn" | "name">]
  | [suite: TestSuite<T>]
  | [
    suite: TestSuite<T>,
    options: Omit<DescribeDefinition<T>, "name" | "suite">,
  ]
  | [suite: TestSuite<T>, fn: () => void]
  | [
    suite: TestSuite<T>,
    options: Omit<DescribeDefinition<T>, "fn" | "name" | "suite">,
    fn: () => void,
  ]
  | [
    suite: TestSuite<T>,
    options: Omit<DescribeDefinition<T>, "fn" | "name" | "suite">,
    fn: () => void,
  ];
