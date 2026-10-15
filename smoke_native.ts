import { selectProviders } from './lib/image-providers/registry';
import './lib/image-providers/toapis';
import { readFile } from 'node:fs/promises';
const job=JSON.parse(await readFile(0,'utf8'));
const providers=selectProviders({refCount:0,prefer:'toapis-image'});
const provider=providers.find(p=>p.id==='toapis-image');
if(!provider)throw new Error('ToAPIs was not selected by the native registry');
const result=await provider.generate({prompt:job.prompt,aspectRatio:'1:1'});
console.log(JSON.stringify(result));
