#include <Servo.h>

#define BUTTON_PIN 2
#define PAN_SERVO_PIN 11
#define TILT_SERVO_PIN 12
#define SCANNER_PIN A0

#define SERVO_DELAY 4 // ms/degree. Spec says 2.8, this gives slowdown/settle time.
#define NEAR_CALIB_CM 30.0 // how far away the near calibration point is
#define FAR_CALIB_CM 60.0 // how far away the far calibration point is

#define SCAN_RANGE_PAN 45 // how many degrees of space to scan in pan
#define SCAN_RANGE_TILT 45 // ^^     ^^        ^^          ^^   in tilt

float m; // calibration constants
float b;

Servo panServo;
Servo tiltServo;

float getDist(uint16_t voltage) {
  // use the calibration data to return a distance from a voltage
  // note: "voltage" is a misnomer throughout this code, it's actually ADC counts, so V*1024/5
  // but calling it "voltage" makes it easier to reason about
  return m/(b-(float)voltage);
}

void setup() {
  // set up hardware
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  panServo.attach(PAN_SERVO_PIN);
  tiltServo.attach(TILT_SERVO_PIN);
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(9600);

  // ready to calibrate: turn on LED and wait for button press
  digitalWrite(LED_BUILTIN, HIGH);
  while(digitalRead(BUTTON_PIN) == HIGH) {}
  // this is the user telling us that the calibration object has been positioned

  Serial.println("CALIBRATING");
  // move to the position to see the 30cm plate of the calibration object 
  panServo.write(90);
  tiltServo.write(70);
  delay(90*SERVO_DELAY); // wait for servos to settle

  // OPT: use the average of several measurements to reduce noise
  float calibVoltageNear = (float)analogRead(SCANNER_PIN);
  // move to the position to see the 60cm plate of the calibration object
  tiltServo.write(100);
  delay(30*SERVO_DELAY); // wait for servos to settle
  float calibVoltageFar = (float)analogRead(SCANNER_PIN);

  // now it's Fun Math Time
  // per the datasheet, the output voltage is proportional to the reciprocal of the distance
  // in the domain from 30cm to 60cm. 
  // so, if we find the slope and offset of that line,
  // we can convert that to find the transfer function d(V), to find the distance corresponding to a measured voltage
  // define that r = 1/d, where d is distance in cm
  // we've measured 2 data points of the function V(r) = m*r+b: V(1/30) = calibVoltageNear and V(1/60) = calibVoltageFar
  // solve V(r) for d:
  // V = m/d+b
  // V-b=m/d
  // d = m/(b-V)
  // so now we can find m and b from the calibration data:
  float m = (calibVoltageFar - calibVoltageNear)/((1/FAR_CALIB_CM)-(1/NEAR_CALIB_CM)); // slope formula
  // given a point, b = V - m*d
  float b = calibVoltageNear - m * (1/NEAR_CALIB_CM);
  // now we know what d(V) is!
  // tell the computer about it
  Serial.print("!Calibration: m=");
  Serial.print(m);
  Serial.print("V*cm, b=");
  Serial.print(b);
  Serial.print("V, sanity check: d(calibVoltageFar)=");
  Serial.print(getDist(calibVoltageFar));
  Serial.println("cm (should be FAR_CALIB_CM)");
  // update computer state
  Serial.println("READY");

  // wait for button press to start scan
  while(digitalRead(BUTTON_PIN) == HIGH) {}

  // scan time!
  // move to initial position
  tiltServo.write(90-SCAN_RANGE_TILT/2);
  panServo.write(90-SCAN_RANGE_PAN/2);
  delay(SCAN_RANGE_PAN/2*SERVO_DELAY);

  for(uint16_t tilt = 90-SCAN_RANGE_TILT/2; tilt < 90+SCAN_RANGE_TILT/2; tilt++){
    // OPT: pan backwards every other line to reduce travel time
    for(uint16_t pan = 90-SCAN_RANGE_PAN/2; tilt < 90+SCAN_RANGE_PAN/2; pan++){
      // start heading to the next location
      panServo.write(pan);
      delay(SERVO_DELAY);

      // get reading
      uint16_t reading = analogRead(SCANNER_PIN);
      float distance = getDist(reading);
      // OPT: start moving to the next locaition while we're sending data
      // send it to the computer
      Serial.print(pan);
      Serial.print(",");
      Serial.print(tilt);
      Serial.print(",");
      Serial.println(distance);
    }
    tiltServo.write(tilt);
    delay(SERVO_DELAY*SCAN_RANGE_PAN);
  }
}

void loop() {
  // no repeating code - to scan again, hit RESET
}
