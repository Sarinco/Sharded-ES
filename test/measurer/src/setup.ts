import { after } from "mocha";
import { MeasurementService } from "./measurer.ts";


after(() => {
    console.log("Writing measurements to file");
    const measurementService = MeasurementService.getInstance();
    const numberOfMeasurements = measurementService.getMeasurements().length;
    console.log("Number of measurements:", numberOfMeasurements);
    const date = new Date();
    // Get the date string in YYYY-MM-DD-HH:MM:SS format
    const date_string = date.toISOString().split("T")[0] + "-" + date.toTimeString().split(" ")[0];
    const filePath = `../measurements/measurement_${date_string}.json`;
    measurementService.writeToFile(filePath);
});
