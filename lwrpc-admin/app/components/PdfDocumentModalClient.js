"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { initialPdfViewerPage } from "../lib/pdfViewerPage";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function highlightedText(value, itemIndex, pageNumber, matches, activeMatchIndex) {
  const segments = matches
    .flatMap((match, matchIndex) =>
      match.pageNumber === pageNumber
        ? match.segments
            .filter((segment) => segment.itemIndex === itemIndex)
            .map((segment) => ({ ...segment, active: matchIndex === activeMatchIndex }))
        : []
    )
    .sort((a, b) => a.start - b.start);

  if (segments.length === 0) return escapeHtml(value);

  let cursor = 0;
  let output = "";

  segments.forEach((segment) => {
    if (segment.end <= cursor) return;
    const start = Math.max(segment.start, cursor);
    const style = segment.active
      ? "background:rgba(251,146,60,0.58);color:transparent;-webkit-text-fill-color:transparent;text-shadow:none;outline:2px solid #c2410c;outline-offset:1px;"
      : "background:rgba(253,224,71,0.55);color:transparent;-webkit-text-fill-color:transparent;text-shadow:none;";
    const activeAttribute = segment.active ? ' data-active-search-match="true"' : "";

    output += escapeHtml(value.slice(cursor, start));
    output += `<mark${activeAttribute} style="${style}">${escapeHtml(value.slice(start, segment.end))}</mark>`;
    cursor = segment.end;
  });

  return output + escapeHtml(value.slice(cursor));
}

function textMatches(pageSearchData, searchTerm) {
  const normalizedTerm = searchTerm.trim().toLocaleLowerCase();
  if (!normalizedTerm) return [];

  return pageSearchData.flatMap((pageData, pageIndex) => {
    const normalizedText = pageData.text.toLocaleLowerCase();
    const matches = [];
    let startIndex = 0;

    while (startIndex < normalizedText.length) {
      const matchIndex = normalizedText.indexOf(normalizedTerm, startIndex);
      if (matchIndex === -1) break;
      const matchEnd = matchIndex + normalizedTerm.length;
      const segments = pageData.itemRanges
        .filter((range) => range.end > matchIndex && range.start < matchEnd)
        .map((range) => ({
          itemIndex: range.itemIndex,
          start: Math.max(0, matchIndex - range.start),
          end: Math.min(range.end, matchEnd) - range.start,
        }))
        .filter((segment) => segment.end > segment.start);

      matches.push({ pageNumber: pageIndex + 1, matchIndex, segments });
      startIndex = matchIndex + Math.max(normalizedTerm.length, 1);
    }

    return matches;
  });
}

export default function PdfDocumentModalClient({
  document,
  onClose,
  eyebrow = "",
  initialPageNumber = 1,
  pageMode = false,
}) {
  const viewerRef = useRef(null);
  const searchInputRef = useRef(null);
  const pageScrollPositionRef = useRef("top");
  const wheelNavigationLockedRef = useRef(false);
  const wheelNavigationTimerRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(initialPdfViewerPage(initialPageNumber));
  const [pageWidth, setPageWidth] = useState(900);
  const [pageSearchData, setPageSearchData] = useState([]);
  const [indexing, setIndexing] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState([]);
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);

  const headingEyebrow = eyebrow ||
    [document.leagueName, document.teamName].filter(Boolean).join(" / ") ||
    "Document Preview";

  useEffect(() => {
    pageScrollPositionRef.current = "top";
    setPageNumber(initialPdfViewerPage(initialPageNumber));
  }, [initialPageNumber]);

  const customTextRenderer = useCallback(
    ({ str, itemIndex }) =>
      highlightedText(str, itemIndex, pageNumber, matches, activeMatchIndex),
    [activeMatchIndex, matches, pageNumber]
  );

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    function updatePageWidth() {
      setPageWidth(Math.max(280, Math.min(1000, viewer.clientWidth - 32)));
    }

    updatePageWidth();
    const observer = new ResizeObserver(updatePageWidth);
    observer.observe(viewer);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return undefined;

    const frame = window.requestAnimationFrame(() => {
      viewer.scrollTop = pageScrollPositionRef.current === "bottom" ? viewer.scrollHeight : 0;
      pageScrollPositionRef.current = "top";
    });

    return () => window.cancelAnimationFrame(frame);
  }, [pageNumber]);

  useEffect(() => () => {
    if (wheelNavigationTimerRef.current) {
      window.clearTimeout(wheelNavigationTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    if (activeMatchIndex < 0) return undefined;

    const timer = window.setTimeout(() => {
      viewerRef.current
        ?.querySelector('mark[data-active-search-match="true"]')
        ?.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    }, 200);

    return () => window.clearTimeout(timer);
  }, [activeMatchIndex, pageNumber, searchTerm]);

  async function loadDocument(pdf) {
    setNumPages(pdf.numPages);
    pageScrollPositionRef.current = "top";
    setPageNumber(initialPdfViewerPage(initialPageNumber, pdf.numPages));
    setPageSearchData([]);
    setIndexing(true);
    setLoadError("");

    try {
      const searchData = await Promise.all(
        Array.from({ length: pdf.numPages }, async (_, index) => {
          const page = await pdf.getPage(index + 1);
          const content = await page.getTextContent();
          const itemRanges = [];
          let text = "";

          content.items.forEach((item, itemIndex) => {
            if (itemIndex > 0) text += " ";
            const value = item.str || "";
            const start = text.length;
            text += value;
            itemRanges.push({ itemIndex, start, end: text.length });
          });

          return { text, itemRanges };
        })
      );
      setPageSearchData(searchData);
    } catch {
      setLoadError("The document opened, but its text could not be indexed for searching.");
    } finally {
      setIndexing(false);
    }
  }

  function runSearch(event) {
    event?.preventDefault();
    const nextSearchTerm = query.trim();
    const nextMatches = textMatches(pageSearchData, nextSearchTerm);

    setSearchTerm(nextSearchTerm);
    setMatches(nextMatches);
    setActiveMatchIndex(nextMatches.length > 0 ? 0 : -1);
    if (nextMatches.length > 0) {
      pageScrollPositionRef.current = "top";
      setPageNumber(nextMatches[0].pageNumber);
    }
  }

  function moveToMatch(direction) {
    if (matches.length === 0) return;
    const nextIndex = (activeMatchIndex + direction + matches.length) % matches.length;
    setActiveMatchIndex(nextIndex);
    pageScrollPositionRef.current = "top";
    setPageNumber(matches[nextIndex].pageNumber);
  }

  function changePage(nextPage, scrollPosition = "top") {
    pageScrollPositionRef.current = scrollPosition;
    setPageNumber(Math.max(1, Math.min(numPages, nextPage)));
  }

  function handleViewerWheel(event) {
    const viewer = viewerRef.current;
    if (!viewer || !numPages || event.deltaY === 0) return;

    const movingForward = event.deltaY > 0;
    const isAtBoundary = movingForward
      ? viewer.scrollTop + viewer.clientHeight >= viewer.scrollHeight - 2
      : viewer.scrollTop <= 2;

    if (!isAtBoundary) return;

    event.preventDefault();
    if (wheelNavigationLockedRef.current) return;

    const nextPage = movingForward ? pageNumber + 1 : pageNumber - 1;
    if (nextPage < 1 || nextPage > numPages) return;

    wheelNavigationLockedRef.current = true;
    changePage(nextPage, movingForward ? "top" : "bottom");
    wheelNavigationTimerRef.current = window.setTimeout(() => {
      wheelNavigationLockedRef.current = false;
    }, 250);
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setSearchTerm("");
    setMatches([]);
    setActiveMatchIndex(-1);
  }

  function printDocument() {
    const printWindow = window.open(document.url, "_blank", "width=1000,height=800");
    if (!printWindow) {
      window.alert("Unable to open the PDF for printing. Please allow popups for this site.");
      return;
    }
    printWindow.focus();
  }

  const searchSummary = useMemo(() => {
    if (indexing) return "Preparing document search...";
    if (!searchTerm) return "Enter a word or phrase, then select Find.";
    if (matches.length === 0) return `No matches found for "${searchTerm}".`;
    return `${activeMatchIndex + 1} of ${matches.length} - Page ${matches[activeMatchIndex]?.pageNumber || pageNumber} - Active match is orange`;
  }, [activeMatchIndex, indexing, matches, pageNumber, searchTerm]);

  return (
    <div
      className={pageMode ? "min-h-screen bg-slate-100 p-2 md:p-6" : "fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-2 md:p-4"}
      {...(pageMode ? {} : { role: "dialog", "aria-modal": true })}
      aria-labelledby="pdf-document-title"
    >
      <section className={`flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ${pageMode ? "mx-auto min-h-[calc(100vh-1rem)] md:min-h-[calc(100vh-3rem)]" : "max-h-[96vh] md:max-h-[92vh]"}`}>
        <header className="flex flex-col gap-3 border-b border-slate-200 bg-slate-950 px-4 py-3 text-white md:flex-row md:items-center md:justify-between md:px-5 md:py-4">
          <div className="min-w-0">
            <span className="text-xs font-black uppercase tracking-wide text-emerald-200">
              {headingEyebrow}
            </span>
            <h2 id="pdf-document-title" className="mt-1 truncate text-xl font-black md:text-2xl">
              {document.title}
            </h2>
            {document.citation && <p className="mt-1 text-sm font-bold text-slate-200">{document.citation}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}
              className="rounded-xl bg-amber-300 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-200"
            >
              {searchOpen ? "Hide Find" : "Find"}
            </button>
            {!pageMode && <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              download
              className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-slate-950 hover:bg-slate-100"
            >
              Download
            </a>}
            {!pageMode && <button type="button" onClick={printDocument} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
              Print
            </button>}
            {!pageMode && <button type="button" onClick={onClose} className="rounded-xl bg-white/10 px-4 py-2 text-sm font-bold text-white hover:bg-white/20">
              Close
            </button>}
          </div>
        </header>

        {searchOpen && (
          <form onSubmit={runSearch} className="border-b border-blue-200 bg-blue-50 px-4 py-3 md:px-5">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="min-w-0 flex-1">
                <span className="sr-only">Find text in this document</span>
                <input
                  ref={searchInputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Find a word or phrase..."
                  className="w-full rounded-xl border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </label>
              <button type="submit" disabled={indexing || !query.trim()} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
                Find
              </button>
              <div className="flex gap-2">
                <button type="button" onClick={() => moveToMatch(-1)} disabled={matches.length === 0} className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-black text-blue-950 disabled:opacity-40">
                  Previous
                </button>
                <button type="button" onClick={() => moveToMatch(1)} disabled={matches.length === 0} className="rounded-xl border border-blue-300 bg-white px-3 py-2 text-sm font-black text-blue-950 disabled:opacity-40">
                  Next
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs font-bold text-blue-950" aria-live="polite">{searchSummary}</p>
          </form>
        )}

        <div className="flex items-center justify-center gap-3 border-b border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700">
          <button type="button" onClick={() => changePage(pageNumber - 1)} disabled={pageNumber <= 1} className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40">
            Previous Page
          </button>
          <span>Page {pageNumber} of {numPages || "-"}</span>
          <button type="button" onClick={() => changePage(pageNumber + 1)} disabled={!numPages || pageNumber >= numPages} className="rounded-lg border border-slate-300 px-3 py-1 disabled:opacity-40">
            Next Page
          </button>
        </div>

        <div ref={viewerRef} onWheel={handleViewerWheel} className="h-[72vh] overflow-auto bg-slate-200 p-4">
          <Document
            file={document.file || document.url}
            onLoadSuccess={loadDocument}
            onLoadError={() => setLoadError("Unable to load this PDF in the document viewer.")}
            loading={<div className="flex min-h-80 items-center justify-center font-bold text-slate-600">Loading PDF...</div>}
            error={<div className="flex min-h-80 items-center justify-center font-bold text-red-700">Unable to load PDF.</div>}
          >
            {numPages > 0 && (
              <Page
                key={`${pageNumber}:${searchTerm}:${activeMatchIndex}`}
                pageNumber={pageNumber}
                width={pageWidth}
                customTextRenderer={customTextRenderer}
                className="mx-auto shadow-xl"
              />
            )}
          </Document>
          {loadError && (
            <div className="mx-auto mt-3 max-w-3xl rounded-xl bg-amber-100 px-4 py-3 text-center text-sm font-bold text-amber-950">
              {loadError} {pageMode ? "You can still navigate the document page by page." : "You can still download or print the document."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
