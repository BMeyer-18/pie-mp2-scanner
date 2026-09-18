// script.js: Read serial data from Arduino and display plots

// global variables
let port; // serial port object
let reader; // stream reader for serial data
const dataPoints = []; // store distance data

// set up event listners to connect to arduino on page load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("start").addEventListener('click', connectToArduino);
    document.getElementById("stop").addEventListener('click', disconnectFromArduino);
});

// connect to Arduino with web serial api
async function connectToArduino() {
    const statusText = document.getElementById("status");
    try {
        // wait for user to select serial port for Arduino
        port = await navigator.serial.requestPort();

        // open port with correct baud rate
        await port.open({ baudRate: 9600 });
        console.log("connected");
        statusText.innerHTML = "connected";
        
        // start data collection
        await readSerialData();
    } catch (err) {
        console.error('Connection error: ' + err);
        statusText.innerHTML = "connection failure: " + err;
    }
}

// CONTINUOUSLY read and interpret data from serial port
async function readSerialData() {
    // create text decoder to convert binary data to string data
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    reader = inputStream.getReader();

    const outputText = document.getElementById("data");

    // loop through and read data until port closes
    while (true) {
        const {value, done} = await reader.read();
        if (done) break; // exit loop when port closes

        // read incoming data (split by \n, filter whitespace)
        const lines = value.split('\n').filter(line => line.trim() !== '');

        // interpret data
        lines.forEach(line => {
            console.log(line.trim())
            outputText.innerHTML = line.trim();
            // PROCESS DATA LATER
        });
    }
}

// disconnect from Arduino
async function disconnectFromArduino() {
    if (reader) {
        await reader.cancel(); // stop reading data
        await port.close(); // close serial port
    }

    // clear chart data
    dataPoints.length = 0;
    document.getElementById("disconnected");
}