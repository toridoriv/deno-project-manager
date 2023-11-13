import { isErrorStatus } from "https://deno.land/std@0.206.0/http/status.ts";
import {
  CreateDeploymentOptions,
  DeploymentSchema,
  DeploymentsSchema,
} from "./deployment.ts";

const PROJECT_ID_PLACEHOLDER = "{projectId}";
const DEPLOYMENT_ID_PLACEHOLDER = "{deploymentId}";

const API_PATHS = {
  deployments: `/projects/${PROJECT_ID_PLACEHOLDER}/deployments`,
  deployment: `/deployments/${DEPLOYMENT_ID_PLACEHOLDER}`,
} as const;

export class DenoDeployApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status: number) {
    super(message);

    this.code = code;
    this.status = status;

    Object.defineProperty(this, "message", {
      enumerable: true,
    });
  }
}

export class DenoDeployApi {
  readonly BASE_URL = "https://api.deno.com";
  readonly VERSION_PATH = "/v1";

  constructor(private token: string, readonly projectId: string) {}

  public async createDeployment(options: CreateDeploymentOptions) {
    const url = this.getUrl("deployments", {
      [PROJECT_ID_PLACEHOLDER]: this.projectId,
    });
    const request = this.getInitialRequest(url, {
      method: "POST",
      body: JSON.stringify(options),
    });

    const response = await fetch(request);

    const raw = await this.processResponse(response);
    const deployment = DeploymentSchema.parse(raw);

    return this.formatReturnValue(response, deployment);
  }

  public async getDeploymentDetails(deploymentId: string) {
    const url = this.getUrl("deployment", {
      [DEPLOYMENT_ID_PLACEHOLDER]: deploymentId,
    });

    const request = this.getInitialRequest(url, {
      method: "GET",
    });

    const response = await fetch(request);

    const raw = await this.processResponse(response);
    const deployment = DeploymentSchema.parse(raw);

    return this.formatReturnValue(response, deployment);
  }

  public async listDeployments(limit = 5, page = 1) {
    const url = this.getUrl("deployments", {
      [PROJECT_ID_PLACEHOLDER]: this.projectId,
    });

    url.searchParams.set("limit", `${limit}`);
    url.searchParams.set("page", `${page}`);

    const request = this.getInitialRequest(url, { method: "GET" });

    const response = await fetch(request);

    const raw = await this.processResponse(response);
    const deployments = DeploymentsSchema.parse(raw);

    return this.formatReturnValue(response, deployments);
  }

  protected formatReturnValue<T>(response: Response, data: T) {
    return {
      metadata: {
        status: {
          code: response.status,
          text: response.statusText,
        },
        headers: this.parseHeaders(response.headers),
      },
      data,
    };
  }

  protected getInitialRequest(url: URL, init?: RequestInit) {
    const request = new Request(url, init);

    request.headers.set("authorization", `Bearer ${this.token}`);
    request.headers.set("content-type", "application/json");

    return request;
  }

  protected getUrl(
    kind: keyof typeof API_PATHS,
    replacements: Record<string, string>,
  ) {
    let path = this.VERSION_PATH + API_PATHS[kind];

    for (const replacement in replacements) {
      path = path.replaceAll(replacement, replacements[replacement]);
    }

    return new URL(path, this.BASE_URL);
  }

  protected async handleError(response: Response): Promise<never> {
    const contentType = response.headers.get("content-type");

    if (this.isJsonResponse(contentType)) {
      const error = (await response.json()) as RawError;

      throw new DenoDeployApiError(error.code, error.message, response.status);
    }

    throw new DenoDeployApiError(
      "unknown",
      await response.text(),
      response.status,
    );
  }

  protected isJsonResponse(contentType: string | null) {
    if (!contentType) {
      return false;
    }

    return contentType.includes("application/json");
  }

  protected parseHeaders(headers: Headers) {
    const object = Object.fromEntries(headers) as Record<string, unknown> & {
      links?: Record<"next" | "first" | "last", URL>;
    };

    if (headers.has("link")) {
      object.link = getPaginationLinks(headers.get("link") as string);
    }

    return object;
  }

  protected processResponse(response: Response) {
    if (isErrorStatus(response.status)) {
      return this.handleError(response);
    }

    return response.json();
  }
}

type RawError = {
  code: string;
  message: string;
};

function getPaginationLinks(value: string) {
  const items = value
    .split("<")
    .filter(Boolean)
    .map(trim)
    .map(getPaginationLink)
    .reduce((acc, [kind, url]) => {
      acc[kind] = url;

      return acc;
    }, {} as Record<"next" | "first" | "last", string>);

  return items;
}

function trim(value: string) {
  return value.trim();
}

function getPaginationLink(value: string) {
  const items = value.split(";");
  let [url, rel] = items;

  url = url.replaceAll("'", "").replace(">", "");
  rel = rel.replace("rel=", "").replaceAll('"', "").replaceAll(",", "");

  return [rel.trim(), new URL(url).href] as ["next" | "first" | "last", string];
}
