import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("service catalog filters by existing categories and limits each page to four cards", async () => {
  const page = await readFile(new URL("../components/public-site.tsx", import.meta.url), "utf8");
  assert.match(page, /category\?\.trim\(\) \|\| "Outros"/);
  assert.match(page, /filteredServices\.slice\(\(currentServicePage - 1\) \* 4, currentServicePage \* 4\)/);
  assert.match(page, /visibleServices\.map/);
  assert.match(page, /setServiceCategory\(category\); setServicePage\(1\)/);
  assert.match(page, /disabled=\{currentServicePage === servicePageCount\}/);
  assert.match(page, /aria-label="Filtrar serviços por categoria"/);
  assert.match(page, /onClick=\{\(\) => addService\(service\)\}/);
});
