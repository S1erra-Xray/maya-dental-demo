// FSH list envelope. In web the same type lives in `@/api/catalog`: the import rewrites
// `@/api/paged` to it.
export type PagedResponse<T> = {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
};
