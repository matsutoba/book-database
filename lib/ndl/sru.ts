import { XMLParser } from "fast-xml-parser";

// 国立国会図書館サーチ 外部提供インタフェース仕様書（第1.4版）3.SRU を参照
const SRU_ENDPOINT = "https://ndlsearch.ndl.go.jp/api/sru";
// 「検索負荷回避のための制約」により startRecord + maximumRecords は 501 を超えられない
const MAX_RECORD_POSITION = 500;

const outerParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
});

export type SruSearchResult = {
  numberOfRecords: number;
  nextRecordPosition: number;
  records: string[];
};

export function buildMonthlyNdcQuery(ndc: string, yearMonth: string): string {
  return `ndc="${ndc}" and from="${yearMonth}" and until="${yearMonth}"`;
}

export async function searchSru(
  query: string,
  startRecord: number,
  maximumRecords: number,
): Promise<SruSearchResult> {
  const url = new URL(SRU_ENDPOINT);
  url.searchParams.set("operation", "searchRetrieve");
  url.searchParams.set("version", "1.2");
  url.searchParams.set("recordSchema", "dcndl_v3");
  url.searchParams.set("recordPacking", "string");
  url.searchParams.set("query", query);
  url.searchParams.set("startRecord", String(startRecord));
  url.searchParams.set("maximumRecords", String(Math.min(maximumRecords, MAX_RECORD_POSITION)));

  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`NDL Search SRU request failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const parsed = outerParser.parse(xml);
  const body = parsed.searchRetrieveResponse;
  if (!body) {
    throw new Error("Unexpected SRU response: missing searchRetrieveResponse");
  }

  const rawRecords = body.records?.record;
  const recordList = rawRecords === undefined ? [] : Array.isArray(rawRecords) ? rawRecords : [rawRecords];

  return {
    numberOfRecords: Number(body.numberOfRecords ?? 0),
    nextRecordPosition: Number(body.nextRecordPosition ?? 0),
    records: recordList.map((record) => String(record.recordData)),
  };
}

export function isWithinRecordLimit(nextRecordPosition: number): boolean {
  return nextRecordPosition > 0 && nextRecordPosition <= MAX_RECORD_POSITION;
}
