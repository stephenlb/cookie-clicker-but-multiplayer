// Weather changes every minute or two. Each type has a falling-particle overlay and a cookie multiplier.
(() => {
    const WEATHER = [
        { id: 'clear', label: '🌤️ Clear skies', multiplier: 1, weight: 3 },
        { id: 'sunny', label: '☀️ Sunny: cookies bake faster x1.5', multiplier: 1.5, weight: 2, glow: true },
        { id: 'rain',  label: '🌧️ Rain x1.25', multiplier: 1.25, weight: 2, particle: '💧', count: 60, seconds: 1.1 },
        { id: 'snow',  label: '❄️ Snow: cookies freeze x0.75', multiplier: 0.75, weight: 2, particle: '❄️', count: 40, seconds: 6 },
        { id: 'cookies', label: '🍪 Raining cookies! Catch them x1.5', multiplier: 1.5, weight: 1, particle: '🍪', count: 25, seconds: 4, catchable: true },
        { id: 'storm', label: '⛈️ Thunderstorm x2', multiplier: 2, weight: 1, particle: '💧', count: 90, seconds: 0.7, lightning: true },
    ];
    let current = WEATHER[0];
    window.weatherMultiplier = () => current.multiplier;

    const display = document.getElementById('weather');
    const layer = document.createElement('div');
    layer.id = 'weather-layer';
    document.body.appendChild(layer);

    function setWeather(w) {
        current = w;
        layer.replaceChildren();
        layer.className = [w.glow && 'sunny', w.lightning && 'storm'].filter(Boolean).join(' ');
        for (let i = 0; i < (w.count || 0); i++) {
            const p = document.createElement('span');
            p.className = 'weather-particle';
            p.textContent = w.particle;
            p.style.left = `${Math.random() * 100}vw`;
            p.style.animationDuration = `${w.seconds * (0.7 + Math.random() * 0.6)}s`;
            p.style.animationDelay = `-${Math.random() * w.seconds}s`;
            if (w.catchable) {
                p.classList.add('catchable');
                p.addEventListener('mousedown', event => {
                    p.remove();
                    document.dispatchEvent(new CustomEvent('weather-cookie', { detail: { x: event.clientX, y: event.clientY } }));
                });
            }
            layer.appendChild(p);
        }
        if (display) display.textContent = w.id === 'clear' ? '' : w.label;
    }

    function pickWeather() {
        let roll = Math.random() * WEATHER.reduce((sum, w) => sum + w.weight, 0);
        return WEATHER.find(w => (roll -= w.weight) < 0) || WEATHER[0];
    }
    function nextWeather() {
        setWeather(pickWeather());
        setTimeout(nextWeather, 60000 + Math.random() * 60000);
    }
    nextWeather();

    // Chat can ask for the forecast
    window.weatherForecast = () => current.label;
})();
