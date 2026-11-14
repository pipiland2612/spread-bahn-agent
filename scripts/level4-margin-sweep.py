from pathlib import Path
import concurrent.futures,json,subprocess,sys
repo=Path(__file__).resolve().parents[1];work=repo.parent
phase=sys.argv[1]
configs=[('baseline','1','.75','1.2'),('price110','1.1','.65','1.35'),('price115','1.15','.65','1.5'),('price120','1.2','.65','1.5')] if phase=='tune' else json.loads((work/'margin4-holdout-configs.json').read_text())
def run(task):
 name,price,opening,share,seed=task
 result=subprocess.run(['node','--env-file=.env','src/run.ts','--level','4','--seed',seed,'--network','offers','--fee-mode','legacy','--quote-mode','options','--quote-multiplier',price,'--opening',opening,'--reference-share',share],cwd=repo,capture_output=True,text=True)
 ids=[line.split()[-1] for line in result.stdout.splitlines() if line.startswith('Practice world ')]
 (work/f'{seed}-{name}.log').write_text(result.stdout+result.stderr)
 if not ids: raise RuntimeError(f'No world: {seed}/{name}')
 d=json.loads((repo/'results'/f'{ids[0]}.json').read_text())
 row={'config':name,'seed':seed,'worldId':ids[0],'settings':{'price':price,'opening':opening,'share':share},'exit':result.returncode,'score':d.get('score'),'complete':d['stats']['complete'],'refused':len(d['stats']['refused'])}
 print(json.dumps(row),flush=True)
 if result.returncode: raise RuntimeError(f'Failed world preserved: {ids[0]}')
 return row
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool: rows=list(pool.map(run,[(*c,f'margin4-{phase}-{i}') for c in configs for i in range(1,4)]))
(work/f'margin4-{phase}.json').write_text(json.dumps(rows,indent=2))
