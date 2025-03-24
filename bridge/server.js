const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const cors = require('cors');

const app = express();
const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());

// Debug flag
const DEBUG = true;

function debugLog(...args) {
    if (DEBUG) {
        console.log('[DEBUG]', ...args);
    }
}

// List available serial ports
async function listPorts() {
    const ports = await SerialPort.list();
    console.log('Available ports:');
    ports.forEach(port => {
        console.log(`${port.path} - ${port.manufacturer || 'Unknown manufacturer'}`);
    });
    debugLog('Ports detail:', ports);
    return ports;
}

// Initialize serial port
let serialPort;
async function initializeSerialPort() {
    const ports = await listPorts();
    
    // More flexible port detection for different OS/configurations
    const picoPort = ports.find(port => {
        const identifiers = [
            // Manufacturer identifiers
            port.manufacturer?.includes('MicroPython'),
            port.manufacturer?.includes('Raspberry Pi'),
            // Path patterns for different OS
            /usb/i.test(port.path),
            /usbmodem/i.test(port.path),
            /COM/i.test(port.path),
            /tty/i.test(port.path),
            // Additional identifiers
            port.vendorId === '2e8a',  // Raspberry Pi Pico vendor ID
            port.productId === '0005'   // Common Pico product ID
        ];
        
        return identifiers.some(id => id);
    });

    if (!picoPort) {
        console.error('No compatible device found. Please check connection and try these troubleshooting steps:');
        console.error('1. Unplug and replug the device');
        console.error('2. Available ports found:', ports.map(p => `\n   - ${p.path} (${p.manufacturer || 'Unknown manufacturer'})`).join(''));
        return false;
    }

    console.log('Using port:', picoPort.path);
    debugLog('Port details:', picoPort);

    serialPort = new SerialPort({
        path: picoPort.path,
        baudRate: 115200
    });

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('error', (err) => {
        console.error('Serial port error:', err);
    });

    let lastRawDataTime = 0;
    const RAW_DATA_INTERVAL = 50; // Minimum time between raw data broadcasts (ms)

    parser.on('data', (data) => {
        try {
            // Clean up incoming data
            let cleanData = data;
            if (data.includes('Sent packet:')) {
                cleanData = data.split('Sent packet:')[1].trim();
            }
            
            debugLog('Received data:', cleanData);

            if (cleanData.startsWith('{')) {
                const parsedData = JSON.parse(cleanData);
                
                if (parsedData.type === 'spo2') {
                    const spo2Packet = {
                        type: 'spo2',
                        timestamp: parsedData.timestamp || Date.now(),
                        spo2: parseFloat(parsedData.spo2)
                    };
                    
                    debugLog('Broadcasting SpO2:', spo2Packet);
                    broadcastData(spo2Packet);
                } 
                else if (parsedData.type === 'raw') {
                    const currentTime = Date.now();
                    
                    // Rate limit raw data broadcasts
                    if (currentTime - lastRawDataTime >= RAW_DATA_INTERVAL) {
                        const rawPacket = {
                            type: 'raw',
                            data: {
                                red: parsedData.red || [],
                                ir: parsedData.ir || [],
                                timestamps: Array.from(
                                    { length: parsedData.red?.length || 0 },
                                    (_, i) => currentTime + (i * 20)
                                )
                            }
                        };
                        
                        debugLog('Broadcasting raw data:', {
                            redLength: rawPacket.data.red.length,
                            irLength: rawPacket.data.ir.length
                        });
                        
                        broadcastData(rawPacket);
                        lastRawDataTime = currentTime;
                    }
                }
            } else if (!data.includes('I2C devices found') && 
                      !data.includes('initialized') && 
                      !data.includes('Starting')) {
                debugLog('Non-JSON data:', data);
            }
        } catch (e) {
            console.error('Error processing data:', e);
            debugLog('Problematic data:', data);
        }
    });

    return true;
}

// Broadcast data to all connected clients
function broadcastData(data) {
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(JSON.stringify(data));
            } catch (e) {
                console.error('Error broadcasting to client:', e);
            }
        }
    });
}

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected');
    debugLog('New WebSocket client connected');
    
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
    
    ws.on('close', () => {
        console.log('Client disconnected');
        debugLog('WebSocket client disconnected');
    });
});

// HTTP endpoints
app.get('/status', (req, res) => {
    debugLog('Status request received');
    const status = {
        connected: serialPort?.isOpen || false,
        port: serialPort?.path || null,
        timestamp: Date.now()
    };
    debugLog('Sending status:', status);
    res.json(status);
});

// Start the server
const PORT = 3001;
server.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    const success = await initializeSerialPort();
    if (!success) {
        console.log('Failed to initialize serial port. Please check the connection and restart the server.');
    } else {
        debugLog('Serial port initialized successfully');
    }
});

// Handle process termination
process.on('SIGINT', () => {
    console.log('Shutting down server...');
    if (serialPort?.isOpen) {
        serialPort.close();
    }
    server.close(() => {
        console.log('Server shut down complete');
        process.exit(0);
    });
});