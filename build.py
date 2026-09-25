"""Build editable files and a fully offline, single-file HTML artifact."""
from pathlib import Path
import base64, re, json
root=Path(__file__).resolve().parent
css=(root/'styles.css').read_text(encoding='utf-8')
jobs_css=(root/'jobs-panel.css').read_text(encoding='utf-8')
# The desktop reference artboard scales as a unit; do not reflow just one panel.
jobs_css=jobs_css.split('@media')[0].replace("font-family:Arial,'Malgun Gothic',sans-serif",'font-family:inherit')
(root/'jobs-panel.css').write_text(jobs_css,encoding='utf-8')
jobs=(root/'jobs-panel.html').read_text(encoding='utf-8').replace('<section class="jobs-panel"','<section id="job-results" class="jobs-panel"',1)
template=(root/'index.template.html').read_text(encoding='utf-8').replace('<!-- JOBS_PANEL -->',jobs)
(root/'index.html').write_text(template,encoding='utf-8')
standalone=template.replace('<link rel="stylesheet" href="styles.css">','<style>'+css+'\n'+jobs_css+'</style>').replace('<link rel="stylesheet" href="jobs-panel.css">','')
for filename,mime in [('NotoSansKR.ttf','font/ttf'),('startin-symbol.png','image/png')]:
    data=base64.b64encode((root/'assets'/filename).read_bytes()).decode('ascii')
    standalone=standalone.replace('assets/'+filename,'data:'+mime+';base64,'+data)
art=base64.b64encode((root/'assets'/'reference.png').read_bytes()).decode('ascii')
# A large data URI exceeds Chromium's CSS custom-property token limit.
# Decode the original PNG once into a short, local Blob URL instead.
image_loader="<script>(()=>{const s=atob('"+art+"');const b=new Uint8Array(s.length);for(let i=0;i<s.length;i++)b[i]=s.charCodeAt(i);document.documentElement.style.setProperty('--art','url(\"'+URL.createObjectURL(new Blob([b],{type:'image/png'}))+'\")');})();</script>"
standalone=standalone.replace('</head>',image_loader+'\n</head>')
standalone=standalone.replace('<script src="app.js"></script>','<script>'+(root/'app.js').read_text(encoding='utf-8')+'</script>')
standalone=standalone.replace('</head>','<!-- Bundled font license:\n'+(root/'assets'/'OFL.txt').read_text(encoding='utf-8').replace('--','—')+'\n-->\n</head>')
(root/'STARTIN_1920x1080.html').write_text(standalone,encoding='utf-8')
print(json.dumps({'standalone_bytes':len(standalone.encode('utf-8')),'master_canvas':'1920x1080','result':'built'},ensure_ascii=False))
