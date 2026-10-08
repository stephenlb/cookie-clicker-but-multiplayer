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

    // Shop: spend cookies on upgrades. Prices grow 15% per level owned.
    const UPGRADES = [
        { id: 'finger',  name: 'Strong Finger',  desc: '+1 cookie per click',        cost: 50 },
        { id: 'grandma', name: 'Grandma',        desc: 'bakes 1 cookie/sec',         cost: 100 },
        { id: 'oven',    name: 'Oven',           desc: 'bakes 8 cookies/sec',        cost: 800 },
        { id: 'factory', name: 'Factory',        desc: 'bakes 50 cookies/sec',       cost: 5000 },
        { id: 'message', name: 'Message Booster',   desc: '+10 cookies per chat message',   cost: 200 },
        { id: 'chat',    name: 'Word Booster',      desc: '+5 cookies per chat word',       cost: 300 },
        { id: 'char',    name: 'Character Booster', desc: '+1 cookie per chat character',   cost: 500 },
        { id: 'double',  name: '2X Clicker',     desc: 'doubles cookies per click',  cost: 500, growth: 4, max: 5 },
        { id: 'loophole', name: 'Tax Loophole',  desc: '-0.5% cookie tax rate',      cost: 1000, growth: 2, max: 5 },
        { id: 'evasion', name: 'Tax Evasion',   desc: '+15% chance to dodge each tax', cost: 2500, growth: 3, max: 5 },
        { id: 'fast',    name: 'Fast Clicker',   desc: 'auto-clicks 2 times/sec',    cost: 400 },
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
    const bakedPerSecond = () => level('grandma') + 8 * level('oven') + 50 * level('factory');

    const shopList = document.getElementById('upgrades');
    const shopButtons = {};
    for (const u of UPGRADES) {
        const btn = document.createElement('button');
        btn.className = 'upgrade';
        btn.addEventListener('click', () => buyUpgrade(u));
        shopList.appendChild(btn);
        shopButtons[u.id] = btn;
    }
    // Shop clicks should not count as cookie clicks
    document.getElementById('shop').addEventListener('mousedown', event => event.stopPropagation());

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

    const MAX_CHAT_MESSAGES = 50;
    const chatDisplay = document.getElementById("chat");
    function chatReceiver(data) {
        if (!data || typeof data.message !== "string") return;
        // Drop Twitch system notices and anonymous senders
        const user = String(data.user || "").trim();
        if (!user || user.toLowerCase() === "tmi.twitch.tv") return;
        const message = data.message;

        // textContent keeps user input from being interpreted as HTML
        const line = document.createElement("div");
        line.className = "chat";
        const name = document.createElement("strong");
        name.className = "chat-user";
        name.textContent = user;
        const text = document.createElement("span");
        text.textContent = `: ${message}`;
        line.append(name, text);

        // Newest message on top, capped so the page does not grow forever
        chatDisplay.prepend(line);
        while (chatDisplay.children.length > MAX_CHAT_MESSAGES) {
            chatDisplay.lastElementChild.remove();
        }

        // Per message, plus per word and per character once those upgrades are owned
        const wordCount = message.split(/\s+/).filter(Boolean).length;
        addCookies(chatMessageValue() + chatWordValue() * wordCount + chatCharValue() * message.length);
        const match = message.match(/[a-fA-F0-9]{6}/);
        if (match) {
            document.body.style.backgroundColor = `#${match[0]}`;
        }
    }

    function addCookies(cookies=1) {
        // +1x per power of ten above a million (a linear multiplier made the balance explode)
        cookies = D(cookies).times(1 + Math.floor(cookieBalance.div(1000000).plus(1).log10()));
        if (Date.now() < hydratedUntil) cookies = cookies.times(HYDRATED_MULTIPLIER);
        setBalance(cookieBalance.plus(cookies));
        let rand = Math.random() * 10 - Math.random() * 10;
        let scaleRand = Math.round(Math.random() * 10) / 6;
        cookieBalanceDisplay.style.top = `${Math.random()*10}px`;
        cookieBalanceDisplay.style.transform = `rotate(${rand}deg) scale(${scaleRand})`;
    }

    function setBalance(balance) {
        // Round the cookies because cookies are round thank you @theavebel
        cookieBalance = balance.round();
        if (cookieBalance.lt(0)) cookieBalance = D(0);
        cookieBalanceDisplay.innerHTML = fmt(cookieBalance);
        localStorage.setItem("cookies", cookieBalance.toString());
    }

    function getCookies() {
        const saved = D(localStorage.getItem("cookies") || 0);
        // Recover from a corrupted save (NaN / negative)
        return isNaN(saved.mantissa) || saved.lt(0) ? D(0) : saved;
    }

    function cookieClickTransmit(hash) {
        pubnub.publish({
            channel: COOKIE_CHANNEL,
            message: hash,
        });
    }
    async function cookieClickReceiver(hash) {
        let verified = await verify(hash);
        //console.log(`Cookie Click Verified: ${verified}`);
        addCookies(1);
    }

    pubnub.subscribe({
        channel: COOKIE_CHANNEL,
        messages: cookieClickReceiver,
    });

    let cookie = document.getElementById("cookie");
    setInterval( click, 1000);
    async function click(event) {
        //console.log('clicked');
        await nonceFinder(DIFFICULTY, hash => {
            //console.log(hash);
            cookieClickTransmit(hash);
        });
    }

    // Golden cookies appear at random spots for a few seconds; click one for a bonus
    const GOLDEN_SIZE = 80;
    const GOLDEN_LIFETIME = 8000;
    function spawnGoldenCookie() {
        const golden = document.createElement('button');
        golden.className = 'golden-cookie';
        golden.style.left = `${Math.random() * (window.innerWidth - GOLDEN_SIZE)}px`;
        golden.style.top = `${Math.random() * (window.innerHeight - GOLDEN_SIZE)}px`;

        const dismiss = () => {
            golden.classList.add('leaving');
            setTimeout(() => golden.remove(), 400);
        };
        const expire = setTimeout(dismiss, GOLDEN_LIFETIME);

        golden.addEventListener('mousedown', event => {
            event.stopPropagation(); // not a regular cookie click
            clearTimeout(expire);
            const bonus = Decimal.max(100, cookieBalance.times(0.1).round());
            addCookies(bonus);
            const pop = document.createElement('div');
            pop.className = 'golden-bonus';
            pop.textContent = `+${fmt(bonus)} 🍪`;
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

    // Attack cookies fly in from a screen edge toward the big cookie.
    // Click one to swat it for a small reward; if it lands, it steals cookies.
    const ATTACK_SIZE = 60;
    const ATTACK_TRAVEL_MS = 5000;
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

        attacker.addEventListener('mousedown', event => {
            event.stopPropagation(); // not a regular cookie click
            clearTimeout(landing);
            addCookies(5);
            showFloatingText('golden-bonus', 'Swatted! +5 🍪', event.clientX, event.clientY);
            attacker.remove();
        });
    }
    function scheduleAttackCookie() {
        setTimeout(() => {
            spawnAttackCookie();
            scheduleAttackCookie();

    // Boss-style fights: click the cookie repeatedly to drain its HP before time runs out.
    // Used by boss cookies and the IRS. Only one fight at a time; returns false if busy.
    const FIGHT_SIZE = 180;
    let fightActive = false;
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
            enemy.remove();
            bar.remove();
        };

        const escape = setTimeout(() => {
            onLose(x, y);
            finish();
        }, timeMs);

        enemy.addEventListener('mousedown', event => {
            event.stopPropagation(); // not a regular cookie click
            enemy.classList.add('hit');
            setTimeout(() => enemy.classList.remove('hit'), 80);
            hp--;
            fill.style.width = `${Math.max(0, hp / maxHp * 100)}%`;
            if (hp > 0) return;
            clearTimeout(escape);
            onWin(event);
            finish();
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
        }, 20000 + Math.random() * 30000);
    }
    scheduleAttackCookie();
        }, 15000 + Math.random() * 30000);
    }
    scheduleGoldenCookie();

    // A glass of water now and then: drink it (click) to be Hydrated, which multiplies all cookie gains
    const HYDRATED_MULTIPLIER = 2;
    const HYDRATED_MS = 30000;
    const WATER_LIFETIME_MS = 10000;
    const buffDisplay = document.getElementById('buff');
    let hydratedUntil = 0;
    setInterval(() => {
        const left = Math.ceil((hydratedUntil - Date.now()) / 1000);
        buffDisplay.textContent = left > 0 ? `💧 Hydrated x${HYDRATED_MULTIPLIER} for ${left}s` : '';
    }, 250);
    function spawnWaterGlass() {
        const glass = document.createElement('button');
        glass.className = 'water-glass';
        glass.title = 'A glass of water';
        glass.style.left = `${Math.random() * (window.innerWidth - 44)}px`;
        glass.style.top = `${Math.random() * (window.innerHeight - 64)}px`;
        const expire = setTimeout(() => glass.remove(), WATER_LIFETIME_MS);
        glass.addEventListener('mousedown', event => {
            event.stopPropagation(); // not a regular cookie click
            clearTimeout(expire);
            hydratedUntil = Date.now() + HYDRATED_MS;
            showFloatingText('golden-bonus', 'Glug glug! Hydrated 💧', event.clientX, event.clientY);
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
    // Dodge taxes too often and the IRS cookie shows up for an audit. Paying a tax cools suspicion.
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
                showFloatingText('golden-bonus', 'IRS shooed away! Case closed.', event.clientX, event.clientY);
            },
            onLose: (x, y) => {
                // Back taxes plus a 25% fine
                const bill = Decimal.min(cookieBalance, Decimal.max(100, owed.times(1.25).round()));
                setBalance(cookieBalance.minus(bill));
                showFloatingText('attack-bonus', `IRS audit! Back taxes + fine: ${fmt(bill)} 🍪`, x, y);
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
                showFloatingText('attack-bonus', 'The IRS noticed... 🧾', window.innerWidth / 2, window.innerHeight / 2 + 40);
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
    async function cookieSpeak() {
        try {
            const res = await fetch('https://en.wikipedia.org/api/rest_v1/page/random/summary');
            if (!res.ok) return;
            const page = await res.json();
            if (page.type !== 'standard' || !page.extract) return; // skip disambiguation pages
            speech.replaceChildren();
            const title = document.createElement('strong');
            title.textContent = page.title;
            const text = document.createElement('span');
            text.textContent = shorten(page.extract);
            speech.append(title, text);

            const rect = cookie.getBoundingClientRect();
            speech.style.left = `${rect.left + rect.width / 2}px`;
            speech.style.top = `${Math.min(rect.bottom + 14, window.innerHeight - speech.offsetHeight - 8)}px`;
            speech.classList.add('visible');
            setTimeout(() => speech.classList.remove('visible'), SPEECH_VISIBLE_MS);
        } catch (err) {
            // offline or blocked: the cookie just stays quiet
        }
    }
    setTimeout(cookieSpeak, 3000);
    setInterval(cookieSpeak, SPEECH_INTERVAL_MS);

    function animateClick(event) {
        cookie.classList.remove('pressed');
        void cookie.offsetWidth; // restart animation
        cookie.classList.add('pressed');

        const pop = document.createElement('div');
        pop.className = 'click-pop';
        pop.style.left = `${event.clientX}px`;
        pop.style.top = `${event.clientY}px`;
        pop.style.setProperty('--r', `${Math.random() * 80 - 40}deg`);
        document.body.appendChild(pop);
        pop.addEventListener('animationend', () => pop.remove());
    }

    // Hack tool (dev panel): press ` (backtick) to toggle, or use window.hack in the console
    const hack = {
        give: n => addCookies(n),
        set: n => setBalance(D(n)),
        spawn: {
            golden: spawnGoldenCookie,
            attack: spawnAttackCookie,
            boss: spawnBossCookie,
            water: spawnWaterGlass,
            irs: callIrs,
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
        ['Attack', hack.spawn.attack],
        ['Boss', hack.spawn.boss],
        ['Water', hack.spawn.water],
        ['IRS', hack.spawn.irs],
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
        if (clickValue() > 1) addCookies(clickValue() - 1);
        click(event);
    });
})();
