import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './SpO2Monitor.css'; // Reuse the same CSS

const RawSignalMonitor = ({ rawData }) => {
  // Format timestamp for display
  const formatTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return "Invalid";
      }
      return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;
    } catch (e) {
      return "Error";
    }
  };

  // Prepare data for chart
  const chartData = rawData.timestamps.map((timestamp, index) => ({
    timestamp: timestamp,
    red: rawData.red[index],
    ir: rawData.ir[index]
  }));

  return (
    <div className="card">
      <div className="header">
        <h2>Raw Sensor Signals</h2>
      </div>
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
              domain={['dataMin', 'dataMax']}
            />
            <YAxis 
              label={{ value: 'Signal Intensity', angle: -90, position: 'insideLeft' }} 
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