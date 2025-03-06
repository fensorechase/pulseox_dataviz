import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SpO2Monitor.css';

const RawSignalMonitor = ({ rawData }) => {
  console.log("Raw data for chart:", rawData);

  // Check if we have valid data
  const hasValidData = rawData && 
                       rawData.red && 
                       rawData.ir && 
                       rawData.timestamps &&
                       rawData.red.length > 0;

  // Format timestamp for display
  const formatTime = (timestamp) => {
    if (!timestamp) return "Invalid";
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid";
      }
      return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}.${Math.floor(date.getMilliseconds()/100)}`;
    } catch (e) {
      return "Error";
    }
  };

  // Prepare data for chart
  const chartData = hasValidData ? 
    rawData.timestamps.map((timestamp, index) => ({
      timestamp: timestamp,
      red: rawData.red[index],
      ir: rawData.ir[index]
    })) : [];

  return (
    <div className="card">
      <div className="header">
        <h2>Raw Sensor Signals</h2>
      </div>
      
      {!hasValidData && (
        <div className="info-message">
          Waiting for raw sensor data...
        </div>
      )}
      
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="timestamp" 
              tickFormatter={formatTime}
              domain={hasValidData ? ['dataMin', 'dataMax'] : [0, 100]}
            />
            <YAxis 
              label={{ value: 'Signal Intensity', angle: -90, position: 'insideLeft' }} 
              domain={hasValidData ? ['auto', 'auto'] : [0, 100]}
            />
            <Tooltip 
              labelFormatter={formatTime}
              formatter={(value) => [value.toFixed(0), '']}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="red" 
              stroke="#ff0000" 
              name="Red LED"
              dot={false}
              isAnimationActive={false}
            />
            <Line 
              type="monotone" 
              dataKey="ir" 
              stroke="#9370db" 
              name="IR LED"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RawSignalMonitor;