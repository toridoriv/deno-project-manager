import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export const DeploymentSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  description: z.string().nullable(),
  status: z.string(),
  domains: z.array(z.string()).min(0).default([]),
  databases: z.object({ default: z.string().optional() }).passthrough().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}).transform(transformDeployment);

export const DeploymentsSchema = z.array(DeploymentSchema);

export function createFileAsset(path: string): FileAssetWithContent {
  return {
    kind: "file",
    content: Deno.readTextFileSync(path),
    encoding: "utf-8",
  };
}

export type Deployment = z.TypeOf<typeof DeploymentSchema>;

export interface CreateDeploymentOptions {
  /**
   * An URL of the entry point of the application. This is the file that will be executed when the deployment is invoked.
   */
  entryPointUrl: string;
  /**
   * An URL of the import map file.
   *
   * If `null` is given, import map auto-discovery logic will be performed, where it looks
   * for Deno's config file (i.e. `deno.json` or `deno.jsonc`) which may contain an embedded
   * import map or a path to an import map file. If found, that import map will be used.
   *
   * If an empty string is given, no import map will be used.
   */
  importMapUrl?: string;
  /**
   * An URL of the lock file.
   *
   * If `null` is given, lock file auto-discovery logic will be performed, where it looks for
   * Deno's config file (i.e. `deno.json` or `deno.jsonc`) which may contain a path to a lock
   * file or boolean value, such as `"lock": false` or `"lock": "my-lock.lock"`. If a config
   * file is found, the semantics of the `lock` field is the same as the Deno CLI, so refer to
   * [a CLI doc page](https://docs.deno.com/runtime/manual/basics/modules/integrity_checking#auto-generated-lockfile).
   *
   * If an empty string is given, no lock file will be used.
   */
  lockFileUrl?: string;
  /**
   * Compiler options to be used when building the deployment.
   *
   * If `null` is given, Deno's config file (i.e. `deno.json` or `deno.jsonc`) will be
   * auto-discovered, which may contain a `compilerOptions` field. If found, that compiler
   * options will be applied.
   *
   * If an empty object `{}` is given,
   * [the default compiler options](https://docs.deno.com/runtime/manual/advanced/typescript/configuration#how-deno-uses-a-configuration-file)
   * will be applied.
   */
  compilerOptions?: {
    jsx?: string;
    jsxFactory?: string;
    jsxFragmentFactory?: string;
    jsxImportSource?: string;
  };
  /**
   * A map whose key represents a file path, and the value is an asset that composes the
   * deployment.
   *
   * Each asset is one of the following three kinds:
   *
   * 1. A file with content data (which is UTF-8 for text, or base64 for binary)
   * 2. A file with a hash
   * 3. A symbolic link to another asset
   *
   * Assets that were uploaded in some of the previous deployments don't need to be uploaded
   * again. In this case, in order to identify the asset, just provide the SHA-1 hash of the
   * content.
   */
  assets: Record<string, FileAssetWithContent | FileAssetWithHash | SymlinkAsset>;
  /**
   * Environment variables to be injected into the deployment.
   *
   * The key is the name of the environment variable, and the value is the value of the
   * environment variable.
   */
  envVars: Record<string, string>;
}

/**
 * A symbolic link to another asset.
 */
export type SymlinkAsset = {
  kind: "symlink";
  target: string;
};

/**
 * A file with content data (which is `UTF-8` for text, or `base64` for binary).
 */
export type FileAssetWithContent = {
  kind: "file";
  content: string;
  encoding: "utf-8" | "base64";
};

/**
 * A file with a hash.
 */
export type FileAssetWithHash = {
  kind: "file";
  gitSha1: string;
};

type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;

function transformDeployment<T extends { domains: string[] }>(value: T) {
  const parsed = value as unknown as Expand<T & { isProduction: boolean }>;

  parsed.isProduction = value.domains.length > 1;

  return parsed;
}
