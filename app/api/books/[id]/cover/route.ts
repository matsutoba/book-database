import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// 一覧表示で多数の<img>が同時にこのルートを叩いても、NDLサムネイルサーバーへの
// 実際のリクエストはこの間隔以上空けて直列に送る（バースト起因の502を避けるため）。
const MIN_FETCH_INTERVAL_MS = 500;
let lastFetchStartedAt = 0;
let fetchQueue: Promise<void> = Promise.resolve();

async function throttledFetch(url: URL, init: RequestInit): Promise<Response> {
  const previous = fetchQueue;
  let releaseQueue: () => void;
  fetchQueue = new Promise<void>((resolve) => {
    releaseQueue = resolve;
  });

  try {
    await previous;
    const wait = MIN_FETCH_INTERVAL_MS - (Date.now() - lastFetchStartedAt);
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastFetchStartedAt = Date.now();
    return await fetch(url, init);
  } finally {
    // 自分の成否に関わらず、次のリクエストにキューを進める
    releaseQueue!();
  }
}

// NDLのサムネイルサーバーは Referer が自ドメイン以外だと403を返すため、
// ブラウザから直接 <img src> で読み込ませず、このルート経由でサーバー側から取得して中継する。
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const bookId = Number(id);
  if (!Number.isInteger(bookId)) {
    return new NextResponse(null, { status: 400 });
  }

  const book = await prisma.book.findUnique({ where: { id: bookId }, select: { coverImageUrl: true } });
  if (!book?.coverImageUrl) {
    return new NextResponse(null, { status: 404 });
  }

  const sourceUrl = new URL(book.coverImageUrl);
  const response = await throttledFetch(sourceUrl, {
    headers: { Referer: `${sourceUrl.origin}/` },
    cache: "no-store",
  });
  if (!response.ok || !response.body) {
    return new NextResponse(null, { status: 502 });
  }

  return new NextResponse(response.body, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
