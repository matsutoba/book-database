"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import type { BookRow } from "@/lib/books";
import styles from "./BookTable.module.css";

type BookTableProps = {
  initialBooks: BookRow[];
  initialHasMore: boolean;
};

type BooksResponse = {
  books: (Omit<BookRow, "publishedDate"> & { publishedDate: string | null })[];
  hasMore: boolean;
};

export function BookTable({ initialBooks, initialHasMore }: BookTableProps) {
  const [books, setBooks] = useState(initialBooks);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const isLoadingRef = useRef(false);
  const { ref, inView } = useInView();

  useEffect(() => {
    if (!inView || !hasMore || isLoadingRef.current) {
      return;
    }

    let cancelled = false;
    isLoadingRef.current = true;

    fetch(`/api/books?skip=${books.length}`)
      .then((response) => response.json() as Promise<BooksResponse>)
      .then((data) => {
        if (cancelled) {
          return;
        }
        const nextBooks = data.books.map((book) => ({
          ...book,
          publishedDate: book.publishedDate ? new Date(book.publishedDate) : null,
        }));
        setBooks((prev) => [...prev, ...nextBooks]);
        setHasMore(data.hasMore);
      })
      .finally(() => {
        isLoadingRef.current = false;
      });

    return () => {
      cancelled = true;
    };
  }, [inView, hasMore, books.length]);

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
        {hasMore && (
          <tr ref={ref}>
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
