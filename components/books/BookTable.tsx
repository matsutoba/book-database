"use client";

import type { BookRow } from "@/lib/books";
import styles from "./BookTable.module.css";
import { useFetchBooks } from "./useFetchBooks";

type BookTableProps = {
  initialBooks: BookRow[];
  initialHasMore: boolean;
};

export function BookTable({ initialBooks, initialHasMore }: BookTableProps) {
  const { books, hasNextPage, sentinelRef } = useFetchBooks(initialBooks, initialHasMore);

  if (books.length === 0) {
    return <p className={styles.empty}>書籍がありません</p>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={styles.indexHeader} aria-hidden="true" />
          <th className={styles.titleHeader}>書籍タイトル / 著者</th>
          <th className={styles.publisherHeader}>出版社</th>
          <th className={styles.dateHeader}>発行日</th>
        </tr>
      </thead>
      <tbody>
        {books.map((book, index) => (
          <tr key={book.id} className={styles.row}>
            <td className={styles.index}>{String(index + 1).padStart(2, "0")}</td>
            <td className={styles.titleCell}>
              <div className={styles.title}>
                {book.title}
                {book.subtitle ? ` ${book.subtitle}` : ""}
              </div>
              {book.authors.length > 0 && <div className={styles.authors}>{book.authors.join(" / ")}</div>}
            </td>
            <td className={styles.publisher}>{book.publisherName ?? "-"}</td>
            <td className={styles.date}>{formatPublishedDate(book.publishedDate)}</td>
          </tr>
        ))}
        {hasNextPage && (
          <tr ref={sentinelRef}>
            <td className={styles.loading} colSpan={4}>
              読み込み中...
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function formatPublishedDate(date: Date | null): string {
  if (!date) {
    return "-";
  }
  return `${date.getUTCFullYear()}年${date.getUTCMonth() + 1}月${date.getUTCDate()}日`;
}
