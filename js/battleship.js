// Chat battleship: chat votes on where to fire with "!fire e4" (or "!shoot e4").
// The most voted target after each window is hit. Sink the whole hidden fleet before running out of shots.
(() => {
    const SIZE = 8;
    const FILES = 'abcdefgh';
    const FLEET = [4, 3, 3, 2];
    const SHOTS = 36;

    // ---------- rules ----------
    // board: { ships: [{ cells: [i...], hits }], shots: Map(index -> 'hit' | 'miss') }
    function newBoard(rng = Math.random) {
        const taken = new Set();
        const ships = [];
        for (const length of FLEET) {
            for (;;) {
                const horizontal = rng() < 0.5;
                const x = Math.floor(rng() * (horizontal ? SIZE - length + 1 : SIZE));
                const y = Math.floor(rng() * (horizontal ? SIZE : SIZE - length + 1));
                const cells = Array.from({ length }, (_, k) => (y + (horizontal ? 0 : k)) * SIZE + x + (horizontal ? k : 0));
                if (cells.some(c => taken.has(c))) continue;
                cells.forEach(c => taken.add(c));
                ships.push({ cells, hits: 0 });
                break;
            }
        }
        return { ships, shots: new Map() };
    }
    // returns 'hit' | 'sunk' | 'miss' | 'noop'
    function fire(board, i) {
        if (board.shots.has(i)) return 'noop';
        const ship = board.ships.find(s => s.cells.includes(i));
        if (!ship) { board.shots.set(i, 'miss'); return 'miss'; }
        board.shots.set(i, 'hit');
        ship.hits++;
        return ship.hits === ship.cells.length ? 'sunk' : 'hit';
    }
    const won = board => board.ships.every(s => s.hits === s.cells.length);

    // "fire e4" / "shoot e4" -> index or null
    function parseCommand(text) {
        const m = text.trim().match(/^!(fire|shoot)\s+([a-h])\s*([1-8])$/i);
        if (!m) return null;
        return (SIZE - +m[3]) * SIZE + FILES.indexOf(m[2].toLowerCase()); // row 1 is the bottom
    }
    const cellName = i => FILES[i % SIZE] + (SIZE - Math.floor(i / SIZE));

    const engine = { SIZE, FLEET, SHOTS, newBoard, fire, won, parseCommand, cellName };
    if (typeof module !== 'undefined') module.exports = engine;
    if (typeof document === 'undefined') return;

    // ---------- UI + chat voting ----------
    const VOTE_MS = 15000;
    const NEW_GAME_DELAY_MS = 10000;
    const panel = document.getElementById('battleship');
    if (!panel) return;
    const statusEl = panel.querySelector('.ship-status');
    const gridEl = panel.querySelector('.ship-grid');
    const votesEl = panel.querySelector('.ship-votes');
    const scoreEl = panel.querySelector('.ship-score');

    const score = JSON.parse(localStorage.getItem('battleship_score') || '{"wins":0,"losses":0}');
    let board, votes, voteEndsAt, over, shotsLeft;

    const cells = [];
    gridEl.append(document.createElement('div'));
    for (const f of FILES) {
        const label = document.createElement('div');
        label.className = 'ship-label';
        label.textContent = f;
        gridEl.append(label);
    }
    for (let y = 0; y < SIZE; y++) {
        const label = document.createElement('div');
        label.className = 'ship-label';
        label.textContent = SIZE - y;
        gridEl.append(label);
        for (let x = 0; x < SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'ship-cell';
            gridEl.append(cell);
            cells.push(cell);
        }
    }

    function newGame() {
        board = newBoard();
        votes = new Map();
        voteEndsAt = Date.now() + VOTE_MS;
        shotsLeft = SHOTS;
        over = false;
        render();
    }

    function render() {
        const reveal = new Set(over ? board.ships.flatMap(s => s.cells) : []);
        cells.forEach((el, i) => {
            const shot = board.shots.get(i);
            el.className = 'ship-cell';
            if (shot) el.classList.add(shot);
            else if (reveal.has(i)) el.classList.add('reveal');
            el.textContent = shot === 'hit' ? '💥' : shot === 'miss' ? '🌊' : reveal.has(i) ? '🚢' : '';
        });
        scoreEl.textContent = `Chat ${score.wins} wins – ${score.losses} losses`;
        renderVotes();
    }

    function renderVotes() {
        const tally = new Map();
        for (const v of votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        votesEl.replaceChildren(...top.map(([index, n]) => {
            const li = document.createElement('li');
            li.textContent = `fire ${cellName(+index)} — ${n}`;
            return li;
        }));
    }

    function finish(win) {
        over = true;
        if (win) { score.wins++; if (window.battleshipWin) window.battleshipWin(); }
        else score.losses++;
        localStorage.setItem('battleship_score', JSON.stringify(score));
        statusEl.textContent = win ? 'Fleet sunk! Chat wins! New game soon…' : 'Out of shots! New game soon…';
        render();
        setTimeout(newGame, NEW_GAME_DELAY_MS);
    }

    function endVoting() {
        const tally = new Map();
        for (const v of votes.values()) tally.set(v, (tally.get(v) || 0) + 1);
        if (!tally.size) { voteEndsAt = Date.now() + VOTE_MS; return; } // nobody voted, keep waiting
        const most = Math.max(...tally.values());
        const winners = [...tally].filter(([, n]) => n === most).map(([key]) => key);
        const index = +winners[Math.floor(Math.random() * winners.length)];
        votes = new Map();
        voteEndsAt = Date.now() + VOTE_MS;
        fire(board, index);
        shotsLeft--;
        if (won(board)) return finish(true);
        if (shotsLeft <= 0) return finish(false);
        render();
    }

    setInterval(() => {
        if (over) return;
        const left = Math.max(0, Math.ceil((voteEndsAt - Date.now()) / 1000));
        const afloat = board.ships.filter(s => s.hits < s.cells.length).length;
        statusEl.textContent = `🚢 ${afloat} afloat · 🎯 ${shotsLeft} shots · !fire e4 — ${left}s`;
        if (!left) endVoting();
    }, 250);

    window.battleshipChat = (user, message) => {
        if (over || !board) return;
        const index = parseCommand(message);
        if (index === null || board.shots.has(index)) return;
        votes.set(user.toLowerCase(), index);
        renderVotes();
    };

    newGame();
})();
