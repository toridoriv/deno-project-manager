// deno-lint-ignore-file no-var
import { Expand, NonFalsy } from "./types.ts";

declare global {
  interface Array<T> {
    /**
     * Removes falsy values from an array.
     *
     * This method filters out null, undefined, false, empty strings, and 0 values from the array,
     * returning a new array containing only the non-falsy values.
     *
     * It uses Array.filter() and Boolean() to remove falsy values.
     *
     * @param array - The array to filter falsy values from
     * @returns A new array containing only non-falsy values
     *
     * @example
     *
     * ```ts
     * const arr = [0, 1, false, 2, '', 3];
     *
     * const filtered = arr.compact();
     * // [1, 2, 3]
     * ```
     */
    compact(): NonFalsy<T>[];
    /**
     * Trims whitespace from the beginning and end of all strings in an array.
     *
     * This method loops through the array, checks if the item is a string,
     * trims whitespace if so, and returns a new array with the trimmed strings.
     *
     * @param array - The array to trim strings in
     * @returns A new array with all strings trimmed
     *
     * @example
     *
     * ```ts
     * const arr = ['hello ', ' world', 'foo'];
     *
     * const trimmed = arr.trim();
     * // ['hello', 'world', 'foo']
     * ```
     */
    trim(): T[];
  }

  /**
   * Template class for compiling template strings with replacements.
   *
   * This class takes a template string in the constructor, with placeholders
   * enclosed in curly braces like `{name}`.
   *
   * The compile() method takes an object of replacements, and compiles
   * the template by replacing placeholders with the replacement values.
   *
   * @example
   *
   * ```ts
   * const template = new Template("Hello {name}!");
   *
   * const str = template.compile({name: "John"});
   * // "Hello John!"
   * ```
   */
  interface Template<T extends string> extends String {
    readonly value: T;
    /**
     * Compiles the template by replacing placeholders with values.
     *
     * This method takes a `replacements` object containing keys and values to substitute
     * into the template string.
     *
     * It loops through the `replacements`, and uses string replacement to replace the
     * placeholder `{key}` in the template with the corresponding value.
     *
     * @param replacements - Object containing placeholder keys and substitute values
     * @returns The compiled template string with placeholders replaced
     *
     * @example
     *
     * ```ts
     * const template = new Template("Hello {name}!");
     *
     * const result = template.compile({name: "John"});
     * // "Hello John!"
     * ```
     */
    compile(replacements: Expand<ExtractFromBracket<T>>): string;
  }

  interface TemplateConstructor {
    new <T extends string>(value?: T): Template<T>;
    readonly prototype: Template<string>;
  }

  /**
   * Allows manipulation and formatting of text strings and determination and location of substrings within strings.
   */
  var Template: TemplateConstructor;
}

Array.prototype.compact = function compact() {
  return this.filter(Boolean);
};

Array.prototype.trim = function trim() {
  const newArray = [];

  for (let i = 0; i < this.length; i++) {
    let item = this[i];

    if (typeof item === "string") {
      item = item.trim();
    }

    newArray.push(item);
  }

  return newArray;
};

// @ts-ignore: ¯\_(ツ)_/¯
globalThis.Template = class Template<T extends string> {
  constructor(readonly value: T) {
  }

  public compile(replacements: Expand<ExtractFromBracket<T>>) {
    let endValue = this.value;

    for (const key in replacements) {
      const template = `{${key}}`;

      // @ts-ignore: ¯\_(ツ)_/¯
      endValue = endValue.replaceAll(template, replacements[key]);
    }

    return endValue;
  }
};

type ExtractFromBracket<T extends string> = {
  [K in GetTemplates<T>[number]]: string | number | boolean;
};

type GetTemplates<T extends string, Cache extends string[] = []> = T extends
  LongTemplateString
  ? T extends `${string}{${infer S}}${infer Rest}` ? GetTemplates<Rest, [...Cache, S]>
  : Cache
  : Cache;

type TemplateString = `{${string}}`;

type LongTemplateString = `${string}${TemplateString}${string}`;
