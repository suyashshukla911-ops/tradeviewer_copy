export type AlertConditionType = 'cross_above' | 'cross_below' | 'greater_than' | 'less_than';

export interface AlertConditionMeta {
  type: AlertConditionType;
  label: string;
  description: string;
}

export const ALERT_CONDITIONS: AlertConditionMeta[] = [
  {
    type: 'cross_above',
    label: 'Crossing Up',
    description: 'Triggers when price crosses above target value',
  },
  {
    type: 'cross_below',
    label: 'Crossing Down',
    description: 'Triggers when price crosses below target value',
  },
  {
    type: 'greater_than',
    label: 'Greater Than',
    description: 'Triggers when price is above target value',
  },
  {
    type: 'less_than',
    label: 'Less Than',
    description: 'Triggers when price is below target value',
  },
];

export function evaluateAlertCondition(
  condition: AlertConditionType,
  targetValue: number,
  currentPrice: number,
  previousPrice?: number
): boolean {
  switch (condition) {
    case 'cross_above': {
      if (previousPrice === undefined) return currentPrice > targetValue;
      return previousPrice <= targetValue && currentPrice > targetValue;
    }
    case 'cross_below': {
      if (previousPrice === undefined) return currentPrice < targetValue;
      return previousPrice >= targetValue && currentPrice < targetValue;
    }
    case 'greater_than':
      return currentPrice > targetValue;
    case 'less_than':
      return currentPrice < targetValue;
    default:
      return false;
  }
}
