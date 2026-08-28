'use client';

// 画像ファイルを正方形に切り出し + 縮小して data URL 化する。
// ロゴは Firestore ドキュメントに直接埋めるため小さく保つ（§Firestore 1MB 制限）。

export interface DownscaleResult {
  dataUrl: string;
  bytes: number; // data URL の概算バイト数
}

const OUTPUT_SIZE = 256; // 出力の一辺(px)
const MAX_BYTES = 180_000; // これを超えたら品質を落として再エンコード

export async function fileToSquareDataUrl(file: File): Promise<DownscaleResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('画像ファイルを選択してください');
  }

  const bitmap = await loadBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const sx = (bitmap.width - side) / 2;
  const sy = (bitmap.height - side) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('画像の処理に失敗しました');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();

  // PNG（透過ロゴ対応）→ 大きすぎれば JPEG で品質を段階的に下げる
  let dataUrl = canvas.toDataURL('image/png');
  if (approxBytes(dataUrl) > MAX_BYTES) {
    for (const q of [0.85, 0.7, 0.55, 0.4]) {
      dataUrl = canvas.toDataURL('image/jpeg', q);
      if (approxBytes(dataUrl) <= MAX_BYTES) break;
    }
  }

  const bytes = approxBytes(dataUrl);
  if (bytes > MAX_BYTES) {
    throw new Error('画像を十分に小さくできませんでした。別の画像を選んでください');
  }
  return { dataUrl, bytes };
}

function approxBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.floor((b64.length * 3) / 4);
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file);
    } catch {
      // フォールバックへ
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}
