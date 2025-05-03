import fs from "fs-extra"

export const gateways = [
    "http://localhost:80",
    "http://localhost:81",
];

export const gateway_site_map = new Map<string, string>([
    ["http://localhost:80", "eu-be"],
    ["http://localhost:81", "eu-spain"],
]);

export const gateway_stock_map = new Map<string, string>([
    ["http://localhost:80", "charleroi-sud"],
    ["http://localhost:81", "barcelone"],
]);

export class Measurement {
    public topic: string;
    public name: string;
    public description: string;
    public value: number;
    public unit: string;
    public source_site: string;
    public destination_site: string;

    constructor(topic: string, name: string, description: string, value: number, unit: string, source_site: string, destination_site: string) {
        this.topic = topic;
        this.name = name;
        this.description = description;
        this.value = value;
        this.unit = unit;
        this.source_site = source_site;
        this.destination_site = destination_site;
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
        source_gateway: string,
        destination_gateway: string
    ) {
        const start = process.hrtime();
        const res = await callback();
        const end = process.hrtime(start);
        const duration = end[0] * 1e9 + end[1]; // Convert to nanoseconds
        const unit = "ns";

        const source_site = gateway_site_map.get(source_gateway);
        const destination_site = gateway_site_map.get(destination_gateway);
        if (!source_site || !destination_site) {
            throw new Error(`Invalid gateway: ${source_gateway} or ${destination_gateway}`);
        }

        const measurement: Measurement = {
            topic,
            name,
            description,
            unit,
            value: duration,
            source_site,
            destination_site,
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
        source_gateway: string,
        destination_gateway: string
    ) {
        return this.measurement_service.measure(
            callback,
            this.topic,
            name,
            description,
            source_gateway,
            destination_gateway
        );
    }
}

