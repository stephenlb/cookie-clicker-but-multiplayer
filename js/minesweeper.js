// Chat minesweeper: chat votes with "!dig e4" / "!flag e4" (or "!d e4" / "!f e4").
// The most voted action after each window is applied. First dig is always safe.
(() => {
    const SIZE = 9;
    const MINES = 10;
    const FILES = 'abcdefghi';

    // ---------- rules ----------
    // cells: { mine, open, flag, count } laid out row-major, index = y * SIZE + x
    function newBoard() {
        return { cells: Array.from({ length: SIZE * SIZE }, () => ({ mine: false, open: false, flag: false, count: 0 })), placed: false };
    }
    function neighbours(i) {
        const x = i % SIZE, y = Math.floor(i / SIZE);
        const out = [];
        for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
                const nx = x + dx, ny = y + dy;
                if ((dx || dy) && nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE) out.push(ny * SIZE + nx);
            }
        }
        return out;
    }
    function placeMines(board, safe, rng = Math.random) {
        // No mines on the first dug cell or around it, so the first dig always opens something
        const banned = new Set([safe, ...neighbours(safe)]);
        const spots = board.cells.map((_, i) => i).filter(i => !banned.has(i));
        for (let n = 0; n < MINES; n++) {
            const pick = Math.floor(rng() * spots.length);
            board.cells[spots.splice(pick, 1)[0]].mine = true;
        }
        board.cells.forEach((cell, i) => { cell.count = neighbours(i).filter(n => board.cells[n].mine).length; });
        board.placed = true;
    }
    // returns 'boom' | 'ok' | 'noop'
    function dig(board, i, rng) {
        const cell = board.cells[i];
        if (cell.open || cell.flag) return 'noop';
        if (!board.placed) placeMines(board, i, rng);
        if (cell.mine) { cell.open = true; return 'boom'; }
        const stack = [i];
        while (stack.length) {
            const j = stack.pop();
            const c = board.cells[j];
            if (c.open || c.flag) continue;
            c.open = true;
            if (c.count === 0) stack.push(...neighbours(j));
        }
        return 'ok';
    }
    function toggleFlag(board, i) {
        const cell = board.cells[i];
        if (cell.open) return 'noop';
        cell.flag = !cell.flag;
        return 'ok';
    }
    const won = board => board.cells.every(c => c.mine || c.open);

    // "dig e4" / "d e4" / "flag e4" / "f e4" -> { action, index } or null
    function parseCommand(text) {
        const m = text.trim().match(/^!(dig|d|reveal|flag|f)\s+([a-i])\s*([1-9])$/i);
        if (!m) return null;
        const x = FILES.indexOf(m[2].toLowerCase());
        const y = SIZE - +m[3]; // row 1 is the bottom, like chess
        return { action: /^f/i.test(m[1]) ? 'flag' : 'dig', index: y * SIZE + x };
    }
    const cellName = i => FILES[i % SIZE] + (SIZE - Math.floor(i / SIZE));

    const engine = { SIZE, MINES, newBoard, dig, toggleFlag, won, parseCommand, cellName, neighbours };
    if (typeof module !== 'undefined') module.exports = engine;
    if (typeof document === 'undefined') return;

    // ---------- UI + chat voting ----------
    const VOTE_MS = 20000;
    const NEW_GAME_DELAY_MS = 10000;
    const panel = document.getElementById('minesweeper');
    if (!panel) return;
    const statusEl = panel.querySelector('.mines-status');
    const gridEl = panel.querySelector('.mines-grid');
    const votesEl = panel.querySelector('.mines-votes');
    const scoreEl = panel.querySelector('.mines-score');

    const score = JSON.parse(localStorage.getItem('minesweeper_score') || '{"wins":0,"losses":0}');
    let board, votes, voteEndsAt, over, exploded;

    // 10x10 grid: a header row of letters, then each row starts with its number
    const cells = [];
    gridEl.append(document.createElement('div'));
    for (const f of FILES) {
        const label = document.createElement('div');
        label.className = 'mines-label';
        label.textContent = f;
        gridEl.append(label);
    }
    for (let y = 0; y < SIZE; y++) {
        const label = document.createElement('div');
        label.className = 'mines-label';
        label.textContent = SIZE - y;
        gridEl.append(label);
        for (let x = 0; x < SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'mines-cell';
            gridEl.append(cell);
            cells.push(cell);
        }
    }

    function newGame() {
        board = newBoard();
        votes = new Map();
        voteEndsAt = Date.now() + VOTE_MS;
        over = false;
        exploded = -1;
        render();
    }

    function render() {
        board.cells.forEach((c, i) => {
            const el = cells[i];
            const showMine = over && c.mine;
            el.className = 'mines-cell';
            if (c.open || showMine) el.classList.add('open');
            if (i === exploded) el.classList.add('boom');
            if (c.open && !c.mine && c.count) el.classList.add(`n${c.count}`);
            el.textContent = showMine && !c.flag ? '💣' : c.flag ? '🚩' : c.open && !c.mine && c.count ? c.count : '';
        });
        scoreEl.textContent = `Chat ${score.wins} wins – ${score.losses} blown up`;
        renderVotes();
    }

    function renderVotes() {
        const tally = new Map();
        for (const v of votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        votesEl.replaceChildren(...top.map(([key, n]) => {
            const li = document.createElement('li');
            const [action, index] = key.split(':');
            li.textContent = `${action} ${cellName(+index)} — ${n}`;
            return li;
        }));
    }

    function finish(win) {
        over = true;
        if (win) { score.wins++; if (window.minesweeperWin) window.minesweeperWin(); }
        else score.losses++;
        localStorage.setItem('minesweeper_score', JSON.stringify(score));
        statusEl.textContent = win ? 'Cleared! Chat wins! New game soon…' : 'BOOM! New game soon…';
        render();
        setTimeout(newGame, NEW_GAME_DELAY_MS);
    }

    function endVoting() {
        const tally = new Map();
        for (const v of votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
        if (!tally.size) { voteEndsAt = Date.now() + VOTE_MS; return; } // nobody voted, keep waiting
        const most = Math.max(...tally.values());
        const winners = [...tally].filter(([, n]) => n === most).map(([key]) => key);
        const [action, index] = winners[Math.floor(Math.random() * winners.length)].split(':');
        votes = new Map();
        voteEndsAt = Date.now() + VOTE_MS;
        if (action === 'flag') { toggleFlag(board, +index); return render(); }
        const result = dig(board, +index);
        if (result === 'boom') { exploded = +index; return finish(false); }
        if (won(board)) return finish(true);
        render();
    }

    setInterval(() => {
        if (over) return;
        const left = Math.max(0, Math.ceil((voteEndsAt - Date.now()) / 1000));
        const flags = board.cells.filter(c => c.flag).length;
        statusEl.textContent = `💣 ${MINES - flags} · !dig e4 / !flag e4 — ${left}s`;
        if (!left) endVoting();
    }, 250);

    window.minesweeperChat = (user, message) => {
        if (over || !board) return;
        const cmd = parseCommand(message);
        if (!cmd) return;
        const cell = board.cells[cmd.index];
        if (cell.open || (cmd.action === 'dig' && cell.flag)) return;
        votes.set(user.toLowerCase(), `${cmd.action}:${cmd.index}`);
        renderVotes();
    };

    newGame();
})();
