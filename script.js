// script.js: Read serial data from Arduino and display plots

// global variables
let port; // serial port object
let reader; // stream reader for serial data
let position = []; // store position data as array of arrays (pan, tilt)
let distance = []; // store distance data as list of floats

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
        statusText.innerHTML = "connected";
        position = [];
        distance = [];

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
    }
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
    let currentLine = "";
    while (true) {
        const {value, done} = await reader.read();
        if (done) {
            // we disconnected
            // plot the data that we have
            // update UI
            plotSensorData();
            document.getElementById("status").innerHTML = "disconnected";
            document.getElementById("data").innerHTML = position.toString();
            document.getElementById("debugging").innerHTML = distance.toString();
            break;
        }; // exit loop when port closes

        currentLine += value;
        if(!currentLine.includes('\n')){
            continue; // wait to progress until we've gotten a completed line
        }

        // read incoming data (split by \n, filter whitespace)
        const lines = currentLine.split('\n').filter(line => line.trim() !== '');
        console.log(`Got serial data: ${lines}`)
        currentLine = ""; // reset for the next message

        // interpret data
        lines.forEach(line => {
            const reading = line.trim();
            if (reading[0] === '!') {
                //it's for debugging; show output
                debuggingText.innerHTML = reading.slice(1,reading.length);
            } else if (reading.split(',').length === 3) {
                // it's numerical data; add to arrays
                const data = reading.split(',');
                const dist = parseFloat(data[2]);
                if (dist >= 0 && dist < 100) {
                    position.push([parseInt(data[0]), parseInt(data[1])-90]);
                    distance.push(Math.abs(dist) > 100 ? 100 : dist);
                    outputText.innerHTML = data[data.length-1];
                }
            } else {
                // it's a status message; update status
                statusText.innerHTML = reading;
            }
        });
    }
}

// use angle and distance readings to calculate coordinates
function calculatePosition(angles, distance) {
    const anglesRadians = [];
    angles.forEach(angle => anglesRadians.push(angle*Math.PI/180));
    const yPan = distance * Math.sin(anglesRadians[0]);

    const x = distance * Math.cos(anglesRadians[0]);
    const y = yPan * Math.cos(anglesRadians[1]);
    const z = yPan * Math.sin(anglesRadians[1]);

    return [x,y,z];
}

// plot graph of data using plotly.js
function plotSensorData() {
    // writing position data to arrays
    const xValues = [];
    const yValues = [];
    const zValues = [];
    for (let i = 0; i < distance.length; i++) {
        if(distance[i] && position[i][0] && position[i][1]) {
            const coords = calculatePosition(position[i], distance[i]);
            xValues.push(coords[0]);
            yValues.push(coords[1]);
            zValues.push(coords[2]);
        }
    }

    // displaying 3d plot with plotly
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