import { after } from "mocha";
import { MeasurementService } from "./measurer.ts";


after(() => {
    // If the test suite was successful, write the measurements to a file
    
    console.log("Writing measurements to file");
    const measurementService = MeasurementService.getInstance();
    const numberOfMeasurements = measurementService.getMeasurements().length;
    console.log("Number of measurements:", numberOfMeasurements);

    const folder_path = process.env.FOLDER; 
    if (!folder_path) {
        console.error("FOLDER environment variable is not set");
        return;
    }

    const date = new Date(); 
    // Get the date string in YYYY-MM-DD-HH:MM:SS format
    const date_string = date.toISOString().split("T")[0] + "-" + date.toTimeString().split(" ")[0];
    const file_path = `../measurements/${folder_path}/measurement_${date_string}.json`;
    measurementService.writeToFile(file_path);
});
