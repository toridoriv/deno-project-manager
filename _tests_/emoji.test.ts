import * as emoji from "@tools/emoji.ts";
import { GITMOJIS } from "@tools/git.data.ts";
import { expect, it } from "./dev-deps.ts";
import { test, TestTheme } from "./utilities.ts";

const EMOJI_CODES = GITMOJIS.map((g) => g.code);
const EMOJI_NAMES = GITMOJIS.map((g) => g.name);
const EMOJI_CHARACTERS = GITMOJIS.map((g) => g.emoji);
const PHRASES = {
  eminem: {
    normal: "There's vomit on his sweater already, mom's spaghetti",
    withEmojis: "There's vomit on his sweater already, mom's 🍝",
    withEmojiCodes: "There's vomit on his sweater already, mom's :spaghetti:",
  },
  harlanEllison: {
    normal: "I Have No Mouth, and I Must Scream",
    withEmojis: "I Have 😶, and I Must 😱",
    withEmojiCodes: "I Have :no_mouth:, and I Must :scream:",
  },
  justinBieber: {
    normal: "Baby, baby, baby, oh",
    withEmojis: "👶, 👶, 👶, oh",
    withEmojiCodes: ":baby:, :baby:, :baby:, oh",
  },
  wiseMonkeys: {
    normal: "See No Evil, Hear No Evil, Speak No Evil",
    withEmojis: "🙈, 🙉, 🙊",
    withEmojiCodes: ":see_no_evil:, :hear_no_evil:, :speak_no_evil:",
  },
};

test("The function isEmojiCode", () => {
  it("should return true when receives an emoji code", () => {
    EMOJI_CODES.forEach((code) => {
      const result = emoji.isEmojiCode(code);

      expect(result, TestTheme.code(`isEmojiCode("${code}")`)).to.be.true;
    });
  });

  it("should return false otherwise", () => {
    EMOJI_NAMES.forEach((value) => {
      const result = emoji.isEmojiCode(value);

      expect(result, TestTheme.code(`isEmojiCode("${value}")`)).to.be.false;
    });
  });
});

test("The function isEmojiChar", () => {
  it("should return true if receives an emoji character", () => {
    EMOJI_CHARACTERS.forEach((char) => {
      const result = emoji.isEmojiChar(char);

      expect(result, TestTheme.code(`isEmojiChar("${char}")`)).to.be.true;
    });
  });

  it("should return false otherwise", () => {
    EMOJI_NAMES.forEach((value) => {
      const result = emoji.isEmojiChar(value);

      expect(result, TestTheme.code(`isEmojiChar("${value}")`)).to.be.false;
    });
  });

  it("should return false if a string is not an emoji, even if it contains one", () => {
    [
      PHRASES.eminem.withEmojis,
      PHRASES.harlanEllison.withEmojis,
      PHRASES.justinBieber.withEmojis,
      PHRASES.wiseMonkeys.withEmojis,
    ].forEach((value) => {
      const result = emoji.isEmojiChar(value);

      expect(result, TestTheme.code(`isEmojiChar("${value}")`)).to.be.false;
    });
  });
});

test("The function emojiCharToCode", () => {
  it("should convert the emojis in a string to their respective codes", () => {
    const cases: [string, string][] = [
      [PHRASES.eminem.withEmojis, PHRASES.eminem.withEmojiCodes],
      [PHRASES.harlanEllison.withEmojis, PHRASES.harlanEllison.withEmojiCodes],
      [PHRASES.justinBieber.withEmojis, PHRASES.justinBieber.withEmojiCodes],
      [PHRASES.wiseMonkeys.withEmojis, PHRASES.wiseMonkeys.withEmojiCodes],
    ];

    cases.forEach(([value, expectation]) => {
      expect(emoji.emojiCharToCode(value)).to.equal(expectation);
    });
  });

  it("should return the string just as is, if no emoji is found", () => {
    const cases: [string, string][] = [
      [PHRASES.eminem.normal, PHRASES.eminem.normal],
      [PHRASES.harlanEllison.normal, PHRASES.harlanEllison.normal],
      [PHRASES.justinBieber.normal, PHRASES.justinBieber.normal],
      [PHRASES.wiseMonkeys.normal, PHRASES.wiseMonkeys.normal],
    ];

    cases.forEach(([value, expectation]) => {
      expect(emoji.emojiCharToCode(value)).to.equal(expectation);
    });
  });
});

test("The function emojiCodeToChar", () => {
  it("should convert the emoji codes in a string to their respective emojis", () => {
    const cases: [string, string][] = [
      [PHRASES.eminem.withEmojiCodes, PHRASES.eminem.withEmojis],
      [PHRASES.harlanEllison.withEmojiCodes, PHRASES.harlanEllison.withEmojis],
      [PHRASES.justinBieber.withEmojiCodes, PHRASES.justinBieber.withEmojis],
      [PHRASES.wiseMonkeys.withEmojiCodes, PHRASES.wiseMonkeys.withEmojis],
    ];

    cases.forEach(([value, expectation]) => {
      expect(emoji.emojiCodeToChar(value)).to.equal(expectation);
    });
  });

  it("should return the string just as is, if no emoji code is found", () => {
    const cases: [string, string][] = [
      [PHRASES.eminem.normal, PHRASES.eminem.normal],
      [PHRASES.harlanEllison.normal, PHRASES.harlanEllison.normal],
      [PHRASES.justinBieber.normal, PHRASES.justinBieber.normal],
      [PHRASES.wiseMonkeys.normal, PHRASES.wiseMonkeys.normal],
    ];

    cases.forEach(([value, expectation]) => {
      expect(emoji.emojiCodeToChar(value)).to.equal(expectation);
    });
  });
});
