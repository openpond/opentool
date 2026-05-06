import { forwardReturns } from "../features/returns";
import { summarizeNumbers, type QuantMetricSummary } from "../result";

export type ForwardReturnStudy = {
  conditioned: QuantMetricSummary;
  horizonBars: number;
  unconditional: QuantMetricSummary;
};

export function studyForwardReturns(params: {
  condition: boolean[];
  horizonBars: number;
  prices: number[];
}): ForwardReturnStudy {
  const forward = forwardReturns(params.prices, params.horizonBars);
  const all = forward.filter((value): value is number => value != null);
  const conditioned = forward.filter(
    (value, index): value is number => value != null && params.condition[index] === true,
  );
  return {
    conditioned: summarizeNumbers(conditioned),
    horizonBars: params.horizonBars,
    unconditional: summarizeNumbers(all),
  };
}
