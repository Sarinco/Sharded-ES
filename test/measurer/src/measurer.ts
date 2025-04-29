import fs from "fs-extra"

export class Measurement {
    public topic: string;
    public name: string;
    public description: string;
    public value: number;
    public unit: string;
    public gateway: string;

    constructor(topic: string, name: string, description: string, value: number, unit: string, gateway: string) {
        this.topic = topic;
        this.name = name;
        this.description = description;
        this.value = value;
        this.unit = unit;
        this.gateway = gateway;
    }
}

export class MeasurementService {
    private measurements: Measurement[] = [];
    private static instance: MeasurementService;

    private constructor() {
        // Private constructor to prevent instantiation
    }

    public static getInstance(): MeasurementService {
        if (!MeasurementService.instance) {
            console.log("Creating a new instance of MeasurementService");
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
        console.log("Writing measurements to file:", filePath);
        const data = JSON.stringify(this.measurements, null, 2);
        fs.writeFileSync(filePath, data, 'utf-8');
    }

    public async measure(
        callback: () => Promise<any>,
        topic: string,
        name: string,
        description: string,
        gateway: string
    ) {
        const start = process.hrtime();
        const res = await callback();
        const end = process.hrtime(start);
        const duration = end[0] * 1e9 + end[1]; // Convert to nanoseconds
        const unit = "ns";

        const measurement: Measurement = {
            topic,
            name,
            description,
            unit,
            value: duration,
            gateway,
        };

        this.addMeasurement(measurement);
        return res;
    }

    createChild(topic: string): MeasurementServiceChild {
        const child = new MeasurementServiceChild(topic);
        return child;
    }
}

export class MeasurementServiceChild {
    private measurement_service: MeasurementService;
    private topic: string;

    constructor(topic: string) {
        this.topic = topic;
        this.measurement_service = MeasurementService.getInstance();
    }

    public measure(
        callback: () => Promise<any>,
        name: string,
        description: string,
        gateway: string
    ) {
        return this.measurement_service.measure(
            callback,
            this.topic,
            name,
            description,
            gateway
        );
    }
}

