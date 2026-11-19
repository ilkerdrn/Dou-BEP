// Testler sabit port yerine boş bir port alır (rastgele port kullanan diğer test dosyalarıyla çakışmasın).
import {createServer} from 'node:net';
export async function freePort(){const s=createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
