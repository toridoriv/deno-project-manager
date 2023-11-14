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

    return remotePaths.map(toFullPath);
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

  return bin.tree.map(pathSelector).filter((v) => !v.startsWith("_"));
}

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
