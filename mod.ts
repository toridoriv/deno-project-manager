// deno-lint-ignore-file no-explicit-any ban-types

export interface DenoManageCommand<F> {
  name: string;
  description: string;
  action: Action<F>;
  flags?: F extends Flags ? F : never;
}

export interface DenoManageFlag {
  name: string;
  abbreviation: string;
  type: KeyOf<TypeMap>;
  description: string;
  options?: FlagOptions;
}

export type Flags = Record<string, DenoManageFlag>;

export function defineCommand<F extends Flags>(command: DenoManageCommand<F>) {
  return command;
}

type Action<F> = F extends Flags
  ? (options: Expand<InferOptionsFromFlag<F>>) => void | Promise<void>
  : () => void | Promise<void>;

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

type FlagOptions = {
  hidden?: boolean;
  default?: unknown;
  required?: boolean;
  standalone?: boolean;
  depends?: string[];
  collect?: boolean;
};

type InferOptionsFromFlag<F extends Flags> = {
  [K in keyof F]: TypeMap[F[K]["type"]];
};

type KeyOf<T> = T extends Record<infer K, any> ? K & {} : never;

type TypeMap = {
  string: string;
  number: number;
  boolean: boolean;
};
