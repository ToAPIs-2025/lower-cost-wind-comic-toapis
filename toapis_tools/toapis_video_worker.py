"""Grok 1.5 I2V only: exact quote, durable task ID, no POST retries."""
import json,os,sys,time,uuid,hashlib
from pathlib import Path
from toapis_async import ToAPIsClient
def run(job):
    c=ToAPIsClient(os.environ.get('TOAPIS_API_KEY'),os.environ.get('TOAPIS_BASE_URL','https://toapis.com'))
    model='grok-video-1.5';duration=4;resolution='480p'
    if job.get('duration',4)!=4 or job.get('resolution','480p')!='480p':raise ValueError('Only verified 4s / 480p preset is enabled')
    data=c._json('pricing?model='+model)
    rows=[p for item in data['data'] if item['id']==model for p in item['prices'] if p['unit']=='second' and p['conditions'].get('resolution')==resolution and p['conditions'].get('duration') in (4,'4s','4') and p['conditions'].get('input_image_count')==1]
    if not rows:raise ValueError('Exact video quote unavailable')
    quote=max(float(p['unit_price']) for p in rows)*duration
    if quote>.25:raise ValueError('Video quote exceeds $0.25 cap')
    image=job.get('image_url')
    if not image or not image.startswith('https://'):raise ValueError('One HTTPS first-frame image is required')
    body={'model':model,'prompt':job['prompt'],'image':image,'duration':duration,'resolution':resolution,'aspect_ratio':job.get('aspect_ratio','1:1')}
    ident=hashlib.sha256(json.dumps(body,sort_keys=True).encode()+job.get('run_id','manual').encode()).hexdigest()
    f=c.state/('video-'+ident+'.json');r=json.loads(f.read_text()) if f.exists() else None
    def save():f.write_text(json.dumps(r,ensure_ascii=False,indent=2),encoding='utf-8')
    if r and not r.get('task_id'):raise RuntimeError('Uncertain prior submission; reconcile first')
    if not r:
        r={'state':'submitting','task_id':None,'request':{**body,'image':'<public first-frame URL omitted>'},'quote_usd':quote,'billing':None,'actual_charge_usd':None};save()
        task=c._json('videos/generations',body);r.update(state='submitted',task_id=task.get('id'));save()
        if not r['task_id']:raise RuntimeError('Missing task ID; no retry')
    started=time.monotonic()
    while time.monotonic()-started<900:
        task=c._json('videos/generations/'+r['task_id']);r.update(state=task.get('status'),billing=task.get('billing'));save()
        if r['state']=='completed':
            result=task.get('result') or {};rows=result.get('data') or [];url=rows[0].get('url') if rows else result.get('url')
            if not url or not url.startswith('https://'):raise RuntimeError('No recognized HTTPS video result')
            r['result_url']=url;save();return {'videoUrl':url,'provider':'toapis-video','upstreamId':r['task_id'],'durationSec':4}
        if r['state'] in ('failed','cancelled','expired'):raise RuntimeError('Terminal task failure; no retry')
        time.sleep(8)
    raise RuntimeError('Video pending; query saved task ID')
if __name__=='__main__':print(json.dumps(run(json.load(sys.stdin))))
