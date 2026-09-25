#include <Servo.h>

#define BUTTON_PIN 2
#define PAN_SERVO_PIN 11
#define TILT_SERVO_PIN 12
#define SCANNER_PIN A0

#define SERVO_DELAY_FULL 300 // ms, include slowdown/settle time.
#define SERVO_DELAY_STEP 100 // ms
#define NEAR_CALIB_CM 30.0 // how far away the near calibration point is
#define FAR_CALIB_CM 60.0 // how far away the far calibration point is

#define SCAN_RANGE_PAN 45 // how many degrees of space to scan in pan
#define SCAN_RANGE_TILT 45 // how many degrees of space to scan in tilt
#define SCAN_STEP_SIZE 2 // how many degrees to step
#define SCAN_OFFSET_PAN 95 // where to center the scan, in pan
#define SCAN_OFFSET_TILT 105 // where to center the scan, in tilt

float m = 10620.0; // calibration constants
float b = 9.0; // these were found previously, but can be updated w/ the calibration routine

Servo panServo;
Servo tiltServo;

float getDist(uint16_t voltage) {
  // use the calibration data to return a distance from a voltage
  // note: "voltage" is a misnomer throughout this code, it's actually ADC counts, so it's V*1024/5
  // but calling it "voltage" makes it easier to reason about
  return m/((float)voltage-b);
}

void setup() {
  // set up hardware
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  panServo.attach(PAN_SERVO_PIN);
  tiltServo.attach(TILT_SERVO_PIN);
  // move to rest position
  tiltServo.write(95);
  panServo.write(SCAN_OFFSET_PAN);

  Serial.begin(9600);

  bool calibrationMode = digitalRead(BUTTON_PIN) == LOW; // recalibrate if we boot with button held down
  if (calibrationMode) {
    panServo.write(SCAN_OFFSET_PAN);
    tiltServo.write(90);
    delay(SERVO_DELAY_FULL); // wait for servos to settle
    Serial.println("PRESS TO CALIBRATE 30cm DISTANCE");
    while(digitalRead(BUTTON_PIN) == LOW) {}
    while(digitalRead(BUTTON_PIN) == HIGH) {}
    // this is the user telling us that the calibration object has been positioned

    Serial.println("CALIBRATING NEAR");
    delay(SERVO_DELAY_FULL); // wait for debounce and servos to settle

    // OPT: use the average of several measurements to reduce noise
    float calibVoltageNear = (float)analogRead(SCANNER_PIN);
    Serial.println("PRESS TO CALIBRATE 60cm DISTANCE");
    // wait for button press
    while(digitalRead(BUTTON_PIN) == HIGH) {}
    Serial.println("CALIBRATING FAR");
    delay(SERVO_DELAY_FULL); // wait for debounce and servos to settle
    float calibVoltageFar = (float)analogRead(SCANNER_PIN);

    Serial.print("!Calbiration readings: Near: ");
    Serial.print(calibVoltageNear);
    Serial.print(", far: ");
    Serial.println(calibVoltageFar);

    // now it's Fun Math Time
    // per the datasheet, the output voltage is proportional to the reciprocal of the distance
    // in the domain from 30cm to 60cm. 
    // so, if we find the slope and offset of that line,
    // we can convert that to find the transfer function d(V), to find the distance corresponding to a measured voltage
    // define that r = 1/d, where d is distance in cm
    // we've measured 2 data points of the function V(r) = m*r+b: V(1/30) = calibVoltageNear and V(1/60) = calibVoltageFar
    // solve V(r) for d:
    // V = m/d+b
    //       V-b=m/d
    // d = m/(V-b)
    // so now we can find m and b from the calibration data:
    m = (calibVoltageFar - calibVoltageNear)/((1/FAR_CALIB_CM)-(1/NEAR_CALIB_CM)); // slope formula
    // given a point, b = V - m*d
    b = calibVoltageNear - m * (1/NEAR_CALIB_CM);
    // now we know what d(V) is!
    // tell the computer about it
    Serial.print("!Calibration: m=");
    Serial.print(m);
    Serial.print("V*cm, b=");
    Serial.print(b);
    Serial.print("V, sanity check: d(calibVoltageFar)=");
    Serial.print(getDist(calibVoltageFar));
    Serial.println("cm (should be FAR_CALIB_CM)");  
  }
  // update computer state
  Serial.println("READY - PRESS BUTTON TO BEGIN");

  // wait for button press to start scan
  while(digitalRead(BUTTON_PIN) == HIGH) {
    // while we're waiting, print the current distance reading
    // this allows the user to confirm the calibration if they wish
    uint16_t reading = analogRead(SCANNER_PIN);
    float distance = getDist(reading);
    Serial.print("READY - PRESS BUTTON TO BEGIN - ");
    Serial.print(distance);
    Serial.println("cm");
    delay(75);
  }

  // scan time!
  // move to initial position
  tiltServo.write(-SCAN_RANGE_TILT/2 + SCAN_OFFSET_TILT);
  panServo.write(-SCAN_RANGE_PAN/2 + SCAN_OFFSET_PAN);
  delay(SERVO_DELAY_FULL);

  for(uint16_t tilt = -SCAN_RANGE_TILT/2 + SCAN_OFFSET_TILT; tilt < SCAN_RANGE_TILT/2 + SCAN_OFFSET_TILT; tilt+=SCAN_STEP_SIZE){
    // OPT: pan backwards every other line to reduce travel time
    for(uint16_t pan = -SCAN_RANGE_PAN/2 + SCAN_OFFSET_PAN; pan < SCAN_RANGE_PAN/2 + SCAN_OFFSET_PAN; pan+=SCAN_STEP_SIZE){
      // start heading to the next location
      panServo.write(pan);
      delay(SERVO_DELAY_STEP);

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
    panServo.write(SCAN_RANGE_PAN/2 + SCAN_OFFSET_PAN);
    delay(SERVO_DELAY_FULL);
  }
  Serial.println("SCAN COMPLETE");
}

void loop() {
  // no repeating code - to scan again, hit RESET
}
