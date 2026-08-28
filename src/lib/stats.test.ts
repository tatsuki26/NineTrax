import { describe, expect, it } from 'vitest';
import { computeByPlayer, computeStatLine, formatRate } from './stats';
import type { AtBat, AtBatResult } from './types';

let seq = 0;
function ab(result: AtBatResult, rbi = 0, playerId = 'p1'): AtBat {
  seq += 1;
  return {
    id: `ab${seq}`,
    playerId,
    order: 1,
    inning: 1,
    result,
    rbi,
    createdAt: seq,
  };
}

describe('computeStatLine', () => {
  it('空配列は全て0、率は null', () => {
    const s = computeStatLine([]);
    expect(s.pa).toBe(0);
    expect(s.ab).toBe(0);
    expect(s.avg).toBeNull();
    expect(s.obp).toBeNull();
    expect(s.slg).toBeNull();
    expect(s.ops).toBeNull();
  });

  it('基本カウントと安打・塁打', () => {
    const s = computeStatLine([
      ab('single'),
      ab('double'),
      ab('triple'),
      ab('homerun'),
      ab('out'),
      ab('strikeout'),
      ab('reachedOnError'),
    ]);
    expect(s.pa).toBe(7);
    // AB = 単打+二+三+本+失策出塁+凡打+三振 = 7
    expect(s.ab).toBe(7);
    expect(s.h).toBe(4);
    // TB = 1 + 2 + 3 + 4 = 10
    expect(s.tb).toBe(10);
  });

  it('四球・死球・犠打・犠飛は打数に含まない（PA - BB - HBP - SB - SF）', () => {
    const s = computeStatLine([
      ab('single'),
      ab('walk'),
      ab('hitByPitch'),
      ab('sacBunt'),
      ab('sacFly'),
    ]);
    expect(s.pa).toBe(5);
    expect(s.ab).toBe(1); // 単打のみ
  });

  it('AVG = H/AB, SLG = TB/AB', () => {
    const s = computeStatLine([ab('double'), ab('out'), ab('out'), ab('single')]);
    // AB=4, H=2, TB=2+1=3
    expect(s.avg).toBeCloseTo(0.5, 10);
    expect(s.slg).toBeCloseTo(0.75, 10);
  });

  it('OBP: 失策出塁は分子に入れない / 犠打は分母に入れない / 犠飛は分母に入れる', () => {
    const s = computeStatLine([
      ab('single'), // 分子+1, 分母(AB)+1
      ab('walk'), // 分子+1, 分母+1
      ab('hitByPitch'), // 分子+1, 分母+1
      ab('sacFly'), // 分子±0, 分母+1
      ab('sacBunt'), // 分子±0, 分母±0
      ab('reachedOnError'), // 分子±0（失策出塁は出塁に含めない）, 分母(AB)+1
    ]);
    // 分子 = H(1) + BB(1) + HBP(1) = 3
    // 分母 = AB(単打1 + 失策出塁1 = 2) + BB(1) + HBP(1) + SF(1) = 5
    expect(s.obp).toBeCloseTo(3 / 5, 10);
  });

  it('OPS = OBP + SLG', () => {
    const s = computeStatLine([ab('homerun'), ab('out')]);
    // AB=2 H=1 TB=4 -> SLG=2.0 ; OBP=(1+0+0)/(2+0+0+0)=0.5
    expect(s.slg).toBeCloseTo(2.0, 10);
    expect(s.obp).toBeCloseTo(0.5, 10);
    expect(s.ops).toBeCloseTo(2.5, 10);
  });

  it('打数0でも四球があれば OBP は算出、AVG/SLG は null', () => {
    const s = computeStatLine([ab('walk'), ab('walk'), ab('sacBunt')]);
    expect(s.ab).toBe(0);
    expect(s.avg).toBeNull();
    expect(s.slg).toBeNull();
    expect(s.ops).toBeNull();
    // 分子 = 2, 分母 = 0 + 2 + 0 + 0 = 2
    expect(s.obp).toBeCloseTo(1.0, 10);
  });

  it('打点は rbi の合計', () => {
    const s = computeStatLine([ab('single', 2), ab('homerun', 4), ab('out', 0)]);
    expect(s.rbi).toBe(6);
  });
});

describe('computeByPlayer', () => {
  it('playerId ごとに集計する', () => {
    const map = computeByPlayer([
      ab('single', 0, 'p1'),
      ab('out', 0, 'p1'),
      ab('homerun', 3, 'p2'),
    ]);
    expect(map.get('p1')?.ab).toBe(2);
    expect(map.get('p1')?.h).toBe(1);
    expect(map.get('p2')?.rbi).toBe(3);
    expect(map.get('p2')?.homerun).toBe(1);
  });
});

describe('formatRate', () => {
  it('null は "-"', () => {
    expect(formatRate(null)).toBe('-');
  });
  it('先頭の0を落とす', () => {
    expect(formatRate(0.333)).toBe('.333');
    expect(formatRate(0.5)).toBe('.500');
  });
  it('1.0以上はそのまま', () => {
    expect(formatRate(1.25)).toBe('1.250');
  });
});
