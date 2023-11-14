import mainDebug from "./debug.ts";
import { createSelector } from "./object.ts";
import { Template } from "./string.ts";

const debug = mainDebug.extend("async");

const GITHUB_TEMPLATES = {
  treePath: new Template("/repos/{owner}/{repo}/git/trees/{branch}"),
  repositoryUrl: new Template(
    "https://raw.githubusercontent.com/{owner}/{repo}/v{version}/{path}",
  ),
};

type GetTreeConfig = Parameters<typeof GITHUB_TEMPLATES["treePath"]["compile"]>[0];

const DENO_TEMPLATES = {
  mapModulePath: new Template("/v2/modules/{module}/v{version}/index"),
  moduleUrl: new Template("https://deno.land/x/{module}@v{version}{path}"),
};

type GetModuleMapConfig = Parameters<
  typeof DENO_TEMPLATES["mapModulePath"]["compile"]
>[0];

export async function getRemotePaths(
  importUrl: string,
  version: string,
) {
  const [_host, owner, repo, ...path] = importUrl.replace("https://", "").split("/");
  const dir = path.length === 1 ? path[0] : path[path.length - 1];

  if (importUrl.includes("github")) {
    const paths = await getRemotePathsFromGitHub(dir, {
      owner,
      repo,
      branch: `v${version}`,
    });
    const toFullPath = (path: string) =>
      GITHUB_TEMPLATES.repositoryUrl.compile({
        version,
        owner,
        repo,
        path: `${dir}/${path}`,
      });

    return paths.map(toFullPath);
  } else if (importUrl.includes("deno.land")) {
    const remotePaths = await getRemotePathsFromDeno(`/${dir}`, {
      module: repo,
      version,
    });

    const toFullPath = (path: string) =>
      DENO_TEMPLATES.moduleUrl.compile({ module: repo, version, path });

    return remotePaths.map(toFullPath);
  }

  return [];
}

export async function getRemotePathsFromDeno(dir: string, config: GetModuleMapConfig) {
  const url = new URL(
    DENO_TEMPLATES.mapModulePath.compile(config),
    "https://apiland.deno.dev",
  );
  const response = await fetchFrom(url).then(solveJson<ModuleMapping>);

  console.log(response.index);

  return response.index[dir];
}

export async function getRemotePathsFromGitHub(dir: string, config: GetTreeConfig) {
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

function solveJson<T>(response: Response) {
  return response.json() as Promise<T>;
}
