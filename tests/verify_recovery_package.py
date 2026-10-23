"""Validate extracted Web recovery bytes with synthetic browser journeys."""
import hashlib,json,os
from pathlib import Path
import shutil,subprocess,tempfile,zipfile
root=Path(__file__).resolve().parents[1]
with tempfile.TemporaryDirectory(prefix='workflow-web-recovery-') as directory:
    target=Path(directory)
    with zipfile.ZipFile(root/'recovery/workflow-web.zip') as bundle:
        for name in bundle.namelist():
            if Path(name).is_absolute() or '..' in Path(name).parts:raise RuntimeError('Unsafe archive path')
        bundle.extractall(target)
    manifest=json.loads((target/'workflow-recovery-manifest.json').read_text())
    assert manifest['role']=='web' and manifest['independent_feature_rollback'] is False
    for name,digest in manifest['files'].items():assert hashlib.sha256((target/name).read_bytes()).hexdigest()==digest
    shutil.copytree(root/'tests',target/'tests')
    env={**os.environ,'NODE_PATH':str(root/'node_modules')}
    subprocess.run(['node','--test','tests/workflow-request-save.cjs','tests/project-first-fixes.cjs','tests/project-execution-initialization.cjs'],cwd=target,env=env,check=True)
    subprocess.run(['node','tests/compliance-correction-browser.cjs'],cwd=target,env=env,check=True)
    print('PASS extracted Web recovery package; synthetic draft/retry/resume/resubmit journeys')
