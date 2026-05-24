import type { ValueType, NameType } from 'recharts/types/component/DefaultTooltipContent';

export type TooltipValue = ValueType;
export type TooltipName = NameType;

export const formatTooltipNumber = (value: TooltipValue): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
};
