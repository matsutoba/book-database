import { NextResponse } from "next/server";
import { BookSourceType, type Prisma } from "@/lib/generated/prisma/client";
import { parseDcndlRecord, type ParsedDcndlRecord } from "@/lib/ndl/dcndl";
import { prisma } from "@/lib/prisma";
import { buildMonthlyNdcQuery, isWithinRecordLimit, searchSru } from "@/lib/ndl/sru";

export const dynamic = "force-dynamic";

// NDC 007: 情報科学（IT関連書籍とみなす分類）
const IT_NDC = "007";
const PAGE_SIZE = 200;

export async function POST() {
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const query = buildMonthlyNdcQuery(IT_NDC, yearMonth);

  const summary = { fetched: 0, created: 0, updated: 0, skipped: 0 };
  let startRecord = 1;
  let numberOfRecords = 0;

  while (true) {
    const result = await searchSru(query, startRecord, PAGE_SIZE);
    numberOfRecords = result.numberOfRecords;
    summary.fetched += result.records.length;

    for (const rawXml of result.records) {
      const parsed = parseDcndlRecord(rawXml);
      if (!parsed) {
        summary.skipped += 1;
        continue;
      }
      const outcome = await upsertBook(parsed);
      summary[outcome] += 1;
    }

    if (!isWithinRecordLimit(result.nextRecordPosition)) {
      break;
    }
    startRecord = result.nextRecordPosition;
  }

  return NextResponse.json({ yearMonth, ndc: IT_NDC, numberOfRecords, ...summary });
}

async function upsertBook(parsed: ParsedDcndlRecord): Promise<"created" | "updated"> {
  const publisherId = parsed.publisherName ? await resolvePublisherId(parsed.publisherName) : null;

  const bookData = {
    isbn13: parsed.isbn13,
    title: parsed.title,
    subtitle: parsed.subtitle,
    publisherId,
    publishedDate: parsed.publishedDate,
    seriesName: parsed.seriesName,
    volume: parsed.volume,
    price: parsed.price,
    coverImageUrl: parsed.coverImageUrl,
  };

  const existingSource = await prisma.bookSource.findUnique({
    where: {
      sourceType_sourceId: { sourceType: BookSourceType.NDL_SEARCH_API, sourceId: parsed.ndlBibId },
    },
  });

  let bookId: number;
  let outcome: "created" | "updated";

  if (existingSource) {
    bookId = existingSource.bookId;
    await prisma.book.update({ where: { id: bookId }, data: bookData });
    await prisma.bookSource.update({
      where: { id: existingSource.id },
      data: { rawData: parsed as unknown as Prisma.InputJsonValue, fetchedAt: new Date() },
    });
    outcome = "updated";
  } else {
    const existingBook = parsed.isbn13 ? await prisma.book.findUnique({ where: { isbn13: parsed.isbn13 } }) : null;

    if (existingBook) {
      bookId = existingBook.id;
      await prisma.book.update({ where: { id: bookId }, data: bookData });
      outcome = "updated";
    } else {
      const created = await prisma.book.create({ data: bookData });
      bookId = created.id;
      outcome = "created";
    }

    await prisma.bookSource.create({
      data: {
        sourceType: BookSourceType.NDL_SEARCH_API,
        sourceId: parsed.ndlBibId,
        bookId,
        rawData: parsed as unknown as Prisma.InputJsonValue,
        fetchedAt: new Date(),
      },
    });
  }

  await prisma.bookAuthor.deleteMany({ where: { bookId } });
  const linkedAuthorIds = new Set<number>();
  let order = 0;
  for (const creator of parsed.creators) {
    const authorId = await resolveAuthorId(creator.name);
    if (linkedAuthorIds.has(authorId)) {
      continue;
    }
    linkedAuthorIds.add(authorId);
    await prisma.bookAuthor.create({ data: { bookId, authorId, role: creator.role, order } });
    order += 1;
  }

  return outcome;
}

async function resolvePublisherId(name: string): Promise<number> {
  const existing = await prisma.publisher.findUnique({ where: { name } });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.publisher.create({ data: { name } });
  return created.id;
}

async function resolveAuthorId(name: string): Promise<number> {
  const existing = await prisma.author.findFirst({ where: { name } });
  if (existing) {
    return existing.id;
  }
  const created = await prisma.author.create({ data: { name } });
  return created.id;
}
