"""Build editable index.html and a convenient preview HTML from source files."""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parent


def read(name: str) -> str:
    return (ROOT / name).read_text(encoding='utf-8')


def main() -> None:
    template = read('index.template.html')
    jobs = read('jobs-panel.html').replace(
        '<section class="jobs-panel"',
        '<section id="job-results" class="jobs-panel"',
        1,
    )
    page = template.replace('<!-- JOBS_PANEL -->', jobs)

    # Editable build: keeps CSS/JS/assets as separate files.
    (ROOT / 'index.html').write_text(page, encoding='utf-8')

    # Preview build: CSS/JS are inlined, image/font assets remain in assets/.
    # The font itself is intentionally not embedded into this HTML.
    preview = page.replace(
        '<link rel="stylesheet" href="styles.css">',
        f'<style>\n{read("styles.css")}\n{read("jobs-panel.css")}\n</style>',
    ).replace('<link rel="stylesheet" href="jobs-panel.css">', '')
    preview = preview.replace(
        '<script src="app.js"></script>',
        f'<script>\n{read("app.js")}\n</script>',
    )
    (ROOT / 'STARTIN_1920x1080.html').write_text(preview, encoding='utf-8')

    result = {
        'result': 'built',
        'master_canvas': '1920x1080',
        'index_bytes': (ROOT / 'index.html').stat().st_size,
        'preview_bytes': (ROOT / 'STARTIN_1920x1080.html').stat().st_size,
    }
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
