import test from 'node:test';
import assert from 'node:assert/strict';
import {auditLocalAssets,inspectPublishedSource} from './offline-audit.mjs';
test('published UI assets reference no direct remote network resources',()=>{
 const result=auditLocalAssets();assert.ok(result.checked>25);assert.deepEqual(result.problems,[]);
});
test('static audit rejects remote scripts, images, CSS URLs, fetch and JS module imports',()=>{
 for(const [text,kind] of [
  ['<script src="https://example.com/lib.js"></script>','external_asset'],
  ['<link rel="stylesheet" href="//cdn.example.com/ui.css">','external_asset'],
  ['@import url("https://example.com/theme.css");','css_import'],
  ['background:url(https://example.com/pixel.png)','css_remote_url'],
  ['import thing from "https://example.com/thing.mjs"','module_remote_import'],
  ['fetch("https://example.com/collect",{method:"POST"})','remote_fetch']]){
  assert.ok(inspectPublishedSource(text,'mock').some(x=>x.kind===kind),text);
 }
});
test('local resources and passive XML namespaces do not produce network alerts',()=>{
 assert.deepEqual(inspectPublishedSource('<script src="/operations.mjs"></script> fetch("/api/health"); <svg xmlns="http://www.w3.org/2000/svg"/>','mock'),[]);
});
