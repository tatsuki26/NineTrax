import { describe, it, expect } from 'vitest';
import {
  deriveResult,
  applyPlateResult,
  suggestRbi,
  looksLikeBrokenDoublePlay,
} from './plate';
import type { AtBatDetail, BaseState } from './types';

const bases = (b: Partial<BaseState> = {}): BaseState => ({
  first: null,
  second: null,
  third: null,
  ...b,
});

describe('deriveResult', () => {
  it('ヒット系はそのまま', () => {
    expect(deriveResult('double', {})).toBe('double');
    expect(deriveResult('homerun', {})).toBe('homerun');
    expect(deriveResult('walk', {})).toBe('walk');
    expect(deriveResult('strikeout', {})).toBe('strikeout');
  });

  it('ゴロで打者アウト → out', () => {
    expect(
      deriveResult('grounder', { batterEndBase: 0, runners: [] }),
    ).toBe('out');
  });

  it('失策で出塁 → reachedOnError', () => {
    expect(
      deriveResult('grounder', {
        batterEndBase: 1,
        fielding: { sequence: [6], error: { pos: 6, kind: 'field' } },
      }),
    ).toBe('reachedOnError');
  });

  it('バント + 走者進塁で打者アウト → sacBunt', () => {
    expect(
      deriveResult('bunt', {
        batterEndBase: 0,
        runners: [{ playerId: 'r1', from: 1, to: 2 }],
      }),
    ).toBe('sacBunt');
  });

  it('フライ + 三塁走者生還で打者アウト → sacFly', () => {
    expect(
      deriveResult('flyball', {
        batterEndBase: 0,
        runners: [{ playerId: 'r3', from: 3, to: 4 }],
      }),
    ).toBe('sacFly');
  });

  it('野選（打者セーフ・走者アウト）→ out（打数につく）', () => {
    expect(
      deriveResult('grounder', {
        batterEndBase: 1,
        fielding: { sequence: [4, 6], fieldersChoice: true },
        runners: [{ playerId: 'r1', from: 1, to: 0 }],
      }),
    ).toBe('out');
  });

  it('打球で打者セーフ・失策も野選もなし → 内野安打 single', () => {
    expect(
      deriveResult('grounder', {
        batterEndBase: 1,
        fielding: { sequence: [6] },
      }),
    ).toBe('single');
  });
});

describe('applyPlateResult', () => {
  it('走者なし・ゴロアウト', () => {
    const t = applyPlateResult(bases(), 'B', {
      batterEndBase: 0,
      runners: [],
    });
    expect(t.next).toEqual(bases());
    expect(t.outsAdded).toBe(1);
    expect(t.runsScored).toBe(0);
  });

  it('0アウト1塁・セカンドゴロ併殺崩れ：一走アウト、打者一塁で生存', () => {
    const detail: AtBatDetail = {
      battedBall: { trajectory: 'grounder', zone: '2b' },
      fielding: { sequence: [4, 6], fieldersChoice: true },
      batterEndBase: 1,
      runners: [{ playerId: 'r1', from: 1, to: 0 }],
      brokenDoublePlay: true,
    };
    const t = applyPlateResult(bases({ first: 'r1' }), 'B', detail);
    expect(t.next).toEqual(bases({ first: 'B' }));
    expect(t.outsAdded).toBe(1);
    expect(deriveResult('grounder', detail)).toBe('out');
    expect(looksLikeBrokenDoublePlay(detail)).toBe(true);
  });

  it('走者一・三塁でタイムリー二塁打：2点、打者二塁', () => {
    const t = applyPlateResult(bases({ first: 'r1', third: 'r3' }), 'B', {
      batterEndBase: 2,
      runners: [
        { playerId: 'r3', from: 3, to: 4 },
        { playerId: 'r1', from: 1, to: 4 },
      ],
    });
    expect(t.runsScored).toBe(2);
    expect(t.scorerIds).toEqual(['r3', 'r1']);
    expect(t.next).toEqual(bases({ second: 'B' }));
    expect(t.outsAdded).toBe(0);
  });

  it('イベントのない走者は塁に残る', () => {
    const t = applyPlateResult(bases({ second: 'r2' }), 'B', {
      batterEndBase: 1,
      runners: [],
    });
    expect(t.next).toEqual(bases({ first: 'B', second: 'r2' }));
  });

  it('outsRecorded を明示すると優先される（三重殺など）', () => {
    const t = applyPlateResult(bases({ first: 'r1', second: 'r2' }), 'B', {
      batterEndBase: 0,
      runners: [
        { playerId: 'r2', from: 2, to: 0 },
        { playerId: 'r1', from: 1, to: 0 },
      ],
      outsRecorded: 3,
    });
    expect(t.outsAdded).toBe(3);
  });
});

describe('suggestRbi', () => {
  it('生還走者数がそのまま候補', () => {
    const detail: AtBatDetail = {
      batterEndBase: 1,
      runners: [{ playerId: 'r3', from: 3, to: 4 }],
    };
    const t = applyPlateResult(bases({ third: 'r3' }), 'B', detail);
    expect(suggestRbi(detail, t)).toBe(1);
  });

  it('失策絡みの得点は打点候補から1減らす', () => {
    const detail: AtBatDetail = {
      batterEndBase: 1,
      fielding: { sequence: [6], error: { pos: 6, kind: 'throw' } },
      runners: [{ playerId: 'r3', from: 3, to: 4 }],
    };
    const t = applyPlateResult(bases({ third: 'r3' }), 'B', detail);
    expect(suggestRbi(detail, t)).toBe(0);
  });

  it('本塁打は打者生還ぶん加算・最大4', () => {
    const detail: AtBatDetail = {
      batterEndBase: 4,
      runners: [
        { playerId: 'r1', from: 1, to: 4 },
        { playerId: 'r2', from: 2, to: 4 },
        { playerId: 'r3', from: 3, to: 4 },
      ],
    };
    const t = applyPlateResult(
      bases({ first: 'r1', second: 'r2', third: 'r3' }),
      'B',
      detail,
    );
    expect(t.runsScored).toBe(4);
    expect(suggestRbi(detail, t)).toBe(4);
  });
});
