"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useInView } from "react-intersection-observer";
import type { BookRow } from "@/lib/books";

type BooksPage = {
  rows: BookRow[];
  hasMore: boolean;
};

type BooksApiResponse = {
  books: (Omit<BookRow, "publishedDate"> & { publishedDate: string | null })[];
  hasMore: boolean;
};

async function fetchBooksPage(skip: number): Promise<BooksPage> {
  const response = await fetch(`/api/books?skip=${skip}`);
  const data: BooksApiResponse = await response.json();

  return {
    rows: data.books.map((book) => ({
      ...book,
      publishedDate: book.publishedDate ? new Date(book.publishedDate) : null,
    })),
    hasMore: data.hasMore,
  };
}

export function useFetchBooks(initialBooks: BookRow[], initialHasMore: boolean) {
  const { ref: sentinelRef, inView } = useInView();
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage } = useInfiniteQuery({
    queryKey: ["books"],
    queryFn: ({ pageParam }) => fetchBooksPage(pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) =>
      lastPage.hasMore ? allPages.reduce((sum, page) => sum + page.rows.length, 0) : undefined,
    initialData: {
      pages: [{ rows: initialBooks, hasMore: initialHasMore }],
      pageParams: [0],
    },
  });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  return {
    books: data.pages.flatMap((page) => page.rows),
    hasNextPage,
    sentinelRef,
  };
}
