% calibration error plot
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

% transfer function V(d) plot
figure;
ds = [30 60];
Vs = [363 186];
m=10620;
b=9;
scatter(ds, Vs, 25, 'r', 'filled', DisplayName="Measured calibration points")
hold on;
fplot(@(d)m*(1/d)+b, [0 150], '--b', DisplayName="Fitted function V(d)=m*(1/d)+b")
ylim([0 1023])
xlabel("Distance (cm)")
ylabel("Voltage (ADC counts)")
title("Measured voltage against true distance")
legend;
ax = gca;
ax.FontSize = 16;
exportgraphics(gca, "./calib_plot.png")