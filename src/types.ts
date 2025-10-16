
export interface Sensor {
    entity: SensorEntity;
    value: number;
    textColor?: string;
    valueColor?: string;
    text?: string;
    active?: boolean;
}

export interface SimpleSensor extends BaseSensor {
    text: string;
}

export interface InOutSensor extends BaseSensor {
    out: BaseSensor;
    in: BaseSensor;
}

export interface BatterySensor {
    capacity: BatteryCapacitySensor;
    temperature: BatteryTemperatureSensor;
}

export interface BatteryCapacitySensor extends BaseSensor {
    precision: number;
}

export interface BatteryTemperatureSensor {
    entity: any;
}

export interface BaseSensor {
    entity: any;
    color: string;
}

export interface SensorEntity {
    state: string;
    attributes: any;
}