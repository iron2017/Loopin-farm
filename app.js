    // Dashboard running state and update interval reference.
    let isRunning = true;
    let timerId = null;

    const fields = {
      moisture: document.getElementById('moisture'),
      temperature: document.getElementById('temperature'),
      humidity: document.getElementById('humidity')
    };

    const toggleBtn = document.getElementById('toggleBtn');
    const statusText = document.getElementById('statusText');
    const statusDot = document.getElementById('statusDot');

    // Create a realistic random value within an inclusive numeric range.
    const randomBetween = (min, max) => Math.random() * (max - min) + min;

    // Smoothly animate value text from its current number to a next number.
    function animateValue(element, from, to, format, duration = 450) {
      const start = performance.now();
      function tick(now) {
        const progress = Math.min((now - start) / duration, 1);
        const value = from + (to - from) * progress;
        element.textContent = format(value);
        if (progress < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    function updateSensors() {
      const next = {
        moisture: randomBetween(20, 80),
        temperature: randomBetween(15, 35),
        humidity: randomBetween(30, 90)
      };

      const previous = {
        moisture: parseFloat(fields.moisture.dataset.value || next.moisture),
        temperature: parseFloat(fields.temperature.dataset.value || next.temperature),
        humidity: parseFloat(fields.humidity.dataset.value || next.humidity)
      };

      fields.moisture.dataset.value = next.moisture.toFixed(1);
      fields.temperature.dataset.value = next.temperature.toFixed(1);
      fields.humidity.dataset.value = next.humidity.toFixed(1);

      animateValue(fields.moisture, previous.moisture, next.moisture, (v) => `${v.toFixed(1)}%`);
      animateValue(fields.temperature, previous.temperature, next.temperature, (v) => `${v.toFixed(1)}°C`);
      animateValue(fields.humidity, previous.humidity, next.humidity, (v) => `${v.toFixed(1)}%`);
    }

    function setRunningState(running) {
      isRunning = running;
      toggleBtn.textContent = running ? 'ON' : 'OFF';
      toggleBtn.classList.toggle('on', running);
      toggleBtn.classList.toggle('off', !running);
      toggleBtn.setAttribute('aria-pressed', String(running));

      statusDot.classList.toggle('running', running);
      statusText.lastChild.textContent = running ? 'System running' : 'System stopped';

      if (!running) {
        clearInterval(timerId);
        timerId = null;
        Object.values(fields).forEach((el) => { el.textContent = '--'; el.removeAttribute('data-value'); });
        return;
      }

      updateSensors();
      timerId = setInterval(updateSensors, 2000);
    }

    toggleBtn.addEventListener('click', () => setRunningState(!isRunning));

    // Start immediately in ON mode.
    setRunningState(true);
  
