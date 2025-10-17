import { LitElement, html, css, svg } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HomeAssistant, LovelaceCardConfig } from "custom-card-helpers";
import { BatterySensor, Sensor } from './types';
import { EntityBuilder } from './entity-builder';

@customElement('solar-gauge-card')
export class SolarGaugeCard extends LitElement {
  @property() accessor _hass!: HomeAssistant;
  @state() accessor _config!: LovelaceCardConfig;

  private solarEntity!: Sensor;
  private gridEntity!: Sensor;
  private batteryPowerEntity!: Sensor;
  private homeConsumptionEntity!: Sensor;

  svgWidth = "300px";
  svgHeight = "200px";
  svgX = 150;
  svgY = 60;
  minStrokeWidth = 5;
  maxStrokeWidth = 20;
  calculatedStrokeWidth = 20;

  static override styles = css`
  
          ha-card {
              display: flex;
              justify-content: center;
              align-items: center;
          }
          .circle {
            fill: none;
            transform: rotate(-180deg);
            transform-origin: 50% 50%;
          }
          .circle-solar {
            stroke: var(--solar-color);
          }        
          .circle-grid-out {
            stroke: var(--grid-out-color);
          }
          .circle-grid-in {
            stroke: var(--grid-in-color);
          }
          .circle-battery-out {
            stroke: var(--battery-out-color);
          }
          .circle-battery-in {
            stroke: var(--battery-in-color);
          }
          .circle-home {
            stroke: var(--home-color);
          }
          .svg-text {
            font-weight: bold;
            alignment-baseline: middle;
            fill: var(--primary-text-color)
          }
          .svg-text-value {     
            font-size: 13px;
            fill: var(--primary-text-color)
          }
          .svg-text-description {
            font-size: 12px;
          }
          .svg-bigtext-value {     
            font-size: 26px;
            fill: var(--primary-text-color)
          }
          .svg-bigtext-description {
            font-size: 24px;
          }
          .svg-text-right{
            text-anchor: end;
          }
          .svg-text-middle{
            text-anchor: middle;
          }
          .svg-text-left{
            text-anchor: start;
          }
  `;

  _gauge(radius: number, value: number, totalValue: number, className: string) {
    const circumference = 2 * Math.PI * radius;
    const dashLength = Math.min(Math.max((value / totalValue) * circumference / 2, 0), circumference / 2);
    const dashGap = Math.max(circumference - dashLength, 0);
    return svg`
          <circle id="gauge-${className}"
            cx="${this.svgX}"
            cy="${this.svgY}"
            r="${radius}"
            stroke-dasharray="${dashLength} ${dashGap}"
            stroke-dashoffset="0"
            class="circle ${className}" style="stroke-width: ${this.calculatedStrokeWidth};
            transition: stroke-dasharray 1s ease;">
          </circle>`
  }

  getFinalStrokeWidth(value: number, strokeWidth: number) {
    const rawNumber = strokeWidth ? strokeWidth : Math.trunc(value / 200);
    return Math.max(Math.min(rawNumber, this.maxStrokeWidth), this.minStrokeWidth);
  };

  isPositiveInteger(value: number): boolean {
    return !isNaN(value) && Number.isInteger(value) && value >= 0;
  }

  drawBattery(entity: BatterySensor) {
    if (entity.capacity.entity) {
      let batteryCapacityValue = Number(entity.capacity.entity.state);
      if (isNaN(batteryCapacityValue)) batteryCapacityValue = 0;

      if (entity.capacity.precision !== undefined) {
        let capacityPrecision = Number(entity.capacity.precision);
        if (this.isPositiveInteger(capacityPrecision)) {
          const powerPrecision = Math.pow(10, capacityPrecision);
          batteryCapacityValue = Math.round(batteryCapacityValue * powerPrecision) / powerPrecision;
        } else {
          console.log('Battery capacity precision value ' + entity.capacity.precision + ' is invalid');
        }
      }

      const xStart = 130;
      const dash = 6;
      const gap = 2
      const length = dash * 5 + gap * 4;
      const strokewidth = 12;
      const xEnd = xStart + length;
      const yStart = 160;
      const xMin = 0;
      const xMax = 100;
      const emptyXEnd = xStart + (batteryCapacityValue - xMin) * (xEnd - xStart) / (xMax - xMin);
      const cellFullColor = entity.capacity.color;

      return svg`
          <text id="battery-capacity-value" x="${xStart + 40}" y="${yStart - 16}" class="svg-text svg-text-middle" style="font-size: 10px;">${batteryCapacityValue}${entity.capacity.entity.attributes.unit_of_measurement}</text>
         ${entity.temperature.entity
          ? svg`
          <text id="battery-temperature-value" x="${xStart}" y="${yStart - 16}" class="svg-text svg-text-middle" style="font-size: 10px;">${Number(entity.temperature.entity.state)}${entity.temperature.entity.attributes.unit_of_measurement}</text>
             ` : ``}
           <line id="battery-cell-full" x1="${xStart}" y1="${yStart}" x2="${xEnd}" y2="${yStart}" stroke="${cellFullColor}" stroke-width="${strokewidth}"
                     stroke-dasharray="${dash} ${gap}">
           </line>
           <line id="battery-cell-empty" x1="${xEnd}" y1="${yStart}" x2="${emptyXEnd}" y2="${yStart}" stroke="lightgray" stroke-width="${strokewidth}"
                     stroke-dasharray="${dash} ${gap}">
           </line>
           <rect id="battery-box" x="${xStart - 3}" y="${yStart - 9}" rx="3" ry="3" width="${length + 6}" height="${strokewidth + 6}" 
                     style="fill:none;stroke-width:2;stroke:${cellFullColor}"></rect>
           <rect id="battery-top" x="${xStart + length + 2}" y="${yStart - 5}" rx="3" ry="3" width="5" height="10" style="fill:${cellFullColor}"></rect>
        `;
    }
  }

  setConfig(config: LovelaceCardConfig) {
    if (!config.solarPower.entity || !config.homeConsumption.entity ||
      (!config.gridPower.entity && (!config.gridPower.out?.entity || !config.gridPower.in?.entity))) {
      throw new Error("You need to define mandatory entities: 'solarPower', 'homeConsumption' and 'gridPower' in the card configuration.");
    } else {
      console.log('All set. Enjoy!!!')
    }
    this._config = config;
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.requestUpdate();
  }

  override render() {

    if (this._hass) {
      const builder = new EntityBuilder(this._hass, this._config);

      //Grid Power
      const hassGridPowerEntity = builder.buildGridPowerEntity(this._hass, this._config);
      this.gridEntity = builder.customizeInOutEntity(hassGridPowerEntity, builder.gridUpdateMap);

      //Battery Power
      const hassBatteryPowerEntity = builder.buildBatteryPowerEntity(this._hass, this._config);
      this.batteryPowerEntity = builder.customizeInOutEntity(hassBatteryPowerEntity, builder.batteryUpdateMap);

      //Solar power
      const hassSolarPowerEntity = builder.buildSolarPowerEntity(this._hass, this._config);
      this.solarEntity = builder.customizeSimpleEntity(hassSolarPowerEntity);

      //Home consumption
      const hassHomeConsumptionEntity = builder.buildHomeConsumptionEntity(this._hass, this._config);
      this.homeConsumptionEntity = builder.customizeSimpleEntity(hassHomeConsumptionEntity);

      //Battery
      const batteryEntity = builder.buildBatteryEntity(this._hass, this._config);
      const battery = this.drawBattery(batteryEntity);

      const userStrokeWidthEntity = this._config.gaugeWidth;

      this.style.setProperty('--solar-color', hassSolarPowerEntity.color);
      this.style.setProperty('--grid-out-color', hassGridPowerEntity.out.color);
      this.style.setProperty('--grid-in-color', hassGridPowerEntity.in.color);
      this.style.setProperty('--battery-out-color', hassBatteryPowerEntity.out.color);
      this.style.setProperty('--battery-in-color', hassBatteryPowerEntity.in.color);
      this.style.setProperty('--home-color', hassHomeConsumptionEntity.color);

      const gridOutValue = Math.max(0, this.gridEntity.value);
      const gridInValue = Math.abs(Math.min(0, this.gridEntity.value));

      const batteryOutValue = Math.max(0, this.batteryPowerEntity.value);
      const batteryInValue = Math.abs(Math.min(0, this.batteryPowerEntity.value));

      const totalProdValue = this.solarEntity.value + batteryOutValue + gridOutValue;
      const totalConsValue = this.homeConsumptionEntity.value + batteryInValue + gridInValue;

      const radiusProd = 100;
      this.calculatedStrokeWidth = this.getFinalStrokeWidth(totalProdValue, userStrokeWidthEntity);
      const radiusCons = radiusProd - this.calculatedStrokeWidth;

      return html` <ha-card>
      <svg width="${this.svgWidth}" height="${this.svgHeight}">
       ${this._gauge(radiusProd, totalProdValue, totalProdValue, 'circle-grid-out')}
       ${this._gauge(radiusProd, this.solarEntity.value + batteryOutValue, totalProdValue, 'circle-battery-out')}
       ${this._gauge(radiusProd, this.solarEntity.value, totalProdValue, 'circle-solar')}
       ${this._gauge(radiusCons, totalConsValue, totalConsValue, 'circle-grid-in')}
       ${this._gauge(radiusCons, this.homeConsumptionEntity.value + batteryInValue, totalConsValue, 'circle-battery-in')}
       ${this._gauge(radiusCons, this.homeConsumptionEntity.value, totalConsValue, 'circle-home')}

    <text id="gauge-home-text" x="${this.svgX - radiusProd - this.calculatedStrokeWidth / 2}" y="${this.svgY * 2.5}" class="svg-text svg-text-description svg-text-left" style="fill:${this.homeConsumptionEntity.textColor}">
        ${this.homeConsumptionEntity.text}
    </text>
    <text id="gauge-home-value" x="${this.svgX - radiusProd - this.calculatedStrokeWidth / 2}" y="${this.svgY * 2.7}" class="svg-text svg-text-value svg-text-left">
        ${this.homeConsumptionEntity.value} ${this.homeConsumptionEntity.entity.attributes.unit_of_measurement}
    </text>
    <text id="gauge-grid-text" x="${this.svgX}" y="${this.svgY * 1.6}" class="svg-text svg-bigtext-description svg-text-middle" style="fill:${this.gridEntity.textColor};">
        ${this.gridEntity.text}
    </text>
    <text id="gauge-grid-value" x="${this.svgX}" y="${this.svgY * 2}" class="svg-text svg-bigtext-value svg-text-middle" style="fill:${this.gridEntity.valueColor};">
        ${this.gridEntity.value} ${this.gridEntity.entity.attributes.unit_of_measurement}
    </text>
    <text id="gauge-solar-text" x="${this.svgX + radiusProd + this.calculatedStrokeWidth / 2}" y="${this.svgY * 2.5}" class="svg-text svg-text-description svg-text-right" style="fill: ${this.solarEntity.textColor}">
        ${this.solarEntity.text}
    </text>
    <text id="gauge-solar-value" x="${this.svgX + radiusProd + this.calculatedStrokeWidth / 2}" y="${this.svgY * 2.7}" class="svg-text svg-text-value svg-text-right" style="fill: ${this.solarEntity.valueColor}">
        ${this.solarEntity.value} ${this.solarEntity.entity.attributes.unit_of_measurement}
    </text>
    <text id="gauge-battery-text" x="${this.svgX + radiusProd + this.calculatedStrokeWidth / 2}" y="${this.svgY * 2.9}" class="svg-text svg-text-description svg-text-right" style="fill: ${this.batteryPowerEntity.textColor || 'none'}">
        ${this.batteryPowerEntity.text || ''}
    </text>
    <text id="gauge-battery-value" x="${this.svgX + radiusProd + this.calculatedStrokeWidth / 2}" y="${this.svgY * 3.1}" class="svg-text svg-text-value svg-text-right" style="fill: ${this.batteryPowerEntity.valueColor || 'none'}">
        ${this.batteryPowerEntity.value} ${this.batteryPowerEntity.entity?.attributes.unit_of_measurement}
    </text>

        ${battery}
      </svg>
      </ha-card>
      `;
    } else {
      return html``;
    }
  }
}