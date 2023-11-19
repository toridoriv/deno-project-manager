import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  returnsNext,
  Stub,
  stub,
} from "@deps";
import { TestCommit } from "@helpers/commit.ts";
import * as git from "@tools/git.ts";
import { getTextData } from "@utilities";

const LOG_OUTPUT_ALL = getTextData("/git/log/all-output.txt");
const LOG_OUTPUT_FIRST = getTextData("/git/log/first-output.txt");
const COMMIT_EXPECTED_KEYS = ["hash", "id", "timestamp", "author", "subject", "ref"];

const utf8EncodeText = new TextEncoder();

describe("The object CommitSchema", () => {
  const rawCommit = {
    timestamp: 1700344381,
    ref: "",
    author: { name: "", email: "" },
    subject: "📝 Update Readme",
    hash: "",
    id: "",
  };

  describe("when calling the method parse", () => {
    it("should correctly convert a git timestamp to a date object", () => {
      const result1 = git.CommitSchema.parse(rawCommit);
      const result2 = git.CommitSchema.parse({
        ...rawCommit,
        timestamp: "Fri Nov 18 22:18:04 2023 -0300",
      });

      expect(result1.timestamp).to.be.instanceof(Date);
      expect(result1.timestamp.getFullYear()).to.equal(2023);
      expect(result1.timestamp.getMonth() + 1).to.equal(11);
      expect(result1.timestamp.getDate()).to.equal(18);
      expect(result2.timestamp).to.be.instanceof(Date);
      expect(result2.timestamp.getFullYear()).to.equal(2023);
      expect(result2.timestamp.getMonth() + 1).to.equal(11);
      expect(result2.timestamp.getDate()).to.equal(18);
    });

    it("should correctly convert every emoji in its subject to its code", () => {
      const parsed = git.CommitSchema.parse(rawCommit);

      expect(parsed.subject).to.equal(":memo: Update Readme");
    });
  });
});

describe("The function parseGitLogOutput", () => {
  it("should return an empty array given an empty log output", () => {
    const result = git.parseGitLogOutput("");

    expect(result).to.eql([]);
  });

  it("should return an array of commit objects given a valid log output", () => {
    const result1 = git.parseGitLogOutput(LOG_OUTPUT_ALL);
    const result2 = git.parseGitLogOutput(LOG_OUTPUT_FIRST);

    expect(result1).to.be.an("array");
    expect(result2).to.be.an("array");

    result1.forEach((commit) => {
      expect(commit).to.contain.keys(...COMMIT_EXPECTED_KEYS);
    });

    result2.forEach((commit) => {
      expect(commit).to.contain.keys(...COMMIT_EXPECTED_KEYS);
    });
  });

  it("should throw a descriptive error when parsing fails", () => {
    try {
      git.parseGitLogOutput("<>");
    } catch (err) {
      expect(err).to.be.instanceof(Error);
      expect(err.cause?.commit).to.include("<>");
    }
  });
});

describe("The function compareCommitsByTimestamp", () => {
  it("should return a negative number if the first commit is more recent than the second", () => {
    const a = new TestCommit({ timestamp: new Date("2023-01-02") });
    const b = new TestCommit({ timestamp: new Date("2023-01-01") });
    const result = git.compareCommitsByTimestamp(a, b);

    expect(result).to.be.lessThan(0);
  });

  it("should return a positive number if the first commit is older than the second", () => {
    const a = new TestCommit({ timestamp: new Date("2023-01-01") });
    const b = new TestCommit({ timestamp: new Date("2023-01-02") });
    const result = git.compareCommitsByTimestamp(a, b);

    expect(result).to.be.greaterThan(0);
  });

  it("should return 0 if both commits were created at the same time", () => {
    const a = new TestCommit({ timestamp: new Date("2023-01-01") });
    const b = new TestCommit({ timestamp: new Date("2023-01-01") });
    const result = git.compareCommitsByTimestamp(a, b);

    expect(result).to.equal(0);
  });
});

describe("The function getCommitLabel", () => {
  it("should return `Added` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":sparkles: Message",
      ":tada: (scope) Message",
      ":construction_worker: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Added", "Added", "Added"]);
  });

  it("should return `Changed` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":art: Message",
      ":bento: (scope) Message",
      ":building_construction: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Changed", "Changed", "Changed"]);
  });

  it("should return `Breaking Changes` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":boom: Message",
      ":boom: (scope) Message",
      ":boom: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Breaking Changes", "Breaking Changes", "Breaking Changes"]);
  });

  it("should return `Deprecated` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":wastebasket: Message",
      ":wastebasket: (scope) Message",
      ":wastebasket: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Deprecated", "Deprecated", "Deprecated"]);
  });

  it("should return `Removed` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":fire: Message",
      ":heavy_minus_sign: (scope) Message",
      ":mute: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Removed", "Removed", "Removed"]);
  });

  it("should return `Fixed` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":bug: Message",
      ":apple: (scope) Message",
      ":pencil2: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Fixed", "Fixed", "Fixed"]);
  });

  it("should return `Security` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":lock: Message",
      ":lock: (scope) Message",
      ":lock: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Security", "Security", "Security"]);
  });

  it("should return `Release` if the commit subject includes an emoji belonging to that group", () => {
    const commits = [
      ":bookmark: Message",
      ":bookmark: (scope) Message",
      ":bookmark: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Release", "Release", "Release"]);
  });

  it("should return `Miscellaneous` if the commit subject includes an emoji that does not belong to any group", () => {
    const commits = [
      ":smiling_face_with_hearts: Message",
      ":cold_face: (scope) Message",
      ":rainbow_flag: (scope) Message (#1)",
    ];
    const groups = commits.map(git.getCommitLabel);

    expect(groups).to.eql(["Miscellaneous", "Miscellaneous", "Miscellaneous"]);
  });

  it("should throw if the commit subject doesn't contain an emoji", () => {
    expect(git.getCommitLabel.bind(null, "I have no emoji")).to.throw(
      "No emoji found :(",
    );
  });
});

describe("The function extractVersionFromCommit", () => {
  it("should return a valid semantic version given a commit object", () => {
    const patch = new TestCommit({ ref: "tag: v1.0.1" });
    const minor = new TestCommit({ ref: "tag: v1.1.0" });
    const major = new TestCommit({ ref: "tag: v1.0.0" });

    expect(git.extractVersionFromCommit(patch)).to.equal("1.0.1");
    expect(git.extractVersionFromCommit(minor)).to.equal("1.1.0");
    expect(git.extractVersionFromCommit(major)).to.equal("1.0.0");
  });
});

describe("The function retrieveAllCommits", () => {
  const TIMES_TO_STUB = 1;
  let denoCommandStub: Stub;

  beforeAll(() => {
    denoCommandStub = stub(
      Deno,
      "Command",
      returnsNext(
        Array.from(
          { length: TIMES_TO_STUB },
          () => ({
            outputSync() {
              return {
                code: 0,
                stdout: utf8EncodeText.encode(LOG_OUTPUT_ALL),
              };
            },
          } as Deno.Command),
        ),
      ),
    );
  });

  afterAll(() => {
    denoCommandStub.restore();
  });

  it("should return a list of commits", () => {
    const result = git.retrieveAllCommits();

    expect(result).to.be.an("array");

    result.forEach((commit) => {
      expect(commit).to.contain.keys(...COMMIT_EXPECTED_KEYS);
    });
  });
});

describe("The function retrieveFirstCommit", () => {
  const TIMES_TO_STUB = 1;
  let denoCommandStub: Stub;

  beforeAll(() => {
    denoCommandStub = stub(
      Deno,
      "Command",
      returnsNext(
        Array.from(
          { length: TIMES_TO_STUB },
          () => ({
            outputSync() {
              return {
                code: 0,
                stdout: utf8EncodeText.encode(LOG_OUTPUT_FIRST),
              };
            },
          } as Deno.Command),
        ),
      ),
    );
  });

  afterAll(() => {
    denoCommandStub.restore();
  });

  it("should return the first commit only", () => {
    const result = git.retrieveFirstCommit();

    expect(result).to.be.an("object");
    expect(result).to.contain.keys(...COMMIT_EXPECTED_KEYS);
    expect(result.subject).to.equal(":tada: Add initial files");
  });
});

describe("The function getReleaseObject", () => {
  const TIMES_TO_STUB = 1;
  let denoCommandStub: Stub;

  beforeAll(() => {
    denoCommandStub = stub(
      Deno,
      "Command",
      returnsNext(
        Array.from(
          { length: TIMES_TO_STUB },
          () => ({
            outputSync() {
              return {
                code: 0,
                stdout: utf8EncodeText.encode(LOG_OUTPUT_FIRST),
              };
            },
          } as Deno.Command),
        ),
      ),
    );
  });

  afterAll(() => {
    denoCommandStub.restore();
  });

  it("when no release commit is found, it should set the hash of the first commit as the previous release", () => {
    const result = git.getReleaseObject("1.0.0", []);

    expect(result.previous).to.equal("4e8037a42326e75c9e68f8b3c39157f8c70a99e3");
    expect(result.previousTag).to.equal("4e8037a42326e75c9e68f8b3c39157f8c70a99e3");
  });

  it("when a release commit is found, it should correctly set its version and tag", () => {
    const result = git.getReleaseObject("1.0.0", [
      new TestCommit({}),
      new TestCommit({}),
      new TestCommit({ ref: "tag: v0.1.0", subject: ":bookmark: Release v0.1.0" }),
      new TestCommit({}),
    ]);

    expect(result.previous).to.equal("0.1.0");
    expect(result.previousTag).to.equal("v0.1.0");
  });
});
