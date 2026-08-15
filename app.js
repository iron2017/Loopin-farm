let isRunning = true;
let timerId = null;

const UPDATE_INTERVAL_MS = 2000;
const HISTORY_LIMIT = 24;
const sourceMode = 'Dummy';

const thresholds = {
  moisture: { min: 20, max: 80, unit: '%' },
  temperature: { min: 15, max: 35, unit: '°C' },
  humidity: { min: 30, max: 90, unit: '%' }
};

const fields = {
  moisture: document.getElementById('moisture'),
  temperature: document.getElementById('temperature'),
  humidity: document.getElementById('humidity')
};

const charts = {
  moisture: document.getElementById('moistureChart'),
  temperature: document.getElementById('temperatureChart'),
  humidity: document.getElementById('humidityChart')
};

const history = {
  moisture: [],
  temperature: [],
  humidity: []
};

const toggleBtn = document.getElementById('toggleBtn');
const statusLabel = document.getElementById('statusLabel');
const statusDot = document.getElementById('statusDot');
const sourceModeEl = document.getElementById('sourceMode');

const alertsList = document.getElementById('alerts');

const irrigationBtn = document.getElementById('irrigationBtn');
const irrigationState = document.getElementById('irrigationState');
const irrigationHint = document.getElementById('irrigationHint');
const irrigationUpdated = document.getElementById('irrigationUpdated');

const gatewayStatus = document.getElementById('gatewayStatus');
const gatewayUpdated = document.getElementById('gatewayUpdated');
const doorStatus = document.getElementById('doorStatus');
const doorUpdated = document.getElementById('doorUpdated');
const cameraStatus = document.getElementById('cameraStatus');
const cameraUpdated = document.getElementById('cameraUpdated');

let irrigationOn = false;
let doorOpen = false;
let doorFault = false;
let cameraOnline = true;

const randomBetween = (min, max) => Math.random() * (max - min) + min;
const maybe = (chance) => Math.random() < chance;
const nowText = () => new Date().toLocaleTimeString();

function animateValue(element, from, to, format, duration = 350) {
  const start = performance.now();
  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const value = from + (to - from) * progress;
    element.textContent = format(value);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

function pushHistory(metric, value) {
  history[metric].push(value);
  if (history[metric].length > HISTORY_LIMIT) history[metric].shift();
}

function setTag(el, mode, text) {
  el.classList.remove('on', 'off', 'warn');
  el.classList.add(mode);
  el.textContent = text;
}

function updateIrrigationUi() {
  irrigationBtn.textContent = irrigationOn ? 'Pump ON' : 'Pump OFF';
  irrigationBtn.classList.toggle('on', irrigationOn);
  irrigationBtn.classList.toggle('off', !irrigationOn);
  irrigationBtn.setAttribute('aria-pressed', String(irrigationOn));

  if (irrigationOn) {
    setTag(irrigationState, 'on', 'Active');
  } else {
    setTag(irrigationState, 'off', 'Inactive');
  }
}

function drawSparkline(svg, values, min, max, color = '#22c55e') {
  if (!svg) return;
  if (!values.length) {
    svg.innerHTML = '';
    return;
  }

  const width = 160;
  const height = 46;
  const range = Math.max(max - min, 0.001);
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values
    .map((value, index) => {
      const x = index * step;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${Math.min(height, Math.max(0, y)).toFixed(1)}`;
    })
    .join(' ');

  svg.innerHTML = `
    <polyline fill="none" stroke="${color}" stroke-width="2.3" points="${points}" />
  `;
}

function getDummySnapshot() {
  return {
    moisture: randomBetween(18, 82),
    temperature: randomBetween(14, 37),
    humidity: randomBetween(28, 92)
  };
}

function updateDeviceHealth(timestamp) {
  setTag(gatewayStatus, 'on', 'Online');
  gatewayUpdated.textContent = `Last update: ${timestamp}`;

  if (maybe(0.12)) {
    doorOpen = !doorOpen;
  }
  doorFault = maybe(0.05);
  setTag(
    doorStatus,
    doorFault ? 'warn' : doorOpen ? 'on' : 'off',
    doorFault ? 'Schedule mismatch' : doorOpen ? 'Open' : 'Closed'
  );
  doorUpdated.textContent = `Last event: ${timestamp}`;

  if (maybe(0.08)) cameraOnline = !cameraOnline;
  setTag(cameraStatus, cameraOnline ? 'on' : 'warn', cameraOnline ? 'Online' : 'Signal unstable');
  cameraUpdated.textContent = `Last heartbeat: ${timestamp}`;
}

function updateAlerts(snapshot) {
  const alerts = [];

  Object.entries(snapshot).forEach(([metric, value]) => {
    const limit = thresholds[metric];
    if (value < limit.min) alerts.push({ type: 'critical', message: `${metric} is too low (${value.toFixed(1)}${limit.unit})` });
    if (value > limit.max) alerts.push({ type: 'critical', message: `${metric} is too high (${value.toFixed(1)}${limit.unit})` });
  });

  if (doorFault) alerts.push({ type: 'warning', message: 'Coop door did not match schedule. Manual check advised.' });
  if (!cameraOnline) alerts.push({ type: 'warning', message: 'Security camera signal unstable.' });

  if (alerts.length === 0) {
    alertsList.innerHTML = '<li class="ok">All systems normal.</li>';
    return;
  }

  alertsList.innerHTML = alerts.map((alert) => `<li class="${alert.type}">${alert.message}</li>`).join('');
}

function updateRecommendation(snapshot) {
  if (snapshot.moisture < 30) {
    irrigationHint.textContent = 'Recommendation: moisture is low, irrigation suggested.';
    if (!irrigationOn) setTag(irrigationState, 'warn', 'Suggested ON');
  } else if (snapshot.moisture > 70) {
    irrigationHint.textContent = 'Recommendation: moisture is high, keep irrigation OFF.';
  } else {
    irrigationHint.textContent = 'Recommendation: moisture in healthy range.';
  }
}

function updateSensors() {
  const next = getDummySnapshot();
  const timestamp = nowText();

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

  pushHistory('moisture', next.moisture);
  pushHistory('temperature', next.temperature);
  pushHistory('humidity', next.humidity);

  drawSparkline(charts.moisture, history.moisture, thresholds.moisture.min, thresholds.moisture.max, '#22c55e');
  drawSparkline(charts.temperature, history.temperature, thresholds.temperature.min, thresholds.temperature.max, '#f97316');
  drawSparkline(charts.humidity, history.humidity, thresholds.humidity.min, thresholds.humidity.max, '#38bdf8');

  updateRecommendation(next);
  updateDeviceHealth(timestamp);
  updateAlerts(next);
}

function clearUi() {
  Object.values(fields).forEach((el) => {
    el.textContent = '--';
    el.removeAttribute('data-value');
  });

  Object.values(charts).forEach((svg) => {
    svg.innerHTML = '';
  });

  alertsList.innerHTML = '<li class="ok">No alerts yet.</li>';
  irrigationHint.textContent = 'Recommendation: waiting for sensor data…';
}

function setRunningState(running) {
  isRunning = running;
  toggleBtn.textContent = running ? 'ON' : 'OFF';
  toggleBtn.classList.toggle('on', running);
  toggleBtn.classList.toggle('off', !running);
  toggleBtn.setAttribute('aria-pressed', String(running));

  statusDot.classList.toggle('running', running);
  statusLabel.textContent = running ? 'System running' : 'System stopped';

  if (!running) {
    clearInterval(timerId);
    timerId = null;
    clearUi();
    return;
  }

  updateSensors();
  timerId = setInterval(updateSensors, UPDATE_INTERVAL_MS);
}

irrigationBtn.addEventListener('click', () => {
  if (!isRunning) return;
  const nextState = !irrigationOn;
  const approved = window.confirm(`Are you sure you want to turn irrigation ${nextState ? 'ON' : 'OFF'}?`);
  if (!approved) return;

  irrigationOn = nextState;
  updateIrrigationUi();
  irrigationUpdated.textContent = `Last action: ${nowText()}`;
});

toggleBtn.addEventListener('click', () => setRunningState(!isRunning));

sourceModeEl.textContent = `${sourceMode} (v1 testing mode)`;
updateIrrigationUi();
setRunningState(true);
