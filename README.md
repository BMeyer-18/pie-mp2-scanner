# pie-mp2-scanner
Contains the code for the second mini-project of Olin College's Principles of Integrated Engineering course: The 2.5D Scanner. The scanner uses a pan-tilt mechanism to scan an object left-to-right and bottom-to-top, eventually creating a plot that should show the locations of each scanned point, creating a graphical representation of the scanned object.  

The servos and the scanner output are handled in the Arduino code, the conversion of spherical to cartesian coordinates and the creation of the plot is handled in the JavaScript script, and the site and digital user interface are handled with html and css. Some plotting for the write-up is done with MATLAB.  

The site must be ran locally in a Chromium-based browser (not Firefox) while the computer is connected to an Arduino hooked up to a pan-tilt mechanism that allows the scanner to see different parts of the object.