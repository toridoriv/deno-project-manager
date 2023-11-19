import "./globals.ts";

import { parse } from "https://deno.land/std@0.207.0/path/parse.ts";
import mainDebug from "./debug.ts";
import { createSelector } from "./object.ts";

const debug = mainDebug.extend("async");

const GITHUB_TEMPLATES = {
  treePath: new Template("/repos/{owner}/{name}/git/trees/{branch}"),
  repositoryUrl: new Template(
    "https://raw.githubusercontent.com/{owner}/{name}/{branch}/{path}",
  ),
};

type GetTreeConfig = Parameters<
  (typeof GITHUB_TEMPLATES)["treePath"]["compile"]
>[0];

const DENO_TEMPLATES = {
  mapModulePath: new Template("/v2/modules/{name}/{version}/index"),
  moduleUrl: new Template("https://deno.land/x/{name}@{version}{path}"),
};

type GetModuleMapConfig = Parameters<
  (typeof DENO_TEMPLATES)["mapModulePath"]["compile"]
>[0];

/**
 * Gets file paths for a module from a remote source.
 *
 * This function takes a module import URL, parses it to get metadata like the host and module details,
 * and fetches file paths contained in the module from the remote source.
 *
 * It supports GitHub and Deno hosts. For GitHub, it uses the repository API to traverse the directory tree.
 * For Deno, it uses the module mapping API to get the file list.
 *
 * The file paths are converted to full importable URLs using template strings.
 *
 * @param importUrl - The module import URL
 * @returns Array of file paths for the module
 */
export async function getRemotePaths(importUrl: string) {
  const parsedUrl = getMetadataFromUrl(importUrl);
  const { owner, name, dir, host, paths, version } = parsedUrl;

  debug("Parsed Module URL: %o", parsedUrl);

  if (host.includes("github")) {
    const branch = paths.join("/");

    const remotePaths = await getRemotePathsFromGitHub(dir, {
      owner,
      name,
      branch,
    });
    const toFullPath = (path: string) =>
      GITHUB_TEMPLATES.repositoryUrl.compile({
        branch,
        owner,
        name,
        path: `${dir}/${path}`,
      });

    return remotePaths.filter(isPublic).map(toFullPath);
  } else if (host.includes("deno")) {
    const remotePaths = await getRemotePathsFromDeno(`/${dir}`, {
      name,
      version,
    });

    const toFullPath = (path: string) =>
      DENO_TEMPLATES.moduleUrl.compile({ name, version, path });

    return remotePaths.map(toFullPath);
  }

  return [];
}

/**
 * Gets file paths from Deno's module API for a given directory.
 *
 * This function takes a directory path within a module and info about the module,
 * and returns an array of file paths contained in that directory.
 *
 * It uses the module mapping API to get a mapping of all files in the module.
 * It then extracts just the paths for the given directory.
 *
 * @param dir - The directory path within the module
 * @param config - Module name and version
 * @returns Array of file paths in the directory
 */
export async function getRemotePathsFromDeno(
  dir: string,
  config: GetModuleMapConfig,
) {
  const url = new URL(
    DENO_TEMPLATES.mapModulePath.compile(config),
    "https://apiland.deno.dev",
  );
  const response = await fetchFrom(url).then(solveJson<ModuleMapping>);

  return response.index[dir];
}

/**
 * Gets file paths from a GitHub repository tree.
 *
 * This function takes a directory path and GitHub repository info,
 * and returns an array of file paths contained in that directory.
 *
 * It uses the GitHub API to fetch the repository tree `JSON` for the given branch.
 * It finds the tree entry matching the directory path, and fetches the tree `JSON` for that subdirectory.
 *
 * It then extracts just the "path" field from each entry using a selector function.
 *
 * @param dir - The directory path in the repository
 * @param config - Options like owner, repo name, branch
 * @returns Array of discovered file paths
 */
export async function getRemotePathsFromGitHub(
  dir: string,
  config: GetTreeConfig,
) {
  const url = new URL(
    GITHUB_TEMPLATES.treePath.compile(config),
    "https://api.github.com",
  );

  const root = await fetchFrom(url).then(solveJson<RepositoryTreeResponse>);
  const urlDir = root.tree.find((v) => v.path === dir)?.url;

  if (!urlDir) {
    return [];
  }

  const bin = await fetchFrom(urlDir).then(solveJson<RepositoryTreeResponse>);
  const pathSelector = createSelector("path");

  return bin.tree.map(pathSelector);
}

/**
 * Makes a fetch request to a `URL` with optional request settings.
 *
 * This function takes a `URL` string or `URL` object, and an optional `RequestInit`
 * object to configure the fetch request.
 *
 * It makes the fetch request using the provided URL and `RequestInit`.
 *
 * If the response is not ok, it throws an error with the status and message.
 * Otherwise it returns the response.
 *
 * This provides a simple wrapper around `fetch` for making requests.
 *
 * @param url - The `URL` to fetch from
 * @param request - Optional `RequestInit` object
 * @returns The successful response.
 *
 * @throws {Error} If response is not ok
 */
export async function fetchFrom(url: string | URL, request?: RequestInit) {
  debug("%s %s", request?.method?.toUpperCase() || "GET", url);

  const response = await fetch(url, request);

  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`, {
      cause: `${request?.method?.toUpperCase() || "GET"} ${url}`,
    });
  }

  return response;
}

/**
 * Parses metadata about a module from its import URL.
 *
 * This function takes a module import URL string, and extracts metadata like the host,
 * owner, name, version, directory path, and more.
 *
 * It parses the URL into components using the URL API, and returns an object containing:
 *
 * - owner - The owner username or organization
 * - name - The name of the module
 * - dir - The directory path within the module
 * - paths - Any additional path segments
 * - host - The hostname like "github.com" or "deno.land"
 * - version - The version if included in a Deno URL
 *
 * This allows easily extracting metadata from import URLs without needing to manually parse
 * the string.
 *
 * @param raw - The raw import URL string
 * @returns An object containing parsed metadata
 *
 * @example
 *
 * ```ts
 * import { getMetadataFromUrl } from "./async.ts";
 *
 * const url = "https://deno.land/x/cliffy@v0.25.7/command/mod.ts";
 * const meta = getMetadataFromUrl(url);
 *
 * console.assert(meta.name === "cliffy");
 * console.assert(meta.version === "v0.25.7");
 * console.assert(meta.host === "deno.land");
 * ```
 *
 * @example
 *
 * ```ts
 * import { getMetadataFromUrl } from "./async.ts";
 *
 * const url =
 *   "https://raw.githubusercontent.com/toridoriv/deno-project-manager/main/bin/deploy.ts";
 * const meta = getMetadataFromUrl(url);
 *
 * console.assert(meta.name === "deno-project-manager");
 * console.assert(meta.version === "main");
 * console.assert(meta.host === "raw.githubusercontent.com");
 * ```
 */
export function getMetadataFromUrl(raw: string) {
  const url = new URL(raw); // from github or deno
  const parsedPath = parse(url.pathname);
  const [owner, rawName, ...paths] = parsedPath.dir.split("/").compact();
  let [name, version] = rawName.split("@");

  if (!version) {
    version = paths.shift() || "";
  }

  const dir = paths.pop() || "";

  return { owner, name, version, host: url.host, dir, paths };
}

type ModuleMapping = {
  index: Record<string, string[]>;
  docs: unknown;
};

interface RepositoryTreeResponse {
  sha: string;
  url: string;
  tree: RepositoryTree[];
}

interface RepositoryTree {
  path: string;
  mode: string;
  type: string;
  size: number;
  sha: string;
  url: string;
}

function solveJson<T>(response: Response) {
  return response.json() as Promise<T>;
}

function isPublic(path: string) {
  return !path.startsWith("_");
}
