# pulseox_dataviz
This project uses a MAX30102 Pulse Oximetry Sensor and Raspberry Pi Pico to capture oxygen saturation level (SpO2) in percent and visualize them.

## Overview
spo2-monitor/

├── pico/

│ ├── main.py # Main Pico script

│ ├── max30102.py # Sensor library

│ ├── hrcalc.py # Heart rate calculation library

│ └── requirements.txt # Python dependencies

│

└── web-app/ # React application

├── src/

│ ├── components/

│ │ └── SpO2Monitor.jsx

│ ├── App.jsx

│ └── main.jsx

├── package.json

└── index.html


## Inspiration from: 
- doug-burrell in repo 'max30102' (https://github.com/doug-burrell/max30102/blob/master/max30102.py)
    - Notes from doug-burrell: "To use the code, instantiate the HeartRateMonitor class found in heartrate_monitor.py. The thread is used by running start_sensor and stop_sensor. While the thread is running you can read bpm to get the active beats per minute. Note that a few seconds are required to get a reliable BPM value and the sensor is very sensitive to movement so a steady finger is required!"