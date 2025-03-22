import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const RawSignalMonitor = ({ rawData }) => {
  const [stats, setStats] = useState({
    red: { min: 0, max: 0, avg: 0 },
    ir: { min: 0, max: 0, avg: 0 }
  });

  // Calculate statistics when raw data changes
  useEffect(() => {
    if (rawData.red?.length > 0 && rawData.ir?.length > 0) {
      try {
        setStats({
          red: {
            min: Math.min(...rawData.red),
            max: Math.max(...rawData.red),
            avg: rawData.red.reduce((a, b) => a + b, 0) / rawData.red.length
          },
          ir: {
            min: Math.min(...rawData.ir),
            max: Math.max(...rawData.ir),
            avg: rawData.ir.reduce((a, b) => a + b, 0) / rawData.ir.length
          }
        });
      } catch (e) {
        console.error("Error calculating stats:", e);
      }
    }
  }, [rawData]);

  // Create chart data with time values
  const chartData = Array.isArray(rawData.red) ? rawData.red.map((red, index) => ({
    time: index * 0.02, // 20ms intervals
    red,
    ir: rawData.ir[index]
  })) : [];

  return (
    <div className="chart-card">
      <div className="chart-header">
        <h2>Raw Sensor Signals</h2>
      </div>
      
      {chartData.length === 0 ? (
        <div className="info-message">
          Waiting for raw sensor data...
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="time"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={(value) => value.toFixed(2)}
                label={{ 
                  value: 'Time (s)', 
                  position: 'bottom', 
                  offset: 10,
                  fill: '#666'
                }}
                tick={{ fill: '#666' }}
              />
              <YAxis 
                domain={['auto', 'auto']}
                label={{ 
                  value: 'Signal Intensity', 
                  angle: -90, 
                  position: 'insideLeft',
                  offset: -10,
                  fill: '#666'
                }}
                tick={{ fill: '#666' }}
              />
              <Tooltip 
                formatter={(value) => value.toFixed(0)}
                labelFormatter={(value) => `${value.toFixed(2)}s`}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #ccc' }}
              />
              <Legend 
                verticalAlign="top" 
                height={36}
                wrapperStyle={{ paddingTop: '10px' }}
              />
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
      )}
      
      <div className="stats-panel">
        <h3>Signal Statistics</h3>
        <div className="stats-grid">
          <div className="signal-stats">
            <h4>Red LED Signal</h4>
            <div className="stats-row">
              <div className="stat-box">
                <label>Average</label>
                <value>{stats.red.avg.toFixed(0)}</value>
              </div>
              <div className="stat-box">
                <label>Range</label>
                <value>{stats.red.min.toFixed(0)} - {stats.red.max.toFixed(0)}</value>
              </div>
            </div>
          </div>
          <div className="signal-stats">
            <h4>IR LED Signal</h4>
            <div className="stats-row">
              <div className="stat-box">
                <label>Average</label>
                <value>{stats.ir.avg.toFixed(0)}</value>
              </div>
              <div className="stat-box">
                <label>Range</label>
                <value>{stats.ir.min.toFixed(0)} - {stats.ir.max.toFixed(0)}</value>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RawSignalMonitor;