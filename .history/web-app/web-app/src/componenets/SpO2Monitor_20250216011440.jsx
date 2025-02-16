import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const SpO2Monitor = () => {
  const [data, setData] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);
  
  // Connect to bridge server
  const connectToBridge = useCallback(() => {
    const ws = new WebSocket('ws://localhost:3001');
    
    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    ws.onclose = () => {
      setIsConnected(false);
      setError('Connection lost. Retrying...');
      // Attempt to reconnect after 2 seconds
      setTimeout(connectToBridge, 2000);
    };
    
    ws.onerror = (error) => {
      setError('Connection error: ' + error.message);
    };
    
    ws.onmessage = (event) => {
      const reading = JSON.parse(event.data);
      
      setData(prevData => {
        // Keep last 30 seconds of data
        const newData = [...prevData, reading].filter(
          d => d.timestamp > Date.now() - 30000
        );
        return newData;
      });
    };
    
    return () => {
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
    const date = new Date(timestamp);
    return `${date.getMinutes()}:${date.getSeconds().toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Real-time Blood Oxygen Saturation (SpO2)
          <span className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                domain={['dataMin', 'dataMax']}
              />
              <YAxis 
                domain={[90, 100]} 
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
      </CardContent>
    </Card>
  );
};

export default SpO2Monitor;