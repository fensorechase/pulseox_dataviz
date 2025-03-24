import React, { useState, useEffect, useCallback, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SpO2Monitor.css';
import RawSignalMonitor from './RawSignalMonitor';

const SpO2Monitor = () => {
  const [spo2Data, setSpo2Data] = useState([]);
  const [rawData, setRawData] = useState({ red: [], ir: [], timestamp: null });
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('spo2');
  const [stats, setStats] = useState({ min: 0, max: 0, avg: 0 });
  const [startTime, setStartTime] = useState(Date.now());
  const ws = useRef(null);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p>{`SpO2: ${payload[0].value.toFixed(1)}%`}</p>
        </div>
      );
    }
    return null;
  };

  const connectToBridge = useCallback(() => {
    console.log("Connecting to WebSocket...");
    ws.current = new WebSocket('ws://localhost:3001');

    ws.current.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      setError(null);
    };

    ws.current.onclose = () => {
      console.log("WebSocket disconnected");
      setIsConnected(false);
      setError('Connection lost. Retrying...');
      setTimeout(connectToBridge, 2000);
    };

    ws.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("Received message:", message);

        if (message.type === 'spo2' && typeof message.spo2 === 'number') {
          setSpo2Data(prevData => {
            // Use the message timestamp or current time if not provided
            const messageTime = message.timestamp || Date.now();
            const relativeTime = (messageTime - startTime) / 1000;
            
            const newPoint = {
              relativeTime,
              spo2: message.spo2
            };
            
            const newData = [...prevData, newPoint].slice(-100);
            
            if (newData.length > 0) {
              const values = newData.map(d => d.spo2);
              setStats({
                min: Math.min(...values).toFixed(1),
                max: Math.max(...values).toFixed(1),
                avg: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
              });
            }
            
            return newData;
          });
        } 
        else if (message.type === 'raw') {
          setRawData({
            red: message.data?.red || message.red || [],
            ir: message.data?.ir || message.ir || [],
            timestamp: message.timestamp || Date.now()
          });
        }
      } catch (e) {
        console.error("Error processing message:", e);
      }
    };

    return () => {
      if (ws.current?.readyState === WebSocket.OPEN) {
        ws.current.close();
      }
    };
}, [startTime]);

const resetMonitoring = useCallback(() => {
  console.log("Resetting monitoring...");
  
  // Close existing connection first
  if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.close();
  }
  ws.current = null; // Clear the WebSocket reference

  // Reset all state completely
  setSpo2Data([]); // Clear SpO2 data
  setRawData({ red: [], ir: [], timestamp: null }); // Clear raw data
  setStats({ min: 0, max: 0, avg: 0 }); // Reset stats
  
  // Create completely new start time
  const newStartTime = Date.now();
  setStartTime(newStartTime);
  
  // Small delay to ensure everything is cleared
  setTimeout(() => {
      // Create new WebSocket connection
      ws.current = new WebSocket('ws://localhost:3001');
      
      // Setup new handlers
      ws.current.onopen = () => {
          console.log("WebSocket reconnected after reset");
          setIsConnected(true);
          setError(null);
      };
      
      ws.current.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);
          setError('Connection lost. Retrying...');
          setTimeout(connectToBridge, 2000);
      };
      
      ws.current.onmessage = event => {
          try {
              const message = JSON.parse(event.data);
              
              if (message.type === 'spo2' && typeof message.spo2 === 'number') {
                  setSpo2Data(prevData => {
                      const relativeTime = (message.timestamp - newStartTime) / 1000;
                      const newPoint = {
                          relativeTime,
                          spo2: message.spo2
                      };
                      return [...prevData, newPoint].slice(-100);
                  });
              } 
              else if (message.type === 'raw') {
                  setRawData({
                      red: message.data?.red || message.red || [],
                      ir: message.data?.ir || message.ir || [],
                      timestamp: message.timestamp || Date.now()
                  });
              }
          } catch (e) {
              console.error("Error processing message after reset:", e);
          }
      };
      
      console.log("Monitoring reset complete, new start time:", newStartTime);
  }, 100);
}, []); // Remove connectToBridge from dependencies

  useEffect(() => {
    const cleanup = connectToBridge();
    return cleanup;
  }, [connectToBridge]);

  return (
    <div className="monitor-container">
      <div className="tab-container">
        <button 
          className={`tab-button ${activeTab === 'spo2' ? 'active' : ''}`}
          onClick={() => setActiveTab('spo2')}
        >
          SpO2 Values ({spo2Data.length} points)
        </button>
        <button 
          className={`tab-button ${activeTab === 'raw' ? 'active' : ''}`}
          onClick={() => setActiveTab('raw')}
        >
          Raw Signals ({rawData.red.length} points)
        </button>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`} />
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      {error && (
        <div className="error-alert">
          {error}
        </div>
      )}

      {activeTab === 'spo2' ? (
        <div className="chart-card">
          <div className="chart-header">
            <h2>SpO2 Monitoring</h2>
            <button 
              className="reset-button"
              onClick={resetMonitoring}
            >
              Reset Monitoring
            </button>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={spo2Data}
                margin={{ top: 20, right: 50, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="relativeTime"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tick={false}
                  label={{ value: 'Time (s)', position: 'bottom', offset: 0 }}
                  padding={{ left: 20, right: 20 }}
                />
                <YAxis 
                  domain={[80, 100]}
                  label={{ 
                    value: 'SpO2 (%)', 
                    angle: -90, 
                    position: 'insideLeft',
                    offset: 10
                  }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="spo2" 
                  stroke="#8884d8" 
                  name="SpO2"
                  dot={false}
                  isAnimationActive={false}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="stats-panel">
            <h3>Summary Statistics</h3>
            <div className="stats-grid">
              <div className="stat-box">
                <label>Average SpO2</label>
                <value>{stats.avg}%</value>
              </div>
              <div className="stat-box">
                <label>Minimum</label>
                <value>{stats.min}%</value>
              </div>
              <div className="stat-box">
                <label>Maximum</label>
                <value>{stats.max}%</value>
              </div>
              <div className="stat-box">
                <label>Data Points</label>
                <value>{spo2Data.length}</value>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <RawSignalMonitor rawData={rawData} />
      )}
    </div>
  );
};

export default SpO2Monitor;