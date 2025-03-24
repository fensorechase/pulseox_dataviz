const express = require('express');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const WebSocket = require('ws');
const cors = require('cors');
const process = require('process');

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
    try {
        const ports = await listPorts();
        let picoPort = ports.find(port => port.manufacturer?.includes('MicroPython'));

        if (!picoPort) {
            console.error('No Pico device found.');
            return false;
        }

        console.log('Using port:', picoPort.path);
        debugLog('Port details:', picoPort);

        serialPort = new SerialPort({
            path: picoPort.path,
            baudRate: 115200
        });

        const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

        serialPort.on('open', () => {
            console.log('Serial port opened successfully');
            debugLog('Connection established with', picoPort.path);
        });

        serialPort.on('error', (err) => {
            console.error('Serial port error:', err);
        });

        let lastRawDataTime = 0;
        const RAW_DATA_INTERVAL = 50;

        parser.on('data', (data) => {
            try {
                // Ignore initialization and sample value messages
                if (data.includes('I2C devices found') || 
                    data.includes('MAX30102 initialized') || 
                    data.includes('Starting SpO2') ||
                    data.includes('Sample values')) {  // Added this condition
                    debugLog('Info message:', data);
                    return;
                }
        
                // Extract JSON data from "Sent packet:" prefix
                let jsonData = data;
                if (data.includes('Sent packet:')) {
                    jsonData = data.split('Sent packet:')[1].trim();
                    debugLog('Extracted JSON data:', jsonData);
                }
        
                // Parse the JSON data
                if (jsonData) {
                    const parsedData = JSON.parse(jsonData);
                    debugLog('Successfully parsed data:', parsedData.type);
        
                    // Forward raw data packet
                    if (parsedData.type === 'raw') {
                        const currentTime = Date.now();
                        if (currentTime - lastRawDataTime >= RAW_DATA_INTERVAL) {
                            debugLog('Raw data values - Red:', parsedData.red.slice(0, 5), 'IR:', parsedData.ir.slice(0, 5));
                            
                            const rawPacket = {
                                type: 'raw',
                                data: {
                                    red: parsedData.red,
                                    ir: parsedData.ir,
                                    timestamps: Array.from(
                                        { length: parsedData.red.length },
                                        (_, i) => currentTime + (i * 20)
                                    )
                                }
                            };
                            broadcastData(rawPacket);
                            lastRawDataTime = currentTime;
                        }
                    }
                    // Handle SpO2 data when we add it
                    else if (parsedData.type === 'spo2') {
                        debugLog('SpO2 value:', parsedData.spo2);
                        broadcastData({
                            type: 'spo2',
                            timestamp: parsedData.timestamp,
                            spo2: parsedData.spo2
                        });
                    }
                }
            } catch (e) {
                // Only log parse errors for non-debug messages
                if (!data.includes('Sample values')) {
                    console.error('Error processing data:', e.message);
                    debugLog('Problematic data:', data);
                }
            }
        });

        return true;
    } catch (err) {
        console.error('Error during port initialization:', err);
        return false;
    }
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



function broadcastData(data) {
    const message = JSON.stringify(data);
    debugLog('Broadcasting to clients:', {
        type: data.type,
        dataLength: data.type === 'raw' ? data.data.red.length : 1,
        sample: data.type === 'raw' ? {
            red: data.data.red.slice(0, 3),
            ir: data.data.ir.slice(0, 3)
        } : data.spo2
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            try {
                client.send(message);
            } catch (e) {
                console.error('Error sending to client:', e);
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
let shutdownComplete = false;

async function gracefulShutdown() {
    if (shutdownComplete) return;
    console.log('\nInitiating graceful shutdown...');

    // Close all WebSocket connections
    if (wss.clients.size > 0) {
        console.log(`Closing ${wss.clients.size} WebSocket connection(s)...`);
        for (const client of wss.clients) {
            try {
                client.close(1000, 'Server shutting down');
            } catch (err) {
                console.error('Error closing WebSocket client:', err);
            }
        }
    }

    // Close serial port
    if (serialPort?.isOpen) {
        try {
            await new Promise((resolve, reject) => {
                serialPort.close(err => {
                    if (err) {
                        console.error('Error closing serial port:', err);
                        reject(err);
                    } else {
                        console.log('Serial port closed');
                        resolve();
                    }
                });
            });
        } catch (err) {
            console.error('Failed to close serial port:', err);
        }
    }

    // Close HTTP server
    try {
        await new Promise((resolve) => {
            server.close(() => {
                console.log('HTTP server closed');
                resolve();
            });
        });
    } catch (err) {
        console.error('Error closing HTTP server:', err);
    }

    shutdownComplete = true;
    console.log('Shutdown complete');
    process.exit(0);
}

// Termination handler
process.on('SIGINT', gracefulShutdown);  // Ctrl+C
process.on('SIGTERM', gracefulShutdown); // Kill command
process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err);
    gracefulShutdown();
});