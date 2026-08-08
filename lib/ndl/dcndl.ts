import { XMLParser } from "fast-xml-parser";

// searchRetrieve の recordData（recordSchema=dcndl_v3）は DC-NDL（RDF）フォーマット仕様 ver.3系
// （https://ndlsearch.ndl.go.jp/renkei/dcndl/version3）に基づく RDF/XML
const REPEATED_TAGS = new Set([
  "dcterms:identifier",
  "dcterms:creator",
  "dcterms:subject",
  "dcterms:description",
  "dc:creator",
  "dcndl:Item",
]);

const rdfParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  isArray: (name) => REPEATED_TAGS.has(name),
  // 数値らしいテキスト（出版年月 "2026.8" や分類記号など）を誤って number 型に変換させない
  parseTagValue: false,
});

export type ParsedCreator = {
  name: string;
  role: string | null;
};

export type ParsedDcndlRecord = {
  ndlBibId: string;
  isbn13: string | null;
  title: string;
  subtitle: string | null;
  creators: ParsedCreator[];
  publisherName: string | null;
  publishedDate: Date | null;
  seriesName: string | null;
  volume: string | null;
  price: number | null;
  coverImageUrl: string | null;
};

export function parseDcndlRecord(rdfXml: string): ParsedDcndlRecord | null {
  const parsed = rdfParser.parse(rdfXml);
  const root = parsed["rdf:RDF"];
  const bibResource = root?.["dcndl:BibResource"];
  if (!bibResource) {
    return null;
  }

  const identifiers = toArray(bibResource["dcterms:identifier"]);
  const ndlBibId = findIdentifierText(identifiers, "NDLBibID");
  if (!ndlBibId) {
    return null;
  }

  const isbnRaw = findIdentifierText(identifiers, "ISBN");
  const fullTitle =
    extractText(bibResource["dc:title"]?.["rdf:Description"]?.["rdf:value"]) ??
    extractText(bibResource["dcterms:title"]) ??
    "";
  const [title, subtitle] = splitOnSeparator(fullTitle, " : ");
  const series = splitOnSeparator(
    extractText(bibResource["dcndl:seriesTitle"]?.["rdf:Description"]?.["rdf:value"]) ?? null,
    " ; ",
  );

  return {
    ndlBibId,
    isbn13: isbnRaw ? normalizeIsbn13(isbnRaw) : null,
    title: title || fullTitle,
    subtitle,
    creators: extractCreators(bibResource),
    publisherName: extractText(bibResource["dcterms:publisher"]?.["foaf:Agent"]?.["foaf:name"]) ?? null,
    publishedDate: parsePublishedDate(
      extractText(bibResource["dcterms:date"]) ?? extractText(bibResource["dcterms:issued"]),
    ),
    seriesName: series[0],
    volume: extractText(bibResource["dcndl:volume"]?.["rdf:Description"]?.["rdf:value"]) ?? series[1],
    price: parsePrice(extractText(bibResource["dcndl:price"])),
    coverImageUrl: extractCoverImageUrl(root["dcndl:Item"]),
  };
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

function extractText(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "object" && "#text" in (value as Record<string, unknown>)) {
    return String((value as Record<string, unknown>)["#text"]);
  }
  return undefined;
}

function findIdentifierText(identifiers: unknown[], datatypeSuffix: string): string | undefined {
  for (const identifier of identifiers) {
    if (typeof identifier !== "object" || identifier === null) {
      continue;
    }
    const record = identifier as Record<string, unknown>;
    const datatype = record["@_rdf:datatype"];
    if (typeof datatype === "string" && datatype.endsWith(`/${datatypeSuffix}`)) {
      return extractText(record);
    }
  }
  return undefined;
}

function normalizeIsbn13(raw: string): string | null {
  const digits = raw.replace(/[^0-9]/g, "");
  return digits.length === 13 ? digits : null;
}

function splitOnSeparator(value: string | null | undefined, separator: string): [string, string | null] {
  if (!value) {
    return ["", null];
  }
  const index = value.indexOf(separator);
  if (index === -1) {
    return [value, null];
  }
  return [value.slice(0, index), value.slice(index + separator.length)];
}

function extractCreators(bibResource: Record<string, unknown>): ParsedCreator[] {
  const structured = toArray(bibResource["dcterms:creator"]);
  if (structured.length > 0) {
    return structured
      .map((entry) => {
        const agent = (entry as Record<string, unknown>)["foaf:Agent"] as Record<string, unknown> | undefined;
        const name = extractText(agent?.["foaf:name"]);
        return name ? { name, role: extractText(agent?.["dcndl:role"]) ?? null } : null;
      })
      .filter((creator): creator is ParsedCreator => creator !== null);
  }

  return toArray(bibResource["dc:creator"])
    .map((entry) => extractText(entry))
    .filter((name): name is string => Boolean(name))
    .map((name) => ({ name, role: null }));
}

function parsePublishedDate(dateText: string | undefined): Date | null {
  if (!dateText) {
    return null;
  }
  const match = dateText.match(/^(\d{4})(?:[.\-](\d{1,2}))?(?:[.\-](\d{1,2}))?/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = match[2] ? Number(match[2]) : 1;
  const day = match[3] ? Number(match[3]) : 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function parsePrice(priceText: string | undefined): number | null {
  if (!priceText) {
    return null;
  }
  const halfWidth = priceText.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0));
  const digits = halfWidth.match(/\d+/);
  return digits ? Number(digits[0]) : null;
}

function extractCoverImageUrl(items: unknown): string | null {
  for (const item of toArray(items) as Record<string, unknown>[]) {
    const thumbnail = item["foaf:thumbnail"] as Record<string, unknown> | undefined;
    const url = thumbnail?.["@_rdf:resource"];
    if (typeof url === "string") {
      return url;
    }
  }
  return null;
}
