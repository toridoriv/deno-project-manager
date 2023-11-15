import mainDebug from "./debug.ts";
import { createSelector } from "./object.ts";
import { Template } from "./string.ts";

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
 *
 * @example
 *
 * ```ts
 * const paths = await getRemotePaths('https://deno.land/x/mymod@1.0.0');
 * // paths = [
 * //   'https://deno.land/x/mymod@1.0.0/src/index.ts',
 * //   'https://deno.land/x/mymod@1.0.0/src/util.ts'
 * // ]
 * ```
 */
export async function getRemotePaths(importUrl: string) {
  const parsedUrl = parseModuleUrl(importUrl);
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
 *
 * @example
 *
 * ```ts
 * const paths = await getRemotePathsFromDeno("src", {
 *   name: "my_module",
 *   version: "1.0.0"
 * });
 * ```
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
 *
 * @example
 *
 * ```ts
 * const paths = await getRemotePathsFromGitHub("src", {
 *   owner: "user",
 *   name: "repo",
 *   branch: "main"
 * });
 * ```
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
 *
 * @example
 *
 * ```ts
 * const resp = await fetchFrom("https://api.github.com/repos/user/repo");
 *
 * const resp = await fetchFrom(url, {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json"
 *   }
 * });
 * ```
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

function parseModuleUrl(raw: string) {
  const url = new URL(raw);
  const parts = url.pathname.split("/").filter(Boolean);
  const [owner, rawName, ...rest] = parts;
  const [name, version] = rawName.split("@");
  const dir = parts[parts.length - 1];
  const paths = rest.slice(0, -1);

  return { owner, name, dir, paths, host: url.host, version };
}

function isPublic(path: string) {
  return !path.startsWith("_");
}
