// Secret door: a tiny door hidden in the corner leads inside the cookie jar,
// where every cookie wears a hat.
(() => {
    // Each hat comes with a personality: a name, a greeting, keyword replies and idle chatter
    const PERSONALITIES = [
        { hat: '🎩', name: 'Sir Crumbsworth', greet: 'Good evening. Do mind the milk.', idle: ['Quite the vintage, this jar.', 'One simply does not get dunked.'],
          replies: { hello: 'Charmed, I am sure.', milk: 'Unspeakable. Ghastly. Do go on.', name: 'Sir Crumbsworth the Third.', joke: 'Why did the cookie visit the doctor? He felt crumby. Ahem.' }, fallback: 'Hmm. Indeed. Quite.' },
        { hat: '👑', name: 'Queen Chip', greet: 'Bow before the chocolate chip.', idle: ['I have the most chips here.', 'Fetch me a napkin.'],
          replies: { hello: 'You may address me.', milk: 'Only the finest, served warm.', name: 'Queen Chip. Always Queen.', joke: 'You are the joke. Kidding. Mostly.' }, fallback: 'Do not bore me, peasant.' },
        { hat: '🤠', name: 'Dusty', greet: 'Howdy, partner. Cookie country.', idle: ['Long day on the baking sheet.', 'Smells like oven out there.'],
          replies: { hello: 'Well howdy!', milk: 'Cold glass of milk, now we\'re talkin.', name: 'They call me Dusty.', joke: 'Why can\'t a cookie ride a horse? No legs, partner.' }, fallback: 'Yeehaw, I reckon.' },
        { hat: '🧙', name: 'Merlin Oats', greet: 'I foresaw your arrival. Also raisins.', idle: ['The oven speaks in tongues.', 'I sense a sprinkle disturbance.'],
          replies: { hello: 'Greetings, mortal.', milk: 'A potion of great power.', name: 'Merlin Oats, archmage.', joke: 'The spell was fine. The cookie is the punchline.' }, fallback: 'The stars are unclear.' },
        { hat: '🥳', name: 'Sprinkles', greet: 'PARTY!! You came!!', idle: ['Is it someone\'s birthday?!', 'Confetti!!'],
          replies: { hello: 'HIII!!!', milk: 'MILK PARTY!!', name: 'Sprinkles!! Hi!!', joke: 'Knock knock! Who\'s there? PARTY!' }, fallback: 'Yay!! Whatever that was!!' },
        { hat: '🎓', name: 'Professor Dough', greet: 'Ah, a student. Sit. Preheat to 350.', idle: ['Fun fact: I am mostly flour.', 'Statistically, I am delicious.'],
          replies: { hello: 'Class is in session.', milk: 'Milk: a calcium-based dunking medium.', name: 'Professor Dough, PhD.', joke: 'Humor is just baked-in tension.' }, fallback: 'Interesting hypothesis.' },
        { hat: '🎅', name: 'Cookie Claus', greet: 'Ho ho ho! Did you leave me out?', idle: ['Nice list or naughty list?', 'I get left out every December.'],
          replies: { hello: 'Ho ho hello!', milk: 'Santa\'s favorite. Mine too.', name: 'Cookie Claus.', joke: 'What do cookies sing? Jingle bakes!' }, fallback: 'Ho ho ho?' },
        { hat: '👷', name: 'Hardhat Hank', greet: 'Careful, structural integrity here is low.', idle: ['This jar is not up to code.', 'Crumbling. Always crumbling.'],
          replies: { hello: 'Safety first, hi.', milk: 'Waterlogging risk. Bad for structure.', name: 'Hank. Foreman.', joke: 'I do not joke on the job site.' }, fallback: 'Add that to the punch list.' },
        { hat: '🧢', name: 'Chill Chip', greet: 'yo. what\'s up. no worries.', idle: ['just vibing in the jar', 'dunk or be dunked, whatever'],
          replies: { hello: 'yooo', milk: 'milk is chill. i\'m chill.', name: 'chill chip. call me cc.', joke: 'lol idk. cookies are funny just existing.' }, fallback: 'ya. totally.' },
        { hat: '👒', name: 'Lady Macaroon', greet: 'Darling! How divine of you to visit.', idle: ['Such drab lighting in here.', 'Where is my tea?'],
          replies: { hello: 'Darling!', milk: 'Only in porcelain, dear.', name: 'Lady Macaroon, naturally.', joke: 'Oh, I could not possibly.' }, fallback: 'How terribly provincial.' },
    ];
    const COOKIE_COUNT = 24;

    const door = document.createElement('div');
    door.id = 'secret-door';
    door.title = '';
    door.innerHTML = '<span class=door-knob></span>';

    const jar = document.createElement('div');
    jar.id = 'jar-inside';
    jar.innerHTML = '<div class=jar-glass></div><div class=jar-title>Inside the cookie jar</div>'
        + '<div class=jar-bubble></div>'
        + '<form class=jar-talk autocomplete=off><input maxlength=120 placeholder="Click a cookie, then talk to it"><button>Say</button></form>'
        + '<button class=jar-exit>Leave through the door 🚪</button>';
    const bubble = jar.querySelector('.jar-bubble');
    const talkForm = jar.querySelector('.jar-talk');
    const talkInput = talkForm.querySelector('input');
    let selected = null;
    let bubbleTimer;
    const pick = list => list[Math.floor(Math.random() * list.length)];
    function say(wrap, text) {
        const p = wrap.personality;
        bubble.replaceChildren();
        const who = document.createElement('strong');
        who.textContent = `${p.hat} ${p.name}`;
        bubble.append(who, document.createTextNode(text));
        bubble.classList.add('visible');
        const rect = wrap.getBoundingClientRect();
        bubble.style.left = `${Math.min(Math.max(rect.left + rect.width / 2, 130), window.innerWidth - 130)}px`;
        bubble.style.top = `${Math.max(rect.top - 90, 8)}px`;
        clearTimeout(bubbleTimer);
        bubbleTimer = setTimeout(() => bubble.classList.remove('visible'), 6000);
    }
    function reply(p, text) {
        const t = text.toLowerCase();
        if (/\b(hi|hello|hey|yo|howdy)\b/.test(t)) return p.replies.hello;
        if (/milk/.test(t)) return p.replies.milk;
        if (/name|who are you/.test(t)) return p.replies.name;
        if (/joke|funny|laugh/.test(t)) return p.replies.joke;
        if (/eat|bite|hungry|dunk/.test(t)) return 'Eat me?! ...Okay, rude. I mean, ' + p.fallback.toLowerCase();
        return p.fallback;
    }
    talkForm.addEventListener('submit', event => {
        event.preventDefault();
        const text = talkInput.value.trim();
        if (!text) return;
        talkInput.value = '';
        if (!selected) selected = jar.querySelector('.jar-cookie');
        say(selected, reply(selected.personality, text));
    });
    // The input must not trigger Escape-less global key handlers
    talkInput.addEventListener('keydown', event => event.stopPropagation());
    const exit = jar.querySelector('.jar-exit');

    for (let i = 0; i < COOKIE_COUNT; i++) {
        const wrap = document.createElement('div');
        wrap.className = 'jar-cookie';
        wrap.style.left = (4 + Math.random() * 88) + '%';
        wrap.style.bottom = (2 + Math.random() * 70) + '%';
        wrap.style.setProperty('--bob', (1.5 + Math.random() * 2) + 's');
        wrap.style.setProperty('--delay', (-Math.random() * 3) + 's');
        wrap.style.setProperty('--tilt', (Math.random() * 20 - 10) + 'deg');
        wrap.innerHTML = '<span class=jar-hat></span><img src="assets/cookie.png" alt="">';
        wrap.personality = PERSONALITIES[i % PERSONALITIES.length];
        wrap.querySelector('.jar-hat').textContent = wrap.personality.hat;
        wrap.addEventListener('click', () => {
            selected = wrap;
            talkInput.focus();
            say(wrap, wrap.personality.greet);
        });
        jar.appendChild(wrap);
    }

    // Cookies chatter on their own while the jar is open
    setInterval(() => {
        if (!jar.classList.contains('open') || bubble.classList.contains('visible')) return;
        const wrap = pick([...jar.querySelectorAll('.jar-cookie')]);
        say(wrap, pick(wrap.personality.idle));
    }, 7000);

    const setOpen = open => jar.classList.toggle('open', open);
    door.addEventListener('click', () => setOpen(true));
    exit.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setOpen(false);
    });

    // Don't let door/jar clicks count as cookie clicks
    for (const el of [door, jar]) el.addEventListener('mousedown', event => event.stopPropagation());

    document.body.append(door, jar);
})();
