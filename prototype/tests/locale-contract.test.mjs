import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { messages } from "../en/messages.mjs";

const appSource = await readFile(new URL("../app.mjs", import.meta.url), "utf8");
const htmlSource = await readFile(new URL("../en/index.html", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("every statically referenced interface message exists in the English catalog", () => {
  const keys = [...appSource.matchAll(/\bt\("([A-Za-z0-9]+)"/g)].map((match) => match[1]);
  assert.ok(keys.length > 80, "expected broad interface-copy coverage");
  for (const key of keys) assert.equal(typeof messages[key], "string", `missing message ${key}`);
});

test("the rendered route declares its explicit locale and contains no embedded interface copy", () => {
  assert.match(htmlSource, /<html lang="en" data-locale="en">/);
  assert.match(htmlSource, /<div id="app"><\/div>/);
  assert.doesNotMatch(htmlSource, /<body>\s*[A-Za-z]/);
});

test("the visual system includes a reduced-motion contract and no CSS-authored words", () => {
  assert.match(cssSource, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(cssSource, /content:\s*["'][A-Za-z]/);
});

test("the catalog covers recovery, consultation, sharing, and successor boundaries", () => {
  const required = [
    "failureBody",
    "rejectedBody",
    "consultationBody",
    "shareBody",
    "successorBody",
    "determinationUnlisted",
  ];
  for (const key of required) assert.equal(typeof messages[key], "string");
  assert.match(messages.failureBody, /preserved/i);
  assert.match(messages.failureBody, /restored/i);
  assert.match(messages.shareBody, /does not contain/i);
  assert.match(messages.successorBody, /separate/i);
});

test("the representative record carries the complete institutional signature", () => {
  assert.match(appSource, /class="sample-brand"/);
  assert.match(appSource, /class="sample-brand-name">\$\{t\("brandName"\)\}/);
  assert.match(appSource, /class="sample-brand-office">\$\{t\("brandDescriptor"\)\}/);
  assert.equal(messages.brandInitial, "BPG");
});
