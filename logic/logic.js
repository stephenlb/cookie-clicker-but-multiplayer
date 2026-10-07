(async () =>  {
    let cookiesPerSecond = 0;
    let cookieBalance = getCookies();
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
    });

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
        console.log(`Cookie Click Verified: ${verified}`);
        addCookies(1);
    }

    pubnub.subscribe({
        channel: COOKIE_CHANNEL,
        messages: cookieClickReceiver,
    });

    let cookie = document.getElementById("cookie");
    setInterval( click, 1000);
    async function click(event) {
        console.log('clicked');
        let start = +new Date;
        await nonceFinder(DIFFICULTY, hash => {
            let end = +new Date;
            console.log(hash);
            console.log("Latency: ", end - start);
            cookieClickTransmit(hash);
        });
    }



    cookie.addEventListener('mousedown', click);
})();
