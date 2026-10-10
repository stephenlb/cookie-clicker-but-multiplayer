(async () =>  {
    // Balances and prices are Decimals (break_infinity.js) so they never overflow
    const D = x => new Decimal(x);
    const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];
    function fmt(value) {
        const d = D(value);
        if (d.lt(1e6)) return Math.floor(d.toNumber()).toLocaleString();
        const tier = Math.floor(d.log10() / 3);
        if (tier >= SUFFIXES.length) return d.toExponential(2).replace('+', '');
        return `${d.div(D(10).pow(tier * 3)).toNumber().toFixed(2)} ${SUFFIXES[tier]}`;
    }
    let cookiesPerSecond = D(0);
    let cookieBalance = getCookies();
    const chat_channel = localStorage.getItem("chat_channel");
    const cookieBalanceDisplay = document.querySelector('#cookies');
    const cookiePerSecondBalanceDisplay = document.querySelector('#cookiesPerSecond');
    const DIFFICULTY = 4;
    const COOKIE_CHANNEL = "Cookies";
    const hashString = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('');

    // Calculate Cookies Per Second
    let previousCookieBalance = D(0);
    setInterval( () => {
        cookiesPerSecond = cookieBalance.minus(previousCookieBalance);
        cookiePerSecondBalanceDisplay.innerHTML = fmt(cookiesPerSecond);
        previousCookieBalance = cookieBalance;
    }, 1000);

    // A guy eating cookies: the pile on his plate and his chewing speed track cookies per second.
    // Drop a real photo at assets/cookie-eater.jpg to replace the emoji guy.
    const MAX_PILE = 24;
    const eater = document.createElement('div');
    eater.id = 'cookie-eater';
    eater.innerHTML = '<div class=eater-pile></div><div class=eater-guy><img alt="" src="assets/cookie-eater.jpg"><span>🤤</span></div><div class=eater-caption></div>';
    const eaterImg = eater.querySelector('img');
    eaterImg.addEventListener('error', () => eaterImg.remove());
    eaterImg.addEventListener('load', () => eater.classList.add('has-photo'));
    document.body.appendChild(eater);
    const eaterGuy = eater.querySelector('.eater-guy');
    const eaterPile = eater.querySelector('.eater-pile');
    const eaterCaption = eater.querySelector('.eater-caption');
    function updateEater() {
        const magnitude = cookiesPerSecond.gt(0) ? Math.max(0, cookiesPerSecond.log10()) : 0;
        const pile = cookiesPerSecond.gt(0) ? Math.min(MAX_PILE, 1 + Math.round(magnitude * 2.5)) : 0;
        eaterPile.textContent = '🍪'.repeat(pile);
        eaterGuy.style.animationDuration = `${Math.max(0.12, 0.7 / (1 + magnitude / 2))}s`;
        eaterCaption.textContent = cookiesPerSecond.gt(0) ? `${fmt(cookiesPerSecond)} cookies/sec incoming!` : 'Waiting for cookies…';
    }
    setInterval(updateEater, 1000);
    updateEater();

    // Shop: spend cookies on upgrades. Prices grow 15% per level owned.
    const UPGRADES = [
        { id: 'finger',  name: 'Strong Finger',  desc: '+1 cookie per click',        cost: 50 },
        { id: 'grandma', name: 'Grandma',        desc: 'bakes 1 cookie/sec',         cost: 100 },
        { id: 'oven',    name: 'Oven',           desc: 'bakes 8 cookies/sec',        cost: 800 },
        { id: 'factory', name: 'Factory',        desc: 'bakes 50 cookies/sec',       cost: 5000 },
        { id: 'cheese',  name: 'Cheese Wheel 🧀', desc: 'bakes 20 cookies/sec (it is gouda)', cost: 2500 },
        { id: 'message', name: 'Message Booster',   desc: '+10 cookies per chat message',   cost: 200 },
        { id: 'chat',    name: 'Word Booster',      desc: '+5 cookies per chat word',       cost: 300 },
        { id: 'char',    name: 'Character Booster', desc: '+1 cookie per chat character',   cost: 500 },
        { id: 'double',  name: '2X Clicker',     desc: 'doubles cookies per click',  cost: 500, growth: 4, max: 5 },
        { id: 'loophole', name: 'Tax Loophole',  desc: '-0.5% cookie tax rate',      cost: 1000, growth: 2, max: 5 },
        { id: 'evasion', name: 'Tax Evasion',   desc: '+15% chance to dodge each tax', cost: 2500, growth: 3, max: 5 },
        { id: 'fast',    name: 'Fast Clicker',   desc: 'auto-clicks 2 times/sec',    cost: 400 },
        { id: 'planet',  name: 'Cookie Planet',  desc: 'bakes 2,000,000 cookies/sec',     cost: 1e9 },
        { id: 'dimension', name: 'Cookie Dimension', desc: 'bakes 2,000,000,000 cookies/sec', cost: 1e12 },
    ];
    const owned = JSON.parse(localStorage.getItem("upgrades") || "{}");
    const level = id => owned[id] || 0;
    const upgradeCost = u => D(u.cost).times(D(u.growth || 1.15).pow(level(u.id))).ceil();
    const clickValue = () => (1 + level('finger')) * 2 ** level('double');
    const autoClicksPerSecond = () => 2 * level('fast');
    // Chat pays a flat 10 per message; words and characters only pay once bought
    const chatMessageValue = () => 10 + 10 * level('message');
    const chatWordValue = () => 5 * level('chat');
    const chatCharValue = () => level('char');
    const bakedPerSecond = () => level('grandma') + 8 * level('oven') + 50 * level('factory') + 20 * level('cheese')
        + 2e6 * level('planet') + 2e9 * level('dimension');

    const shopList = document.getElementById('upgrades');
    const shopButtons = {};
    for (const u of UPGRADES) {
        const btn = document.createElement('button');
        btn.className = 'upgrade';
        btn.addEventListener('click', () => buyUpgrade(u));
        shopList.appendChild(btn);
        shopButtons[u.id] = btn;
    }

    function renderShop() {
        for (const u of UPGRADES) {
            const btn = shopButtons[u.id];
            const cost = upgradeCost(u);
            const maxed = u.max && level(u.id) >= u.max;
            btn.disabled = maxed || cookieBalance.lt(cost);
            const price = maxed ? 'MAX' : `🍪 ${fmt(cost)}`;
            btn.innerHTML = `<strong>${u.name}</strong> (x${level(u.id)}) - ${price}<span class=upgrade-desc>${u.desc}</span>`;
        }
    }
    function buyUpgrade(u) {
        const cost = upgradeCost(u);
        if (u.max && level(u.id) >= u.max) return;
        if (cookieBalance.lt(cost)) return;
        setBalance(cookieBalance.minus(cost));
        owned[u.id] = level(u.id) + 1;
        localStorage.setItem("upgrades", JSON.stringify(owned));
        renderShop();
    }
    setInterval(renderShop, 250);
    renderShop();
    cookieBalanceDisplay.innerHTML = fmt(cookieBalance);
    setInterval(() => {
        const baked = bakedPerSecond() + autoClicksPerSecond() * clickValue();
        if (baked) addCookies(baked);
    }, 1000);

    // Gnomeskytarg thank you for fixing RNG
    function rng() {
        const buf = new Uint32Array(4);
        crypto.getRandomValues(buf);
        return Array.from(buf, x => x.toString(16).padStart(8, '0')).join('');
    }
    function countZeros(hash) {
        let count = 0;
        while (hash[count++] == '0') continue; 
        return count;
    }

    async function nonceFinder(difficulty=3, callback=(()=>{})) {
        const maxIterations = 250;
        const uuid = crypto.randomUUID();
        let iterationCount = 0;
        let nonce = '';
        let count = 0;
        let hash = '';
        let stringToSign = '';

        while (true) {
            nonce = rng();
            stringToSign = nonce + uuid;
            hash = await hashString(stringToSign);
            count = countZeros(hash);
            if (count >= difficulty) break;
            if (iterationCount++ >= maxIterations) return setTimeout(
                () => nonceFinder(difficulty, callback),
                10,
            );
        }

        let bundle = {
            hash: hash,
            nonce: nonce,
            uuid: uuid,
        }

        callback(bundle);
        return bundle;
    }

    async function verify(hashObj) {
        const hash = hashObj.hash;
        const nonce = hashObj.nonce;
        const uuid = hashObj.uuid;
        const count = countZeros(hash);

        if (count < DIFFICULTY) return false;
        if (hash in hashCache) return false;

        let stringToSign = nonce + uuid;
        const hashToVerfiy = await hashString(stringToSign);
        if (hash === hashToVerfiy) {
            hashCache[hash] = true;
            //localStorage.setItem("hashCache", JSON.stringify(hashCache));
            return true;
        }
        return false;
    }

    /*
    function getDay() {
        let day = new Date().getDay();
        switch (day) {
            case 0: return 'Sunday';
            case 1: return 'Monday';
        }
    }
    */

    let pubnub = PubNub({
        subscribeKey: 'demo',
        publishKey: 'demo',
        timetoken: 100,
    });

    pubnub.subscribe({
        channel: chat_channel,
        messages: chatReceiver,
    });

    // Dev only: watch-reload.sh publishes here after files are saved
    if (["localhost", "127.0.0.1", ""].includes(location.hostname)) {
        // The stream replays channel history, so only reload for messages
        // stamped after this page loaded (otherwise it reloads in a loop)
        const pageLoadedAt = Date.now();
        pubnub.subscribe({
            channel: "cookie-clicker-dev-reload",
            timetoken: String(pageLoadedAt * 10000),
            messages: msg => { if (msg && msg.reload > pageLoadedAt) location.reload(); },
        });
    }

    const MAX_CHAT_MESSAGES = 50;
    const chatDisplay = document.getElementById("chat");
    function safe(text) {
        return text.replace(/['"()<>]/g,'');
    }

    // Leaderboards persisted in localStorage: chat messages and shared cookie clicks per user
    const LEADERBOARD_SIZE = 5;
    function createLeaderboard(storageKey, listSelector) {
        const counts = JSON.parse(localStorage.getItem(storageKey) || "{}");
        const list = document.querySelector(listSelector);
        function render() {
            const top = Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, LEADERBOARD_SIZE);
            list.replaceChildren(...top.map(([user, count]) => {
                const li = document.createElement("li");
                li.textContent = `${safe(user)} — ${count}`;
                return li;
            }));
        }
        render();
        return user => {
            const key = user.toLowerCase();
            counts[key] = (counts[key] || 0) + 1;
            localStorage.setItem(storageKey, JSON.stringify(counts));
            render();
        };
    }
    const recordChatter = createLeaderboard("leaderboard", "#leaderboard ol");
    const recordClicker = createLeaderboard("click_leaderboard", "#click-leaderboard ol");

    function chatReceiver(data) {
        if (!data || typeof data.message !== "string") return;
        // Drop Twitch system notices and anonymous senders
        const user = String(data.user || "").trim();
        if (!user || user.toLowerCase() === "tmi.twitch.tv") return;
        const message = data.message;
        recordChatter(user);
        if (window.chessChat) window.chessChat(user, data.message);
        if (window.minesweeperChat) window.minesweeperChat(user, data.message);
        chatCommand(user, data.message);

        // textContent keeps user input from being interpreted as HTML
        const line = document.createElement("div");
        line.className = "chat";
        const team = versusChat(user, message);
        if (team) line.classList.add(`team-${team}`);
        const name = document.createElement("strong");
        name.className = "chat-user";
        name.textContent = safe(user);
        const text = document.createElement("span");
        text.textContent = safe(`: ${message}`);
        line.append(name, text);

        // Newest message on top, capped so the page does not grow forever
        chatDisplay.prepend(line);
        while (chatDisplay.children.length > MAX_CHAT_MESSAGES) {
            chatDisplay.lastElementChild.remove();
        }

        // Per message, plus per word and per character once those upgrades are owned
        const wordCount = message.split(/\s+/).filter(Boolean).length;
        addCookies(chatMessageValue() + chatWordValue() * wordCount + chatCharValue() * message.length);
        chatSpawnTriggers(message);
        floatEmoji(message);
        hydrateAlert(message);
        const match = message.match(/[a-fA-F0-9]{6}/);
        if (match) {
            document.body.style.backgroundColor = `#${match[0]}`;
        }
    }

    // Emoji in chat drift across the screen as big, wobbling, fading sprites
    const EMOJI_PATTERN = /\p{Extended_Pictographic}(?:\uFE0F|\u200D\p{Extended_Pictographic}|[\u{1F3FB}-\u{1F3FF}])*/gu;
    const MAX_EMOJI_PER_MESSAGE = 5;
    const MAX_EMOJI_ON_SCREEN = 40;
    function floatEmoji(message) {
        const found = (message.match(EMOJI_PATTERN) || []).slice(0, MAX_EMOJI_PER_MESSAGE);
        for (const emoji of found) {
            if (document.querySelectorAll('.chat-emoji').length >= MAX_EMOJI_ON_SCREEN) return;
            const w = window.innerWidth, h = window.innerHeight;
            const size = 60 + Math.random() * 80;
            const el = document.createElement('div');
            el.className = 'chat-emoji';
            el.textContent = emoji;
            el.style.fontSize = `${size}px`;
            el.style.left = `${Math.random() * (w - size)}px`;
            el.style.top = `${h * 0.5 + Math.random() * h * 0.4}px`;
            document.body.appendChild(el);

            const drift = Math.random() * 300 - 150;
            const spin = Math.random() * 60 - 30;
            const rise = h * (0.5 + Math.random() * 0.4);
            const anim = el.animate([
                { transform: 'translate(0, 0) scale(0.2) rotate(0deg)', opacity: 0 },
                { transform: `translate(${drift * 0.25}px, ${-rise * 0.15}px) scale(1.2) rotate(${spin * -0.5}deg)`, opacity: 1, offset: 0.12 },
                { transform: `translate(${-drift * 0.5}px, ${-rise * 0.5}px) scale(1) rotate(${spin}deg)`, opacity: 1, offset: 0.55 },
                { transform: `translate(${drift}px, ${-rise}px) scale(0.8) rotate(${-spin}deg)`, opacity: 0 },
            ], { duration: 3500 + Math.random() * 2000, easing: 'ease-in-out' });
            anim.onfinish = () => el.remove();
        }
    }

    // A lowercase "hydrate" in chat takes over the screen for a few seconds (click to dismiss)
    const HYDRATE_ALERT_MS = 4000;
    const HYDRATE_COOLDOWN_MS = 60000; // at most one alert per minute
    let hydrateLastAlert = -Infinity;
    let hydrateAlertEl = null;
    let hydrateAlertTimer = 0;
    function hydrateAlert(message) {
        if (!message.includes("hydrate")) return;
        if (Date.now() - hydrateLastAlert < HYDRATE_COOLDOWN_MS) return;
        hydrateLastAlert = Date.now();
        if (!hydrateAlertEl) {
            hydrateAlertEl = document.createElement("div");
            hydrateAlertEl.id = "hydrate-alert";
            hydrateAlertEl.textContent = "HYDRATE 🥛";
            hydrateAlertEl.addEventListener("click", () => hydrateAlertEl.classList.remove("open"));
            document.body.append(hydrateAlertEl);
        }
        hydrateAlertEl.classList.add("open");
        clearTimeout(hydrateAlertTimer);
        hydrateAlertTimer = setTimeout(() => hydrateAlertEl.classList.remove("open"), HYDRATE_ALERT_MS);
    }

    // Chat keywords spawn cookies, with a per-keyword cooldown so spam cannot flood the screen
    const CHAT_SPAWN_COOLDOWN_MS = 10000;
    // "boom" in chat is worth this many clicks on whatever boss is on screen
    const BOOM_DAMAGE = 500000;
    const chatSpawns = [
        { pattern: /\bhydrat(e|ed|ion)\b|[💧🚰🚿💦🌊🥛🧋🍼]/iu, spawn: () => spawnWaterGlass(), last: 0 },
        { pattern: /\bboss\b/i,             spawn: () => spawnBossCookie(), last: 0 },
        { pattern: /\bboom\b/i,             spawn: () => damageFight?.(BOOM_DAMAGE), last: 0 },
        { pattern: /\bcheese\b|🧀/iu,       spawn: () => spawnCheese(), last: 0 },
        { pattern: /\bgolden\b/i,           spawn: () => spawnGoldenCookie(), last: 0 },
        { pattern: /\bdiamonds?\b|💎/iu,     spawn: () => spawnDiamondCookie(), last: 0 },
    ];
    function chatSpawnTriggers(message) {
        const now = Date.now();
        for (const entry of chatSpawns) {
            if (!entry.pattern.test(message) || now - entry.last < CHAT_SPAWN_COOLDOWN_MS) continue;
            entry.last = now;
            entry.spawn();
        }
    }

    // Chat commands: "!name args". Each has a room-wide cooldown so one chatter cannot spam the screen,
    // and a per-user cooldown on top for the ones that pay out.
    const centerText = (className, text) => showFloatingText(className, text, window.innerWidth / 2, window.innerHeight / 2);
    const COMMANDS = {
        attack: { cooldown: 30, run: () => spawnAttackCookie(), help: 'cookie attack' },
        cheese: { cooldown: 30, run: () => spawnCheese(), help: 'spawn a cheese' },
        kevin:  { cooldown: 60, run: () => spawnKevin(), help: 'summon Kevin' },
        tax:    { cooldown: 60, run: () => collectTax(), help: 'call the tax man' },
        irs:    { cooldown: 120, run: () => callIrs(), help: 'call the IRS' },
        gift:   { cooldown: 5, userCooldown: 120, run: user => {
            addCookies(25);
            centerText('golden-bonus', `${safe(user)} baked a gift! +25 🍪`);
        }, help: 'free cookies (once every 2 min)' },
        party:  { cooldown: 15, run: () => { floatEmoji('🎉🎊🥳🍪🎈'); }, help: 'party emoji' },
        rain:   { cooldown: 15, run: () => { floatEmoji('🍪🍪🍪🍪🍪'); }, help: 'cookie rain' },
        shake:  { cooldown: 15, run: () => {
            document.body.animate([
                { transform: 'translate(0, 0)' }, { transform: 'translate(-12px, 6px)' },
                { transform: 'translate(10px, -8px)' }, { transform: 'translate(-8px, -4px)' },
                { transform: 'translate(6px, 8px)' }, { transform: 'translate(0, 0)' },
            ], { duration: 500, iterations: 2 });
        }, help: 'shake the screen' },
        color:  { cooldown: 5, run: (user, arg) => {
            // Any CSS color name or hex code, e.g. "!color tomato" or "!color #ff8800"
            const value = /^[0-9a-f]{6}$/i.test(arg) ? `#${arg}` : arg;
            if (!arg || !CSS.supports('color', value)) return false;
            document.body.style.backgroundColor = value;
        }, help: 'change the background (!color teal)' },
        buy:    { cooldown: 10, run: (user, arg) => {
            // The room's cookies pay for it: "!buy oven"
            const u = UPGRADES.find(x => x.id === arg.toLowerCase());
            if (!u || (u.max && level(u.id) >= u.max) || cookieBalance.lt(upgradeCost(u))) return false;
            buyUpgrade(u);
            centerText('golden-bonus', `${safe(user)} bought ${u.name}!`);
        }, help: `buy an upgrade (${UPGRADES.map(u => u.id).join(', ')})` },
        stats:  { cooldown: 10, run: () => {
            centerText('golden-bonus', `🍪 ${fmt(cookieBalance)} · ${fmt(cookiesPerSecond)}/s`);
        }, help: 'show balance' },
        help:   { cooldown: 20, run: () => {
            centerText('golden-bonus', 'Commands: ' + Object.keys(COMMANDS).map(c => '!' + c).join(' ') + ' !red !blue !versus + chess moves');
        }, help: 'list commands' },
    };
    const commandLast = {}; // command -> last run
    const commandUserLast = {}; // command + user -> last run
    function chatCommand(user, message) {
        const match = message.trim().match(/^!(\w+)\s*(\S*)/);
        const command = match && COMMANDS[match[1].toLowerCase()];
        if (!command) return;
        const name = match[1].toLowerCase();
        const now = Date.now();
        const userKey = `${name}:${user.toLowerCase()}`;
        if (now - (commandLast[name] || 0) < command.cooldown * 1000) return;
        if (now - (commandUserLast[userKey] || 0) < (command.userCooldown || 0) * 1000) return;
        if (command.run(user, match[2]) === false) return;
        commandLast[name] = now;
        commandUserLast[userKey] = now;
    }

    // Clearing a minesweeper board pays the room
    window.minesweeperWin = () => {
        const prize = Decimal.max(1000, cookieBalance.times(0.05).round());
        addCookies(prize);
        centerText('golden-bonus', `Minesweeper cleared! +${fmt(prize)} 🍪`);
    };

    // Versus: chat picks a team with !red / !blue, then !versus starts a round.
    // While a round runs, each message scores for its sender's team (1 point plus 1 per word, up to 5).
    // The winning team earns the room a cookie prize.
    const VERSUS_ROUND_S = 60;
    const VERSUS_TEAMS = { red: '🔴 Red', blue: '🔵 Blue' };
    const versusDisplay = document.getElementById('versus');
    const versusMembers = new Map(); // lowercased chat user -> team
    let versus = null; // { red, blue, left } while a round is running
    function renderVersus() {
        if (!versus) { versusDisplay.textContent = ''; return; }
        versusDisplay.textContent = `⚔️ ${VERSUS_TEAMS.red} ${versus.red} vs ${versus.blue} ${VERSUS_TEAMS.blue} (${versus.left}s)`;
    }
    function startVersus() {
        if (versus) return false;
        versus = { red: 0, blue: 0, left: VERSUS_ROUND_S };
        renderVersus();
        const timer = setInterval(() => {
            if (--versus.left > 0) return renderVersus();
            clearInterval(timer);
            endVersus();
        }, 1000);
        showFloatingText('golden-bonus', 'VERSUS! Chat: !red or !blue', window.innerWidth / 2, window.innerHeight / 2);
        return true;
    }
    function endVersus() {
        const { red, blue } = versus;
        versus = null;
        const winner = red === blue ? null : red > blue ? 'red' : 'blue';
        if (winner) {
            const prize = Decimal.max(1000, cookieBalance.times(0.05).round());
            addCookies(prize);
            versusDisplay.textContent = `🏆 ${VERSUS_TEAMS[winner]} wins ${Math.max(red, blue)}-${Math.min(red, blue)}! +${fmt(prize)} 🍪`;
        } else {
            versusDisplay.textContent = `🤝 Draw at ${red}-${blue}`;
        }
        setTimeout(() => { if (!versus) versusDisplay.textContent = ''; }, 8000);
    }
    function versusChat(user, message) {
        const key = user.toLowerCase();
        const command = message.trim().match(/^!(red|blue|versus)\b/i);
        if (command) {
            const name = command[1].toLowerCase();
            if (name === 'versus') startVersus();
            else versusMembers.set(key, name);
            return versusMembers.get(key);
        }
        const team = versusMembers.get(key);
        if (!versus || !team) return team;
        versus[team] += Math.min(5, 1 + message.split(/\s+/).filter(Boolean).length);
        renderVersus();
        return team;
    }

    function addCookies(cookies=1) {
        // +1x per power of ten above a million (a linear multiplier made the balance explode)
        cookies = D(cookies).times(1 + Math.floor(cookieBalance.div(1000000).plus(1).log10()));
        if (Date.now() < hydratedUntil) cookies = cookies.times(HYDRATED_MULTIPLIER);
        setBalance(cookieBalance.plus(cookies));
        popBalance();
    }

    // Short springy pop on every gain; restarting the animation keeps rapid gains snappy
    function popBalance() {
        const tilt = Math.random() * 4 - 2;
        cookieBalanceDisplay.animate([
            { transform: 'scale(1) rotate(0deg)' },
            { transform: `scale(1.18) rotate(${tilt}deg)`, offset: 0.35 },
            { transform: 'scale(1) rotate(0deg)' },
        ], { duration: 220, easing: 'ease-out' });
    }

    // The shown number eases toward the real balance instead of jumping
    let displayedBalance = cookieBalance;
    function tickBalanceDisplay() {
        const diff = cookieBalance.minus(displayedBalance);
        displayedBalance = diff.abs().lt(1) ? cookieBalance : displayedBalance.plus(diff.times(0.2));
        cookieBalanceDisplay.textContent = fmt(displayedBalance.round());
        requestAnimationFrame(tickBalanceDisplay);
    }
    requestAnimationFrame(tickBalanceDisplay);

    function setBalance(balance) {
        // Round the cookies because cookies are round thank you @theavebel
        cookieBalance = balance.round();
        if (cookieBalance.lt(0)) cookieBalance = D(0);
        localStorage.setItem("cookies", cookieBalance.toString());
    }

    function getCookies() {
        const saved = D(localStorage.getItem("cookies") || 0);
        // Recover from a corrupted save (NaN / negative)
        return isNaN(saved.mantissa) || saved.lt(0) ? D(0) : saved;
    }

    // Clicks are shared over PubNub; real clicks carry the player's name
    const playerName = (localStorage.getItem("player_name")
        || prompt("Your name for the click leaderboard?")
        || "anonymous").trim().slice(0, 20);
    localStorage.setItem("player_name", playerName);

    function cookieClickTransmit(hash, user) {
        pubnub.publish({
            channel: COOKIE_CHANNEL,
            message: user ? { ...hash, user } : hash,
        });
    }
    async function cookieClickReceiver(hash) {
        let verified = await verify(hash);
        //console.log(`Cookie Click Verified: ${verified}`);
        if (verified && typeof hash.user === "string" && hash.user.trim()) {
            recordClicker(hash.user.trim().slice(0, 20));
        }
        addCookies(1);
    }

    pubnub.subscribe({
        channel: COOKIE_CHANNEL,
        messages: cookieClickReceiver,
    });

    // Multiplayer event bus: presence, emoji reactions and golden cookie announcements.
    // Only messages newer than page load are handled (the stream replays history).
    const EVENTS_CHANNEL = "cookie-clicker-events";
    const PRESENCE_INTERVAL_MS = 5000;
    const PRESENCE_TIMEOUT_MS = 15000;
    const REACTION_COOLDOWN_MS = 500;
    const GRAB_GIFT = 50; // everyone else gets this when a player grabs a golden cookie
    const playerId = crypto.randomUUID();
    const players = new Map(); // id -> { name, seen }
    const playersDisplay = document.getElementById("players");

    const sendEvent = event => pubnub.publish({
        channel: EVENTS_CHANNEL,
        message: { ...event, id: playerId, name: playerName, at: Date.now() },
    });
    const sendPresence = () => sendEvent({ type: "hello" });

    function renderPlayers() {
        const now = Date.now();
        for (const [id, p] of players) if (now - p.seen > PRESENCE_TIMEOUT_MS) players.delete(id);
        const names = [...players.values()].map(p => safe(p.name));
        playersDisplay.textContent = `👥 ${names.length} online: ${names.join(", ")}`;
    }

    function eventReceiver(event) {
        if (!event || typeof event.id !== "string" || typeof event.name !== "string") return;
        if (event.at < pageStartedAt) return;
        const name = event.name.trim().slice(0, 20) || "anonymous";
        players.set(event.id, { name, seen: Date.now() });
        renderPlayers();
        if (event.id === playerId) return;
        if (event.type === "emoji" && typeof event.emoji === "string") {
            floatEmoji(event.emoji.slice(0, 16));
        } else if (event.type === "grab") {
            addCookies(GRAB_GIFT);
            showFloatingText('golden-bonus', `${safe(name)} grabbed a golden cookie! +${GRAB_GIFT} 🍪 for you`, window.innerWidth / 2, window.innerHeight / 3);
        }
    }

    const pageStartedAt = Date.now();
    pubnub.subscribe({
        channel: EVENTS_CHANNEL,
        timetoken: String(pageStartedAt * 10000),
        messages: eventReceiver,
    });
    sendPresence();
    setInterval(sendPresence, PRESENCE_INTERVAL_MS);
    setInterval(renderPlayers, PRESENCE_INTERVAL_MS);

    // Reaction bar: click an emoji to float it across everyone's screen
    const reactBar = document.getElementById("reactions");
    let lastReaction = 0;
    for (const emoji of ["🍪", "🔥", "😂", "❤️", "🎉", "💧"]) {
        const btn = document.createElement("button");
        btn.textContent = emoji;
        btn.addEventListener("click", () => {
            if (Date.now() - lastReaction < REACTION_COOLDOWN_MS) return;
            lastReaction = Date.now();
            floatEmoji(emoji);
            sendEvent({ type: "emoji", emoji });
        });
        reactBar.append(btn);
    }

    let cookie = document.getElementById("cookie");
    setInterval( click, 1000);
    async function click(event) {
        //console.log('clicked');
        await nonceFinder(DIFFICULTY, hash => {
            //console.log(hash);
            cookieClickTransmit(hash, event && playerName);
        });
    }

    // Golden cookies appear at random spots for a few seconds; click one for a bonus
    const GOLDEN_SIZE = 80;
    const GOLDEN_LIFETIME = 8000;
    // Diamond cookies are rarer and faster to vanish, but pay out far more
    const DIAMOND_LIFETIME = 4000;
    function spawnGoldenCookie() {
        spawnBonusCookie('golden-cookie', GOLDEN_LIFETIME, 0.1, 100);
    }
    function spawnDiamondCookie() {
        spawnBonusCookie('golden-cookie diamond-cookie', DIAMOND_LIFETIME, 0.5, 5000);
    }
    // Cheese: a rarer, shorter-lived golden cookie that pays out with a cheesy pun
    const CHEESE_LIFETIME = 6000;
    const CHEESE_PUNS = ['Gouda catch!', 'Say cheese!', 'Nacho cheese!', 'Brie-lliant!', 'Feta late than never!', 'Cheddar believe it!', 'Swiss-ly done!', "That's un-brie-lievable!"];
    function spawnCheese() {
        spawnBonusCookie('golden-cookie cheese-cookie', CHEESE_LIFETIME, 0.15, 250, CHEESE_PUNS);
    }
    function scheduleCheese() {
        setTimeout(() => {
            spawnCheese();
            scheduleCheese();
        }, 60000 + Math.random() * 60000);
    }
    scheduleCheese();

    function spawnBonusCookie(className, lifetime, balanceShare, minBonus, puns) {
        const golden = document.createElement('button');
        golden.className = className;
        if (puns) golden.textContent = '🧀';
        golden.style.left = `${Math.random() * (window.innerWidth - GOLDEN_SIZE)}px`;
        golden.style.top = `${Math.random() * (window.innerHeight - GOLDEN_SIZE)}px`;

        const dismiss = () => {
            golden.classList.add('leaving');
            setTimeout(() => golden.remove(), 400);
        };
        const expire = setTimeout(dismiss, lifetime);

        golden.addEventListener('mousedown', event => {
            clearTimeout(expire);
            const bonus = Decimal.max(minBonus, cookieBalance.times(balanceShare).round());
            addCookies(bonus);
            sendEvent({ type: "grab" });
            const pop = document.createElement('div');
            pop.className = 'golden-bonus';
            pop.textContent = `${puns ? puns[Math.floor(Math.random() * puns.length)] + ' ' : ''}+${fmt(bonus)} ${puns ? '🧀' : '🍪'}`;
            pop.style.left = `${event.clientX}px`;
            pop.style.top = `${event.clientY}px`;
            document.body.appendChild(pop);
            pop.addEventListener('animationend', () => pop.remove());
            golden.remove();
        });
        document.body.appendChild(golden);
    }
    function scheduleGoldenCookie() {
        setTimeout(() => {
            spawnGoldenCookie();
            scheduleGoldenCookie();
        }, 15000 + Math.random() * 30000);
    }
    scheduleGoldenCookie();

    // Weapons: pick one with the button in the corner; it sets your damage against monster cookies
    const WEAPONS = [
        { id: 'fist', icon: '👊', name: 'Fist', damage: 1 },
        { id: 'slingshot', icon: '🏹', name: 'Bow', damage: 2 },
        { id: 'pistol', icon: '🔫', name: 'Pistol', damage: 3 },
        { id: 'sword', icon: '🗡️', name: 'Sword', damage: 4 },
        { id: 'laser', icon: '⚡', name: 'Lightning', damage: 6 },
    ];
    let weapon = WEAPONS.find(w => w.id === localStorage.getItem('weapon')) || WEAPONS[0];
    const weaponBtn = document.createElement('button');
    weaponBtn.id = 'weapon-btn';
    const weaponMenu = document.createElement('div');
    weaponMenu.id = 'weapon-menu';
    function equipWeapon(w) {
        weapon = w;
        localStorage.setItem('weapon', w.id);
        weaponBtn.textContent = w.icon;
        weaponBtn.title = `${w.name} (${w.damage} dmg)`;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><text y="26" font-size="26">${w.icon}</text></svg>`;
        document.documentElement.style.setProperty('--weapon-cursor', `url("data:image/svg+xml,${encodeURIComponent(svg)}") 16 16, crosshair`);
        for (const item of weaponMenu.children) item.classList.toggle('selected', item.dataset.id === w.id);
        weaponMenu.classList.remove('open');
    }
    for (const w of WEAPONS) {
        const item = document.createElement('button');
        item.dataset.id = w.id;
        item.textContent = `${w.icon} ${w.name} · ${w.damage} dmg`;
        item.addEventListener('click', () => equipWeapon(w));
        weaponMenu.appendChild(item);
    }
    weaponBtn.addEventListener('click', () => weaponMenu.classList.toggle('open'));
    for (const el of [weaponBtn, weaponMenu]) el.addEventListener('mousedown', event => event.stopPropagation());
    document.body.append(weaponMenu, weaponBtn);
    equipWeapon(weapon);

    // Attack cookies fly in from a screen edge toward the big cookie.
    // Click one to swat it for a small reward; if it lands, it steals cookies.
    const ATTACK_SIZE = 60;
    const ATTACK_TRAVEL_MS = 5000;
    const ATTACK_HP = 3;
    function showFloatingText(className, text, x, y) {
        const pop = document.createElement('div');
        pop.className = className;
        pop.textContent = text;
        pop.style.left = `${x}px`;
        pop.style.top = `${y}px`;
        document.body.appendChild(pop);
        pop.addEventListener('animationend', () => pop.remove());
    }
    function spawnAttackCookie() {
        const w = window.innerWidth, h = window.innerHeight;
        const edge = Math.floor(Math.random() * 4);
        const startX = edge === 0 ? -ATTACK_SIZE : edge === 1 ? w : Math.random() * w;
        const startY = edge === 2 ? -ATTACK_SIZE : edge === 3 ? h : Math.random() * h;
        const target = cookie.getBoundingClientRect();
        const endX = target.left + target.width / 2 - ATTACK_SIZE / 2;
        const endY = target.top + target.height / 2 - ATTACK_SIZE / 2;

        const attacker = document.createElement('button');
        attacker.className = 'attack-cookie';
        attacker.style.setProperty('--t', `${ATTACK_TRAVEL_MS}ms`);
        attacker.style.left = `${startX}px`;
        attacker.style.top = `${startY}px`;
        document.body.appendChild(attacker);
        void attacker.offsetWidth; // commit start position so the transition runs
        attacker.style.left = `${endX}px`;
        attacker.style.top = `${endY}px`;

        const landing = setTimeout(() => {
            const stolen = Decimal.min(cookieBalance, Decimal.max(25, cookieBalance.times(0.05).round()));
            setBalance(cookieBalance.minus(stolen));
            showFloatingText('attack-bonus', `-${fmt(stolen)} 🍪`, endX, endY);
            attacker.remove();
        }, ATTACK_TRAVEL_MS);

        let hp = ATTACK_HP;
        attacker.addEventListener('mousedown', event => {
            showFloatingText('golden-bonus', weapon.icon, event.clientX, event.clientY);
            hp -= weapon.damage;
            if (hp > 0) return;
            clearTimeout(landing);
            addCookies(5);
            showFloatingText('golden-bonus', 'Swatted! +5 🍪', event.clientX, event.clientY - 30);
            attacker.remove();
        });
    }
    function scheduleAttackCookie() {
        setTimeout(() => {
            spawnAttackCookie();
            scheduleAttackCookie();
        }, 20000 + Math.random() * 30000);
    }
    scheduleAttackCookie();

    // Boss-style fights: click the cookie repeatedly to drain its HP before time runs out.
    // Used by boss cookies and the IRS. Only one fight at a time; returns false if busy.
    const FIGHT_SIZE = 180;
    let fightActive = false;
    let damageFight = null; // deals damage to the current fight, if any
    function spawnFight({ label, className, maxHp, timeMs, onWin, onLose }) {
        if (fightActive) return false;
        fightActive = true;
        let hp = maxHp;
        const x = FIGHT_SIZE / 2 + Math.random() * (window.innerWidth - FIGHT_SIZE * 2);
        const y = 40 + Math.random() * (window.innerHeight - FIGHT_SIZE - 80);

        const enemy = document.createElement('button');
        enemy.className = `boss-cookie ${className}`;
        enemy.style.left = `${x}px`;
        enemy.style.top = `${y}px`;
        const bar = document.createElement('div');
        bar.className = 'boss-bar';
        bar.dataset.label = label;
        bar.style.left = `${x}px`;
        bar.style.top = `${y - 8}px`;
        const fill = document.createElement('div');
        bar.appendChild(fill);
        document.body.append(enemy, bar);

        const finish = () => {
            fightActive = false;
            damageFight = null;
            enemy.remove();
            bar.remove();
        };

        const escape = setTimeout(() => {
            onLose(x, y);
            finish();
        }, timeMs);

        const hit = (event, damage) => {
            enemy.classList.add('hit');
            setTimeout(() => enemy.classList.remove('hit'), 80);
            hp -= damage;
            fill.style.width = `${Math.max(0, hp / maxHp * 100)}%`;
            if (hp > 0) return;
            clearTimeout(escape);
            damageFight = null;
            onWin(event);
            finish();
        };
        damageFight = damage => {
            const rect = enemy.getBoundingClientRect();
            hit({ clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }, damage);
        };
        enemy.addEventListener('mousedown', event => {
            showFloatingText('golden-bonus', weapon.icon, event.clientX, event.clientY);
            hit(event, weapon.damage);
        });
        return true;
    }

    // Win a boss fight for a big reward; lose and the boss eats a chunk of your cookies.
    function spawnBossCookie() {
        spawnFight({
            label: 'BOSS',
            className: 'boss',
            maxHp: 25,
            timeMs: 10000,
            onWin: event => {
                const reward = Decimal.max(1000, cookieBalance.times(0.5).round());
                addCookies(reward);
                showFloatingText('golden-bonus', `Boss defeated! +${fmt(reward)} 🍪`, event.clientX, event.clientY);
            },
            onLose: (x, y) => {
                const stolen = Decimal.min(cookieBalance, Decimal.max(250, cookieBalance.times(0.2).round()));
                setBalance(cookieBalance.minus(stolen));
                showFloatingText('attack-bonus', `Boss ate ${fmt(stolen)} 🍪`, x, y);
            },
        });
    }
    function scheduleBossCookie() {
        setTimeout(() => {
            spawnBossCookie();
            scheduleBossCookie();
        }, 90000 + Math.random() * 90000);
    }
    scheduleBossCookie();
    function scheduleDiamondCookie() {
        setTimeout(() => {
            spawnDiamondCookie();
            scheduleDiamondCookie();
        }, 90000 + Math.random() * 120000);
    }
    scheduleDiamondCookie();

    // A glass of water now and then: drink it (click) to be Hydrated, which multiplies all cookie gains
    const HYDRATED_MULTIPLIER = 2;
    const HYDRATED_MS = 30000;
    const WATER_LIFETIME_MS = 10000;
    const buffDisplay = document.getElementById('buff');
    let hydratedUntil = 0;
    setInterval(() => {
        const left = Math.ceil((hydratedUntil - Date.now()) / 1000);
        buffDisplay.textContent = left > 0 ? `🥛 Hydrated x${HYDRATED_MULTIPLIER} for ${left}s` : '';
    }, 250);
    function spawnWaterGlass() {
        const glass = document.createElement('button');
        glass.className = 'water-glass';
        glass.title = 'A glass of milk';
        glass.style.left = `${Math.random() * (window.innerWidth - 44)}px`;
        glass.style.top = `${Math.random() * (window.innerHeight - 64)}px`;
        const expire = setTimeout(() => glass.remove(), WATER_LIFETIME_MS);
        glass.addEventListener('mousedown', event => {
            clearTimeout(expire);
            hydratedUntil = Date.now() + HYDRATED_MS;
            showFloatingText('golden-bonus', 'Glug glug! Hydrated 🥛', event.clientX, event.clientY);
            glass.remove();
        });
        document.body.appendChild(glass);
    }
    function scheduleWaterGlass() {
        setTimeout(() => {
            spawnWaterGlass();
            scheduleWaterGlass();
        }, 40000 + Math.random() * 60000);
    }
    scheduleWaterGlass();

    // Cookie taxes: every minute the Cookie Tax Man takes a cut of your balance.
    // Balances under the exemption are safe; Tax Loophole upgrades lower the rate.
    const TAX_INTERVAL_S = 60;
    const TAX_EXEMPT = 100;
    const taxTimerDisplay = document.getElementById('taxTimer');
    let taxCountdown = TAX_INTERVAL_S;
    const taxRate = () => 0.03 - 0.005 * level('loophole');
    const evasionChance = () => 0.15 * level('evasion');
    // Dodge taxes too often and the IRS (Internal Cookie Service) cookie shows up for an audit. Paying a tax cools suspicion.
    const AUDIT_THRESHOLD = 3;
    let suspicion = 0;
    let evadedTotal = D(0);
    function callIrs() {
        const owed = evadedTotal;
        return spawnFight({
            label: 'IRS',
            className: 'irs',
            maxHp: 20,
            timeMs: 8000,
            onWin: event => {
                showFloatingText('golden-bonus', 'Internal Cookie Service (IRS) shooed away! Case closed.', event.clientX, event.clientY);
            },
            onLose: (x, y) => {
                // Back taxes plus a 25% fine
                const bill = Decimal.min(cookieBalance, Decimal.max(100, owed.times(1.25).round()));
                setBalance(cookieBalance.minus(bill));
                showFloatingText('attack-bonus', `Internal Cookie Service audit! Back taxes + fine: ${fmt(bill)} 🍪`, x, y);
            },
        });
    }
    function collectTax() {
        if (cookieBalance.lte(TAX_EXEMPT)) {
            showFloatingText('golden-bonus', 'Tax Man: tax exempt!', window.innerWidth / 2, window.innerHeight / 2);
            return;
        }
        if (Math.random() < evasionChance()) {
            showFloatingText('golden-bonus', 'Tax evasion successful! 🕵️', window.innerWidth / 2, window.innerHeight / 2);
            evadedTotal = evadedTotal.plus(Decimal.max(1, cookieBalance.times(taxRate()).round()));
            if (++suspicion >= AUDIT_THRESHOLD && callIrs()) {
                suspicion = 0;
                evadedTotal = D(0);
                showFloatingText('attack-bonus', 'The Internal Cookie Service noticed... 🧾', window.innerWidth / 2, window.innerHeight / 2 + 40);
            }
            return;
        }
        suspicion = Math.max(0, suspicion - 1);
        const tax = Decimal.max(1, cookieBalance.times(taxRate()).round());
        setBalance(cookieBalance.minus(tax));
        showFloatingText('attack-bonus', `Tax Man took ${fmt(tax)} 🍪`, window.innerWidth / 2, window.innerHeight / 2);
    }
    function renderTaxTimer() {
        const evade = evasionChance() ? `, ${Math.round(evasionChance() * 100)}% evasion` : '';
        taxTimerDisplay.textContent = `🧾 Tax (${(taxRate() * 100).toFixed(1)}%${evade}) in ${taxCountdown}s`;
    }
    renderTaxTimer();
    setInterval(() => {
        if (--taxCountdown <= 0) {
            collectTax();
            taxCountdown = TAX_INTERVAL_S;
        }
        renderTaxTimer();
    }, 1000);

    // The cookie teaches: every so often it says a random Wikipedia fact
    const speech = document.getElementById('cookie-speech');
    const SPEECH_INTERVAL_MS = 25000;
    const SPEECH_VISIBLE_MS = 15000;
    function shorten(text, max=240) {
        if (text.length <= max) return text;
        const cut = text.slice(0, max);
        const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('? '), cut.lastIndexOf('! '));
        return end > 80 ? cut.slice(0, end + 1) : cut.replace(/\s+\S*$/, '') + '…';
    }
    let speechHideTimer;
    function sayInSpeech(heading, body) {
        speech.replaceChildren();
        const title = document.createElement('strong');
        title.textContent = heading;
        const text = document.createElement('span');
        text.textContent = body;
        speech.append(title, text);

        const rect = cookie.getBoundingClientRect();
        speech.style.left = `${rect.left + rect.width / 2}px`;
        speech.style.top = `${Math.min(rect.bottom + 14, window.innerHeight - speech.offsetHeight - 8)}px`;
        speech.classList.add('visible');
        clearTimeout(speechHideTimer);
        speechHideTimer = setTimeout(() => speech.classList.remove('visible'), SPEECH_VISIBLE_MS);
    }
    async function cookieSpeak() {
        try {
            const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            if (!res.ok) return;
            const page = await res.json();
            if (page.type !== 'standard' || !page.extract) return; // skip disambiguation pages
            sayInSpeech(page.title, shorten(page.extract));
        } catch (err) {
            // offline or blocked: the cookie just stays quiet
        }
    }
    setTimeout(cookieSpeak, 3000);
    setInterval(cookieSpeak, SPEECH_INTERVAL_MS);

    // Milestones: each time the balance reaches a new power of ten, the cookie says good job
    const milestoneOf = balance => balance.lt(10) ? 0 : Math.floor(balance.log10());
    let lastMilestone = milestoneOf(cookieBalance);
    setInterval(() => {
        const reached = milestoneOf(cookieBalance);
        if (reached > lastMilestone) sayInSpeech('good job', `You reached ${fmt(D(10).pow(reached))} cookies!`);
        lastMilestone = Math.max(lastMilestone, reached);
    }, 500);

    // Achievements: unlocked the first time the balance reaches a threshold, and kept even if it drops later
    const ACHIEVEMENTS = [
        { id: 'a100',  name: 'Crumbs',            at: 100 },
        { id: 'a1k',   name: 'Cookie Jar',        at: 1e3 },
        { id: 'a10k',  name: 'Bakery Intern',     at: 1e4 },
        { id: 'a100k', name: 'Head Baker',        at: 1e5 },
        { id: 'a1m',   name: 'Cookie Millionaire', at: 1e6 },
        { id: 'a100m', name: 'Cookie Mogul',      at: 1e8 },
        { id: 'a1b',   name: 'Cookie Billionaire', at: 1e9 },
        { id: 'a1t',   name: 'Cookie Empire',     at: 1e12 },
        { id: 'a1qa',  name: 'Cookie Galaxy',     at: 1e15 },
        { id: 'a1qi',  name: 'Cookie Universe',   at: 1e18 },
        { id: 'a1sx',  name: 'Cookie Multiverse', at: 1e21 },
        { id: 'a1dc',  name: 'Cookie Singularity', at: 1e33 },
    ];
    const unlocked = JSON.parse(localStorage.getItem("achievements") || "{}");
    const achievementList = document.getElementById('achievements');
    const achievementEls = {};
    for (const a of ACHIEVEMENTS) {
        achievementEls[a.id] = achievementList.appendChild(document.createElement('div'));
    }
    function renderAchievements() {
        for (const a of ACHIEVEMENTS) {
            const el = achievementEls[a.id];
            const done = unlocked[a.id];
            el.className = done ? 'achievement unlocked' : 'achievement';
            el.textContent = done ? `🏆 ${a.name} - ${fmt(a.at)} 🍪` : `🔒 Reach ${fmt(a.at)} 🍪`;
        }
    }
    setInterval(() => {
        let changed = false;
        for (const a of ACHIEVEMENTS) {
            if (unlocked[a.id] || cookieBalance.lt(a.at)) continue;
            unlocked[a.id] = true;
            changed = true;
            sayInSpeech('🏆 Achievement unlocked', `${a.name}: reach ${fmt(a.at)} cookies`);
        }
        if (!changed) return;
        localStorage.setItem("achievements", JSON.stringify(unlocked));
        renderAchievements();
    }, 500);
    renderAchievements();

    // Synthesized crunch: a burst of filtered noise plus a short pitched thump, varied per click
    let audioCtx = null;
    let noiseBuffer = null;
    function playClickSound() {
        try {
            audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') audioCtx.resume();
            const now = audioCtx.currentTime;
            if (!noiseBuffer) {
                noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
                const data = noiseBuffer.getChannelData(0);
                for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
            }
            const noise = audioCtx.createBufferSource();
            noise.buffer = noiseBuffer;
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 1500 + Math.random() * 2000;
            const noiseGain = audioCtx.createGain();
            noiseGain.gain.setValueAtTime(0.5, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            noise.connect(filter).connect(noiseGain).connect(audioCtx.destination);
            noise.start(now);

            const osc = audioCtx.createOscillator();
            const oscGain = audioCtx.createGain();
            osc.frequency.setValueAtTime(260 + Math.random() * 80, now);
            osc.frequency.exponentialRampToValueAtTime(70, now + 0.1);
            oscGain.gain.setValueAtTime(0.35, now);
            oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
            osc.connect(oscGain).connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.12);
        } catch (err) {
            // audio unavailable: stay silent
        }
    }

    const COOKIE_TYPES = ['cookie.png', 'cookie-2.png', 'cookie-3.webp', 'cookieart.png'];
    function animateClick(event) {
        playClickSound();
        cookie.classList.remove('pressed');
        void cookie.offsetWidth; // restart animation
        cookie.classList.add('pressed');

        const pop = document.createElement('div');
        pop.className = 'click-pop';
        pop.style.left = `${event.clientX}px`;
        pop.style.top = `${event.clientY}px`;
        const type = COOKIE_TYPES[Math.floor(Math.random() * COOKIE_TYPES.length)];
        pop.style.backgroundImage = `url(assets/${type})`;
        pop.style.setProperty('--r', `${Math.random() * 80 - 40}deg`);
        document.body.appendChild(pop);
        pop.addEventListener('animationend', () => pop.remove());

        const spawn = (className, x, y, text) => {
            const el = document.createElement('div');
            el.className = className;
            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            if (text) el.textContent = text;
            document.body.appendChild(el);
            el.addEventListener('animationend', () => el.remove());
            return el;
        };
        spawn('click-ring', event.clientX, event.clientY);
        spawn('click-number', event.clientX + Math.random() * 40 - 20, event.clientY - 20, `+${fmt(clickValue())}`);
        for (let i = 0; i < 6; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 50;
            const crumb = spawn('click-crumb', event.clientX, event.clientY);
            crumb.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
            crumb.style.setProperty('--dy', `${Math.sin(angle) * dist + 20}px`);
        }
    }

    // Kevin pops up every few minutes with a task. Finish it before time runs out for a cookie reward.
    const KEVIN_TASK_MS = 20000;
    const kevinTasks = [
        { text: n => `Click ${n} times in ${KEVIN_TASK_MS / 1000}s!`,   goal: () => 20 + Math.floor(Math.random() * 20), progress: 'clicks' },
        { text: n => `Earn ${fmt(n)} 🍪 in ${KEVIN_TASK_MS / 1000}s!`,  goal: () => Decimal.max(50, cookieBalance.times(0.02).round()), progress: 'earned' },
    ];
    let kevin = null;
    function spawnKevin() {
        if (kevin) return;
        const task = kevinTasks[Math.floor(Math.random() * kevinTasks.length)];
        const goal = task.goal();
        const card = document.createElement('div');
        card.id = 'kevin';
        const title = document.createElement('strong');
        title.textContent = '🧑 Kevin says:';
        const body = document.createElement('div');
        body.textContent = task.text(goal);
        const status = document.createElement('div');
        card.append(title, body, status);
        document.body.appendChild(card);

        const startBalance = cookieBalance;
        const deadline = Date.now() + KEVIN_TASK_MS;
        kevin = { clicks: 0 };
        const finish = (done) => {
            clearInterval(tick);
            if (done) {
                const reward = Decimal.max(500, cookieBalance.times(0.05).round());
                addCookies(reward);
                title.textContent = '🧑 Kevin: nice work!';
                status.textContent = `+${fmt(reward)} 🍪`;
            } else {
                title.textContent = '🧑 Kevin: disappointing.';
                status.textContent = 'Task failed.';
            }
            kevin = null;
            setTimeout(() => card.remove(), 3000);
        };
        const tick = setInterval(() => {
            const have = task.progress === 'clicks' ? D(kevin.clicks) : cookieBalance.minus(startBalance);
            const left = Math.ceil((deadline - Date.now()) / 1000);
            status.textContent = `${fmt(Decimal.max(0, have))} / ${fmt(goal)} (${left}s)`;
            if (have.gte(goal)) finish(true);
            else if (left <= 0) finish(false);
        }, 250);
    }
    function scheduleKevin() {
        setTimeout(() => {
            spawnKevin();
            scheduleKevin();
        }, 120000 + Math.random() * 120000);
    }
    scheduleKevin();

    // Hack tool (dev panel): press ` (backtick) to toggle, or use window.hack in the console
    const hack = {
        give: n => addCookies(n),
        set: n => setBalance(D(n)),
        spawn: {
            golden: spawnGoldenCookie,
            diamond: spawnDiamondCookie,
            cheese: spawnCheese,
            attack: spawnAttackCookie,
            boss: spawnBossCookie,
            water: spawnWaterGlass,
            irs: callIrs,
            kevin: spawnKevin,
            versus: startVersus,
        },
        tax: () => collectTax(),
        maxUpgrades: () => {
            for (const u of UPGRADES) owned[u.id] = u.max || 25;
            localStorage.setItem("upgrades", JSON.stringify(owned));
            renderShop();
        },
        resetUpgrades: () => {
            for (const id of Object.keys(owned)) delete owned[id];
            localStorage.setItem("upgrades", "{}");
            renderShop();
        },
    };
    window.hack = hack;

    const panel = document.createElement('div');
    panel.id = 'hack-panel';
    panel.addEventListener('mousedown', event => event.stopPropagation());
    const title = document.createElement('div');
    title.className = 'hack-title';
    title.textContent = 'HACK TOOL (` to close)';
    panel.appendChild(title);
    const amount = document.createElement('input');
    amount.value = '1000000';
    amount.size = 12;
    panel.appendChild(amount);
    const actions = [
        ['Give', () => hack.give(amount.value)],
        ['Set balance', () => hack.set(amount.value)],
        ['Golden', hack.spawn.golden],
        ['Diamond', hack.spawn.diamond],
        ['Attack', hack.spawn.attack],
        ['Boss', hack.spawn.boss],
        ['Water', hack.spawn.water],
        ['IRS', hack.spawn.irs],
        ['Kevin', hack.spawn.kevin],
        ['Versus', hack.spawn.versus],
        ['Collect tax', hack.tax],
        ['Max upgrades', hack.maxUpgrades],
        ['Reset upgrades', hack.resetUpgrades],
    ];
    for (const [label, fn] of actions) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.addEventListener('click', () => fn());
        panel.appendChild(btn);
    }
    document.body.appendChild(panel);
    document.addEventListener('keydown', event => {
        if (event.key === '`') panel.classList.toggle('open');
    });

    document.body.addEventListener('mousedown', event => {
        animateClick(event);
        if (kevin) kevin.clicks++;
        if (clickValue() > 1) addCookies(clickValue() - 1);
        click(event);
    });
})();
