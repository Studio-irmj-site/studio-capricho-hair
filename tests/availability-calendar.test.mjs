import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("availability calendar has seven flexible columns isolated from table padding", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.availability-month-panel \.rdp-weekdays,\.availability-month-panel \.rdp-week \{ display:grid; grid-template-columns:repeat\(7,minmax\(0,1fr\)\)/);
  assert.match(css, /\.availability-month-panel td\.rdp-day \{ min-width:0; padding:0; border:0;/);
  assert.match(css, /\.availability-month-panel \.rdp-day button \{ width:100%; min-width:0;/);
});

test("monthly calendar filters the existing availability view without replacing its actions", async () => {
  const source = await readFile(new URL("../components/admin-app.tsx", import.meta.url), "utf8");
  const panel = source.slice(source.indexOf("function AvailabilityPanel("), source.indexOf("function Clients("));
  assert.match(panel, /<Calendar mode="single" locale=\{ptBR\}/);
  assert.match(panel, /onMonthChange=\{setCalendarMonth\}/);
  assert.match(panel, /onSelect=\{\(date\)=>selectDate/);
  assert.match(panel, /Limpar seleção e ver todos os dias/);
  assert.match(panel, /setFilterDate\(value\)/);
  assert.match(panel, /Próximos 7 dias/);
  for (const action of ["onBulk(date)", "onEdit(row)", "onDelete(row)", "onToggle(row,v)"]) {
    assert.ok(panel.includes(action), `Preserve ${action}`);
  }
  assert.match(source, /function BulkAvailabilityForm/);
  assert.match(source, /generateAvailability\(form\)/);
  assert.match(source, /pause_start/);
  assert.match(source, /weekdays/);
});
