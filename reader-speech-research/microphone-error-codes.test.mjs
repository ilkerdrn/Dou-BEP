import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyAudioCaptureFailure} from './local-voice-capture.mjs';

test('DirectShow missing output pin is classified without leaking raw device names',()=>{
 const message='Could not find output pin from audio only capture device.\n'+
  'Could not find audio only device with name [Microphone Array (Realtek(R) Audio)] among source devices of type video.\n'+
  'Error opening input file audio=Microphone Array (Realtek(R) Audio).';
 assert.equal(classifyAudioCaptureFailure(message),'dshow-audio-device-open-failed');
 assert.equal(classifyAudioCaptureFailure('Error opening input file audio=Private Microphone'),
  'dshow-audio-device-open-failed');
});
test('audio failure classifier handles permissions, busy devices and timeout',()=>{
 assert.equal(classifyAudioCaptureFailure('Access is denied'),'microphone-permission-denied');
 assert.equal(classifyAudioCaptureFailure('Device or resource busy'),'microphone-device-busy');
 assert.equal(classifyAudioCaptureFailure('',{code:'ETIMEDOUT'}),'microphone-capture-timeout');
 assert.equal(classifyAudioCaptureFailure('',{code:'ENOENT'}),'microphone-process-start-failed');
 assert.equal(classifyAudioCaptureFailure('unknown'),'microphone-capture-failed');
});
test('audio failure classifier never echoes arbitrary stderr, paths or secrets',()=>{
 const secret='C:\\Users\\Example\\PrivateAudio\\microphone.wav';
 const code=classifyAudioCaptureFailure('Access denied: '+secret);
 assert.equal(code,'microphone-permission-denied');
 assert.equal(code.includes(secret),false);
});
