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

// Initialize serial port (you'll need to replace PORT_PATH with your actual port)
let serialPort;
async function initializeSerialPort() {
    const ports = await listPorts();
    // Look for Raspberry Pi Pico port
    const picoPort = ports.find(port => 
        port.manufacturer?.includes('Raspberry Pi') || 
        port.manufacturer?.includes('Microsoft')  // Windows sometimes shows it as Microsoft
    );

    if (!picoPort) {
        console.error('No Raspberry Pi Pico found. Please connect the device.');
        return false;
    }

    serialPort = new SerialPort({
        path: picoPort.path,
        baudRate: 115200
    });

    const parser = serialPort.pipe(new ReadlineParser({ delimiter: '\n' }));

    serialPort.on('error', (err) => {
        console.error('Serial port error:', err);
    });

    parser.on('data', (data) => {
        try {
            const parsedData = JSON.parse(data);
            // Broadcast to all connected WebSocket clients
            wss.clients.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(JSON.stringify(parsedData));
                }
            });
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