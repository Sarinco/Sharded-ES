import { MeasurementService } from "./measurer.ts";


const measurementService = MeasurementService.getInstance();
const date = new Date();
const date_string = date.toISOString().split("T")[0];
const filePath = `../../measurements/measurements_${date_string}.json`;
measurementService.writeToFile(filePath);
