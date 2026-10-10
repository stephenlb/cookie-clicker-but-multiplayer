// Font selector: pick a preset, type any font installed on your computer, or upload your own font file.
(() => {
    const PRESETS = [
        ['Pixel (default)', "'pixel', 'Helvetica Neue'"],
        ['Sans-serif', 'sans-serif'],
        ['Serif', 'serif'],
        ['Monospace', 'monospace'],
        ['Comic Sans', "'Comic Sans MS', 'Comic Neue', cursive"],
        ['Impact', 'Impact, sans-serif'],
        ['Georgia', 'Georgia, serif'],
        ['Courier New', "'Courier New', monospace"],
    ];
    const KEY = 'font';
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null'); // { family } or { family, uploaded: true }
    const apply = family => { document.documentElement.style.fontFamily = family; };

    // An uploaded font file can't be kept in localStorage (too big), so it lasts until the page reloads
    let uploadCount = 0;
    async function loadUpload(file) {
        const name = `custom-upload-${++uploadCount}`;
        const face = new FontFace(name, await file.arrayBuffer());
        document.fonts.add(await face.load());
        return `'${name}', sans-serif`;
    }

    const wrap = document.createElement('div');
    wrap.id = 'font-picker';
    wrap.innerHTML = `
        <button class=font-toggle title="Change font">Aa</button>
        <div class=font-panel hidden>
            <strong>Font</strong>
            <select class=font-preset></select>
            <input class=font-custom placeholder="Any installed font, e.g. Papyrus" maxlength=60>
            <label class=font-upload>Upload font file <input type=file accept=".ttf,.otf,.woff,.woff2" hidden></label>
        </div>`;
    document.body.appendChild(wrap);
    const $ = s => wrap.querySelector(s);
    const select = $('.font-preset');
    PRESETS.forEach(([label, family]) => select.add(new Option(label, family)));

    $('.font-toggle').onclick = () => { $('.font-panel').hidden = !$('.font-panel').hidden; };
    const save = family => { apply(family); localStorage.setItem(KEY, JSON.stringify({ family })); };

    select.onchange = () => { $('.font-custom').value = ''; save(select.value); };
    $('.font-custom').onchange = event => {
        // Strip quotes/semicolons so the name can't break out of the font-family value
        const name = event.target.value.replace(/[^\w \-]/g, '').trim();
        if (name) save(`'${name}', sans-serif`);
        else select.onchange();
    };
    $('.font-upload input').onchange = async event => {
        const file = event.target.files[0];
        if (!file) return;
        try { apply(await loadUpload(file)); } catch (err) { alert('Could not load that font file.'); }
    };

    if (saved && saved.family) {
        apply(saved.family);
        const preset = PRESETS.find(([, family]) => family === saved.family);
        if (preset) select.value = preset[1];
        else $('.font-custom').value = saved.family.split("'")[1] || '';
    }
})();
