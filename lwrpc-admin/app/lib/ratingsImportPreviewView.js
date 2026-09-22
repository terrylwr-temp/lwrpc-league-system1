export const RATINGS_PREVIEW_PAGE_SIZE = 50;

const REVIEW_ACTIONS = new Set(['REVIEW', 'INVALID']);

export function isReviewOrInvalidRatingRow(row) {
  return REVIEW_ACTIONS.has(String(row?.action || '').toUpperCase());
}

export function toggleRatingsPreviewReviewOnly(state) {
  return { ...state, reviewOnly: !state.reviewOnly, page: 0 };
}

export function ratingsImportPreviewView(rows, state, pageSize = RATINGS_PREVIEW_PAGE_SIZE) {
  const allRows = Array.isArray(rows) ? rows : [];
  const reviewOnly = Boolean(state?.reviewOnly);
  const visibleRows = reviewOnly ? allRows.filter(isReviewOrInvalidRatingRow) : allRows;
  const pages = Math.max(1, Math.ceil(visibleRows.length / pageSize));
  const requestedPage = Number.isInteger(state?.page) ? state.page : 0;
  const page = Math.min(Math.max(0, requestedPage), pages - 1);
  return {
    page,
    pages,
    pageRows: visibleRows.slice(page * pageSize, (page + 1) * pageSize),
    visibleCount: visibleRows.length,
    totalCount: allRows.length,
  };
}
