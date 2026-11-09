/**
 * Local-only candidate model bundle preflight for future intelligible Turkish TTS.
 * No downloading, execution, data collection, model loading or network.
 * Manifest validation is NOT a human speech-quality or production acceptance test.
 */
import {createHash} from 'node:crypto';
import {createReadStream,realpathSync,statSync} from 'node:fs';
import {isAbsolute,join,relative,sep} from 'node:path';

const SHA256 = /^[0-9a-f]{64}$/;
const SAFE_MODEL_NAME = /^[a-zA-Z0-9_-]+\.onnx$/;
const MAX_MODEL_BYTES = 2 * 1024 * 1024 * 1024;

export async function inspectLocalModelBundle(directory,manifest) {
  const deny = reason => Object.freeze({
    packageIntegrityVerified:false, usableForResearch:false, usableForProduction:false, reason,
    offlineOnly:true, humanListeningRequired:true
  });
  if (typeof directory!=='string' || !isAbsolute(directory) ||
      !manifest || typeof manifest!=='object' || Array.isArray(manifest)) return deny('invalid-input');
  if (manifest.schema!=='dou-local-tts-bundle-v1' ||
      manifest.language!=='tr-TR' ||
      manifest.engineType!=='local-neural-tts-research' ||
      manifest.execution!=='offline-only' ||
      manifest.consentProvenanceVerified!==true ||
      manifest.distributionRightsVerified!==true ||
      typeof manifest.licenseId!=='string' ||
      !/^[A-Za-z0-9.-]{3,64}$/.test(manifest.licenseId) ||
      typeof manifest.modelFile!=='string' || !SAFE_MODEL_NAME.test(manifest.modelFile) ||
      typeof manifest.sha256!=='string' || !SHA256.test(manifest.sha256)) {
    return deny('manifest-invalid-or-rights-unverified');
  }
  try {
    const root = realpathSync(directory);
    const modelPath = realpathSync(join(root,manifest.modelFile));
    const rel = relative(root,modelPath);
    if (!rel || rel.startsWith('..'+sep) || rel==='..' || isAbsolute(rel)) return deny('model-outside-root');
    const stats = statSync(modelPath);
    if (!stats.isFile() || stats.size<1024 || stats.size>MAX_MODEL_BYTES) return deny('invalid-model-size');
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(modelPath)) digest.update(chunk);
    const hash = digest.digest('hex');
    if (hash !== manifest.sha256) return deny('model-sha256-mismatch');
    return Object.freeze({
      packageIntegrityVerified:true, usableForResearch:false, usableForProduction:false,
      reason:'model-hash-matches-self-declared-license-but-runtime-and-listening-not-validated',
      offlineOnly:true,humanListeningRequired:true
    });
  } catch {
    return deny('model-missing-or-unreadable');
  }
}
