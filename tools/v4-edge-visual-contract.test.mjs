import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const browser=readFileSync(new URL('./browser-ui-acceptance.mjs',import.meta.url),'utf8');
const css=readFileSync(new URL('../dou-unified-ui.css',import.meta.url),'utf8');
test('Edge visual contract uses active V4 DOU red and final unified stylesheet',()=>{
 assert.match(browser,/campusVisual\.brand==='#d70926'/);
 assert.match(browser,/result\.stylesheet==='\/dou-unified-ui\.css'/);
 assert.match(browser,/result\.palette==='#d70926'/);
 assert.doesNotMatch(browser,/#7a1f2b|rgb\(122, 31, 43\)|rgb\(128, 27, 42\)|burgundy/i);
});
test('V4 mobile menu has readable institutional red without touching student high contrast',()=>{
 assert.match(css,/V4 campus mobile navigation:/);
 assert.match(css,/body\.institution-page\.campus-layout\[data-design-version="4"\]:not\(\.high\):not\(\.high-contrast\) \.dou-nav-toggle\{/);
 assert.match(css,/color:#d70926!important;/);
 assert.match(browser,/mobileToggle\.color==='rgb\(215, 9, 38\)'/);
});
