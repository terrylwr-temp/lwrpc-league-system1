export function initialPdfViewerPage(value, numPages = 0) {
  const requestedPage = Number(value);
  const normalizedPage = Number.isInteger(requestedPage) && requestedPage >= 1 ? requestedPage : 1;
  const totalPages = Number(numPages);
  return Number.isInteger(totalPages) && totalPages >= 1 ? Math.min(normalizedPage, totalPages) : normalizedPage;
}
