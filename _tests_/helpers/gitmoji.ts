import { faker } from "@deps";
import { GITMOJI_MAPPING, GITMOJIS } from "@tools/git.data.ts";
import { CommitLabel } from "@tools/git.ts";

export const EMOJI_CODES = GITMOJIS.map((g) => g.code);
export const EMOJI_NAMES = GITMOJIS.map((g) => g.name);
export const EMOJI_CHARACTERS = GITMOJIS.map((g) => g.emoji);

export function getRandomGitmoji(kind?: CommitLabel) {
  if (!kind) {
    return faker.helpers.arrayElement(EMOJI_CODES);
  }

  const group = GITMOJI_MAPPING[kind];
  const name = faker.helpers.arrayElement(group.emojis);

  return `:${name}:`;
}

export function getRandomGitmojiCommitSubject(kind?: CommitLabel) {
  const text = faker.git.commitMessage();
  const scope = getScope();
  const gitmoji = getRandomGitmoji(kind);

  return `${gitmoji} ${scope}${text}`;
}

function getScope() {
  const empty = faker.datatype.boolean();

  if (empty) {
    return "";
  }

  return `(${faker.word.noun()}) `;
}
