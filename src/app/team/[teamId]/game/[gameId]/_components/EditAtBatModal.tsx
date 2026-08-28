'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Field, Select } from '@/components/Field';
import { Modal } from '@/components/Modal';
import { updateAtBat } from '@/lib/db/atbats';
import { AT_BAT_RESULT_LABELS, AT_BAT_RESULT_ORDER } from '@/lib/types';
import type { AtBat, Player } from '@/lib/types';
import { RbiStepper } from './RbiStepper';

export function EditAtBatModal({
  teamId,
  gameId,
  atbat,
  players,
  onClose,
}: {
  teamId: string;
  gameId: string;
  atbat: AtBat;
  players: Player[];
  onClose: () => void;
}) {
  const [result, setResult] = useState(atbat.result);
  const [rbi, setRbi] = useState(atbat.rbi);
  const [inning, setInning] = useState(atbat.inning);
  const [playerId, setPlayerId] = useState(atbat.playerId);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    await updateAtBat(teamId, gameId, atbat.id, { result, rbi, inning, playerId });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="打席を編集"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={save} disabled={saving}>
            保存
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Field label="選手">
          <Select value={playerId} onChange={(e) => setPlayerId(e.target.value)}>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.number != null ? ` #${p.number}` : ''}
                {p.archived ? '（削除済）' : ''}
              </option>
            ))}
            {!players.some((p) => p.id === playerId) && (
              <option value={playerId}>（不明な選手）</option>
            )}
          </Select>
        </Field>

        <Field label="結果">
          <Select
            value={result}
            onChange={(e) => setResult(e.target.value as typeof result)}
          >
            {AT_BAT_RESULT_ORDER.map((r) => (
              <option key={r} value={r}>
                {AT_BAT_RESULT_LABELS[r]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="イニング">
          <Select value={inning} onChange={(e) => setInning(Number(e.target.value))}>
            {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}回
              </option>
            ))}
          </Select>
        </Field>

        <Field label="打点">
          <RbiStepper value={rbi} onChange={setRbi} />
        </Field>
      </div>
    </Modal>
  );
}
