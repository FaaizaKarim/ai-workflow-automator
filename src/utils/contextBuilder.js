export function createInitialContext(trigger = 'manual', inboundPayload = null) {
  const context = {
    trigger,
    steps: {},
  };
  if (inboundPayload != null) {
    context.inbound = inboundPayload;
  }
  return context;
}

export function mergeStepOutput(context, stepIndex, stepType, output) {
  const key = `step${stepIndex}`;
  context[key] = output;
  context.steps[key] = {
    type: stepType,
    output,
  };
  return context;
}

export function getFinalContext(context) {
  return context;
}
