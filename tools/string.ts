export class Template<T extends string> {
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
