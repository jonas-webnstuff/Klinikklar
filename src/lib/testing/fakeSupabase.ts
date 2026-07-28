import type { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type FakeRow = Record<string, unknown>;
export type FakeTables = Record<string, FakeRow[]>;

type QueryResult = { data: FakeRow[]; error: Error | null };

interface FakeQueryBuilder extends PromiseLike<QueryResult> {
  select: (columns: string) => FakeQueryBuilder;
  eq: (column: string, value: unknown) => FakeQueryBuilder;
  in: (column: string, values: unknown[]) => FakeQueryBuilder;
  order: (column: string, options?: unknown) => FakeQueryBuilder;
  limit: (count: number) => FakeQueryBuilder;
  maybeSingle: () => Promise<{ data: FakeRow | null; error: Error | null }>;
  single: () => Promise<{ data: FakeRow | null; error: Error | null }>;
}

/**
 * Minimal in-memory stand-in for the Supabase query builder, covering only the
 * chain shapes actually used by computeReadinessChecklist: .select().eq()...,
 * .in(), .maybeSingle(), and awaiting the builder directly for list queries.
 * Not a general-purpose Supabase mock.
 */
export function createFakeSupabase(tables: FakeTables, options?: { errorOnTable?: string }) {
  function buildQuery(table: string): FakeQueryBuilder {
    if (options?.errorOnTable === table) {
      const error = new Error(`fake supabase error for table "${table}"`);
      const erroring: FakeQueryBuilder = {
        select: () => erroring,
        eq: () => erroring,
        in: () => erroring,
        order: () => erroring,
        limit: () => erroring,
        maybeSingle: async () => ({ data: null, error }),
        single: async () => ({ data: null, error }),
        then: (onFulfilled) => Promise.resolve({ data: [], error }).then(onFulfilled),
      };
      return erroring;
    }

    let rows = [...(tables[table] || [])];

    const builder: FakeQueryBuilder = {
      select: () => builder,
      eq: (column, value) => {
        rows = rows.filter((row) => row[column] === value);
        return builder;
      },
      in: (column, values) => {
        const set = new Set(values);
        rows = rows.filter((row) => set.has(row[column]));
        return builder;
      },
      order: () => builder,
      limit: (count) => {
        rows = rows.slice(0, count);
        return builder;
      },
      maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
      single: async () => ({ data: rows[0] ?? null, error: null }),
      then: (onFulfilled) => Promise.resolve({ data: rows, error: null }).then(onFulfilled),
    };

    return builder;
  }

  return {
    from: (table: string) => buildQuery(table),
  } as unknown as ReturnType<typeof createSupabaseAdminClient>;
}
