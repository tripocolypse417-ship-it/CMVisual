import { describe, it, expect } from 'vitest';
import { assessForecastReadiness } from './predictionSafetyGate.js';
import { scorePositionForecasts } from './forecastBacktest.js';
import { evaluateForecastPromotion } from './forecastChampionGate.js';
import { prioritizeEvidenceRequests } from './forecastActiveSensing.js';

const nowMs = 10000;
const sample = (timestampMs) => ({ timestampMs, x: 1, y: 2, uncertainty: 0.2, sourceId: 'device-a', coordinateFrame: 'local-survey', clockDomain: 'normalized', evidenceClass: 'MEASURED' });
describe('prediction research safeguards', () => {
  it('admits only experimental forecasts with compatible evidence', () => {
    const result = assessForecastReadiness({ observations: [sample(9000),sample(9200),sample(9400)], horizonSec: 2, nowMs });
    expect(result.status).toBe('EXPERIMENTAL_READY');
    expect(result.operationalUseAllowed).toBe(false);
  });
  it('rejects incompatible timing', () => {
    const result = assessForecastReadiness({ observations: [sample(9000),sample(9200),{...sample(9400),clockDomain:'other'}], horizonSec:2, nowMs });
    expect(result.status).toBe('INSUFFICIENT_DATA');
  });
  it('refuses to score unverified truth', () => {
    expect(scorePositionForecasts([{id:'case1', predicted:{x:1,y:1},groundTruth:{x:1,y:1},baseline:{x:0,y:0},horizonSec:1}]).evaluated).toBe(0);
  });
  it('does not promote models without independent testing', () => {
    expect(evaluateForecastPromotion({candidate:{},baseline:{},evaluation:{}}).promote).toBe(false);
  });
  it('requests only authorized measurements without activation', () => {
    const result = prioritizeEvidenceRequests({ gaps:[{kind:'temperature',importance:2}], sensors:[{id:'a',measures:['temperature'],available:true,authorized:false,expectedReduction:0.9,cost:0},{id:'b',measures:['temperature'],available:true,authorized:true,expectedReduction:0.5,cost:1}] });
    expect(result.requests.map(r=>r.sensorId)).toEqual(['b']);
    expect(result.autonomousSensorActivationAllowed).toBe(false);
  });
});
