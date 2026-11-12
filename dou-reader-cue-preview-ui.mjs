import {attachFixedReaderCuePreview} from './dou-reader-cue-preview.mjs';
// Separate demo-only controller: never reads an exam question or its answers.
const preview=attachFixedReaderCuePreview({doc:document,win:window});
window.addEventListener('pagehide',()=>preview.destroy(),{once:true});
