import { describe, expect, it } from "@deps";
import "@tools/globals.ts";

describe("The class Template", () => {
  it("should compile a template with replacements", () => {
    const template = new Template("Hello {name}!");
    const result = template.compile({ name: "John" });

    expect(result).to.equal("Hello John!");
  });

  it("should handle multiple replacements in the template", () => {
    const template = new Template("My name is {name} and I am {age} years old.");
    const result = template.compile({ name: "Alice", age: 25 });

    expect(result).to.equal("My name is Alice and I am 25 years old.");
  });

  it("should handle an empty template", () => {
    const template = new Template("");
    const result = template.compile({});

    expect(result).to.equal("");
  });
});

describe("The method Array.prototype.compact", () => {
  it("should remove falsy values from the array", () => {
    const arr = [0, 1, false, 2, "", 3];
    const result = arr.compact();

    expect(result).to.deep.equal([1, 2, 3]);
  });

  it("should handle an array with no falsy values", () => {
    const arr = [1, 2, 3];
    const result = arr.compact();
    expect(result).to.deep.equal([1, 2, 3]);
  });

  it("should handle an empty array", () => {
    const arr = [] as unknown[];
    const result = arr.compact();

    expect(result).to.deep.equal([]);
  });
});

describe("The method Array.prototype.trim", () => {
  it("should trim whitespace from strings in the array", () => {
    const arr = [" hello ", " world", "foo"];
    const result = arr.trim();

    expect(result).to.deep.equal(["hello", "world", "foo"]);
  });

  it("should handle an array with no strings", () => {
    const arr = [1, 2, 3];
    const result = arr.trim();

    expect(result).to.deep.equal([1, 2, 3]);
  });

  it("should handle an empty array", () => {
    const arr = [] as unknown[];
    const result = arr.trim();

    expect(result).to.deep.equal([]);
  });
});
