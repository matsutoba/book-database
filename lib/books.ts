import type { Prisma } from "@/lib/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const BOOKS_PAGE_SIZE = 20;

const bookInclude = {
  publisher: true,
  bookAuthors: { orderBy: { order: "asc" as const }, include: { author: true } },
} satisfies Prisma.BookInclude;

type BookWithRelations = Prisma.BookGetPayload<{ include: typeof bookInclude }>;

export type BookRow = {
  id: number;
  title: string;
  subtitle: string | null;
  authors: string[];
  publisherName: string | null;
  publishedDate: Date | null;
  coverImageUrl: string | null;
};

export type BookRowsPage = {
  rows: BookRow[];
  hasMore: boolean;
};

export async function fetchBookRows(skip: number, take: number): Promise<BookRowsPage> {
  const books = await prisma.book.findMany({
    orderBy: [{ publishedDate: "desc" }, { id: "desc" }],
    skip,
    take: take + 1,
    include: bookInclude,
  });

  const hasMore = books.length > take;

  return { rows: books.slice(0, take).map(mapBookToRow), hasMore };
}

function mapBookToRow(book: BookWithRelations): BookRow {
  return {
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.bookAuthors.map((bookAuthor) => bookAuthor.author.name),
    publisherName: book.publisher?.name ?? null,
    publishedDate: book.publishedDate,
    coverImageUrl: book.coverImageUrl,
  };
}
