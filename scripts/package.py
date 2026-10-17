"""Create a portable source ZIP without credentials, runtime records or dependencies."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root = Path(__file__).resolve().parent.parent
out = root / 'artifacts' / 'bookleaf-support.zip'
out.parent.mkdir(exist_ok=True)
excluded = {'node_modules', '.git', 'artifacts', '.cache', 'test-results', 'playwright-report', '__pycache__'}
with ZipFile(out, 'w', ZIP_DEFLATED) as archive:
    for path in sorted(root.rglob('*')):
        relative = path.relative_to(root)
        if not path.is_file() or any(part in excluded for part in relative.parts):
            continue
        if path.name == '.DS_Store' or (path.name.startswith('.env') and path.name != '.env.example'):
            continue
        archive.write(path, Path('bookleaf-support') / relative)
print(out)
