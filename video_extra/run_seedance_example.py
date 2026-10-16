"""Default is a dry run. Supply --live and a private API key for one paid task."""
from pathlib import Path
import argparse,json
from seedance_client import Client
def main():
 p=argparse.ArgumentParser();p.add_argument('--job',required=True);p.add_argument('--live',action='store_true');a=p.parse_args()
 job=json.loads(Path(a.job).read_text(encoding='utf-8'))
 if not a.live:print(json.dumps({'dry_run':True,'job':job}));return
 client=Client(job['run_id']);raw=client.run(job);out=Path(job.get('output','seedance-result.mp4'));out.parent.mkdir(parents=True,exist_ok=True);out.write_bytes(raw)
 print(json.dumps({'model':job['model'],'status':'completed','output':str(out),'billing_status':(client.receipt.get('billing') or {}).get('status'),'cost_usd':(client.receipt.get('billing') or {}).get('cost_usd')}))
if __name__=='__main__':main()
