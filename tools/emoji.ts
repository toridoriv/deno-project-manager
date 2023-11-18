import githubEmojis from "https://gist.githubusercontent.com/toridoriv/13b0fc654205d46bdbe62d0904993267/raw/91ebfee0098f615f0cca921a050db64c884175aa/github-emojis.json" assert {
  type: "json",
};
import emojiRegex from "npm:emoji-regex";
import { Emoji, get as getEmoji } from "npm:github-emojis";

/**
 * Regular expression to match emoji code strings like :unicorn:.
 *
 * This matches emoji names contained within colons, like :unicorn: or :thumbs_up:.
 * It can be used to test if a string contains an emoji code.
 *
 * @example
 *
 * ```ts
 * import { EMOJI_CODE_REGEX } from "./emoji.ts";
 *
 * const str = ":unicorn:";
 *
 * console.assert(EMOJI_CODE_REGEX.test(str));
 * console.assert(EMOJI_CODE_REGEX.test("🦄") === false);
 *
 * ```
 */
export const EMOJI_CODE_REGEX = /^:\w+:$/;

/**
 * Global regular expression to match emoji codes.
 *
 * This matches emoji names contained within colons. It is the global
 * version of {@link EMOJI_CODE_REGEX}, meaning it will match all occurrences
 * in a string rather than just the isolated emoji code.
 *
 * Useful for replacing or extracting all emoji codes from a string.
 *
 * @example
 *
 * ```ts
 * import { EMOJI_CODE_REGEX_GLOBAL } from "./emoji.ts";
 *
 * const str = "Hello :unicorn: :sparkles:";
 *
 * // Get all emoji codes
 * const codes = str.match(EMOJI_CODE_REGEX_GLOBAL);
 * console.assert(JSON.stringify(codes) === '[":unicorn:",":sparkles:"]');
 *
 * // Replace all emoji codes
 * const replaced = str.replace(EMOJI_CODE_REGEX_GLOBAL, "-");
 * console.assert(replaced === "Hello - -");
 * ```
 */
export const EMOJI_CODE_REGEX_GLOBAL = /:\w+:/g;

/**
 * Global regular expression to match emoji characters.
 *
 * This matches any emoji characters like 🦄 or ✨ in a string.
 * It is the global version of {@link EMOJI_CHAR_REGEX}, meaning it will match
 * all occurrences rather than just rather than just the isolated emoji.
 *
 * Useful for replacing or extracting all emoji characters from a string.
 *
 * @example
 *
 * ```ts
 * import { EMOJI_CHAR_REGEX_GLOBAL } from "./emoji.ts";
 *
 * const str = "Hello 🦄 ✨";
 *
 * // Get all emoji characters
 * const chars = str.match(EMOJI_CHAR_REGEX_GLOBAL);
 * console.assert(JSON.stringify(chars) === '["🦄","✨"]');
 *
 * // Replace all emoji characters
 * const replaced = str.replace(EMOJI_CHAR_REGEX_GLOBAL, "-");
 * console.assert(replaced === "Hello - -");
 * ```
 */
export const EMOJI_CHAR_REGEX_GLOBAL = emojiRegex();

/**
 * Checks if a string contains an emoji code.
 *
 * An emoji code is a string contained within colons, like :unicorn: or :thumbs_up:.
 *
 * @param text - The text to check for emoji codes
 * @returns `true` if the text contains an emoji code, `false` otherwise
 *
 * @example
 *
 * ```ts
 * import { isEmojiCode } from "./emoji.ts";
 *
 * const text = ":unicorn:";
 *
 * console.assert(isEmojiCode(text));
 *
 * ```
 */
export function isEmojiCode(text: string) {
  return EMOJI_CODE_REGEX.test(text);
}

/**
 * Checks if a string is an emoji character.
 *
 * An emoji character is an actual emoji like 😀 or 👍.
 *
 * @param text - The text to check for emoji characters
 * @returns `true` if the text is an emoji, `false` otherwise
 *
 * @example
 *
 * ```ts
 * import { isEmojiChar } from "./emoji.ts";
 *
 * const text = "🦄";
 *
 * console.assert(isEmojiChar(text));
 *
 * ```
 */
export function isEmojiChar(text: string) {
  const unicode = getEmojiUnicode(text);

  if (unicode === text) {
    return false;
  }

  const metadata = getEmojiMetadata(text);

  if (metadata === null) {
    return false;
  }

  return true;
}

/**
 * Converts emoji characters in a string to emoji codes.
 *
 * This takes a string and replaces any emoji characters like 🦄 with their equivalent emoji code :unicorn:.
 *
 * @param text - The text containing emoji characters
 * @returns The text with emoji characters converted to codes
 *
 * @example
 *
 * ```ts
 * import { emojiCharToCode } from "./emoji.ts";
 *
 * const text = "I Have 😶, and I Must 😱";
 * const convertedText = emojiCharToCode(text);
 *
 * console.assert(convertedText === "I Have :no_mouth:, and I Must :scream:");
 *
 * const textWithoutEmojis = "I Have No Mouth, and I Must Scream";
 * const convertedTextWithoutEmojis = emojiCharToCode(text);
 *
 * console.assert(convertedTextWithoutEmojis === textWithoutEmojis);
 *
 * ```
 */
export function emojiCharToCode(text: string) {
  let convertedText = text;
  const emojis = text.match(EMOJI_CHAR_REGEX_GLOBAL) || ([] as string[]);

  for (let i = 0; i < emojis.length; i++) {
    const emoji = emojis[i];
    const metadata = getEmojiMetadata(emoji);

    if (metadata) {
      convertedText = convertedText.replaceAll(emoji, metadata.code);
    }
  }

  return convertedText;
}

/**
 * Converts emoji codes in a string to emoji characters.
 *
 * This takes a string and replaces any emoji codes like :unicorn:
 * with their emoji character counterpart 🦄.
 *
 * @param text - The text containing emoji codes
 * @returns The text with emoji codes converted to characters
 *
 * @example
 *
 * ```ts
 * import { emojiCodeToChar } from "./emoji.ts";
 *
 * const text = "I Have :no_mouth:, and I Must :scream:";
 * const convertedText = emojiCodeToChar(text);
 *
 * console.assert(convertedText === "I Have 😶, and I Must 😱");
 *
 * const textWithoutEmojis = "I Have No Mouth, and I Must Scream";
 * const convertedTextWithoutEmojis = emojiCodeToChar(text);
 *
 * console.assert(convertedTextWithoutEmojis === textWithoutEmojis);
 *
 * ```
 */
export function emojiCodeToChar(text: string) {
  let convertedText = text;
  const codes = text.match(EMOJI_CODE_REGEX_GLOBAL) || ([] as string[]);

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    const name = code.substring(1, code.length - 1) as Emoji;

    convertedText = convertedText.replaceAll(code, getEmoji(name) as string);
  }

  return convertedText;
}

function getEmojiUnicode(emoji: string) {
  if (emoji.split(" ").length > 1) {
    return emoji;
  }

  const codePoints: number[] = [];

  for (let i = 0; i < emoji.length; i++) {
    const currentCode = emoji.codePointAt(i);

    // Check if the current character is part of a surrogate pair
    if (currentCode && currentCode >= 0xd800 && currentCode <= 0xdfff) {
      const nextCode = emoji.codePointAt(i + 1);

      // Check if the next character is a low surrogate
      if (nextCode && nextCode >= 0xdc00 && nextCode <= 0xdfff) {
        // Combine high and low surrogates to get the Unicode code point
        codePoints.push(
          (currentCode - 0xd800) * 0x400 + (nextCode - 0xdc00) + 0x10000,
        );
        i++; // Skip the next character since it's part of the surrogate pair
      }
    } else {
      // Single character or non-surrogate character
      codePoints.push(currentCode || 0);
    }
  }

  return codePoints.map((code) => code.toString(16)).join("-");
}

function getEmojiMetadata(emoji: string) {
  const unicode = getEmojiUnicode(emoji);
  let metadata = githubEmojis.find(findEmojiMetadata.bind(null, unicode));

  if (!metadata) {
    const [baseUnicode] = unicode.split("-");
    metadata = githubEmojis.find(findEmojiMetadata.bind(null, baseUnicode));
  }

  return metadata || null;
}

function findEmojiMetadata(
  unicode: string,
  value: (typeof githubEmojis)[number],
) {
  return value.unicode === unicode;
}
