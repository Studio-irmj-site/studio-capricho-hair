import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const source=await readFile(new URL('../lib/availability-generator.ts',import.meta.url),'utf8');
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {generateAvailability:generate}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const base={available_date:'2026-10-15',start_time:'08:00',end_time:'18:00',interval:30,pause:true,pause_start:'12:00',pause_end:'13:00',repeat:false,until:'2026-10-31',weekdays:[4]};
test('pause boundaries and closing time',()=>{
 const rows=generate(base); assert.equal(rows.length,18);
 assert.equal(rows.at(-1).start_time,'17:30');
 assert.ok(!rows.some(r=>['12:00','12:30','18:00'].includes(r.start_time)));
 assert.ok(rows.some(r=>r.start_time==='13:00'));
});
test('repeat only chosen weekdays across month boundary',()=>{
 const rows=generate({...base,repeat:true,until:'2026-11-05'});
 assert.deepEqual([...new Set(rows.map(r=>r.available_date))],['2026-10-15','2026-10-22','2026-10-29','2026-11-05']);
 assert.equal(new Set(rows.map(r=>r.available_date+r.start_time)).size,rows.length);
});
test('reject invalid interval, dates, pause and empty weekdays',()=>{
 for(const patch of [{interval:0},{interval:1.5},{available_date:'2026-02-30'},{end_time:'07:00'},{pause_end:'11:00'},{repeat:true,weekdays:[]},{repeat:true,until:'2026-10-14'}]) assert.throws(()=>generate({...base,...patch}));
});
