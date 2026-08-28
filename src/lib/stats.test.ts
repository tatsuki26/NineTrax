import { describe, it, expect } from 'vitest';
import { computeStatLine, computeByPlayer, formatRate } from './stats';
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
  it('空配列はすべて0、レートは null', () => {
    const s = computeStatLine([]);
    expect(s.pa).toBe(0);
    expect(s.ab).toBe(0);
    expect(s.avg).toBeNull();
    expect(s.obp).toBeNull();
    expect(s.slg).toBeNull();
    expect(s.ops).toBeNull();
  });

  it('四球・死球・犠打・犠飛のみだと AB=0 で AVG/SLG は null、OBP は算出される', () => {
    const s = computeStatLine([ab('walk'), ab('hitByPitch'), ab('sacBunt'), ab('sacFly')]);
    expect(s.pa).toBe(4);
    expect(s.ab).toBe(0);
    expect(s.avg).toBeNull();
    expect(s.slg).toBeNull();
    // OBP 分母 = AB(0) + 四球(1) + 死球(1) + 犠飛(1) = 3、分子 = 0 + 1 + 1 = 2
    expect(s.obp).toBeCloseTo(2 / 3, 10);
    expect(s.ops).toBeNull(); // SLG が null なので OPS も null
  });

  it('犠打は OBP の分母に入らない / 犠飛は入る', () => {
    const withBunt = computeStatLine([ab('single'), ab('sacBunt')]);
    // 分母 = AB(1) + 0 + 0 + 0 = 1
    expect(withBunt.obp).toBeCloseTo(1 / 1, 10);

    const withFly = computeStatLine([ab('single'), ab('sacFly')]);
    // 分母 = AB(1) + 犠飛(1) = 2、分子 = 安打(1)
    expect(withFly.obp).toBeCloseTo(1 / 2, 10);
  });

  it('失策出塁は打数に含むが、安打にも OBP の分子にも含めない', () => {
    const s = computeStatLine([ab('reachedOnError'), ab('reachedOnError')]);
    expect(s.ab).toBe(2);
    expect(s.h).toBe(0);
    expect(s.avg).toBe(0);
    expect(s.obp).toBe(0);
  });

  it('塁打と各レートを正しく計算する', () => {
    // 単打, 二塁打, 三塁打, 本塁打, 三振, 四球
    const s = computeStatLine([
      ab('single'),
      ab('double'),
      ab('triple'),
      ab('homerun', 2),
      ab('strikeout'),
      ab('walk'),
    ]);
    expect(s.pa).toBe(6);
    expect(s.h).toBe(4);
    expect(s.tb).toBe(1 + 2 + 3 + 4); // 10
    expect(s.ab).toBe(5); // H(4) + 三振(1)
    expect(s.rbi).toBe(2);
    expect(s.avg).toBeCloseTo(4 / 5, 10);
    expect(s.slg).toBeCloseTo(10 / 5, 10);
    // OBP 分子 = H(4) + 四球(1) = 5、分母 = AB(5) + 四球(1) = 6
    expect(s.obp).toBeCloseTo(5 / 6, 10);
    expect(s.ops).toBeCloseTo(10 / 5 + 5 / 6, 10);
  });

  it('凡打・三振は打数に含む', () => {
    const s = computeStatLine([ab('out'), ab('strikeout'), ab('out')]);
    expect(s.ab).toBe(3);
    expect(s.avg).toBe(0);
  });
});

describe('computeByPlayer', () => {
  it('playerId ごとに分けて集計する', () => {
    const rows = [ab('single', 0, 'a'), ab('out', 0, 'a'), ab('homerun', 1, 'b')];
    const map = computeByPlayer(rows);
    expect(map.get('a')?.ab).toBe(2);
    expect(map.get('a')?.h).toBe(1);
    expect(map.get('b')?.homerun).toBe(1);
    expect(map.get('b')?.rbi).toBe(1);
  });
});

describe('formatRate', () => {
  it('null は "-"、1未満は先頭0省略、1以上はそのまま', () => {
    expect(formatRate(null)).toBe('-');
    expect(formatRate(0)).toBe('.000');
    expect(formatRate(1 / 3)).toBe('.333');
    expect(formatRate(1)).toBe('1.000');
    expect(formatRate(2.5)).toBe('2.500');
  });
});
