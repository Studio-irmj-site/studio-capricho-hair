import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin login, desktop/mobile menu and identity preview use the client logo", async () => {
  const page = await readFile(new URL("../components/admin-app.tsx", import.meta.url), "utf8");
  const logo = await readFile(new URL("../components/admin-logo.tsx", import.meta.url), "utf8");
  assert.match(logo, /src="\/studio-capricho-client-logo.jpeg"/);
  assert.match(logo, /alt="Studio Capricho Hair"/);
  assert.equal((page.match(/<AdminLogo/g) || []).length, 4);
  assert.doesNotMatch(page, /Monogram/);
  assert.match(page, /<div className="sidebar-brand"><AdminLogo compact/);
  assert.match(page, /<div className="login-orbit"><AdminLogo/);
  assert.match(page, /className="login-form"><AdminLogo compact/);
  assert.equal((page.match(/<SidebarContent/g) || []).length, 2);
});
