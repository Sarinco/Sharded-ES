import { Measurement } from "./interface";
import { writeFileSync } from "fs";

export class MeasurementService {
    private measurements: Measurement[] = [];
    private static instance: MeasurementService;

    public static getInstance(): MeasurementService {
        if (!MeasurementService.instance) {
            MeasurementService.instance = new MeasurementService();
        }
        return MeasurementService.instance;
    }

    public addMeasurement(measurement: Measurement): void {
        this.measurements.push(measurement);
    }

    public getMeasurements(): Measurement[] {
        return this.measurements;
    }

    public writeToFile(filePath: string): void {
        // Write the measurements to a file in JSON format
        const data = JSON.stringify(this.measurements, null, 2);
        writeFileSync(filePath, data, 'utf-8');
    }

    public measure(
        callback: () => void,
        topic: string,
        name: string,
        description: string,
    ) {
        const start = process.hrtime();
        callback();
        const end = process.hrtime(start);
        const duration = end[0] * 1e9 + end[1]; // Convert to nanoseconds
        const unit = "ns";

        const measurement: Measurement = {
            topic,
            name,
            description,
            unit,
            value: duration,
        };

        this.addMeasurement(measurement);
    }
}

