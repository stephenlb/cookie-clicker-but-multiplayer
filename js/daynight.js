// Day and night follow the player's clock: the sky darkens at dusk, stars come out at night, and night pays a bonus.
(() => {
    const NIGHT_MULTIPLIER = 1.25;
    const MAX_DARKNESS = 0.5;
    // hour of day (0-24, fractional) -> how dark it is, 0 (day) to 1 (night); dawn 5-7, dusk 18-20
    const darkness = h => h < 5 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h < 18 ? 0 : h < 20 ? (h - 18) / 2 : 1;
    const phaseOf = h => h < 5 || h >= 20 ? 'night' : h < 7 ? 'dawn' : h < 18 ? 'day' : 'dusk';
    const ICONS = { night: '🌙', dawn: '🌅', day: '☀️', dusk: '🌇' };

    const overlay = document.createElement('div');
    overlay.id = 'night-overlay';
    for (let i = 0; i < 40; i++) {
        const star = document.createElement('span');
        star.className = 'night-star';
        star.style.left = `${Math.random() * 100}vw`;
        star.style.top = `${Math.random() * 60}vh`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        overlay.appendChild(star);
    }
    document.body.appendChild(overlay);
    const clock = document.getElementById('clock');

    let phase = 'day';
    window.dayNightMultiplier = () => phase === 'night' ? NIGHT_MULTIPLIER : 1;
    window.dayNightPhase = () => phase;

    function update() {
        const now = new Date();
        const hour = now.getHours() + now.getMinutes() / 60;
        phase = phaseOf(hour);
        const dark = darkness(hour);
        overlay.style.setProperty('--dark', (dark * MAX_DARKNESS).toFixed(3));
        overlay.style.setProperty('--stars', Math.max(0, dark * 1.4 - 0.4).toFixed(3));
        if (clock) {
            const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            clock.textContent = `${ICONS[phase]} ${time}${phase === 'night' ? ` night x${NIGHT_MULTIPLIER}` : ''}`;
        }
    }
    update();
    setInterval(update, 15000);
})();
