# コーディング規約

## 関数の書き方

用途に応じて `function` 宣言とアロー関数を使い分ける。

- ページ、レイアウト、React コンポーネント: `function`
- カスタムフック、ユーティリティ: `function` またはアロー関数のどちらかに統一（ファイル/モジュール単位で混在させない）
- `map`、`filter`、イベント処理のコールバック: アロー関数
- `this` が必要なメソッド: 通常の `function`

```tsx
// Good（コンポーネントは function）
export function Shell({ children }: ShellProps) {
  return <div>{children}</div>;
}

// Bad
export const Shell = ({ children }: ShellProps) => {
  return <div>{children}</div>;
};
```

```tsx
// Good（コールバックはアロー関数）
items.map((item) => item.id);
```

## スタイリング

- Tailwind のユーティリティクラスは極力使わず、CSS 側にスタイルを寄せる。
  - html/body の高さ指定や CSS 変数などの真にグローバルな基礎スタイルは `app/globals.css` に書く。
  - コンポーネント固有のスタイルは、コンポーネントに colocate した CSS Modules（例: `Shell.tsx` + `Shell.module.css`）に書く。
- `lib/cn.ts` はクラス名を結合するだけの依存なしユーティリティ。`clsx` や `tailwind-merge` は使わない。
