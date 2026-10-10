// Cookie clicker inside the cookie clicker. Each level has its own cookies and a cursor upgrade,
// and buying a portal unlocks another clicker one level deeper (up to MAX_DEPTH).
(() => {
    const MAX_DEPTH = 4;
    const PORTAL_COST = 50;
    const panel = document.getElementById('inception');
    if (!panel) return;

    function level(depth) {
        const root = document.createElement('div');
        root.className = 'inception-level';
        root.innerHTML = `
            <div class=inception-title>Level ${depth}: <span class=inception-count>0</span> 🍪</div>
            <button class=inception-cookie>🍪</button>
            <div class=inception-buttons>
                <button class=inception-cursor></button>
                <button class=inception-portal></button>
            </div>
            <div class=inception-inner></div>`;
        const $ = s => root.querySelector(s);
        let cookies = 0, power = 1, cursors = 0, portal = false;
        const cursorCost = () => 10 * 2 ** cursors;

        const render = () => {
            $('.inception-count').textContent = Math.floor(cookies);
            $('.inception-cursor').textContent = `Cursor +1/s (${cursorCost()})`;
            $('.inception-cursor').disabled = cookies < cursorCost();
            const p = $('.inception-portal');
            p.hidden = portal || depth >= MAX_DEPTH;
            p.textContent = `Open level ${depth + 1} (${PORTAL_COST})`;
            p.disabled = cookies < PORTAL_COST;
        };
        $('.inception-cookie').onclick = () => { cookies += power; render(); };
        $('.inception-cursor').onclick = () => {
            if (cookies < cursorCost()) return;
            cookies -= cursorCost(); cursors++; render();
        };
        $('.inception-portal').onclick = () => {
            if (portal || cookies < PORTAL_COST) return;
            cookies -= PORTAL_COST; portal = true;
            $('.inception-inner').appendChild(level(depth + 1));
            render();
        };
        setInterval(() => { if (cursors) { cookies += cursors; render(); } }, 1000);
        render();
        return root;
    }

    panel.appendChild(level(1));
})();
