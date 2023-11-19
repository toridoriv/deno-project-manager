import { faker } from "@deps";
import { Commit, CommitLabel } from "@tools/git.ts";
import { getRandomGitmojiCommitSubject } from "./gitmoji.ts";

export interface TestCommit extends Commit {}

export class TestCommit {
  constructor(
    { hash, id, timestamp, author, subject, ref }: Partial<Commit>,
    kind?: CommitLabel,
  ) {
    this.hash = hash || faker.git.commitSha();
    this.id = id || faker.git.commitSha({ length: 7 });
    this.timestamp = timestamp || new Date();
    this.author = author || new TestGitAuthor({});
    this.subject = subject || getRandomGitmojiCommitSubject(kind);
    this.ref = ref || "";
  }
}

export interface TestGitAuthor extends GitAuthor {
}

export class TestGitAuthor {
  constructor({ email, name }: Partial<GitAuthor>) {
    this.email = email || faker.internet.email();
    this.name = name || faker.person.fullName();
  }
}

type GitAuthor = Commit["author"];
