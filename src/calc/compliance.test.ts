import { describe, it, expect } from 'vitest';
import {
  checkSizingCompliance,
  checkMcsScope,
  emitterBandFromFlowTemp,
  MCS_SCOPE_TOTAL_LIMIT_KW,
  MCS_SCOPE_PER_UNIT_LIMIT_KW,
} from './compliance';

describe('sizing: 100% rule for non-hybrid systems', () => {
  it('passes when the heat pump alone meets 100% of design load, excluding supplementary heat', () => {
    const result = checkSizingCompliance({
      isHybrid: false,
      designHeatLossW: 8000,
      heatPumpOutputAtDesignConditionsW: 8200,
    });
    expect(result.rule).toBe('100%-of-load');
    expect(result.pass).toBe(true);
  });

  it('fails when the heat pump alone falls short of design load', () => {
    const result = checkSizingCompliance({
      isHybrid: false,
      designHeatLossW: 8000,
      heatPumpOutputAtDesignConditionsW: 7000,
    });
    expect(result.pass).toBe(false);
  });
});

describe('sizing: hybrid 55% rule (MIS 3005-D, 2025 revision)', () => {
  it('the 100% rule does NOT apply to hybrids — >=55% of load at 55C flow is the test', () => {
    const result = checkSizingCompliance({
      isHybrid: true,
      designHeatLossW: 10000,
      heatPumpOutputAtDesignConditionsW: 4000, // would fail the 100% rule
      hybridOutputAt55FlowW: 6000, // but passes the 55% rule
    });
    expect(result.rule).toBe('hybrid-55%-at-55C');
    expect(result.requiredW).toBe(5500);
    expect(result.pass).toBe(true);
  });

  it('fails a hybrid that meets less than 55% of load at 55C flow', () => {
    const result = checkSizingCompliance({
      isHybrid: true,
      designHeatLossW: 10000,
      heatPumpOutputAtDesignConditionsW: 9000,
      hybridOutputAt55FlowW: 5000, // 50% < 55%
    });
    expect(result.pass).toBe(false);
  });
});

describe('scope limits', () => {
  it('exposes 70 kW total / 45 kW per unit', () => {
    expect(MCS_SCOPE_TOTAL_LIMIT_KW).toBe(70);
    expect(MCS_SCOPE_PER_UNIT_LIMIT_KW).toBe(45);
  });

  it('passes a two-unit install within both limits', () => {
    const result = checkMcsScope({ unitOutputsKw: [30, 35] });
    expect(result.totalOutputKw).toBe(65);
    expect(result.pass).toBe(true);
  });

  it('fails when total output exceeds 70 kW even if each unit is under 45 kW', () => {
    const result = checkMcsScope({ unitOutputsKw: [40, 40] });
    expect(result.totalOk).toBe(false);
    expect(result.perUnitOk).toBe(true);
    expect(result.pass).toBe(false);
  });

  it('flags the specific unit(s) exceeding the 45 kW per-unit limit', () => {
    const result = checkMcsScope({ unitOutputsKw: [20, 50] });
    expect(result.perUnitOk).toBe(false);
    expect(result.failingUnitIndices).toEqual([1]);
  });
});

describe('MCS 021 emitter band from design flow temperature', () => {
  it('bands ascend A (coolest) to F (hottest) with flow temperature', () => {
    expect(emitterBandFromFlowTemp(35)).toBe('A');
    expect(emitterBandFromFlowTemp(45)).toBe('C');
    expect(emitterBandFromFlowTemp(60)).toBe('F');
  });
});
