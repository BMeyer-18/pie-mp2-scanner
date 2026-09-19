// script.js: Read serial data from Arduino and display plots

// global variables
let port; // serial port object
let reader; // stream reader for serial data
const position = []; // store position data as array of arrays (pan, tilt)
const distance = []; // store distance data as list of floats

// set up event listners to connect to arduino on page load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("start").addEventListener('click', connectToArduino);
    document.getElementById("stop").addEventListener('click', disconnectFromArduino);
    plotSensorData();
});

// connect to Arduino with web serial api
async function connectToArduino() {
    const statusText = document.getElementById("status");
    try {
        // wait for user to select serial port for Arduino
        port = await navigator.serial.requestPort();

        // open port with correct baud rate
        await port.open({ baudRate: 9600 });
        statusText.innerHTML = "connected";
        
        // start data collection
        await readSerialData();
    } catch (err) {
        console.error('Connection error: ' + err);
        statusText.innerHTML = "connection failure: " + err;
    }
}

// disconnect from Arduino
async function disconnectFromArduino() {
    if (reader) {
        await reader.cancel(); // stop reading data
        await port.close(); // close serial port
    }

    // clear chart data
    document.getElementById("status").innerHTML = "disconnected";
    document.getElementById("data").innerHTML = position.toString();
    document.getElementById("debugging").innerHTML = distance.toString();
}

// CONTINUOUSLY read and interpret data from serial port
async function readSerialData() {
    // create text decoder to convert binary data to string data
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    reader = inputStream.getReader();

    // create variables for dom objects
    const statusText = document.getElementById("status");
    const outputText = document.getElementById("data");
    const debuggingText = document.getElementById("debugging");

    // loop through and read data until port closes
    while (true) {
        const {value, done} = await reader.read();
        if (done) break; // exit loop when port closes

        // read incoming data (split by \n, filter whitespace)
        const lines = value.split('\n').filter(line => line.trim() !== '');

        // interpret data
        lines.forEach(line => {
            const reading = line.trim();
            if (reading[0] === '!') {
                //it's for debugging; show output
                debuggingText.innerHTML = reading.slice(1,reading.length);
            } else if (reading.split(',').length === 3) {
                // it's numerical data; add to arrays
                const data = reading.split(',');
                const currentPosition = [];
                for (let i = 0; i < 2; i++)
                    currentPosition.push(parseInt(data[i]));
                position.push(currentPosition);
                distance.push(parseFloat(data[2]));
                outputText.innerHTML = data[data.length-1];
            } else {
                // it's a status message; update status
                statusText.innerHTML = reading;
            }
        });
    }
}

// plot graph of data using plotly.js
function plotSensorData() {
    const statusText = document.getElementById("status");

    // writing sample data
    const xValues = [];
    const yValues = [];
    const zValues = [];
    for (let i = 0; i < 10; i += 0.5) {
        xValues.push(i);
        yValues.push(Math.sin(i))
        zValues.push(0);
    }

    // displaying 2d plot with plotly
    const data = [{
        x: xValues,
        y: yValues,
        z: zValues,
        mode: "markers",
        marker: {
            size: 5,
        },
        type: "scatter3d"
    }];
    const layout = {
        title: {
            text: "Scanned Location Data"
        }
    };
    Plotly.newPlot('plot', data, layout);
}