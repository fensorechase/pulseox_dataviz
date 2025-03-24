# pulseox_dataviz

**Background**: This project was developed to demonstrate what blood oxygen saturation is, and how a device (e.g., pulse oximeter) can approximate blood oxygen saturation from a non-invasive measurement on the finger. We use a MAX30102 Pulse Oximetry Sensor and Raspberry Pi Pico to calculate oxygen saturation level (SpO2) in percent and visualize them in a simple web app, along with the raw light intensities used to calculate the SpO2 (i.e., IR and red frequencies). The web app can be run locally.

**Motivations**: Recent studies have revealed that pulse oximeters show accuracy differences across different skin tones, affecting measurement reliability for some patient populations (Hao et al.). This project for the 2025 Atlanta Science Festival aims to demystify blood oxygen as a vital sign, demonstrate how pulse oximeters work, and highlight the concerning accuracy variations that can impact clinical assessment. By raising awareness about these differences in non-invasive medical devices, we hope to inspire additional efforts to ensure all patients receive equally accurate care regardless of skin color.

1. [Utility of Skin Tone on Pulse Oximetry in Critically Ill Patients: A Prospective Cohort Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11392475/), Hao et al., Crit Care Explor, 2024.

## How to run

1. Connect computer and Raspberry Pi Pico, and uploading ```main.py``` and ```max30102.py``` onto the Raspberry Pi Pico (e.g., via Thonny). Press play on ```main.py```, then quit Thonny.
   - When you plug the Pi Pico into your laptop/local machine, the MAX sensor should light up red -- this indicates the Pi Pico is running ```main.py``` and reading serial data from the MAX sensor.
2. Install dependencies: run ```npm install``` in both the ```bridge``` and ```web-app``` directories.
3. In this repo within ```bridge``` directory, first run the bridge script with ```node server.js```. This allows data to flow between the Pi Pico and your local machine.
4. Then in a new terminal window, inside ```web-app``` directory, execute ```npm run dev```. Open the local URL displayed to see visualization with finger on sensor.

## Overview

pulseox_dataviz/

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

## Hardware Setup

All hardware required to set up the circuit can be purchased at the following sources (as of March 2025):

- SunFounder Raspberry Pi Pico kit: $40 each [Amazon](https://www.amazon.com/SunFounder-Raspberry-Tutorials-Electronics-Programming/dp/B08XXHGSQ7)
- MAX30102 SpO2 sensor, 2 pieces: $7 each [Amazon](https://www.amazon.com/dp/B09LQDW27N?tag=xdadev04-20&ascsubtag=UUxdaUeUpU1015050&asc_refurl=https%3A%2F%2Fwww.xda-developers.com%2Fpulse-oximeter-raspberry-pi-pico%2F&asc_campaign=Short-Term)

Preliminary note: the MAX30102 sensor is very sensitie to movement in this circuit -- handle the sensor very gently when the light is on and taking measurements, or else the data stream may be interrupted. If this happens and the red light goes out, restart both local scripts.

Connect the MAX30102 sensor to the Raspberry Pi Pico using the following pins:

| MAX30102 Pin | Pico Pin | Wire Color |
|-------------|----------|------------|
| VIN         | 3V3      | Red        |
| GND         | GND      | Blue       |
| SCL         | GP1      | Red        |
| SDA         | GP0      | Yellow     |

**Notes:**

- The MAX30102 sensor uses I2C communication protocol
- The sensor operates at 3.3V (connect to 3V3, not VBUS)

```mermaid
graph LR
    subgraph Raspberry Pi Pico
        PICO_GND[GND]
        PICO_3V3[3V3]
        PICO_SDA[SDA/GP0]
        PICO_SCL[SCL/GP1]
    end

    subgraph MAX30102 Sensor
        MAX_GND[GND]
        MAX_VIN[VIN]
        MAX_SCL[SCL]
        MAX_SDA[SDA]
    end

    %% Power connections
    PICO_3V3 -->|Red wire| MAX_VIN
    PICO_GND -->|Blue wire| MAX_GND

    %% I2C connections
    PICO_SDA -->|Yellow wire| MAX_SDA
    PICO_SCL -->|Red wire| MAX_SCL

    style PICO_3V3 fill:#ff9999
    style PICO_GND fill:#9999ff
    style PICO_SDA fill:#ffff99
    style PICO_SCL fill:#ff9999
    
    style MAX_VIN fill:#ff9999
    style MAX_GND fill:#9999ff
    style MAX_SDA fill:#ffff99
    style MAX_SCL fill:#ff9999
```

![alt text](img/Full_1_Breadboard.jpeg)


## Helpful Related Projects/Tools

1. doug-burrell in repo [max30102](https://github.com/doug-burrell/max30102/blob/master/max30102.py)
2. To convert repo to txt (useful for chatting with LLMs about code base): [repo2txt tool](https://repo2txt.simplebasedomain.com/).
3. Project inspiration:
    - [MAX30102 tutorial](https://dev.to/shilleh/how-to-measure-heart-rate-and-blood-oxygen-levels-with-max30102-sensor-on-a-raspberry-pi-using-python-50hc)
    - [Extra tutorial with different devices](https://github.com/tobiasisenberg/OxiVis/blob/master/example-data/oximeter-20200705-145239-83376-test%20trace.pdf)
