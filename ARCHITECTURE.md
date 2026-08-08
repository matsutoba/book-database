# システム構成

## データベース

- MySQL 8 を Docker Compose (`docker-compose.yml`) で起動する。
- ホスト側ポートは **3307**（コンテナ内は 3306）。同一ホストの別プロジェクト（`ledger-db`）が 3306 を使用しているための回避。
- 起動: `docker compose up -d` / 停止: `docker compose down`
- 接続情報は `.env` の `DATABASE_URL` で管理する（`.env.example` に雛形あり）。

## ORM

- Prisma 7 を使用（`prisma/schema.prisma`）。
- Prisma 7 では接続文字列は `prisma.config.ts` 経由で読み込まれる（`schema.prisma` の `datasource` ブロックには直接書かない）。`prisma.config.ts` は `dotenv/config` を import して `.env` を読み込む。
- 生成された Prisma Client の出力先は `lib/generated/prisma`（gitignore 対象、コミットしない）。
- マイグレーションは `prisma/migrations` にコミットする。
