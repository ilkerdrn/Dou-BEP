import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const edge=readFileSync(new URL('./browser-ui-acceptance.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../dou-unified-ui.css',import.meta.url),'utf8');
test('Edge coordination assertions reflect measured V4 white hero and charcoal navigation',()=>{
 assert.match(edge,/coordinationVisual\.heroColor==='rgb\(255, 255, 255\)'&&coordinationVisual\.headingColor==='rgb\(29, 29, 27\)'/);
 assert.match(edge,/coordinationVisual\.menuColor==='rgb\(240, 240, 237\)'/);
 assert.match(edge,/coordinationVisual\.searchBg==='rgb\(48, 48, 46\)'&&coordinationVisual\.searchText==='rgb\(255, 255, 255\)'/);
 assert.doesNotMatch(edge,/coordinationVisual\.headingColor==='rgb\(32, 36, 49\)'/);
});
test('Unified CSS preserves white hero, dark headline and readable inactive menu',()=>{
 assert.match(css,/\.portal-hero\)\{\s*background:#fff!important/);
 assert.match(css,/\.portal-hero h1[^}]*\{\s*color:#1d1d1b!important/);
 assert.match(css,/\.dou-nav-link\.portal-menu:not\(\.current\):not\(\[aria-current="page"\]\)[^}]*\{\s*color:#f0f0ed!important/);
});
