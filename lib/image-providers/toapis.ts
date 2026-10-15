import type { ImageProvider } from './types';
import { registerImageProvider } from './registry';
import { generateToAPIsImage } from '../../toapis_tools/toapis_bridge.mjs';
export const toapisImageProvider:ImageProvider={
 id:'toapis-image',name:'ToAPIs async images',supportsRefs:false,maxRefImages:0,priority:900,
 available:()=>Boolean(process.env.TOAPIS_API_KEY),
 generate:async input=>{
  if(input.referenceImages?.length || input.cref || input.sref)throw new Error('Reference mapping is not enabled');
  if(input.aspectRatio && input.aspectRatio!=='1:1')throw new Error('Only verified square preset is enabled');
  const r=await generateToAPIsImage({model:process.env.TOAPIS_IMAGE_MODEL||'gpt-image-2-vip',prompt:input.prompt,run_id:process.env.TOAPIS_RUN_ID||'manual'});
  if(!/^https:\/\//.test(r.url))throw new Error('Expected HTTPS result URL');
  return {imageUrl:r.url,provider:'toapis-image',upstreamId:r.task_id};
 }
};
registerImageProvider(toapisImageProvider);
