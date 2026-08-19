import { Request, Response } from 'express';

export const predictBunchingRisk = async (req: Request, res: Response): Promise<void> => {
  try {
    const { headway_ratio, dwell_time_prev, passenger_load, schedule_delay, congestion_index } = req.body;

    const hr = parseFloat(headway_ratio || 1.0);
    const delay = parseFloat(schedule_delay || 0.0);
    const load = parseFloat(passenger_load || 0.5);

    let riskLevel = 'LOW';
    let riskScore = 0.15;
    let action = 'NORMAL_SPEED';
    let recommendation = 'Maintain standard operating speed (22 km/h).';
    let holdDurationSec = 0;

    if (hr < 0.35 || delay > 240) {
      riskLevel = 'HIGH';
      riskScore = 0.88;
      action = 'HOLD';
      holdDurationSec = 45;
      recommendation = `Hold 45 seconds at next stop to maintain headway gap and prevent bunching behind preceding bus.`;
    } else if (hr < 0.65 || delay > 120) {
      riskLevel = 'MEDIUM';
      riskScore = 0.52;
      action = 'HOLD';
      holdDurationSec = 20;
      recommendation = `Hold 20 seconds at next stop to restore scheduled spacing.`;
    } else if (delay < -180 && load < 0.3) {
      riskLevel = 'LOW';
      action = 'SKIP_STOP';
      recommendation = `Skip low-demand minor stop to recover lost schedule time.`;
    }

    res.status(200).json({
      success: true,
      prediction: {
        bunching_risk: riskLevel,
        bunching_score: riskScore,
        action,
        hold_duration_sec: holdDurationSec,
        recommendation,
        telemetry: {
          headway_ratio: hr,
          schedule_delay: delay,
          passenger_load: load
        }
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
