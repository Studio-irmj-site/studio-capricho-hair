import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("client hero uses the supplied logo without replacing tabs or budget", async () => {
  const page = await readFile(new URL("../components/public-site.tsx", import.meta.url), "utf8");
  assert.match(page, /src="\/studio-capricho-client-logo.jpeg"/);
  assert.doesNotMatch(page, /<FloatingRibbonLogo|<Monogram/);
  assert.match(page, /TabsContent value="inicio"/);
  assert.match(page, /submit_public_request/);
  const logo = await readFile(new URL("../public/studio-capricho-client-logo.jpeg", import.meta.url));
  assert.equal(logo[0], 0xff);
  assert.equal(logo[1], 0xd8);
  assert.equal(logo.length, 143637);
});
