// openBD（https://openbd.jp/）: ISBN指定で書誌情報・カバー画像を取得できる無料API。認証不要、書名検索は不可。
const OPENBD_ENDPOINT = "https://api.openbd.jp/v1/get";

type OpenBdRecord = {
  summary?: {
    isbn?: string;
    cover?: string;
  };
} | null;

// isbn13ごとのカバー画像URL（取得できたものだけ）を返す。空配列を渡した場合はリクエストしない。
export async function fetchOpenBdCovers(isbn13List: string[]): Promise<Map<string, string>> {
  const covers = new Map<string, string>();
  if (isbn13List.length === 0) {
    return covers;
  }

  const url = new URL(OPENBD_ENDPOINT);
  url.searchParams.set("isbn", isbn13List.join(","));

  const response = await fetch(url, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(`openBD request failed: ${response.status} ${response.statusText}`);
  }

  const records = (await response.json()) as OpenBdRecord[];
  for (const record of records) {
    const isbn = record?.summary?.isbn;
    const cover = record?.summary?.cover;
    if (isbn && cover) {
      covers.set(isbn, cover);
    }
  }

  return covers;
}
