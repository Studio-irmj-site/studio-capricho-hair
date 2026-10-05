import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("client sections are separate accessible tabs while the budget stays shared", async () => {
  const source = await readFile(new URL("../components/public-site.tsx", import.meta.url), "utf8");
  for (const value of ["inicio", "servicos", "contato"]) {
    assert.ok(source.includes(`<TabsTrigger value="${value}">`));
    assert.ok(source.includes(`<TabsContent value="${value}" asChild>`));
  }
  assert.match(source, /value=\{activeTab\} onValueChange=\{navigateTab\}/);
  assert.match(source, /aria-label="Painel da cliente"/);
  assert.match(source, /window.addEventListener\("hashchange", readHash\)/);
  assert.match(source, /setCartOpen\(false\); navigateTab\("servicos"\)/);
  assert.match(source, /useState<CartItem\[\]>\(\[\]\)/);
  assert.match(source, /submit_public_request/);
});
