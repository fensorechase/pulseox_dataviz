from machine import I2C, Pin, UART
import json
import time
from max30102 import MAX30102

# Initialize I2C for sensor
i2c = I2C(0, sda=Pin(0), scl=Pin(1))
sensor = MAX30102(i2c=i2c)

# Initialize UART for USB communication
# Use UART0 which is connected to USB
uart = UART(0, baudrate=115200)

def main():
    print("Starting SpO2 monitoring...")
    
    while True:
        try:
            # Read sensor data
            red_data, ir_data = sensor.read_sequential()
            
            # Calculate SpO2
            _, _, spo2, spo2_valid = sensor.calc_hr_and_spo2(ir_data, red_data)
            
            if spo2_valid:
                # Create data packet
                data = {
                    'timestamp': time.ticks_ms(),  # milliseconds
                    'spo2': spo2
                }
                
                # Send data as JSON string with newline as delimiter
                uart.write(json.dumps(data) + '\n')
            
            # Small delay to prevent overwhelming the serial connection
            time.sleep(0.1)
            
        except Exception as e:
            print("Error:", e)
            time.sleep(1)

if __name__ == '__main__':
    main()