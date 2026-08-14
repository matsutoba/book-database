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
          <th className={styles.dateHeader}>発行日</th>
          <th className={styles.coverHeader} aria-hidden="true" />
          <th className={styles.titleHeader}>書籍タイトル / 著者</th>
          <th className={styles.publisherHeader}>出版社</th>
        </tr>
      </thead>
      <tbody>
        {books.map((book) => (
          <tr key={book.id} className={styles.row}>
            <td className={styles.date}>{formatPublishedDate(book.publishedDate)}</td>
            <td className={styles.cover}>
              {book.coverImageUrl && (
                <a
                  href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(book.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img className={styles.coverImage} src={`/api/books/${book.id}/cover`} alt="" />
                </a>
              )}
            </td>
            <td className={styles.titleCell}>
              <div className={styles.title}>
                {book.title}
                {book.subtitle ? ` ${book.subtitle}` : ""}
              </div>
              {book.authors.length > 0 && <div className={styles.authors}>{book.authors.join(" / ")}</div>}
            </td>
            <td className={styles.publisher}>{book.publisherName ?? "-"}</td>
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
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${date.getUTCFullYear()}/${month}/${day}`;
}
