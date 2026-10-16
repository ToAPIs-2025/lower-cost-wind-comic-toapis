"""Opt-in 4s/480p Seedance examples. Private durable state; no submission retries."""
from pathlib import Path
from decimal import Decimal
from urllib.parse import urlparse,quote
import json,os,urllib.request,urllib.error,time,hashlib

MODELS=('seedance-2','seedance-2-mini','seedance-2-5')
class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self,*args,**kwargs):return None
class Client:
 def __init__(self,run_id):
  self.key=os.environ['TOAPIS_API_KEY'];self.origin=os.environ.get('TOAPIS_BASE_URL','https://toapis.com').removesuffix('/v1').rstrip('/')
  if self.origin not in ('https://toapis.com','https://toapis.cn'):raise ValueError('Use the ToAPIs HTTPS origin')
  self.run_id=run_id;self.folder=Path(os.environ.get('TOAPIS_STATE_DIR','.toapis-state'));self.folder.mkdir(parents=True,exist_ok=True)
  self.path=self.folder/(hashlib.sha256(run_id.encode()).hexdigest()+'.json');self.http=urllib.request.build_opener(NoRedirect);self.receipt=None
 def api(self,path,body=None):
  req=urllib.request.Request(self.origin+'/v1/'+path,data=json.dumps(body).encode() if body is not None else None,headers={'Authorization':'Bearer '+self.key,'Content-Type':'application/json'},method='POST' if body is not None else 'GET')
  try:
   with self.http.open(req,timeout=75) as r:return json.load(r)
  except urllib.error.HTTPError as e:raise RuntimeError('ToAPIs HTTP '+str(e.code)+'; inspect private state, do not resubmit') from None
 def save(self):
  temp=self.path.with_suffix('.tmp');temp.write_text(json.dumps(self.receipt,ensure_ascii=False,indent=2),encoding='utf-8');os.replace(temp,self.path)
 def submit(self,body):
  b=dict(body);model=b.get('model')
  if model not in MODELS or b.get('duration')!=4 or b.get('resolution')!='480p' or b.get('aspect_ratio')!='1:1' or b.get('generate_audio') is not False:raise ValueError('Only listed Seedance models, 4s/480p/1:1/no audio are enabled')
  if bool(b.get('image_urls'))==bool(b.get('image_with_roles')):raise ValueError('Provide exactly one first-frame field')
  if b.get('image_urls') and len(b['image_urls'])!=1:raise ValueError('One first frame only')
  if b.get('image_with_roles') and (len(b['image_with_roles'])!=1 or b['image_with_roles'][0].get('role')!='first_frame'):raise ValueError('One first frame only')
  b['client_business_id']=self.run_id
  prior=json.loads(self.path.read_text(encoding='utf-8')) if self.path.exists() else None
  if prior:
   if prior['request']!=b:raise RuntimeError('Saved request differs; do not resubmit')
   self.receipt=prior
   if not prior.get('task_id'):raise RuntimeError('Prior submission uncertain; reconcile Task Logs')
   return prior['task_id']
  catalog=self.api('pricing?model='+model)
  matches=[p for d in catalog.get('data',[]) if d.get('id')==model for p in d.get('prices',[]) if p.get('conditions',{}).get('resolution')=='480p' and str(p.get('conditions',{}).get('duration','')).removesuffix('s')=='4' and not p.get('conditions',{}).get('has_video_input',False) and not p.get('conditions',{}).get('has_audio_input',False)]
  if not matches or any(p['unit']!='1m_tokens' or p['price_basis']!='total_tokens' for p in matches):raise ValueError('Exact total-token price unavailable')
  rate=max(Decimal(p['unit_price']) for p in matches);estimate=Decimal(38400)*rate/Decimal(1000000)
  cap=Decimal(os.environ.get('TOAPIS_MAX_VIDEO_USD','0.5'))
  if estimate>cap or cap>Decimal('1'):raise ValueError('Output-token estimate exceeds explicit example cap')
  self.receipt={'run_id':self.run_id,'request':b,'task_id':None,'state':'submitting','quote_usd_per_million_tokens':str(rate),'estimated_output_tokens':38400,'catalog_estimate_usd':str(estimate),'reserved_usd':str(cap),'billing':None,'observations':[]}
  with self.path.open('x',encoding='utf-8') as f:json.dump(self.receipt,f,ensure_ascii=False,indent=2)
  try:t=self.api('videos/generations',b)
  except Exception:
   self.receipt['state']='submission_uncertain_no_retry';self.save();raise
  self.receipt.update(task_id=t.get('id'),state=t.get('status','submitted'));self.save()
  if not self.receipt['task_id']:raise RuntimeError('Task ID unavailable; no retry')
  return self.receipt['task_id']
 def poll(self,task_id):
  start=time.monotonic()
  while time.monotonic()-start<900:
   t=self.api('videos/generations/'+quote(task_id,safe=''))
   if t.get('model') and t['model']!=self.receipt['request']['model']:raise RuntimeError('Returned model mismatch')
   self.receipt.update(state=t.get('status'),billing=t.get('billing'),last_response=t)
   self.receipt['observations'].append({'status':t.get('status'),'billing':t.get('billing')});self.save()
   if t.get('status')=='completed':
    url=t['result']['data'][0]['url'];self.receipt['result_url']=url;self.save();return url
   if t.get('status') in ('failed','cancelled','expired'):raise RuntimeError('Terminal task failure; no retry')
   time.sleep(10)
  raise RuntimeError('Still pending; query saved task, do not resubmit')
 def download(self,url):
  u=urlparse(url)
  if u.scheme!='https' or u.username or u.password:raise ValueError('Unsafe asset URL')
  with self.http.open(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Accept':'video/*'}),timeout=120) as r:raw=r.read(128*1024*1024+1)
  if len(raw)>128*1024*1024 or b'ftyp' not in raw[:40] or self.key.encode() in raw:raise RuntimeError('Invalid video result')
  return raw
 def run(self,job):
  body={'model':job['model'],'prompt':job['prompt'],'duration':4,'resolution':'480p','aspect_ratio':'1:1','generate_audio':False,'image_with_roles':[{'url':job['image'],'role':'first_frame'}]}
  task=self.submit(body);url=self.poll(task);return self.download(url)
