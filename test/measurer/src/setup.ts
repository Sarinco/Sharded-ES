import { after } from "mocha";
import { MeasurementService } from "./measurer.ts";


after(() => {
    console.log("Writing measurements to file");
    const measurementService = MeasurementService.getInstance();
    const numberOfMeasurements = measurementService.getMeasurements().length;
    console.log("Number of measurements:", numberOfMeasurements);
    const filePath = "measurements.json";
    measurementService.writeToFile(filePath);
});
