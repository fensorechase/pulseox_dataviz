// STEP 1: RUN THIS SCRIPT: node server.js
// STEP 2: Run web-app via 'npm run dev'
// Update your server.js file with these changes
const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());

// List available serial ports
async function listPorts() {
    const ports = await SerialPort.list();
    console.log('Available ports:');
    ports.forEach(port => {
        console.log(`${port.path} - ${port.manufacturer || 'Unknown manufacturer'}`);
    });
    return ports;
}

// Initialize serial port
let serialPort;
async function initializeSerialPort() {
    const ports = await listPorts();
    // Look for Raspberry Pi Pico or MicroPython port
    const picoPort = ports.find(port => 
        port.manufacturer?.includes('Raspberry Pi') || 
        port.manufacturer?.includes('Microsoft') ||
        port.manufacturer?.includes('MicroPython') ||
        port.path.includes('usbmodem')
    );

    if (!picoPort) {
        console.error('No Raspberry Pi Pico found. Please connect the device.');
        return false;
    }

    console.log('Using port:', picoPort.path);

    serialPort = new SerialPort({
        path: picoPort.path,
        baudRate: 115200
    });

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('error', (err) => {
        console.error('Serial port error:', err);
    });

    // Buffer to store raw signal data
    let rawDataBuffer = {
        red: [],
        ir: [],
        timestamps: []
    };
    
    // Maximum number of points to keep in buffer
    const MAX_BUFFER_SIZE = 100;

    parser.on('data', (data) => {
        console.log('Received raw data:', data);
        try {
            // Check if the data begins with "{" to avoid parsing non-JSON data
            if (data.trim().startsWith('{')) {
                const parsedData = JSON.parse(data);
                
                // Add real timestamp if needed
                if (!parsedData.timestamp) {
                    parsedData.timestamp = Date.now();
                } else if (parsedData.timestamp < 1000000000000) {
                    // If timestamp is in milliseconds since boot, add to real timestamp
                    // but keep original for sequence info
                    parsedData.originalTimestamp = parsedData.timestamp;
                    parsedData.timestamp = Date.now();
                }
                
                // Process data based on type
                if (parsedData.type === 'spo2') {
                    // Broadcast SpO2 data to clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(parsedData));
                        }
                    });
                } 
                else if (parsedData.type === 'raw') {
                    // Add raw data to buffer
                    const timestamp = parsedData.timestamp;
                    
                    // Add each data point with a slight time offset to simulate sequence
                    for (let i = 0; i < parsedData.red.length; i++) {
                        rawDataBuffer.red.push(parsedData.red[i]);
                        rawDataBuffer.ir.push(parsedData.ir[i]);
                        rawDataBuffer.timestamps.push(timestamp + i * 20); // 20ms offset between points
                        
                        // Limit buffer size
                        if (rawDataBuffer.red.length > MAX_BUFFER_SIZE) {
                            rawDataBuffer.red.shift();
                            rawDataBuffer.ir.shift();
                            rawDataBuffer.timestamps.shift();
                        }
                    }
                    
                    // Prepare data packet for clients
                    const rawPacket = {
                        type: 'raw',
                        timestamp: Date.now(),
                        data: {
                            red: rawDataBuffer.red,
                            ir: rawDataBuffer.ir,
                            timestamps: rawDataBuffer.timestamps
                        }
                    };
                    
                    // Broadcast raw data to clients
                    wss.clients.forEach(client => {
                        if (client.readyState === WebSocket.OPEN) {
                            client.send(JSON.stringify(rawPacket));
                        }
                    });
                }
            } else {
                console.log('Received non-JSON data, ignoring:', data);
            }
        } catch (e) {
            console.error('Error parsing data:', e);
        }
    });

    return true;
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    
    ws.on('close', () => {
        console.log('Client disconnected');
    });
});

// HTTP endpoints
app.get('/status', (req, res) => {
    res.json({ 
        connected: serialPort?.isOpen || false,
        port: serialPort?.path || null
    });
});

// Start the server
const PORT = 3001;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    const success = await initializeSerialPort();
    if (!success) {
        console.log('Failed to initialize serial port. Please check the connection and restart the server.');
    }
});