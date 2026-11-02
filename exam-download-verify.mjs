/** v2.81: Fail-closed verification of server-owned exam ZIP/PDF before saving locally.
 * Runs only in the browser. Do not log, store or transmit private exam bytes.
 */
const LIMIT = 24 * 1024 * 1024;
const FORMATS = Object.freeze({
 zip:{mime:'application/zip',digest:'x-package-sha256',signature:[0x50,0x4b,0x03,0x04]},
 pdf:{mime:'application/pdf',digest:'x-document-sha256',signature:[0x25,0x50,0x44,0x46,0x2d]}
});
function hex(bytes){return [...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function verifyExamDownload(response,{format,maxBytes=LIMIT}={}){
 const spec=FORMATS[format];
 if(!spec||!Number.isSafeInteger(maxBytes)||maxBytes<1||maxBytes>LIMIT)throw Error('Dosya doğrulama parametreleri geçersiz.');
 if(!response?.ok)throw Error('Onaylı çıktı sunucudan alınamadı.');
 if(response.headers?.get('content-type')!==spec.mime)throw Error('Sunucu dosya biçimi beklendiği gibi değil.');
 const expected=response.headers?.get(spec.digest);
 if(typeof expected!=='string'||!/^[a-f0-9]{64}$/.test(expected))throw Error('Sunucu dosya bütünlük özeti geçersiz.');
 const lengthHeader=response.headers?.get('content-length');
 if(!lengthHeader||!/^[1-9]\d*$/.test(lengthHeader))throw Error('Dosya boyutu bildirimi geçersiz.');
 const declared=Number(lengthHeader);
 if(!Number.isSafeInteger(declared)||declared>maxBytes)throw Error('Sınav çıktısı güvenli boyut sınırını aşıyor.');
 const bytes=new Uint8Array(await response.arrayBuffer());
 if(bytes.length!==declared)throw Error('Dosya eksik veya beklenenden büyük geldi.');
 if(bytes.length<spec.signature.length||!spec.signature.every((n,i)=>bytes[i]===n))throw Error('Dosyanın içerik imzası geçersiz.');
 if(!globalThis.crypto?.subtle)throw Error('Bu tarayıcıda yerel SHA-256 doğrulaması kullanılamıyor.');
 const actual=hex(await globalThis.crypto.subtle.digest('SHA-256',bytes));
 if(actual!==expected)throw Error('İndirilen dosya sunucu özetiyle eşleşmiyor.');
 return {bytes,sha256:actual,mime:spec.mime};
}
