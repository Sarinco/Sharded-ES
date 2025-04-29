import { MeasurementService } from "./measurer.ts";


const measurementService = MeasurementService.getInstance();
const filePath = "measurements.json";
measurementService.writeToFile(filePath);
