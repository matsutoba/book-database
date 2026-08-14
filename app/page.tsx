import { BookTable } from "@/components/books/BookTable";
import { BOOKS_PAGE_SIZE, fetchBookRows } from "@/lib/books";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { rows, hasMore } = await fetchBookRows(0, BOOKS_PAGE_SIZE);

  return (
    <main className={styles.main}>
      <BookTable initialBooks={rows} initialHasMore={hasMore} />
    </main>
  );
}
