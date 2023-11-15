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
 * const tmpl = new Template("Hello {name}!");
 *
 * const str = tmpl.compile({name: "John"});
 * // "Hello John!"
 * ```
 */
export class Template<T extends string> {
  constructor(readonly value: T) {
  }

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
   * const tmpl = new Template("Hello {name}!");
   *
   * const result = tmpl.compile({name: "John"});
   * // "Hello John!"
   * ```
   */
  public compile(replacements: Expand<ExtractFromBracket<T>>) {
    let endValue = this.value;

    for (const key in replacements) {
      const template = `{${key}}`;

      // @ts-ignore: ¯\_(ツ)_/¯
      endValue = endValue.replaceAll(template, replacements[key]);
    }

    return endValue;
  }
}

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

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
