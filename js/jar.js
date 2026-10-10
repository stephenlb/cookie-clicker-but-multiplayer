// Secret door: a tiny door hidden in the corner leads inside the cookie jar,
// an apartment of connected rooms where every cookie wears a hat.
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
    // The library's librarian is far too tired to be a cookie
    const LIBRARIAN = { hat: '😴', name: 'The Librarian', greet: 'Shhh... oh. Hi. ...Sorry, I dozed off. Again.',
        idle: ['zzz... overdue... zzz...', '*yawns for forty seconds*', 'Has it been a week? It feels like a week.', 'I have not slept since the Dewey Decimal incident.'],
        replies: { hello: 'Hnnh... hello... what day is it...', milk: 'Warm milk... that would put me out like a light... yes please...', name: 'I am... the librarian... I think... ask me after a nap.', joke: 'A cookie walks into a library... zzz... sorry, lost the thread.', book: 'Books are... over there... somewhere... I have read none of them... no time...', tired: 'Tired? No. I am perfectly... *head hits desk*', sleep: 'Sleep... yes... the dream... please... five more minutes...' },
        eat: 'Food? Too tired to chew... maybe later...', fallback: 'Mmm... what?... sorry... I was asleep with my eyes open...' };

    // The apartment: the hall is the entrance, every other room is reached through doors
    const ROOMS = {
        hall:    { title: 'The Hall', cookies: 4, doors: [{ to: 'living', icon: '🛋️', label: 'Living room', side: 'left' }, { to: 'kitchen', icon: '🍳', label: 'Kitchen', side: 'right' }] },
        living:  { title: 'Living Room', cookies: 6, doors: [{ to: 'hall', icon: '🚪', label: 'Hall', side: 'left' }, { to: 'bedroom', icon: '🛏️', label: 'Bedroom', side: 'right' }, { to: 'library', icon: '📚', label: 'Library', side: 'top' }] },
        kitchen: { title: 'Kitchen', cookies: 6, doors: [{ to: 'hall', icon: '🚪', label: 'Hall', side: 'left' }, { to: 'bathroom', icon: '🛁', label: 'Bathroom', side: 'right' }] },
        bedroom: { title: 'Bedroom', cookies: 5, decor: [{ e: '🛏️', x: 50, y: 18, size: 260 }, { e: '🪟', x: 80, y: 55, size: 90 }, { e: '💡', x: 28, y: 22, size: 50 }], doors: [{ to: 'living', icon: '🛋️', label: 'Living room', side: 'left' }] },
        library: { title: 'Library', cookies: 5, librarian: true, decor: [{ e: '📚', x: 15, y: 30, size: 110 }, { e: '📚', x: 32, y: 30, size: 110 }, { e: '📖', x: 50, y: 14, size: 70 }, { e: '📚', x: 68, y: 30, size: 110 }, { e: '📚', x: 85, y: 30, size: 110 }, { e: '🕯️', x: 50, y: 24, size: 50 }], doors: [{ to: 'living', icon: '🛋️', label: 'Living room', side: 'left' }] },
        bathroom:{ title: 'Bathroom', cookies: 4, doors: [{ to: 'kitchen', icon: '🍳', label: 'Kitchen', side: 'left' }] },
    };

    const door = document.createElement('div');
    door.id = 'secret-door';
    door.title = '';
    door.innerHTML = '<span class=door-knob></span>';

    const jar = document.createElement('div');
    jar.id = 'jar-inside';
    jar.innerHTML = '<div class=jar-glass></div><div class=jar-title></div>'
        + '<div class=jar-bubble></div>'
        + '<form class=jar-talk autocomplete=off><input maxlength=120 placeholder="Click a cookie, then talk to it"><button>Say</button></form>'
        + '<button class=jar-exit>Leave through the front door 🚪</button>';
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
        if (p.replies.book && /book|read|shush|shh|quiet/.test(t)) return p.replies.book;
        if (p.replies.tired && /tired|sleep|nap|bed|rest|yawn/.test(t)) return p.replies.tired;
        if (/milk/.test(t)) return p.replies.milk;
        if (/name|who are you/.test(t)) return p.replies.name;
        if (/joke|funny|laugh/.test(t)) return p.replies.joke;
        if (/eat|bite|hungry|dunk/.test(t)) return p.eat || 'Eat me?! ...Okay, rude. I mean, ' + p.fallback.toLowerCase();
        return p.fallback;
    }
    talkForm.addEventListener('submit', event => {
        event.preventDefault();
        const text = talkInput.value.trim();
        if (!text) return;
        talkInput.value = '';
        if (!selected) selected = rooms[current].querySelector('.jar-cookie');
        say(selected, reply(selected.personality, text));
    });
    // The input must not trigger Escape-less global key handlers
    talkInput.addEventListener('keydown', event => event.stopPropagation());
    const exit = jar.querySelector('.jar-exit');

    const title = jar.querySelector('.jar-title');
    const rooms = {};
    let current = 'hall';
    let cookieIndex = 0;
    for (const [id, room] of Object.entries(ROOMS)) {
        const el = document.createElement('div');
        el.className = `jar-room room-${id}`;
        for (const d of room.decor || []) {
            const item = document.createElement('span');
            item.className = 'room-decor';
            item.textContent = d.e;
            item.style.cssText = `left:${d.x}%;bottom:${d.y}%;font-size:${d.size}px`;
            el.appendChild(item);
        }
        for (let i = 0; i < room.cookies; i++) {
            const wrap = document.createElement('div');
            wrap.className = 'jar-cookie';
            wrap.style.left = (8 + Math.random() * 80) + '%';
            wrap.style.bottom = (12 + Math.random() * 50) + '%';
            wrap.style.setProperty('--bob', (1.5 + Math.random() * 2) + 's');
            wrap.style.setProperty('--delay', (-Math.random() * 3) + 's');
            wrap.style.setProperty('--tilt', (Math.random() * 20 - 10) + 'deg');
            wrap.innerHTML = '<span class=jar-hat></span><img src="assets/cookie.png" alt="">';
            wrap.personality = PERSONALITIES[cookieIndex++ % PERSONALITIES.length];
            wrap.querySelector('.jar-hat').textContent = wrap.personality.hat;
            wrap.addEventListener('click', () => {
                selected = wrap;
                talkInput.focus();
                say(wrap, wrap.personality.greet);
            });
            el.appendChild(wrap);
        }
        if (room.librarian) {
            const wrap = document.createElement('div');
            wrap.className = 'jar-cookie jar-librarian';
            wrap.style.left = '50%';
            wrap.style.bottom = '30%';
            wrap.innerHTML = '<span class=jar-zzz>💤</span><span class=jar-librarian-body>🧑‍💼</span><span class=jar-hat></span>';
            wrap.personality = LIBRARIAN;
            wrap.querySelector('.jar-hat').textContent = LIBRARIAN.hat;
            wrap.addEventListener('click', () => {
                selected = wrap;
                talkInput.focus();
                say(wrap, LIBRARIAN.greet);
            });
            el.appendChild(wrap);
        }
        for (const d of room.doors) {
            const doorEl = document.createElement('button');
            doorEl.className = `room-door door-${d.side}`;
            doorEl.innerHTML = `<span class=room-door-icon>${d.icon}</span><span class=room-door-label></span>`;
            doorEl.querySelector('.room-door-label').textContent = d.label;
            doorEl.addEventListener('click', () => goTo(d.to));
            el.appendChild(doorEl);
        }
        rooms[id] = el;
        jar.prepend(el);
    }
    function goTo(id) {
        current = id;
        selected = null;
        bubble.classList.remove('visible');
        for (const [rid, el] of Object.entries(rooms)) el.classList.toggle('active', rid === id);
        title.textContent = ROOMS[id].title;
        exit.style.display = id === 'hall' ? '' : 'none';
    }
    goTo('hall');

    // Cookies chatter on their own while the jar is open
    setInterval(() => {
        if (!jar.classList.contains('open') || bubble.classList.contains('visible')) return;
        const wrap = pick([...rooms[current].querySelectorAll('.jar-cookie')]);
        say(wrap, pick(wrap.personality.idle));
    }, 7000);

    const setOpen = open => {
        jar.classList.toggle('open', open);
        if (open) goTo('hall');
    };
    door.addEventListener('click', () => setOpen(true));
    exit.addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') setOpen(false);
    });

    // Don't let door/jar clicks count as cookie clicks
    for (const el of [door, jar]) el.addEventListener('mousedown', event => event.stopPropagation());

    document.body.append(door, jar);
})();
