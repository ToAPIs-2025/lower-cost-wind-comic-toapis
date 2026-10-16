import json,os,sys
from seedance_client import Client
def run(job):
 if job.get('duration',4)!=4 or job.get('resolution','480p')!='480p' or job.get('aspect_ratio','1:1')!='1:1':raise ValueError('Only tested 4s/480p/1:1 is enabled')
 c=Client(job['run_id']);b={'model':job.get('model','seedance-2-mini'),'prompt':job['prompt'],'duration':4,'resolution':'480p','aspect_ratio':'1:1','generate_audio':False,'image_with_roles':[{'url':job['image_url'],'role':'first_frame'}]}
 tid=c.submit(b);url=c.poll(tid)
 return {'videoUrl':url,'provider':'toapis-video','upstreamId':tid}
if __name__=='__main__':print(json.dumps(run(json.load(sys.stdin))))
