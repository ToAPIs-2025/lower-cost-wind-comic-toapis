import { selectProviders as selectVideoProviders } from './lib/video-providers/registry';
import './lib/video-providers/toapis';
let body='';for await(const c of process.stdin)body+=c;const job=JSON.parse(body);
const p=selectVideoProviders({hasFirstFrame:true,hasLastFrame:false,hasSubjectReference:false,durationSec:4,prefer:'toapis-video'}).find(p=>p.id==='toapis-video');
if(!p)throw new Error('Native video registry did not select ToAPIs');
console.log(JSON.stringify(await p.generate(job)));
