import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("home displays supplied Google review excerpts with one verified profile link", async () => {
  const source = await readFile(new URL("../components/google-reviews.tsx", import.meta.url), "utf8");
  const page = await readFile(new URL("../components/public-site.tsx", import.meta.url), "utf8");
  assert.match(source, /https:\/\/maps.app.goo.gl\/9Q5wyxuLAivPCLnA8\?g_st=ic/);
  assert.equal((source.match(/href=\{mapsUrl\}/g) || []).length, 1);
  for (const name of ["Oficina Diversao e Alegria", "Agata Rayane", "Maria Clara Silva Mariano"]) assert.ok(source.includes(name));
  assert.match(source, /Trechos selecionados/);
  assert.match(source, /aria-live="polite"/);
  const home = page.slice(page.indexOf('<TabsContent value="inicio"'), page.indexOf('<TabsContent value="servicos"'));
  assert.match(home, /<GoogleReviews \/>/);
  assert.match(home, /studio-capricho-client-logo.jpeg/);
});
