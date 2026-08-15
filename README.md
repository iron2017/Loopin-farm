# Loopin-farm

Static farm sensor dashboard.

## Current version (v1)

This version uses **dummy/simulated data** for testing until physical IoT devices are connected.

Implemented dashboard modules:
- Live sensor simulation (soil moisture, temperature, humidity)
- Threshold-based alerts
- Irrigation control panel (manual ON/OFF for testing)
- Sensor trend mini charts (rolling history)
- Device health cards (gateway, coop door, camera)

## Free deployment (GitHub Pages)

This repository is configured to auto-deploy to **GitHub Pages** (free) when code is pushed to `main`.

Expected URL:

- `https://iron2017.github.io/Loopin-farm/`

### One-time setup in GitHub

1. Open repository **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `main` (or run the **Deploy static site to GitHub Pages** workflow manually).
