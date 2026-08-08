import { BookTable } from "@/components/books/BookTable";
import { prisma } from "@/lib/prisma";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const books = await prisma.book.findMany({
    orderBy: { publishedDate: "desc" },
    include: {
      publisher: true,
      bookAuthors: { orderBy: { order: "asc" }, include: { author: true } },
    },
  });

  const rows = books.map((book) => ({
    id: book.id,
    title: book.title,
    subtitle: book.subtitle,
    authors: book.bookAuthors.map((bookAuthor) => bookAuthor.author.name),
    publisherName: book.publisher?.name ?? null,
    publishedDate: book.publishedDate,
  }));

  return (
    <main className={styles.main}>
      <BookTable books={rows} />
    </main>
  );
}
