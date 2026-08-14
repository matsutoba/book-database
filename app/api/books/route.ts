import { NextResponse, type NextRequest } from "next/server";
import { BOOKS_PAGE_SIZE, fetchBookRows } from "@/lib/books";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const skip = Math.max(0, Number(request.nextUrl.searchParams.get("skip")) || 0);

  const { rows, hasMore } = await fetchBookRows(skip, BOOKS_PAGE_SIZE);

  return NextResponse.json({ books: rows, hasMore });
}
