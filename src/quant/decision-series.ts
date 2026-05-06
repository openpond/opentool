import {
  quantDecisionArtifactV1Schema,
  type QuantDecision,
  type QuantDecisionArtifactV1,
} from "./schemas";

export function validateDecisionArtifact(value: unknown): QuantDecisionArtifactV1 {
  const artifact = quantDecisionArtifactV1Schema.parse(value);
  for (let index = 1; index < artifact.decisions.length; index += 1) {
    if (artifact.decisions[index].time < artifact.decisions[index - 1].time) {
      throw new Error(`Decision artifact times must be sorted at index ${index}`);
    }
  }
  return artifact;
}

export function compactDecisionChanges(decisions: QuantDecision[]): QuantDecision[] {
  const compact: QuantDecision[] = [];
  let previousTarget: number | null = null;
  for (const decision of decisions) {
    if (previousTarget === null || decision.targetPosition !== previousTarget) {
      compact.push(decision);
      previousTarget = decision.targetPosition;
    }
  }
  return compact;
}
