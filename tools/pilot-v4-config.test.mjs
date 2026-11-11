import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

const root=resolve(import.meta.dirname,'..');
const seed=readFileSync(resolve(root,'tools/pilot-v4-seed.mjs'),'utf8');
const launcher=readFileSync(resolve(root,'PILOT-V4-BASLAT.ps1'),'utf8');

test('pilot uses only separate local SQLite and refuses existing DB',()=>{
 assert.match(seed,/join\(root,'\.local-pilot-v4'\)/);
 assert.match(seed,/if\(existsSync\(dbPath\)\|\|existsSync\(marker\)\)/);
 assert.match(seed,/BEP_PILOT_ONLY/);
 assert.match(seed,/BEP_REQUIRE_INDEPENDENT_EXAM_APPROVAL/);
 assert.doesNotMatch(seed,/rmSync\(|unlinkSync\(|delete\s+from\s+tenants/i);
 assert.match(launcher,/\$env:PORT = '4174'/);
 assert.match(launcher,/\$env:BEP_DB_PATH = \$db/);
 assert.match(launcher,/pilot-only\.marker/);
});
test('pilot supplies isolated teacher, reviewer and anonymous draft fixtures',()=>{
 for(const role of ['teacher','reviewer','coordinator'])assert.ok(seed.includes("role:'"+role+"'"));
 assert.match(seed,/createTenantAdmin\(/);
 assert.match(seed,/store\.createExam\(teacher,\{exam\}\)/);
 assert.match(seed,/PILOT-01/);
 assert.match(seed,/PILOT-02/);
 assert.match(seed,/Hicbir sinav onaylanmadi/);
 assert.doesNotMatch(seed,/store\.approveExam\(/);
 assert.match(launcher,/Kapatmak icin Ctrl\+C/);
});
