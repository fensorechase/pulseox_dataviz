import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SpO2Monitor.css';
import RawSignalMonitor from './RawSignalMonitor';

const SpO2Monitor = () => {
  const [spo2Data, setSpo2Data] = useState([]);
  const [rawData, setRawData] = useState({ red: [], ir: [], timestamps: [] });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('spo2'); // 'spo2' or 'raw'
  
  // Connect to bridge server
  const connectToBridge = useCallback(() => {
    console.log("Attempting to connect to WebSocket...");
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      console.log("WebSocket connection established!");
      setIsConnected(true);
      setError(null);
    };
    
    ws.onclose = (event) => {
      console.log("WebSocket connection closed:", event.reason);
      setIsConnected(false);
      setError('Connection lost. Retrying...');
      // Attempt to reconnect after 2 seconds
      setTimeout(connectToBridge, 2000);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      setError('Connection error: ' + error.message);
    };
    
    ws.onmessage = (event) => {
      try {
        console.log("Received message length:", event.data.length);
        const message = JSON.parse(event.data);
        console.log("Message type:", message.type);
        
        // Handle different data types
        if (message.type === 'spo2') {
          setSpo2Data(prevData => {
            // Keep last 30 seconds of data
            const newData = [...prevData, message].filter(
              d => d.timestamp > Date.now() - 30000
            );
            return newData;
          });
        } 
        else if (message.type === 'raw') {
          console.log("Raw data received:", message.data);
          if (message.data) {
            setRawData(message.data);
          }
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    };
    
    return () => {
      console.log("Cleaning up WebSocket connection");
      ws.close();
    };
  }, []);
  
  // Check bridge server status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('http://localhost:3001/status');
        const status = await response.json();
        if (!status.connected) {
          setError('Sensor not connected. Please check USB connection.');
        }
      } catch (e) {
        setError('Bridge server not running. Please start the server.');
      }
    };
    
    checkStatus();
  }, []);
  
  useEffect(() => {
    const cleanup = connectToBridge();
    return cleanup;
  }, [connectToBridge]);

  // Format timestamp for display
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid";
      }
      return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
    } catch (e) {
      console.error("Error formatting time:", e, timestamp);
      return "Error";
    }
  };

  return (
    <div>
      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'spo2' ? 'active' : ''}`}
          onClick={() => setActiveTab('spo2')}
        >
          SpO2 Values
        </button>
        <button 
          className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Raw Signals
        </button>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {error && (
        <div className="error-alert">
          <strong>Error:</strong> {error}
        </div>
      )}
      
      {activeTab === 'spo2' && (
        <div className="card">
          <div className="header">
            <h2>Real-time Blood Oxygen Saturation (SpO2)</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={spo2Data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={formatTime}
                  domain={['dataMin', 'dataMax']}
                />
                <YAxis 
                  domain={[80, 100]} 
                  label={{ value: 'SpO2 (%)', angle: -90, position: 'insideLeft' }} 
                />
                <Tooltip 
                  labelFormatter={formatTime}
                  formatter={(value) => [`${value.toFixed(1)}%`, 'SpO2']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="spo2" 
                  stroke="#8884d8" 
                  name="SpO2"
                  isAnimationActive={false}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {activeTab === 'raw' && (
        <RawSignalMonitor rawData={rawData} />
      )}
    </div>
  );
};

export default SpO2Monitor;