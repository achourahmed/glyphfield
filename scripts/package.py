from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import shutil

root = Path(__file__).resolve().parents[1]
skill = root / 'skills/acubic-glyph-hero'
downloads = root / 'showcase/downloads'
downloads.mkdir(exist_ok=True)
shutil.copy2(skill / 'SKILL.md', downloads / 'SKILL.md')
for folder, filename, prefix in [(skill, 'acubic-glyph-hero.zip', 'acubic-glyph-hero'), (skill / 'assets/starter', 'hero-starter.zip', 'hero-starter')]:
    with ZipFile(downloads / filename, 'w', ZIP_DEFLATED) as archive:
        for path in sorted(folder.rglob('*')):
            if path.is_file() and not any(part.startswith('.') for part in path.relative_to(folder).parts):
                archive.write(path, str(Path(prefix) / path.relative_to(folder)))
    print(f'Built {filename}')
