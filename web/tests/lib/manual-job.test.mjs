import { test } from "node:test";
import assert from "node:assert/strict";
import { isLinkedInUrl, manualJdPath, guessCompanyFromUrl, parseFetchedJd } from "../../src/lib/manual-job.mjs";

test("detects LinkedIn hosts only", () => {
  assert.equal(isLinkedInUrl("https://www.linkedin.com/jobs/view/4012345678/"), true);
  assert.equal(isLinkedInUrl("https://uk.linkedin.com/jobs/view/x"), true);
  assert.equal(isLinkedInUrl("https://notlinkedin.com/jobs"), false);
  assert.equal(isLinkedInUrl("not a url"), false);
});

test("manual JD path is stable per URL and lives under jds/manual", () => {
  const a = manualJdPath("https://www.linkedin.com/jobs/view/1/");
  assert.match(a, /^jds\/manual\/[0-9a-f]{16}\.md$/);
  assert.equal(a, manualJdPath(" https://www.linkedin.com/jobs/view/1/ "));
  assert.notEqual(a, manualJdPath("https://www.linkedin.com/jobs/view/2/"));
});

test("guesses the employer from ATS URLs, blank otherwise", () => {
  assert.equal(guessCompanyFromUrl("https://job-boards.greenhouse.io/intercom/jobs/7464291"), "Intercom");
  assert.equal(guessCompanyFromUrl("https://jobs.ashbyhq.com/legora/abc"), "Legora");
  assert.equal(guessCompanyFromUrl("https://jobs.lever.co/veeva/3dbab10a"), "Veeva");
  assert.equal(guessCompanyFromUrl("https://astrazeneca.wd3.myworkdayjobs.com/Careers/job/x"), "Astrazeneca");
  assert.equal(guessCompanyFromUrl("https://www.linkedin.com/jobs/view/1/"), "");
});

test("reads title and location from fetch-jd output", () => {
  assert.deepEqual(parseFetchedJd("Senior Product Manager\n\nLocation: London\nType: FullTime"), { title: "Senior Product Manager", location: "London" });
  assert.deepEqual(parseFetchedJd("# Director, AI\nbody"), { title: "Director, AI", location: "" });
});
