// チームID生成。§11.1: 12文字の暗号学的乱数、base32(英小文字 a-z + 数字 2-7)。
// 紛らわしい文字（0,1,8,9,o,i,l など）を除外した Crockford 風のアルファベット。

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // 31文字（l, o, 0, 1 を除外）
const TEAM_ID_LENGTH = 12;

function getRandomBytes(len: number): Uint8Array {
  const bytes = new Uint8Array(len);
  // ブラウザ / Node 18+ 双方で利用可能な Web Crypto
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateTeamId(length = TEAM_ID_LENGTH): string {
  const bytes = getRandomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

// URL パラメータとして妥当なチームID形式かの簡易チェック
export function isValidTeamId(value: string): boolean {
  if (value.length < 8 || value.length > 24) return false;
  for (const ch of value) {
    if (!ALPHABET.includes(ch)) return false;
  }
  return true;
}
