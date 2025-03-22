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
    
    def send_packet(packet):
        """Helper function to send JSON packets"""
        try:
            json_str = json.dumps(packet)
            uart.write(json_str + '\n')
            print("Sent packet:", json_str)  # Debug print
            
            # Print sample values if it's raw data
            if packet.get('type') == 'raw':
                print("Sample values - Red:", packet['red'][:5], "IR:", packet['ir'][:5])
                
        except Exception as e:
            print("Error sending packet:", e)
    
    def main():
        print("Starting SpO2 monitoring...")
        
        while True:
            try:
                # Read sensor data
                red_data, ir_data = sensor.read_sequential(amount=50)
                
                # Calculate SpO2
                hr, hr_valid, spo2, spo2_valid = sensor.calc_hr_and_spo2(ir_data, red_data)
                
                current_time = time.ticks_ms()
                
                # Send raw data first
                if len(red_data) > 0 and len(ir_data) > 0:
                    raw_packet = {
                        'type': 'raw',
                        'red': list(red_data),  # Convert to list for JSON serialization
                        'ir': list(ir_data),
                        'timestamp': current_time
                    }
                    send_packet(raw_packet)
                
                # Send SpO2 if valid
                if spo2_valid:
                    spo2_packet = {
                        'type': 'spo2',
                        'spo2': float(spo2),
                        'timestamp': current_time
                    }
                    send_packet(spo2_packet)
                
                time.sleep(0.1)  # 100ms delay
                
            except Exception as e:
                print("Error in main loop:", e)
                time.sleep(0.5)
    
    if __name__ == "__main__":
        main()
else:
    print("MAX30102 sensor not found at address 0x57!")
    print("Please check your connections and try again.")
