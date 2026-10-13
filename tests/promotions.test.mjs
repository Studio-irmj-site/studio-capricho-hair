import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";
const source = await readFile(new URL("../lib/promotions.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const { promotionalPrice, studioToday, validatePromotion } = await import(`data:text/javascript;base64,${Buffer.from(output).toString("base64")}`);
const service = { id: "one", price: 100, active: true };
const offer = { id: "offer", service_id: "one", title: "Escova especial", description: null, start_date: "2026-10-20", end_date: "2026-10-21", promotional_price: 70, active: true };
test("discount follows the appointment day, includes both boundaries and chooses the cheapest offer", () => {
  assert.equal(promotionalPrice(service, "", [offer]), 100);
  assert.equal(promotionalPrice(service, "2026-10-19", [offer]), 100);
  assert.equal(promotionalPrice(service, "2026-10-20", [offer]), 70);
  assert.equal(promotionalPrice(service, "2026-10-21", [offer]), 70);
  assert.equal(promotionalPrice(service, "2026-10-22", [offer]), 100);
  assert.equal(promotionalPrice(service, "2026-10-20", [{ ...offer, active: false }]), 100);
  assert.equal(promotionalPrice(service, "2026-10-20", [{ ...offer, service_id: "other" }]), 100);
  assert.equal(promotionalPrice(service, "2026-10-20", [offer, { ...offer, promotional_price: 60 }]), 60);
  assert.equal(promotionalPrice({ ...service, price: 50 }, "2026-10-20", [offer]), 50);
});
test("date rolls over in Sao Paulo, not at midnight UTC", () => {
  assert.equal(studioToday(new Date("2026-10-21T02:59:00Z")), "2026-10-20");
  assert.equal(studioToday(new Date("2026-10-21T03:00:00Z")), "2026-10-21");
});
test("invalid date, inactive service and non-discount prices cannot be saved", () => {
  assert.doesNotThrow(() => validatePromotion(offer, [service]));
  for (const patch of [{ end_date: "2026-10-19" }, { start_date: "2026-02-30" }, { promotional_price: 100 }, { promotional_price: -1 }, { promotional_price: NaN }, { title: " " }, { service_id: "other" }]) assert.throws(() => validatePromotion({ ...offer, ...patch }, [service]));
  assert.throws(() => validatePromotion(offer, [{ ...service, active: false }]));
});
