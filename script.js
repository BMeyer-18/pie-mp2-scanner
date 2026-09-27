// script.js: Reads serial data from Arduino, displays plot

// global variables
let port; // serial port object
let reader; // stream reader for serial data
let position = []; // stores position data as array of arrays (pan, tilt)
let distance = []; // stores distance data as list of floats

// sets up event listners to connect to arduino on page load
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById("start").addEventListener('click', connectToArduino);
    document.getElementById("stop").addEventListener('click', disconnectFromArduino);
});


/**
 * Uses web serial API to connect to the Arduino and reset all data variables.
 * Once connection is established, begins data collection.
 * If connection fails, displays the error on the site.
 */
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

/**
 * Disconnects from the arduino when the "disconnect" button is pressed.
 */
async function disconnectFromArduino() {
    if (reader) {
        await reader.cancel(); // stop reading data
    }
}

/**
 * Continuously reads data from Arduino serial port using a text decoder stream until disconnect.
 * For each completed line, if it begins with a "!", display it on the site for debugging purposes.
 * If it's a comma-separated list with 3 items, it's readable data to be processed as spherical
 * location and distance coordinates. If the recorded distance is >100cm or <0cm, throw out the data.
 * If it doesn't fall into any of the above criteria, it displays on the site as a status update.
 * On disconnect, calls the function that plots the recorded data.
 */
async function readSerialData() {
    // create text decoder to convert binary data to string data
    const decoder = new TextDecoderStream();
    port.readable.pipeTo(decoder.writable);
    const inputStream = decoder.readable;
    reader = inputStream.getReader();

    // create variables for dom objects
    const statusText = document.getElementById("status");
    const debuggingText = document.getElementById("debugging");

    // loop through and read data until port closes
    let currentLine = "";
    while (true) {
        const {value, done} = await reader.read();
        if (done) {
            // plot data and update UI on disconnect
            plotSensorData();
            statusText.innerHTML = "disconnected";
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
                }
            } else {
                // it's a status message; update status
                statusText.innerHTML = reading;
            }
        });
    }
}

/**
 * Uses spherical angle and distance readings to calculate XYZ coordinates.
 * Converts angles to radians and uses 3D rotation matrices to find points.
 * @param {Array<Int>} angles contains the pan and tilt angles as a 2-element array
 * @param {Double} distance contains the distance read from the IR sensor, in cm
 * @returns {Array<Double>} 3-element array of doubles with XYZ coordinates in order
 */
function calculatePosition(angles, distance) {
    const anglesRadians = [];
    angles.forEach(angle => anglesRadians.push(angle*Math.PI/180));
    const yPan = distance * Math.sin(anglesRadians[0]);

    const x = distance * Math.cos(anglesRadians[0]);
    const y = yPan * Math.cos(anglesRadians[1]);
    const z = yPan * Math.sin(anglesRadians[1]);

    return [x,y,z];
}

/**
 * Plots a 3D graph of the data in XYZ coordinates after converting radian data to XYZ
 * coordinates using the plotly.js library.
 */
function plotSensorData() {
    // check that we have enough data
    if (position.length < 5 || distance.length < 5){
        document.getElementById("status").innerHTML = "Not enough data! Try again."
    } else {
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
}