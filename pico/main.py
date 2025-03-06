# Update your main.py file with these changes
from machine import I2C, Pin, UART
import json
import time

# First scan for devices
i2c = I2C(0, sda=Pin(0), scl=Pin(1), freq=100000)
devices = i2c.scan()
print("I2C devices found:", [hex(device) for device in devices])

# Only import MAX30102 if we found a device
if 0x57 in devices:
    from max30102 import MAX30102
    
    # Initialize sensor
    sensor = MAX30102(i2c=i2c)
    
    # Initialize UART for USB communication
    uart = UART(0, baudrate=115200)
    
    def main():
        print("Starting SpO2 monitoring...")
        sample_count = 0
        
        while True:
            try:
                # Read sensor data
                red_data, ir_data = sensor.read_sequential(amount=50)  # 50 samples
                
                # Calculate SpO2 directly with the modified sensor class
                hr, hr_valid, spo2, spo2_valid = sensor.calc_hr_and_spo2(ir_data, red_data)
                
                # Create data packet with SpO2 value
                if spo2_valid:
                    # Send the calculated SpO2 value
                    spo2_packet = {
                        'type': 'spo2',
                        'timestamp': time.ticks_ms(),
                        'spo2': spo2
                    }
                    
                    # Send data over UART with newline delimiter
                    uart.write(json.dumps(spo2_packet) + '\n')
                    print(json.dumps(spo2_packet))
                    
                    sample_count += 1
                    if sample_count % 10 == 0:
                        print(f"Collected {sample_count} valid samples")
                
                # Send a sample of raw data (5 points for red and IR to keep bandwidth reasonable)
                if len(red_data) > 0 and len(ir_data) > 0:
                    # Send a few sample points for visualization
                    # (take just a subset to not overwhelm the connection)
                    sample_size = min(5, len(red_data), len(ir_data))
                    
                    raw_packet = {
                        'type': 'raw',
                        'timestamp': time.ticks_ms(),
                        'red': red_data[:sample_size],
                        'ir': ir_data[:sample_size]
                    }
                    
                    # Send raw data packet
                    json_str = json.dumps(raw_packet)
                    uart.write(json_str + '\n')
                    print("Debug - Raw data sent")  # This will be a separate line
                
                # Small delay to prevent overwhelming the serial connection
                time.sleep(0.1)
                
            except Exception as e:
                print("Error:", e)
                time.sleep(0.5)  # Increased delay after error
    
    if __name__ == "__main__":
        main()
else:
    print("MAX30102 sensor not found at address 0x57!")
    print("Please check your connections and try again.")