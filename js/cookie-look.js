// Cosmetics for the big cookie: bites appear as you click, and its color shifts every minute.
(() => {
    const cookie = document.getElementById('cookie');
    const img = cookie && cookie.querySelector('img');
    if (!img) return;

    // ---------- bites ----------
    const CLICKS_PER_BITE = 15;
    const MAX_BITES = 8;
    const bites = []; // { angle, radius } in degrees / percent of the image size
    let clicks = 0;

    function renderBites() {
        // Each bite is a few overlapping circles along the rim, which gives it a scalloped edge
        const holes = bites.flatMap(({ angle, size }) => [-1, 0, 1].map(k => {
            const a = (angle + k * 9) * Math.PI / 180;
            const x = 50 + 46 * Math.cos(a), y = 50 + 46 * Math.sin(a);
            const r = size * (k === 0 ? 1 : 0.7);
            return `radial-gradient(circle at ${x}% ${y}%, transparent ${r}%, #000 ${r + 0.5}%)`;
        }));
        const mask = holes.join(',') || 'none';
        img.style.webkitMaskImage = img.style.maskImage = mask;
        img.style.webkitMaskComposite = 'source-in';
        img.style.maskComposite = 'intersect';
    }

    const angleGap = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

    cookie.addEventListener('mousedown', () => {
        if (++clicks % CLICKS_PER_BITE) return;
        if (bites.length >= MAX_BITES) {
            // Eaten up: a fresh cookie takes its place
            bites.length = 0;
        } else {
            // Spread bites around the rim, never right on top of an earlier one
            let angle;
            do { angle = Math.random() * 360; }
            while (bites.some(b => angleGap(angle, b.angle) < 35));
            bites.push({ angle, size: 12 + Math.random() * 6 });
        }
        renderBites();
    });

    // ---------- color ----------
    const TINT_MS = 60000;
    function shiftColor() {
        img.style.setProperty('--tint', `hue-rotate(${Math.floor(Math.random() * 300 + 30)}deg)`);
    }
    setInterval(shiftColor, TINT_MS);
})();
