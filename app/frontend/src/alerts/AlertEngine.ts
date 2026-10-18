import type { Alert } from './Alert';
import { evaluateAlertCondition, type AlertConditionType } from './AlertCondition';
import type { Timeframe } from '../chart/models/Candle';

export interface CreateAlertParams {
  symbol: string;
  timeframe: Timeframe;
  condition: AlertConditionType;
  value: number;
  enabled?: boolean;
}

export class AlertEngine {
  private alerts: Alert[] = [];
  private lastPrices: Map<string, number> = new Map();

  constructor(initialAlerts: Alert[] = []) {
    this.alerts = [...initialAlerts];
  }

  public getAlerts(): Alert[] {
    return [...this.alerts];
  }

  public setAlerts(alerts: Alert[]): void {
    this.alerts = [...alerts];
  }

  public addAlert(params: CreateAlertParams): Alert {
    const newAlert: Alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      symbol: params.symbol,
      timeframe: params.timeframe,
      condition: params.condition,
      value: Number(params.value),
      enabled: params.enabled ?? true,
      createdAt: Date.now(),
    };
    this.alerts.push(newAlert);
    return newAlert;
  }

  public toggleAlert(id: string): Alert | null {
    const alert = this.alerts.find((a) => a.id === id);
    if (alert) {
      alert.enabled = !alert.enabled;
      return alert;
    }
    return null;
  }

  public deleteAlert(id: string): boolean {
    const initialLen = this.alerts.length;
    this.alerts = this.alerts.filter((a) => a.id !== id);
    return this.alerts.length < initialLen;
  }

  public checkAlerts(symbol: string, currentPrice: number): Alert[] {
    const prevPrice = this.lastPrices.get(symbol);
    const triggered: Alert[] = [];

    for (const alert of this.alerts) {
      if (!alert.enabled || alert.symbol !== symbol) continue;

      const isTriggered = evaluateAlertCondition(
        alert.condition,
        alert.value,
        currentPrice,
        prevPrice
      );

      if (isTriggered) {
        alert.triggeredAt = Date.now();
        triggered.push({ ...alert });
      }
    }

    this.lastPrices.set(symbol, currentPrice);
    return triggered;
  }
}
