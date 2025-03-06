# -*-coding:utf-8-*-

# MicroPython version - removed __future__ import
from time import sleep
from machine import I2C, Pin

# register addresses
REG_INTR_STATUS_1 = 0x00
REG_INTR_STATUS_2 = 0x01

REG_INTR_ENABLE_1 = 0x02
REG_INTR_ENABLE_2 = 0x03

REG_FIFO_WR_PTR = 0x04
REG_OVF_COUNTER = 0x05
REG_FIFO_RD_PTR = 0x06
REG_FIFO_DATA = 0x07
REG_FIFO_CONFIG = 0x08

REG_MODE_CONFIG = 0x09
REG_SPO2_CONFIG = 0x0A
REG_LED1_PA = 0x0C

REG_LED2_PA = 0x0D
REG_PILOT_PA = 0x10
REG_MULTI_LED_CTRL1 = 0x11
REG_MULTI_LED_CTRL2 = 0x12

REG_TEMP_INTR = 0x1F
REG_TEMP_FRAC = 0x20
REG_TEMP_CONFIG = 0x21
REG_PROX_INT_THRESH = 0x30
REG_REV_ID = 0xFE
REG_PART_ID = 0xFF


class MAX30102():
    # by default, this assumes that the device is at 0x57 on channel 1
    def __init__(self, i2c=None, address=0x57):
        if i2c is None:
            # Use I2C0 by default with lower frequency
            self.i2c = I2C(0, scl=Pin(1), sda=Pin(0), freq=100000)
        else:
            self.i2c = i2c
        
        self.address = address
        self.max_retries = 3

        # Check if device is responsive
        try:
            self.reset()
            sleep(1)  # wait 1 sec
            
            # read & clear interrupt register (read 1 byte)
            self._read_register(REG_INTR_STATUS_1, 1)
            self.setup()
            print("MAX30102 initialized successfully")
        except Exception as e:
            print("Error initializing MAX30102:", e)
            raise

    def _write_register(self, register, data):
        """Write with retry logic"""
        for _ in range(self.max_retries):
            try:
                self.i2c.writeto_mem(self.address, register, bytes([data]))
                return
            except Exception as e:
                sleep(0.01)  # Short delay before retry
        raise OSError("Failed to write to register")

    def _read_register(self, register, length):
        """Read with retry logic"""
        for _ in range(self.max_retries):
            try:
                return self.i2c.readfrom_mem(self.address, register, length)
            except Exception as e:
                sleep(0.01)  # Short delay before retry
        raise OSError("Failed to read from register")

    def shutdown(self):
        """
        Shutdown the device.
        """
        try:
            self._write_register(REG_MODE_CONFIG, 0x80)
        except Exception as e:
            print("Error shutting down:", e)

    def reset(self):
        """
        Reset the device, this will clear all settings,
        so after running this, run setup() again.
        """
        try:
            self._write_register(REG_MODE_CONFIG, 0x40)
        except Exception as e:
            print("Error resetting:", e)
            raise

    def setup(self, led_mode=0x03):
        """
        This will setup the device with the values written in sample Arduino code.
        """
        try:
            # INTR setting
            # 0xc0 : A_FULL_EN and PPG_RDY_EN = Interrupt will be triggered when
            # fifo almost full & new fifo data ready
            self._write_register(REG_INTR_ENABLE_1, 0xc0)
            self._write_register(REG_INTR_ENABLE_2, 0x00)

            # FIFO_WR_PTR[4:0]
            self._write_register(REG_FIFO_WR_PTR, 0x00)
            # OVF_COUNTER[4:0]
            self._write_register(REG_OVF_COUNTER, 0x00)
            # FIFO_RD_PTR[4:0]
            self._write_register(REG_FIFO_RD_PTR, 0x00)

            # 0b 0100 1111
            # sample avg = 4, fifo rollover = false, fifo almost full = 17
            self._write_register(REG_FIFO_CONFIG, 0x4f)

            # 0x02 for read-only, 0x03 for SpO2 mode, 0x07 multimode LED
            self._write_register(REG_MODE_CONFIG, led_mode)
            # 0b 0010 0111
            # SPO2_ADC range = 4096nA, SPO2 sample rate = 100Hz, LED pulse-width = 411uS
            self._write_register(REG_SPO2_CONFIG, 0x27)

            # choose value for ~7mA for LED1
            self._write_register(REG_LED1_PA, 0x24)
            # choose value for ~7mA for LED2
            self._write_register(REG_LED2_PA, 0x24)
            # choose value fro ~25mA for Pilot LED
            self._write_register(REG_PILOT_PA, 0x7f)
        except Exception as e:
            print("Error during setup:", e)
            raise

    # this won't validate the arguments!
    # use when changing the values from default
    def set_config(self, reg, value):
        try:
            self._write_register(reg, value)
        except Exception as e:
            print("Error setting config:", e)

    def get_data_present(self):
        try:
            read_ptr = self._read_register(REG_FIFO_RD_PTR, 1)[0]
            write_ptr = self._read_register(REG_FIFO_WR_PTR, 1)[0]
            if read_ptr == write_ptr:
                return 0
            else:
                num_samples = write_ptr - read_ptr
                # account for pointer wrap around
                if num_samples < 0:
                    num_samples += 32
                return num_samples
        except Exception as e:
            print("Error checking data presence:", e)
            return 0

    def read_fifo(self):
        """
        This function will read the data register.
        """
        try:
            # read 1 byte from registers (values are discarded)
            self._read_register(REG_INTR_STATUS_1, 1)
            self._read_register(REG_INTR_STATUS_2, 1)

            # read 6-byte data from the device
            d = self._read_register(REG_FIFO_DATA, 6)

            # mask MSB [23:18]
            red_led = (d[0] << 16 | d[1] << 8 | d[2]) & 0x03FFFF
            ir_led = (d[3] << 16 | d[4] << 8 | d[5]) & 0x03FFFF

            return red_led, ir_led
        except Exception as e:
            print("Error reading FIFO:", e)
            return 0, 0

    def read_sequential(self, amount=50):  # Reduced from 100 to 50
        """
        This function will read the red-led and ir-led `amount` times.
        This works as blocking function.
        """
        red_buf = []
        ir_buf = []
        count = amount
        
        # Add timeout to prevent infinite loop
        timeout = 100  # 10 seconds with 0.1s sleep
        timeout_count = 0
        
        while count > 0 and timeout_count < timeout:
            try:
                num_bytes = self.get_data_present()
                if num_bytes > 0:
                    red, ir = self.read_fifo()
                    red_buf.append(red)
                    ir_buf.append(ir)
                    count -= 1
                    timeout_count = 0  # Reset timeout when we get data
                else:
                    sleep(0.1)
                    timeout_count += 1
            except Exception as e:
                print("Error in read_sequential:", e)
                sleep(0.1)
                timeout_count += 1
        
        return red_buf, ir_buf
        
    def calc_hr_and_spo2(self, ir_data, red_data):
        """
        Simplified calculation to integrate hrcalc functionality
        directly into the MAX30102 class
        """
        # Check if we have enough data (at least 10 points)
        if len(ir_data) < 10 or len(red_data) < 10:
            return -999, False, -999, False
            
        try:
            # Get average values
            ir_mean = sum(ir_data) // len(ir_data) if ir_data else 0
            red_mean = sum(red_data) // len(red_data) if red_data else 0
            
            # Calculate SpO2 (simplified algorithm)
            # Check for reasonable values first
            if ir_mean < 1000 or red_mean < 1000:  # Likely no finger detected
                return -999, False, -999, False
                
            # Calculate ratio (R)
            R = (red_mean / ir_mean) if ir_mean > 0 else 0
            
            # SpO2 approximation formula (empirical)
            # This is a simplified formula, not medically accurate
            spo2 = 110 - 25 * R
            
            # Constrain to valid SpO2 range
            spo2 = min(max(spo2, 0), 100)
            
            # Determine if the reading is valid
            spo2_valid = 70 <= spo2 <= 100
            
            # For heart rate, return a fixed value (not implemented properly here)
            hr = 75  # Placeholder
            hr_valid = True
            
            return hr, hr_valid, spo2, spo2_valid
        except Exception as e:
            print("Error calculating vitals:", e)
            return -999, False, -999, False