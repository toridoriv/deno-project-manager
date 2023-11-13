import { loadSync } from "https://deno.land/std@0.206.0/dotenv/mod.ts";
import { walkSync } from "https://deno.land/std@0.206.0/fs/walk.ts";
import { defineCommand } from "../mod.ts";
import { DenoDeployApi } from "./_helpers/deno-deploy-api.ts";
import {
  CreateDeploymentOptions,
  createFileAsset,
  Deployment,
  FileAssetWithContent,
} from "./_helpers/deployment.ts";

const DEFAULT_WALK_SYNC_OPTIONS = {
  includeDirs: false,
  includeSymlinks: false,
  maxDepth: Infinity,
};

const DEFAULT_EXCLUSIONS = "^.git, ^.vscode, .env*";

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
    const api = new DenoDeployApi(opts.deployToken, opts.projectId);
    const exclusions = `${DEFAULT_EXCLUSIONS + ", " + opts.deployExclusions}`
      .split(",")
      .map(trim)
      .map(toRegex);
    const paths = getPathsToDeploy(exclusions);
    const options = getCreateDeploymentOptions(paths);

    options.entryPointUrl = entry;

    if (opts.importMapPath) {
      options.importMapUrl = opts.importMapPath;
    }

    console.info("ℹ️ Creating a deploy with the following options:");
    console.info(Deno.inspect(options, { colors: true }));

    if (opts.dryRun) {
      Deno.exit(0);
    }

    const createDeploymentResponse = await api.createDeployment(options);
    const deploymentDetailsResponse = await api.getDeploymentDetails(
      createDeploymentResponse.data.id,
    );
    const url = getDeploymentUrl(deploymentDetailsResponse.data);

    if (opts.githubOutput) {
      Deno.writeTextFileSync(opts.githubOutput, `DEPLOY_URL=${url}`, { append: true });
    }

    console.info("✅ Deployment successful");
    console.info(`✨ Available at: ${url}`);

    Deno.exit(0);
  },
});

function toRegex(value: string) {
  return new RegExp(value);
}

function trim(value: string) {
  return value.trim();
}

function getPathsToDeploy(exclusions: RegExp[]) {
  const opts = {
    ...DEFAULT_WALK_SYNC_OPTIONS,
    skip: exclusions,
  };

  return Array.from(walkSync("./", opts), (entry) => entry.path);
}

function getCreateDeploymentOptions(paths: string[]): CreateDeploymentOptions {
  const assets = paths
    .map(
      (path) => [path, createFileAsset(path)] as [string, FileAssetWithContent],
    )
    .reduce((acc, [path, asset]) => {
      acc[path] = asset;
      return acc;
    }, {} as Record<string, FileAssetWithContent>);
  const envVars = loadSync({ envPath: ".env.deployment" });

  return {
    entryPointUrl: "",
    importMapUrl: "",
    assets,
    envVars,
  };
}

function getDeploymentUrl(deployment: Deployment) {
  const domain = "https://" + deployment.domains[0];
  if (!deployment.isProduction) {
    return domain;
  }

  return domain.replace(`-${deployment.id}`, "");
}
