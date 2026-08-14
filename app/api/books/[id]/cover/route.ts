import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
  const response = await fetch(sourceUrl, {
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
