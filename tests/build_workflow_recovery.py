"""Build a deterministic source-based compatibility recovery archive. Never deploys."""
import argparse
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile


def git(*args):
    return subprocess.check_output(['git', *args])


def included(name):
    parts=Path(name).parts
    return not (parts[0] in ('.git','.github','tests','scripts','verification')
                or name.endswith('.md') or parts[0].startswith('.env')
                or name=='local.settings.json' or '__pycache__' in parts)


def build(role, baseline, output, dependencies=None):
    head=git('rev-parse','HEAD').decode().strip()
    with zipfile.ZipFile(io.BytesIO(git('archive','--format=zip',baseline))) as source:
        files={p:source.read(p) for p in source.namelist() if not p.endswith('/') and included(p)}
    allowed=({'function_app.py','project_request_changes.py','compliance_corrections.py',
              'migrations/20261023_workflow_corrections.sql',
              'migrations/20261023_compliance_correction_events.sql'} if role=='api' else
             {'compliance-correction.js','compliance.html','my-actions.html',
              'project-management.html','project-request-save.js','project-workspace.html'})
    changed=git('diff','--name-only',baseline,head).decode().splitlines()
    backports=[]
    for path in changed:
        if not included(path):continue
        if path not in allowed:raise RuntimeError('Unreviewed runtime delta: '+path)
        files[path]=git('show',head+':'+path);backports.append(path)
    if dependencies:
        files['requirements-workflow-recovery.lock']=Path('scripts/requirements-workflow-recovery.lock').read_bytes()
        root=Path(dependencies).resolve()
        for path in sorted(root.rglob('*')):
            if not path.is_file() or '__pycache__' in path.parts or path.suffix=='.pyc':continue
            rel=path.relative_to(root)
            if rel.parts[0]=='bin':continue
            files['.python_packages/lib/site-packages/'+rel.as_posix()]=path.read_bytes()
    manifest={'role':role,'deployed_source_baseline':baseline,'compatibility_source':head,
      'compatibility_backports':sorted(backports),
      'independent_feature_rollback':False,
      'limitations':'Source rebuild, not original deployment bytes. Required compatibility runtime matches candidate; no independent rollback of that logic. Retain migrated schema and audit/receipt data.',
      'files':{p:hashlib.sha256(data).hexdigest() for p,data in sorted(files.items())}}
    files['workflow-recovery-manifest.json']=(json.dumps(manifest,sort_keys=True,indent=2)+'\n').encode()
    output=Path(output);output.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as archive:
        for name,data in sorted(files.items()):
            info=zipfile.ZipInfo(name,date_time=(2026,1,1,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
            info.external_attr=0o100644<<16
            archive.writestr(info,data)
    digest=hashlib.sha256(output.read_bytes()).hexdigest()
    output.with_suffix('.sha256').write_text(digest+'  '+output.name+'\n')
    print(json.dumps({'artifact':str(output),'sha256':digest,'source':head,'baseline':baseline}))


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--role',choices=['api','web'],required=True)
    p.add_argument('--baseline',required=True);p.add_argument('--output',required=True);p.add_argument('--dependencies')
    a=p.parse_args();build(a.role,a.baseline,a.output,a.dependencies)
