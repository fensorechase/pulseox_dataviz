# pulseox_dataviz

This project uses a MAX30102 Pulse Oximetry Sensor and Raspberry Pi Pico to capture oxygen saturation level (SpO2) in percent and visualize them.

## How to run

1. Connect computer and Raspberry Pi Pico, and uploading main.py and max30102.py onto the Raspberry Pi Pico (via Thonny). Press play on main.py, then quit Thonny.
2. In this repo within bridge/, run 'node server.js'.
3. Then inside web-app/, run 'npm run dev'. Open web page to see visualization with finger on sensor.

## Overview

spo2-monitor/

├── bridge/

│ ├── server.js # Main bridge script

├── pico/

│ ├── main.py # Main Pico script (consistently runs once placed on Pico and Pico is connected via USB to computer)

│ ├── max30102.py # Sensor library

│ └── requirements.txt # Python dependencies

│

└── web-app/ # React application

├── src/

│ ├── components/

│ ├── RawSignalMonitor.jsx

│ ├── SpO2Monitor.css

│ └── SpO2Monitor.jsx

├── App.jsx

├── App.css

├── index.css

└── main.jsx

│

├── package.json

└── index.html

## Inspiration from

- doug-burrell in repo 'max30102' (https://github.com/doug-burrell/max30102/blob/master/max30102.py)
- Notes from doug-burrell: "To use the code, instantiate the HeartRateMonitor class found in heartrate_monitor.py. The thread is used by running start_sensor and stop_sensor. While the thread is running you can read bpm to get the active beats per minute. Note that a few seconds are required to get a reliable BPM value and the sensor is very sensitive to movement so a steady finger is required!"

## Helpful tools

1. Convert repo to txt (useful for chatting with LLMs about code base): https://repo2txt.simplebasedomain.com/
2. Project inspiration: 
    - https://dev.to/shilleh/how-to-measure-heart-rate-and-blood-oxygen-levels-with-max30102-sensor-on-a-raspberry-pi-using-python-50hc
    - (Repo for the above tutorial) https://github.com/doug-burrell/max30102
    - Extra tutorial (good viz example, different devices though): https://github.com/tobiasisenberg/OxiVis/blob/master/example-data/oximeter-20200705-145239-83376-test%20trace.pdf