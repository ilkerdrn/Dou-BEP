import {attachPocketSamplePreview} from './dou-reader-neural-sample.mjs';
// Demo-only preview; no exam, student or arbitrary-text TTS integration.
const preview=attachPocketSamplePreview({doc:document,win:window});
window.addEventListener('pagehide',()=>preview.destroy(),{once:true});
