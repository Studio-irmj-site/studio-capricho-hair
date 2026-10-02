import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("public and admin routes render from the production worker", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  const env = { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } };
  const ctx = { waitUntil() {}, passThroughOnException() {} };
  for (const path of ["/", "/admin"]) {
    const response = await worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), env, ctx);
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
    const html = await response.text();
    assert.match(html, /Studio Capricho Hair/);
    assert.doesNotMatch(html, /Starter Project|codex-preview/);
  }
});

test("database migration enforces RLS and idempotent completion", async () => {
  const sql = [
    await read("supabase/migrations/20260830000000_initial.sql"),
    await read("supabase/migrations/20260830230000_extend_existing_project.sql"),
    await read("supabase/migrations/20260830233000_security_hardening.sql"),
  ].join("\n");
  for (const table of ["administrators","studio_settings","services","clients","availability","quotes","quote_items","appointments","appointment_items","attendances","expenses"]) {
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
  }
  assert.match(sql, /appointment_id uuid not null unique/i);
  assert.match(sql, /appointments_active_slot_uidx/i);
  assert.match(sql, /create or replace function public\.complete_appointment/i);
  assert.match(sql, /select id, receipt_number into v_attendance_id/i);
  assert.match(sql, /public\.is_admin\(\)/i);
});

test("public requests use official service prices and abuse controls", async () => {
  const sql = await read("supabase/migrations/20260830230000_extend_existing_project.sql");
  const page = await read("components/public-site.tsx");
  assert.match(sql, /select \* into v_service\s+from public\.services/i);
  assert.match(sql, /v_service\.price \* v_quantity/i);
  assert.match(sql, /created_at > now\(\) - interval '10 minutes'/i);
  assert.match(sql, /request_hash/i);
  assert.match(page, /submit_public_request/);
  assert.match(page, /public_available_slots/);
  assert.doesNotMatch(page, /price:\s*[0-9]/);
});

test("finance counts completed attendances and receipt actions are permanent", async () => {
  const sql = await read("supabase/migrations/20260830230000_extend_existing_project.sql");
  const admin = await read("components/admin-app.tsx");
  assert.match(sql, /sum\(amount\) from public\.attendances/i);
  assert.match(sql, /delete from public\.attendances where appointment_id/i);
  assert.match(admin, /downloadReceipt/);
  assert.match(admin, /complete_appointment/);
  assert.match(admin, /status === "Concluído"/);
  assert.match(admin, /Exportar PDF/);
});

test("existing production data is snapshotted and the initial agenda is usable", async () => {
  const backup = await read("supabase/migrations/20260830225000_backup_existing_project.sql");
  const hardening = await read("supabase/migrations/20260830233000_security_hardening.sql");
  const seed = await read("supabase/migrations/20260830234000_seed_initial_availability.sql");
  assert.match(backup, /backup_capricho_20260830\.services/i);
  assert.match(hardening, /enable row level security/i);
  assert.match(seed, /generate_series\(9, 17\)/i);
  assert.match(seed, /on conflict \(available_date, start_time\) do nothing/i);
});

test("manual appointments link clients and sessions refresh safely", async () => {
  const sql = await read("supabase/migrations/20260830234500_admin_appointment_rpc.sql");
  const client = await read("lib/supabase.ts");
  const admin = await read("components/admin-app.tsx");
  assert.match(sql, /on conflict \(phone\) do update/i);
  assert.match(sql, /insert into public\.appointment_items/i);
  assert.match(admin, /admin_save_appointment/);
  assert.match(client, /grant_type=refresh_token/);
});

test("visual settings reach the public page and PDFs include the monogram", async () => {
  const page = await read("components/public-site.tsx");
  const pdf = await read("lib/pdf.ts");
  assert.match(page, /--studio-primary/);
  assert.match(page, /--studio-accent/);
  assert.match(pdf, /\(CH\) Tj/);
});


test("production deployment includes public Supabase connection and serves config", async () => {
  const config = JSON.parse(await read("dist/server/wrangler.json"));
  assert.equal(config.vars.SUPABASE_URL, "https://gfqtosxfpvqhdwkhfcvi.supabase.co");
  assert.match(config.vars.SUPABASE_ANON_KEY, /^sb_publishable_/);
  const previousUrl = process.env.SUPABASE_URL;
  const previousKey = process.env.SUPABASE_ANON_KEY;
  try {
    // Cloudflare's nodejs_compat populates process.env from the Worker bindings.
    process.env.SUPABASE_URL = config.vars.SUPABASE_URL;
    process.env.SUPABASE_ANON_KEY = config.vars.SUPABASE_ANON_KEY;
    const { default: worker } = await import("../dist/server/index.js");
    const response = await worker.fetch(new Request("http://localhost/api/config"), {}, { waitUntil() {}, passThroughOnException() {} });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.deepEqual(await response.json(), { url: config.vars.SUPABASE_URL, anonKey: config.vars.SUPABASE_ANON_KEY });
  } finally {
    if (previousUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousUrl;
    if (previousKey === undefined) delete process.env.SUPABASE_ANON_KEY; else process.env.SUPABASE_ANON_KEY = previousKey;
  }
});
