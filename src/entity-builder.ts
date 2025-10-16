import { HomeAssistant, LovelaceCardConfig } from "custom-card-helpers";
import { BatterySensor, InOutSensor, Sensor, SimpleSensor } from "./types";

export class EntityBuilder {
    private hass: HomeAssistant;
    private config: LovelaceCardConfig;

    constructor(hass: HomeAssistant, config: LovelaceCardConfig) {
        this.hass = hass;
        this.config = config;
    }

    private solarColor = "#ffee3A";
    private gridOutColor = "#488fc2";
    private gridInColor = "#8353d1";
    private homeColor = "#ffa500";
    private batteryPowerOutColor = "#0bac3b";
    private batteryPowerInColor = "#83d3d1";
    private batteryColor = "green"

    static readonly IN = "in";
    static readonly ZERO = "zero";
    static readonly OUT = "out";

    public gridUpdateMap: Map<string, Partial<Sensor>> =
        new Map<string, Partial<Sensor>>([
            [EntityBuilder.IN, {
                valueColor: 'green',
                text: 'Grid In',
                active: true
            }],
            [EntityBuilder.ZERO, {
                valueColor: '',
                text: 'Grid',
                active: false
            }],
            [EntityBuilder.OUT, {
                valueColor: 'red',
                text: 'Grid Out',
                active: true
            }],
        ]);

    public batteryUpdateMap: Map<string, Partial<Sensor>> =
        new Map<string, Partial<Sensor>>([
            [EntityBuilder.IN, {
                valueColor: 'green',
                text: 'Battery In',
                active: true
            }],
            [EntityBuilder.ZERO, {
                valueColor: '',
                text: 'Battery',
                active: false
            }],
            [EntityBuilder.OUT, {
                valueColor: 'red',
                text: 'Battery Out',
                active: true
            }],
        ]);

    initializeEntity(power: InOutSensor): Sensor {
        let powerValue = 0;
        let powerActive = true;
        if (power.entity) {
            powerValue = Number(power.entity.state);
            power.color = powerValue > 0 ? power.out.color : power.in.color;
            powerActive = true;
        } else {
            if (power.out.entity && power.in.entity) {
                const outValue = Number(power.out.entity.state);
                const inValue = Number(power.in.entity.state);
                if (outValue > 0) {
                    power.entity = power.out.entity;
                    power.color = power.out.color;
                    powerValue = outValue;
                } else {
                    if (inValue > 0) {
                        power.entity = power.in.entity;
                        power.color = power.in.color;
                        powerValue = inValue * -1;
                    } else {
                        throw new Error("At least one of the 'out' or 'in' entities must be positive.");
                    }
                }
            } else {
                if ((power.out.entity && !power.in.entity) || (!power.out.entity && power.in.entity)) {
                    throw new Error("Invalid configuration.");
                }
                powerActive = false;
            }
        }

        return {
            entity: power.entity,
            value: powerValue,
            textColor: power.color,
            active: powerActive
        };
    }

    customizeInOutEntity(grid: InOutSensor, updates: Map<string, Partial<Sensor>>): Sensor {

        let gridEntity = this.initializeEntity(grid);

        if (gridEntity.value < 0) {
            gridEntity = {
                ...gridEntity,
                ...updates.get(EntityBuilder.IN)
            };
        } else if (gridEntity.value == 0) {
            gridEntity = {
                ...gridEntity,
                ...updates.get(EntityBuilder.ZERO)
            };
        } else {
            gridEntity = {
                ...gridEntity,
                ...updates.get(EntityBuilder.OUT)
            };
        }
        return gridEntity;
    }

    customizeSimpleEntity(entity: SimpleSensor): Sensor {
        return {
            entity: entity.entity,
            value: Number(entity.entity.state),
            textColor: entity.color,
            text: entity.text,
        };
    }

    public buildGridPowerEntity(hass: HomeAssistant, config: LovelaceCardConfig): InOutSensor {
        return {
            entity: hass.states[config.gridPower.entity],
            color: '',
            out: {
                entity: hass.states[config.gridPower?.out?.entity],
                color: this.gridOutColor
            },
            in: {
                entity: hass.states[config.gridPower?.in?.entity],
                color: this.gridInColor
            }
        };
    }

    public buildBatteryPowerEntity(hass: HomeAssistant, config: LovelaceCardConfig): InOutSensor {
        return {
            entity: hass.states[config.batteryPower?.entity],
            color: '',
            out: {
                entity: hass.states[config.batteryPower?.out?.entity],
                color: this.batteryPowerOutColor
            },
            in: {
                entity: hass.states[config.batteryPower?.in?.entity],
                color: this.batteryPowerInColor
            }
        };
    }

    public buildSolarPowerEntity(hass: HomeAssistant, config: LovelaceCardConfig): SimpleSensor {
        return {
            entity: hass.states[config.solarPower.entity],
            color: this.solarColor,
            text: "Solar"
        }
    }

    public buildHomeConsumptionEntity(hass: HomeAssistant, config: LovelaceCardConfig): SimpleSensor {
        return {
            entity: hass.states[config.homeConsumption.entity],
            color: this.homeColor,
            text: "Home"
        }
    }

    public buildBatteryEntity(hass: HomeAssistant, config: LovelaceCardConfig): BatterySensor {
        return {
            capacity: {
                entity: hass.states[config.battery?.capacity?.entity],
                color: this.batteryColor,
                precision: config.battery?.capacity?.precision ?? 0
            },
            temperature: {
                entity: hass.states[config.battery?.temperature?.entity]
            }
        }
    }
}