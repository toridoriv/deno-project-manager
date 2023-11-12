import { walkSync } from "https://deno.land/std@0.206.0/fs/walk.ts";
import { join } from "https://deno.land/std@0.206.0/path/join.ts";
import { defineCommand } from "../mod.ts";

const DEFAULT_WALK_SYNC_OPTIONS = {
  includeDirs: false,
  includeSymlinks: false,
  maxDepth: Infinity,
};

const DEFAULT_EXCLUSIONS = "^.git, ^.vscode, .env*";
const DEFAULT_SKIP_FILES = [/.git/, /.vscode/, /.env*/];

export default defineCommand({
  name: "deploy",
  description: "Deploy to Deno Deploy.",
  flags: {
    production: {
      name: "production",
      abbreviation: "p",
      type: "boolean",
      description: "Deploy to production.",
      options: {
        default: false,
      },
    },
  },
  arguments: [{ name: "entry", type: "file" }],
  async action(opts, entry) {
    const rawExclusions = `${DEFAULT_EXCLUSIONS + ", " + opts.deployExclusions}`.split(
      ",",
    ).map(trim);
    const exclusionRegex = new RegExp(rawExclusions.join("|"));
    const files = new Map<string, string>();
    const exclusions = rawExclusions.map(toRegex);
    const filesContent = getFilesToDeploy(exclusions);
    const manifest = { entries: await createManifest("./", exclusionRegex, files) };

    const request: PushDeploymentRequest = {
      url: `file:///src/${entry}`,
      importMapUrl: `file:///src/import-map.json`,
      production: opts.production,
      manifest,
    };
    const form = new FormData();

    form.append("request", JSON.stringify(request));

    for (const bytes of filesContent) {
      form.append("file", new Blob([bytes]));
    }

    spy(request);

    const response = await fetch(
      `https://dash.deno.com/api/projects/${opts.projectId}/deployment_with_assets`,
      {
        method: "POST",
        body: form,
        headers: {
          authorization: `Bearer ${opts.deployToken}`,
        },
      },
    );

    if (response.status >= 400) {
      spy({ body: await response.text(), status: response.status });
      Deno.exit(1);
    } else {
      spy({ body: await response.text(), status: response.status });
      Deno.exit(0);
    }
  },
});

function toRegex(value: string) {
  return new RegExp(value);
}

function trim(value: string) {
  return value.trim();
}

function getFilesToDeploy(exclusions: RegExp[]) {
  const opts = {
    ...DEFAULT_WALK_SYNC_OPTIONS,
    skip: exclusions,
  };

  const paths = Array.from(walkSync("./", opts), (entry) => entry.path);

  return paths.map(Deno.readFileSync);
}

function spy(value: unknown) {
  return console.log(
    Deno.inspect(value, {
      colors: true,
      strAbbreviateSize: 9_000,
      breakLength: 90,
      iterableLimit: 10,
    }),
  );
}

async function calculateGitSha1(bytes: Uint8Array) {
  const prefix = `blob ${bytes.byteLength}\0`;
  const prefixBytes = new TextEncoder().encode(prefix);
  const fullBytes = new Uint8Array(prefixBytes.byteLength + bytes.byteLength);
  fullBytes.set(prefixBytes);
  fullBytes.set(bytes, prefixBytes.byteLength);
  const hashBytes = await crypto.subtle.digest("SHA-1", fullBytes);
  const hashHex = Array.from(new Uint8Array(hashBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

async function createManifest(
  dir: string,
  exclusionPattern: RegExp,
  mapping: Map<string, string>,
) {
  const manifest: Record<string, ManifestEntry> = {};

  for await (const dirEntry of Deno.readDir(dir)) {
    const path = join(dir, dirEntry.name);
    const shouldExclude = exclusionPattern.test(path);

    if (!shouldExclude) {
      let manifestEntry: ManifestEntry;

      if (dirEntry.isFile) {
        const data = await Deno.readFile(path);
        const gitSha1 = await calculateGitSha1(data);
        manifestEntry = {
          kind: "file",
          gitSha1,
          size: data.byteLength,
        };
        mapping.set(gitSha1, path);
      } else if (dirEntry.isDirectory) {
        if (dirEntry.name.includes(".git")) continue;
        manifestEntry = {
          kind: "directory",
          entries: await createManifest(path, exclusionPattern, mapping),
        };
      }
      // @ts-ignore: ¯\_(ツ)_/¯
      manifest[dirEntry.name] = manifestEntry;
    }
  }

  return manifest;
}

export interface PushDeploymentRequest {
  url: string;
  importMapUrl: string | null;
  production: boolean;
  manifest?: { entries: Record<string, ManifestEntry> };
}

export interface ManifestEntryFile {
  kind: "file";
  gitSha1: string;
  size: number;
}

export interface ManifestEntryDirectory {
  kind: "directory";
  entries: Record<string, ManifestEntry>;
}

export interface ManifestEntrySymlink {
  kind: "symlink";
  target: string;
}

export type ManifestEntry =
  | ManifestEntryFile
  | ManifestEntryDirectory
  | ManifestEntrySymlink;
