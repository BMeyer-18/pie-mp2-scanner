data = table2array(readtable('./distance_error.csv'));
actual = data(:,1); predicted = data(:,2);

figure;
plot(1:8, actual, '.-', MarkerSize=15); hold on
plot(1:8, predicted, '.-', MarkerSize=15)
yline(30, 'k', LineWidth=0.5)
yline(60, 'k', LineWidth=0.5)
text(1.05,32, "Lower Calibration Point", FontSize=10)
text(1.05, 62, "Upper Calibration Point", FontSize=10)
xlabel('Trial Number')
ylabel('Distance (cm)')
title('Error Plot of Recorded Distances')
legend('Actual Distance', 'Predicted Distance', Location='northwest')
exportgraphics(gca, "./error_plot.png")