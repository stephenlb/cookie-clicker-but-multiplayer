(async () =>  {
    let cookiesPerSecond = 0;
    let cookieBalance = getCookies();
    const chat_channel = localStorage.getItem("chat_channel");
    const hashCache = JSON.parse(localStorage.getItem("hashCache")||"{}");
    const cookieBalanceDisplay = document.querySelector('#cookies');
    const cookiePerSecondBalanceDisplay = document.querySelector('#cookiesPerSecond');
    const DIFFICULTY = 4;
    const COOKIE_CHANNEL = "Cookies";
    const hashString = async s => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(b => b.toString(16).padStart(2, '0')).join('');

    // Calculate Cookies Per Second
    let previousCookieBalance = 0;
    setInterval( () => {
        cookiePerSecondBalanceDisplay.innerHTML = cookiesPerSecond =
            cookieBalance - previousCookieBalance;
        previousCookieBalance = cookieBalance;
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
        const user = String(data.user || "anonymous");
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

        addCookies(10);
        const match = message.match(/[a-fA-F0-9]{6}/);
        if (match) {
            document.body.style.backgroundColor = `#${match[0]}`;
        }
    }

    function addCookies(cookies=1) {
        cookies *= 1 + Math.round(cookieBalance / 1000000);
        cookieBalance += cookies;
        // Round the cookies because cookies are round thank you @theavebel
        cookieBalance = Math.round(cookieBalance);
        cookieBalanceDisplay.innerHTML = cookieBalance;
        let rand = Math.random() * 10 - Math.random() * 10;
        let scaleRand = Math.round(Math.random() * 10) / 6;
        cookieBalanceDisplay.style.top = `${Math.random()*10}px`;
        cookieBalanceDisplay.style.transform = `rotate(${rand}deg) scale(${scaleRand})`;
        localStorage.setItem("cookies", cookieBalance);
    }

    function getCookies() {
        return +localStorage.getItem("cookies") || 0;
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



    cookie.addEventListener('mousedown', click);
})();
