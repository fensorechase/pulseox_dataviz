# pulseox_dataviz
This project uses a MAX30102 Pulse Oximetry Sensor and Raspberry Pi Pico to capture oxygen saturation level (SpO2) in percent and visualize them.

## Overview
spo2-monitor/
├── pico/
│   ├── main.py              # Main Pico script
│   ├── max30102.py          # Sensor library
│   ├── hrcalc.py            # Heart rate calculation library
│   └── requirements.txt      # Python dependencies
│
└── web-app/                 # React application
    ├── src/
    │   ├── components/
    │   │   └── SpO2Monitor.jsx
    │   ├── App.jsx
    │   └── main.jsx
    ├── package.json
    └── index.html
