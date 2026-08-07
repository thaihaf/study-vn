import { Prisma, type PrismaClient } from '@prisma/client';

export type RetrievedChunk = {
  id: string;
  sourceId: string;
  text: string;
  position: number;
  pageNumber: number | null;
  section: string | null;
  rank: number;
};

export interface SourceRetriever {
  search(input: {
    query: string;
    sourceIds?: string[];
    limit?: number;
  }): Promise<RetrievedChunk[]>;
}

export class PostgresSourceRetriever implements SourceRetriever {
  constructor(private readonly db: PrismaClient) {}

  async search({
    query,
    sourceIds = [],
    limit = 20,
  }: {
    query: string;
    sourceIds?: string[];
    limit?: number;
  }) {
    const boundedLimit = Math.min(100, Math.max(1, limit));
    const sourceFilter = sourceIds.length
      ? Prisma.sql`AND sc."sourceId" IN (${Prisma.join(sourceIds)})`
      : Prisma.empty;
    const textQuery = query.trim();

    if (!textQuery) {
      return this.db.$queryRaw<RetrievedChunk[]>(Prisma.sql`
        SELECT sc.id,
               sc."sourceId",
               sc.text,
               sc.position,
               sc."pageNumber",
               sc.section,
               0::float8 AS rank
        FROM "SourceChunk" sc
        JOIN "Source" s ON s.id = sc."sourceId"
        WHERE s."processingStatus" = 'READY'
          AND s."archivedAt" IS NULL
          ${sourceFilter}
        ORDER BY sc."sourceId", sc.position
        LIMIT ${boundedLimit}
      `);
    }

    return this.db.$queryRaw<RetrievedChunk[]>(Prisma.sql`
      SELECT sc.id,
             sc."sourceId",
             sc.text,
             sc.position,
             sc."pageNumber",
             sc.section,
             ts_rank_cd(
               to_tsvector('simple', coalesce(sc.text, '')),
               plainto_tsquery('simple', ${textQuery})
             )::float8 AS rank
      FROM "SourceChunk" sc
      JOIN "Source" s ON s.id = sc."sourceId"
      WHERE s."processingStatus" = 'READY'
        AND s."archivedAt" IS NULL
        ${sourceFilter}
        AND to_tsvector('simple', coalesce(sc.text, ''))
            @@ plainto_tsquery('simple', ${textQuery})
      ORDER BY rank DESC, sc.position ASC
      LIMIT ${boundedLimit}
    `);
  }
}

export async function retrieveSourceChunks(
  db: PrismaClient,
  query: string,
  sourceIds: string[] = [],
  limit = 20,
) {
  const retriever: SourceRetriever = new PostgresSourceRetriever(db);
  const ranked = await retriever.search({ query, sourceIds, limit });
  if (ranked.length || !query.trim()) return ranked;
  return retriever.search({ query: '', sourceIds, limit });
}
