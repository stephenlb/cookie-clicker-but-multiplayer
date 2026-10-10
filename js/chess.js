// Chat-vs-computer chess. Chat plays white by voting with "!e4", "!Nf3", "!e2e4" or "!O-O";
// the most voted move after each voting window is played, then the computer answers as black.
(() => {
    const FILES = 'abcdefgh';
    const sqName = i => FILES[i & 7] + (8 - (i >> 3));
    const isWhite = p => p === p.toUpperCase();
    const colorOf = p => (isWhite(p) ? 'w' : 'b');

    // ---------- rules ----------
    // Board is 64 squares, index 0 = a8 ... 63 = h1. State: { board, turn, castling, ep, half }
    function startState() {
        return loadFEN('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0');
    }
    function loadFEN(fen) {
        const [placement, turn, castling, ep, half] = fen.split(' ');
        const board = [];
        for (const ch of placement) {
            if (ch === '/') continue;
            if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) board.push(null);
            else board.push(ch);
        }
        return {
            board,
            turn,
            castling: { K: castling.includes('K'), Q: castling.includes('Q'), k: castling.includes('k'), q: castling.includes('q') },
            ep: ep && ep !== '-' ? FILES.indexOf(ep[0]) + (8 - +ep[1]) * 8 : -1,
            half: +half || 0,
        };
    }

    const KNIGHT = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
    const KING = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
    const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    const ORTHO = [[-1, 0], [1, 0], [0, -1], [0, 1]];

    function attacked(b, sq, by) {
        const r = sq >> 3, c = sq & 7;
        const mine = (p, t) => p === (by === 'w' ? t.toUpperCase() : t);
        const pr = by === 'w' ? r + 1 : r - 1;
        if (pr >= 0 && pr < 8) {
            for (const dc of [-1, 1]) {
                if (c + dc >= 0 && c + dc < 8 && mine(b[pr * 8 + c + dc], 'p')) return true;
            }
        }
        for (const [dr, dc] of KNIGHT) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && mine(b[rr * 8 + cc], 'n')) return true;
        }
        for (const [dr, dc] of KING) {
            const rr = r + dr, cc = c + dc;
            if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && mine(b[rr * 8 + cc], 'k')) return true;
        }
        for (const [dirs, kinds] of [[DIAG, 'bq'], [ORTHO, 'rq']]) {
            for (const [dr, dc] of dirs) {
                let rr = r + dr, cc = c + dc;
                while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                    const p = b[rr * 8 + cc];
                    if (p) {
                        if (kinds.split('').some(k => mine(p, k))) return true;
                        break;
                    }
                    rr += dr; cc += dc;
                }
            }
        }
        return false;
    }

    function pseudoMoves(st) {
        const { board: b, turn, castling, ep } = st;
        const white = turn === 'w';
        const enemy = white ? 'b' : 'w';
        const moves = [];
        const add = (from, to, extra) => moves.push({ from, to, ...extra });
        for (let from = 0; from < 64; from++) {
            const p = b[from];
            if (!p || colorOf(p) !== turn) continue;
            const t = p.toLowerCase();
            const r = from >> 3, c = from & 7;
            if (t === 'p') {
                const dir = white ? -1 : 1;
                const promoRank = white ? 0 : 7;
                const push = (to, extra) => {
                    if ((to >> 3) === promoRank) for (const promo of 'qrbn') add(from, to, { ...extra, promo });
                    else add(from, to, extra);
                };
                const one = from + dir * 8;
                if (!b[one]) {
                    push(one);
                    if (r === (white ? 6 : 1) && !b[one + dir * 8]) add(from, one + dir * 8, { double: true });
                }
                for (const dc of [-1, 1]) {
                    if (c + dc < 0 || c + dc > 7) continue;
                    const to = one + dc;
                    if (b[to] && colorOf(b[to]) === enemy) push(to);
                    else if (to === ep) add(from, to, { enPassant: true });
                }
            } else if (t === 'n' || t === 'k') {
                for (const [dr, dc] of t === 'n' ? KNIGHT : KING) {
                    const rr = r + dr, cc = c + dc;
                    if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
                    const to = rr * 8 + cc;
                    if (!b[to] || colorOf(b[to]) === enemy) add(from, to);
                }
                if (t === 'k') {
                    const home = white ? 60 : 4;
                    if (from === home && !attacked(b, home, enemy)) {
                        const [ks, qs] = white ? ['K', 'Q'] : ['k', 'q'];
                        const rook = white ? 'R' : 'r';
                        if (castling[ks] && b[home + 3] === rook && !b[home + 1] && !b[home + 2]
                            && !attacked(b, home + 1, enemy) && !attacked(b, home + 2, enemy)) {
                            add(from, home + 2, { castle: 'K' });
                        }
                        if (castling[qs] && b[home - 4] === rook && !b[home - 1] && !b[home - 2] && !b[home - 3]
                            && !attacked(b, home - 1, enemy) && !attacked(b, home - 2, enemy)) {
                            add(from, home - 2, { castle: 'Q' });
                        }
                    }
                }
            } else {
                const dirs = t === 'b' ? DIAG : t === 'r' ? ORTHO : DIAG.concat(ORTHO);
                for (const [dr, dc] of dirs) {
                    let rr = r + dr, cc = c + dc;
                    while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
                        const to = rr * 8 + cc;
                        if (b[to]) {
                            if (colorOf(b[to]) === enemy) add(from, to);
                            break;
                        }
                        add(from, to);
                        rr += dr; cc += dc;
                    }
                }
            }
        }
        return moves;
    }

    function applyMove(st, m) {
        const b = st.board.slice();
        const p = b[m.from];
        const white = st.turn === 'w';
        const captured = b[m.to];
        b[m.to] = m.promo ? (white ? m.promo.toUpperCase() : m.promo) : p;
        b[m.from] = null;
        if (m.enPassant) b[m.to + (white ? 8 : -8)] = null;
        if (m.castle) {
            const home = white ? 60 : 4;
            if (m.castle === 'K') { b[home + 1] = b[home + 3]; b[home + 3] = null; }
            else { b[home - 1] = b[home - 4]; b[home - 4] = null; }
        }
        const castling = { ...st.castling };
        if (p === 'K') { castling.K = false; castling.Q = false; }
        if (p === 'k') { castling.k = false; castling.q = false; }
        for (const sq of [m.from, m.to]) {
            if (sq === 63) castling.K = false;
            if (sq === 56) castling.Q = false;
            if (sq === 7) castling.k = false;
            if (sq === 0) castling.q = false;
        }
        return {
            board: b,
            turn: white ? 'b' : 'w',
            castling,
            ep: m.double ? (m.from + m.to) / 2 : -1,
            half: p.toLowerCase() === 'p' || captured || m.enPassant ? 0 : st.half + 1,
        };
    }

    const kingSquare = (b, color) => b.indexOf(color === 'w' ? 'K' : 'k');
    const inCheck = (st, color = st.turn) => attacked(st.board, kingSquare(st.board, color), color === 'w' ? 'b' : 'w');

    function legalMoves(st) {
        return pseudoMoves(st).filter(m => !inCheck(applyMove(st, m), st.turn));
    }

    function insufficientMaterial(b) {
        const rest = b.filter(p => p && p.toLowerCase() !== 'k').map(p => p.toLowerCase());
        return rest.length === 0 || (rest.length === 1 && 'bn'.includes(rest[0]));
    }

    // 'playing' | { over: true, result: 'w' | 'b' | 'draw', reason }
    function gameStatus(st) {
        if (!legalMoves(st).length) {
            return inCheck(st)
                ? { over: true, result: st.turn === 'w' ? 'b' : 'w', reason: 'checkmate' }
                : { over: true, result: 'draw', reason: 'stalemate' };
        }
        if (st.half >= 100) return { over: true, result: 'draw', reason: '50-move rule' };
        if (insufficientMaterial(st.board)) return { over: true, result: 'draw', reason: 'insufficient material' };
        return { over: false };
    }

    // ---------- move text parsing ----------
    // Every spelling chat might use for a move: "e4", "Nf3", "Nbd2", "exd5", "e2e4", "e7e8q", "O-O"
    const clean = s => s.replace(/[x+#=:\s-]/gi, '');
    function moveSpellings(st, m) {
        const p = st.board[m.from];
        const t = p.toLowerCase();
        const from = sqName(m.from), to = sqName(m.to);
        const out = [from + to + (m.promo || '')];
        if (!m.promo || m.promo === 'q') out.push(from + to);
        if (m.castle) out.push(m.castle === 'K' ? 'OO' : 'OOO', m.castle === 'K' ? '00' : '000');
        if (t === 'p') {
            const capture = st.board[m.to] || m.enPassant;
            const forms = capture ? [from[0] + to] : [to];
            for (const f of forms) {
                if (!m.promo) out.push(f);
                else {
                    out.push(f + m.promo, f + m.promo.toUpperCase());
                    if (m.promo === 'q') out.push(f);
                }
            }
        } else {
            const L = t.toUpperCase();
            out.push(L + to, L + from[0] + to, L + from[1] + to, L + from + to);
        }
        return out;
    }
    function parseMove(st, text, legal = legalMoves(st)) {
        const input = clean(text.trim());
        if (!input) return null;
        const spellings = legal.map(m => ({ m, forms: moveSpellings(st, m) }));
        for (const exact of [true, false]) {
            const hits = spellings.filter(({ forms }) => forms.some(f => (exact ? f === input : f.toLowerCase() === input.toLowerCase())));
            if (hits.length === 1) return hits[0].m;
            if (hits.length > 1) {
                // Promotions share a destination; only distinct from/to pairs are ambiguous
                const distinct = new Set(hits.map(h => `${h.m.from}-${h.m.to}`));
                if (distinct.size > 1) return null;
            }
        }
        return null;
    }
    const moveKey = m => sqName(m.from) + sqName(m.to) + (m.promo || '');
    function moveLabel(st, m) {
        const p = st.board[m.from];
        if (m.castle) return m.castle === 'K' ? 'O-O' : 'O-O-O';
        const cap = st.board[m.to] || m.enPassant ? 'x' : '';
        const t = p.toLowerCase();
        const pieceLetter = t === 'p' ? (cap ? sqName(m.from)[0] : '') : t.toUpperCase();
        return `${pieceLetter}${cap}${sqName(m.to)}${m.promo ? '=' + m.promo.toUpperCase() : ''}`;
    }

    // ---------- computer opponent (2-ply material search with a little noise) ----------
    const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };
    function evaluate(st) {
        let score = 0;
        for (let i = 0; i < 64; i++) {
            const p = st.board[i];
            if (!p) continue;
            const v = VALUE[p.toLowerCase()];
            // small bonus for central squares and advanced pawns
            const r = i >> 3, c = i & 7;
            const centre = 6 - Math.abs(3.5 - r) - Math.abs(3.5 - c);
            const adv = p === 'P' ? (6 - r) * 4 : p === 'p' ? (r - 1) * 4 : 0;
            const total = v + centre * 3 + adv;
            score += isWhite(p) ? total : -total;
        }
        return score; // positive favours white
    }
    function searchScore(st, depth) {
        const moves = legalMoves(st);
        if (!moves.length) return inCheck(st) ? (st.turn === 'w' ? -100000 : 100000) : 0;
        if (depth === 0) return evaluate(st);
        const white = st.turn === 'w';
        let best = white ? -Infinity : Infinity;
        for (const m of moves) {
            const s = searchScore(applyMove(st, m), depth - 1);
            best = white ? Math.max(best, s) : Math.min(best, s);
        }
        return best;
    }
    function computerMove(st) {
        const moves = legalMoves(st);
        const sign = st.turn === 'w' ? 1 : -1;
        let best = null, bestScore = -Infinity;
        for (const m of moves) {
            const score = sign * searchScore(applyMove(st, m), 1) + Math.random() * 15;
            if (score > bestScore) { bestScore = score; best = m; }
        }
        return best;
    }

    // Exposed for testing in Node
    const engine = { startState, loadFEN, legalMoves, applyMove, gameStatus, inCheck, parseMove, moveLabel, computerMove, sqName };
    if (typeof module !== 'undefined') module.exports = engine;
    if (typeof document === 'undefined') return;

    // ---------- UI + chat voting ----------
    const VOTE_MS = 30000;
    const COMPUTER_DELAY_MS = 1200;
    const NEW_GAME_DELAY_MS = 15000;
    const GLYPHS = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
    const panel = document.getElementById('chess');
    if (!panel) return;
    const statusEl = panel.querySelector('.chess-status');
    const boardEl = panel.querySelector('.chess-board');
    const votesEl = panel.querySelector('.chess-votes');
    const scoreEl = panel.querySelector('.chess-score');

    const score = JSON.parse(localStorage.getItem('chess_score') || '{"chat":0,"computer":0,"draws":0}');
    let state, legal, lastMove, votes, voteEndsAt, over;

    const cells = [];
    for (let i = 0; i < 64; i++) {
        const cell = document.createElement('div');
        cell.className = `chess-cell ${((i >> 3) + (i & 7)) % 2 ? 'dark' : 'light'}`;
        boardEl.append(cell);
        cells.push(cell);
    }

    function newGame() {
        state = startState();
        legal = legalMoves(state);
        lastMove = null;
        votes = new Map();
        voteEndsAt = Date.now() + VOTE_MS;
        over = false;
        render();
    }

    function render() {
        for (let i = 0; i < 64; i++) {
            const p = state.board[i];
            const cell = cells[i];
            cell.textContent = p ? GLYPHS[p.toLowerCase()] + '︎' : '';
            cell.classList.toggle('piece-w', !!p && isWhite(p));
            cell.classList.toggle('piece-b', !!p && !isWhite(p));
            cell.classList.toggle('last', !!lastMove && (i === lastMove.from || i === lastMove.to));
            cell.classList.toggle('check', !over && !!p && p.toLowerCase() === 'k' && colorOf(p) === state.turn && inCheck(state));
        }
        scoreEl.textContent = `Chat ${score.chat} – ${score.computer} Computer (draws ${score.draws})`;
        renderVotes();
    }

    function renderVotes() {
        const tally = new Map();
        for (const key of votes.values()) tally.set(key, (tally.get(key) || 0) + 1);
        const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        votesEl.replaceChildren(...top.map(([key, n]) => {
            const li = document.createElement('li');
            li.textContent = `${moveLabel(state, legal.find(m => moveKey(m) === key))} — ${n}`;
            return li;
        }));
    }

    function finish(status) {
        over = true;
        if (status.result === 'w') score.chat++;
        else if (status.result === 'b') score.computer++;
        else score.draws++;
        localStorage.setItem('chess_score', JSON.stringify(score));
        const who = status.result === 'w' ? 'Chat wins' : status.result === 'b' ? 'Computer wins' : 'Draw';
        statusEl.textContent = `${who} by ${status.reason}! New game soon…`;
        render();
        setTimeout(newGame, NEW_GAME_DELAY_MS);
    }

    function play(m) {
        state = applyMove(state, m);
        lastMove = m;
        legal = legalMoves(state);
        const status = gameStatus(state);
        render();
        return status;
    }

    function endVoting() {
        if (over || state.turn !== 'w') return;
        const tally = new Map();
        for (const key of votes.values()) tally.set(key, (tally.get(key) || 0) + 1);
        if (!tally.size) { voteEndsAt = Date.now() + VOTE_MS; return; } // nobody voted, keep waiting
        const most = Math.max(...tally.values());
        const winners = [...tally].filter(([, n]) => n === most).map(([key]) => key);
        const key = winners[Math.floor(Math.random() * winners.length)];
        votes = new Map();
        const status = play(legal.find(m => moveKey(m) === key));
        if (status.over) return finish(status);
        voteEndsAt = 0;
        setTimeout(() => {
            const status = play(computerMove(state));
            if (status.over) return finish(status);
            voteEndsAt = Date.now() + VOTE_MS;
        }, COMPUTER_DELAY_MS);
    }

    setInterval(() => {
        if (over) return;
        if (state.turn === 'b' || !voteEndsAt) {
            statusEl.textContent = 'Computer is thinking…';
            return;
        }
        const left = Math.max(0, Math.ceil((voteEndsAt - Date.now()) / 1000));
        statusEl.textContent = `${inCheck(state) ? 'Check! ' : ''}Chat votes (white): !e4 !Nf3 !e2e4 — ${left}s`;
        if (!left) endVoting();
    }, 250);

    // Called from the chat handler: one vote per chatter, a new vote replaces the old one
    window.chessChat = (user, message) => {
        if (over || !state || state.turn !== 'w' || !voteEndsAt) return;
        const text = message.trim();
        if (!text.startsWith('!')) return;
        const m = parseMove(state, text.slice(1), legal);
        if (!m) return;
        votes.set(user.toLowerCase(), moveKey(m));
        renderVotes();
    };

    newGame();
})();
