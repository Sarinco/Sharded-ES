
export class Measurement {
    public topic: string;
    public name: string;
    public description: string;
    public value: number;
    public unit: string;

    constructor(topic: string, name: string, description: string, value: number, unit: string) {
        this.topic = topic;
        this.name = name;
        this.description = description;
        this.value = value;
        this.unit = unit;
    }
}
