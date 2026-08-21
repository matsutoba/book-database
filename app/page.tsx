import { BookTable } from "@/components/books/BookTable";
import { Heading } from "@/components/ui/Heading";
import { BOOKS_PAGE_SIZE, fetchBookRows } from "@/lib/books";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { rows, hasMore } = await fetchBookRows(0, BOOKS_PAGE_SIZE);

  return (
    <main className={styles.main}>
      <Heading>IT関連書籍リスト</Heading>
      <BookTable initialBooks={rows} initialHasMore={hasMore} />
    </main>
  );
}
