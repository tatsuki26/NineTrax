'use client';

import { useRef } from 'react';
import { useRouter } from 'next/navigation';

// フッターのワードマークを「知っている人だけが押せる」管理画面への入口にする。
// 見た目は通常のテキストのまま。ダブルクリック（PC）／長押し（スマホ）で
// /admin/login へ遷移する。
export function SecretAdminLink() {
  const router = useRouter();
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function go() {
    router.push('/admin/login');
  }

  function startPress() {
    pressTimer.current = setTimeout(go, 650);
  }
  function cancelPress() {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  }

  return (
    <span
      onDoubleClick={go}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
      className="cursor-default select-none text-sm font-semibold tracking-tight text-white/70"
    >
      NineTrax
    </span>
  );
}
