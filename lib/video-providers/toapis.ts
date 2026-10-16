import type { VideoProvider } from './types';
import { registerVideoProvider } from './registry';
import { generateToAPIsVideo } from '../../toapis_tools/toapis_bridge.mjs';
export const toapisVideoProvider:VideoProvider={
 id:'toapis-video',name:'ToAPIs Seedance I2V',priority:900,
 supportsImage2Video:true,supportsText2Video:false,supportsLastFrame:false,supportsSubjectReference:false,maxDurationSec:4,supportsNativeAudio:false,
 available:()=>Boolean(process.env.TOAPIS_API_KEY) && process.env.TOAPIS_ENABLE_VIDEO==='1',
 generate:async input=>{
  if(input.lastFrameUrl||input.subjectReferences?.length||input.referenceImages?.length||input.nativeAudio||input.spokenDialogue)throw new Error('Unmapped video options');
  return await generateToAPIsVideo({model:process.env.TOAPIS_VIDEO_MODEL||'seedance-2-mini',model:process.env.TOAPIS_VIDEO_MODEL||'seedance-2-mini',model:process.env.TOAPIS_VIDEO_MODEL||'seedance-2-mini',model:process.env.TOAPIS_VIDEO_MODEL||'seedance-2-mini',prompt:input.prompt,image_url:input.firstFrameUrl,duration:input.durationSec||4,resolution:input.resolution||'480p',aspect_ratio:input.aspectRatio||'1:1',run_id:process.env.TOAPIS_RUN_ID||'manual'});
 }
};
registerVideoProvider(toapisVideoProvider);
