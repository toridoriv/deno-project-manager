import { unemojify } from "https://deno.land/x/emoji@0.3.0/mod.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { DEFAULT_EMOJI_GROUP, EMOJI_MAP } from "./git.data.ts";
import { executeCommand } from "./process.ts";
import { Expand } from "./types.ts";

const commitFormat = {
  hash: "%H",
  id: "%h",
  timestamp: "%ad",
  author: {
    name: "%an",
    email: "%ae",
  },
  subject: "%s",
  ref: "%D",
};

const TrimmedStringSchema = z.string().trim();

export const CommitSchema = z
  .object({
    /**
     * The commit hash.
     */
    hash: TrimmedStringSchema,
    /**
     * The commit ID - the short hash.
     */
    id: TrimmedStringSchema,
    /**
     * The commit timestamp.
     */
    timestamp: z.preprocess(parseDate, z.date()),
    /**
     * The author of the commit, containing their name and email address.
     */
    author: z.object({
      name: TrimmedStringSchema,
      email: TrimmedStringSchema,
    }),
    /**
     * The commit subject line.
     */
    subject: TrimmedStringSchema,
    /**
     * The commit reference - the branch or tag name.
     */
    ref: TrimmedStringSchema,
  })
  .transform(parseSubject);

/**
 * The Commit type, which represents a parsed Git commit.
 */
export type Commit = z.TypeOf<typeof CommitSchema>;

/**
 * The type for commit labels. A commit label is either one of the labels from
 * the {@link EMOJI_MAP} constant, or one of the labels from the {@link DEFAULT_EMOJI_GROUP} constant.
 */
export type CommitLabel =
  | (typeof EMOJI_MAP)[number]["label"]
  | (typeof DEFAULT_EMOJI_GROUP)["label"];

/**
 * Type that excludes the "Release" label from the CommitLabel type.
 * Represents commit labels that have not yet been released.
 */
export type UnreleasedCommitLabel = Exclude<CommitLabel, "Release">;

/**
 * Type representing a commit label object.
 * Contains a `label` property which is a {@link CommitLabel}.
 */
export type CommitLabelObject = { label: CommitLabel };

/**
 * Type representing a commit with a label attached, combining the Commit and CommitLabelObject types.
 */
export type LabeledCommit = Expand<Commit & CommitLabelObject>;

/**
 * Type representing the changes for a release, combining the CommitLabelObject
 * type with a list of commits. Used in the ReleaseObject type to represent
 * the changes for a release grouped by commit label.
 */
export type ReleaseChanges = Expand<CommitLabelObject & { commits: Commit[] }>;

export type ReleaseObject = {
  /** The GitHub username of the repository owner. */
  owner: string;
  /**
   * The name of the project.
   *
   * @example { name: "deno_project_manager" } // Deno Module
   * @example { name: "deno-project-manager" } // GitHub Repository
   */
  name: string;
  /**
   * The version of the release in Semver format.
   */
  version: string;
  /**
   * The tag name for the release.
   */
  tag: string;
  /**
   * The hash of the commit previous to this one.
   */
  previous: string;
  /** The tag name for the release prior to this one. */
  previousTag: string;
  /**
   * The changes for the release, grouped by commit label.
   * The key is the commit label, and the value is the commits with that label.
   */
  changes: Record<UnreleasedCommitLabel, ReleaseChanges>;
};

export const _internals = {
  retrieveFirstCommit,
};

/**
 * Parses the output of `git log` into a list of {@link Commit} objects.
 *
 * Takes the raw output string from `git log` and converts it into
 * a list of Commit objects by splitting the output into lines,
 * JSON-parsing each line into a raw commit object, and mapping
 * the raw commits through the parseCommit function.
 *
 * @param output - The raw output of `git log`.
 * @returns An array of {@link Commit} objects.
 */
export function parseGitLogOutput(output: string) {
  const rawCommits = output.split(`{"hash"`).compact().map((v) => `{"hash"${v}`);

  return rawCommits.map(parseCommit);
}

/**
 * Compares two commit timestamps to determine which commit is more recent.
 *
 * @param a - The first commit to compare
 * @param b - The second commit to compare
 * @returns
 *  - A negative number if `a` is more recent than `b`.
 *  - A positive number if `b` is more recent than `a`.
 *  - `0` if `a` and `b` have the same timestamp.
 */
export function compareCommitsByTimestamp(a: Commit, b: Commit) {
  return b.timestamp.getTime() - a.timestamp.getTime();
}

/**
 * Gets the commit group label for the given commit subject.
 *
 * Extracts the emoji from the commit subject and looks it up
 * in the {@link EMOJI_MAP} constant to find the matching group label.
 * Falls back to {@link DEFAULT_EMOJI_GROUP} if no match.
 *
 * @param subject - The commit subject to get the group label for
 * @returns The commit group label
 */
export function getCommitLabel(subject: string): CommitLabel {
  const emojiMatch = subject.match(/:\w+:/);

  if (emojiMatch === null) {
    throw new Error("No emoji found :(", { cause: { subject } });
  }

  const emoji = emojiMatch[0].replaceAll(":", "");

  for (let i = 0; i < EMOJI_MAP.length; i++) {
    const group = EMOJI_MAP[i];

    if (group.emojis.includes(emoji)) {
      return group.label;
    }
  }

  return DEFAULT_EMOJI_GROUP.label;
}

/**
 * Initializes a release object with the given version and previous version.
 *
 * @param version - The version string for the current release
 * @param previous - The previous release version string, if available
 * @returns An object representing the release with default values
 */
export function initReleaseObject(
  version: string,
  previous = "",
): ReleaseObject {
  return {
    owner: "",
    name: "",
    version,
    tag: `v${version}`,
    previous,
    previousTag: "",
    changes: {
      "Breaking Changes": {
        label: "Breaking Changes",
        commits: [],
      },
      Added: {
        label: "Added",
        commits: [],
      },
      Security: {
        label: "Security",
        commits: [],
      },
      Fixed: {
        label: "Fixed",
        commits: [],
      },
      Removed: {
        label: "Removed",
        commits: [],
      },
      Deprecated: {
        label: "Deprecated",
        commits: [],
      },
      Changed: {
        label: "Changed",
        commits: [],
      },
      Miscellaneous: {
        label: "Miscellaneous",
        commits: [],
      },
    },
  };
}

/**
 * Extracts the semantic version string from a Git commit reference.
 */
export function extractVersionFromCommit(commit: Commit) {
  return commit.ref.replace("tag: v", "");
}

/**
 * Retrieves all commits from the Git repository, sorted chronologically.
 *
 * Executes the `git log` command to get the full commit history. The commit
 * messages are formatted as JSON for easy parsing. The output is then parsed
 * and the commits sorted by timestamp before being returned.
 */
export function retrieveAllCommits() {
  const output = executeCommand("git", {
    args: [
      "log",
      "--tags",
      "--all",
      "--date=format:%s",
      `--pretty=format:${JSON.stringify(commitFormat)}`,
    ],
  });

  return parseGitLogOutput(output).sort(compareCommitsByTimestamp);
}

/**
 * Retrieves the first commit from the Git repository.
 *
 * Executes the `git log` command with first-parent and sorting options
 * to get the very first commit in the history. The commit message is
 * formatted as JSON for easy parsing. The output is parsed and the
 * first (oldest) commit is returned.
 */
export function retrieveFirstCommit() {
  const output = executeCommand("git", {
    args: [
      "log",
      "--first-parent",
      "--date=format:%s",
      `--pretty=format:${JSON.stringify(commitFormat)}`,
      "--abbrev-commit",
    ],
  });

  return parseGitLogOutput(output)
    .sort(compareCommitsByTimestamp)
    .toReversed()[0];
}

/**
 * Constructs a release object for the provided version and list of commits.
 *
 * The release object contains the version, previous version, and categorized
 * changes with associated commits. Commits are scanned to find the previous
 * version tag and categorized based on commit subject.
 *
 * @param version - The version string for this release object.
 * @param commits - The list of commits to categorize.
 * @returns The constructed release object.
 */
export function getReleaseObject(version: string, commits: Commit[]) {
  const release = initReleaseObject(version);

  for (let i = 0; i < commits.length; i++) {
    const commit = commits[i];
    const label = getCommitLabel(commit.subject);

    if (label === "Release") {
      release.previous = extractVersionFromCommit(commit);
      release.previousTag = `v${release.previous}`;
      break;
    }

    release.changes[label].commits.push(commit);
  }

  if (release.previous === "") {
    const firstCommit = _internals.retrieveFirstCommit();
    release.previous = firstCommit.hash;
    release.previousTag = firstCommit.hash;
  }

  return release;
}

function parseCommit(rawCommit: unknown) {
  try {
    return CommitSchema.parse(
      typeof rawCommit === "string" ? JSON.parse(rawCommit) : rawCommit,
    );
  } catch (err) {
    throw new Error("Parse commit failed.", {
      cause: {
        error: err,
        commit: rawCommit,
      },
    });
  }
}

function parseDate(date: unknown) {
  const asNumber = Number(date);

  if (!Number.isNaN(asNumber)) {
    return new Date(asNumber * 1000);
  }

  return date;
}

function parseSubject<T extends { subject: string }>(commit: T) {
  commit.subject = unemojify(commit.subject);

  return commit;
}
