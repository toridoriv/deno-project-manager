import { ansicolors } from "@deps";

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

export function getTextData(path: string, delimiter = "---------") {
  const content = Deno.readTextFileSync(`./_tests_/data${path}`);
  const lines = content.split("\n");
  const isDelimiter = (value: string) => value === delimiter;
  const start = lines.findIndex(isDelimiter) + 1;
  const end = lines.findLastIndex(isDelimiter);

  return lines.slice(start, end).join("\n");
}
