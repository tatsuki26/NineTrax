import { describe, it, expect } from 'vitest';
import { buildAtBat, choiceMeta, describeDetail, RESULT_CHOICES } from './plate';

describe('buildAtBat', () => {
  it('単打 + 左中間', () => {
    const r = buildAtBat('single', 'gap_lc');
    expect(r.result).toBe('single');
    expect(r.detail).toEqual({ zone: 'gap_lc' });
  });

  it('ゴロ + 二塁 → result out・kind grounder', () => {
    const r = buildAtBat('grounder', '2b');
    expect(r.result).toBe('out');
    expect(r.detail).toEqual({ kind: 'grounder', zone: '2b' });
  });

  it('併殺打 → out・gidp・grounder', () => {
    const r = buildAtBat('gidp', 'ss');
    expect(r.result).toBe('out');
    expect(r.detail).toEqual({ kind: 'grounder', gidp: true, zone: 'ss' });
  });

  it('三振は方向を持たない', () => {
    const r = buildAtBat('strikeout', null);
    expect(r.result).toBe('strikeout');
    expect(r.detail).toBeUndefined();
  });

  it('四球は方向不要・detail なし', () => {
    expect(buildAtBat('walk', null)).toEqual({
      result: 'walk',
      detail: undefined,
    });
  });

  it('犠飛 + センター', () => {
    const r = buildAtBat('sacFly', 'cf');
    expect(r.result).toBe('sacFly');
    expect(r.detail).toEqual({ kind: 'flyball', zone: 'cf' });
  });

  it('失策出塁 + 三遊間', () => {
    const r = buildAtBat('reachedOnError', 'gap_56');
    expect(r.result).toBe('reachedOnError');
    expect(r.detail).toEqual({ zone: 'gap_56' });
  });

  it('方向が「不明」でも記録できる', () => {
    const r = buildAtBat('double', 'unknown');
    expect(r.result).toBe('double');
    expect(r.detail).toEqual({ zone: 'unknown' });
  });

  it('方向未選択なら zone を含めない', () => {
    const r = buildAtBat('flyball', null);
    expect(r.result).toBe('out');
    expect(r.detail).toEqual({ kind: 'flyball' });
  });

  it('不明（結果自体） → out', () => {
    expect(buildAtBat('unknown', null).result).toBe('out');
  });
});

describe('RESULT_CHOICES / choiceMeta', () => {
  it('全 choice が公式 AtBatResult にマップされる', () => {
    const valid = new Set([
      'single',
      'double',
      'triple',
      'homerun',
      'walk',
      'hitByPitch',
      'sacBunt',
      'sacFly',
      'reachedOnError',
      'out',
      'strikeout',
    ]);
    for (const c of RESULT_CHOICES) {
      expect(valid.has(c.result)).toBe(true);
    }
  });

  it('本塁打は打点初期値 1', () => {
    expect(choiceMeta('homerun').defaultRbi).toBe(1);
  });

  it('三振・四球・死球・不明は方向ステップなし', () => {
    for (const c of ['strikeout', 'walk', 'hitByPitch', 'unknown'] as const) {
      expect(choiceMeta(c).needsDirection).toBe(false);
    }
  });
});

describe('describeDetail', () => {
  it('方向 + ゴロ', () => {
    expect(describeDetail('out', { kind: 'grounder', zone: '2b' })).toBe(
      '二塁・ゴロ',
    );
  });
  it('ヒットは方向のみ', () => {
    expect(describeDetail('double', { zone: 'gap_lc' })).toBe('左中間');
  });
  it('併殺表示', () => {
    expect(
      describeDetail('out', { kind: 'grounder', gidp: true, zone: 'ss' }),
    ).toBe('遊撃・併殺');
  });
  it('detail なし → 空', () => {
    expect(describeDetail('walk', undefined)).toBe('');
  });
});
