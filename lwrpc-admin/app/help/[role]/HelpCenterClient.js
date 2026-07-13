"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

export default function HelpCenterClient({ guide }) {
  const documents = useMemo(() => guide.documents || [], [guide.documents]);
  const navigation = useMemo(() => guide.navigation || [], [guide.navigation]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(documents[0]?.id || "");
  const [showGoToTop, setShowGoToTop] = useState(false);
  const selectedDocument = documents.find((document) => document.id === selectedId) || documents[0] || null;
  const normalizedQuery = query.trim().toLowerCase();
  const filteredNavigation = useMemo(() => {
    if (!normalizedQuery) return navigation;

    const matchingIds = new Set(
      documents
        .filter((document) => document.searchText.toLowerCase().includes(normalizedQuery))
        .map((document) => document.id)
    );

    return navigation
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => matchingIds.has(item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [documents, navigation, normalizedQuery]);

  useEffect(() => {
    function updateGoToTopVisibility() {
      setShowGoToTop(window.scrollY > 360);
    }

    updateGoToTopVisibility();
    window.addEventListener("scroll", updateGoToTopVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateGoToTopVisibility);
  }, []);

  function selectDocument(documentId) {
    setSelectedId(documentId);
    window.requestAnimationFrame(() => {
      document.getElementById("help-article-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function goToTop() {
    document.getElementById("help-article-top")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function printGuide() {
    window.print();
  }

  if (!documents.length) {
    return (
      <main className="help-center-main min-h-screen bg-slate-100 p-4 text-slate-950 md:p-6">
        <div className="mx-auto max-w-5xl rounded-lg bg-white p-6 shadow">
          <div className="text-xs font-black uppercase tracking-wide text-blue-700">Help Center</div>
          <h1 className="mt-2 text-3xl font-black">{guide.title}</h1>
          <p className="mt-2 text-sm font-semibold text-slate-600">
            No help articles are available yet. Add markdown files under content/help/{guide.role}.
          </p>
          <Link href="/captain-dashboard" className="mt-5 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800">
            Back to Dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="help-center-main min-h-screen bg-slate-100 text-slate-950">
      <style>{`
        @media print {
          body {
            background: white !important;
          }

          .system-footer,
          .system-footer-spacer,
          .help-no-print {
            display: none !important;
          }

          .help-center-main {
            padding: 0 !important;
            background: white !important;
          }

          .help-print-shell {
            display: block !important;
            max-width: none !important;
            padding: 0 !important;
          }

          .help-article {
            box-shadow: none !important;
            border: 0 !important;
            border-radius: 0 !important;
          }

          .help-markdown img {
            max-height: 7in;
            page-break-inside: avoid;
          }

          .help-markdown h1,
          .help-markdown h2,
          .help-markdown h3 {
            page-break-after: avoid;
          }
        }
      `}</style>

      <div className="help-no-print border-b border-slate-200 bg-white px-4 py-4 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-blue-700">LWR PC League Management System</div>
            <h1 className="text-2xl font-black text-slate-950 md:text-3xl">{guide.title}</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">{guide.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={printGuide}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Print
            </button>
            <button
              type="button"
              onClick={printGuide}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white shadow-sm hover:bg-emerald-800"
            >
              Export PDF
            </button>
            <Link href="/captain-dashboard" className="col-span-2 rounded-lg bg-blue-700 px-4 py-2 text-center text-sm font-black text-white shadow-sm hover:bg-blue-800 sm:col-span-1">
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="help-print-shell mx-auto grid max-w-7xl grid-cols-1 gap-4 p-4 md:grid-cols-[19rem_minmax(0,1fr)] md:p-6">
        <aside className="help-no-print space-y-3 md:sticky md:top-4 md:self-start">
          <div className="rounded-lg bg-white p-3 shadow">
            <label className="text-xs font-black uppercase tracking-wide text-slate-500" htmlFor="help-search">
              Search
            </label>
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${String(guide.label || "user").toLowerCase()} help`}
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>

          <nav className="max-h-[70vh] overflow-y-auto rounded-lg bg-white p-2 shadow" aria-label="Help articles">
            {filteredNavigation.map((group) => (
              <div key={group.category} className="mb-2 last:mb-0">
                <div className="px-2 py-2 text-xs font-black uppercase tracking-wide text-slate-500">
                  {group.category}
                </div>
                <div className="space-y-1">
                  {group.items.map((item) => (
                    <div key={item.id}>
                      <button
                        type="button"
                        onClick={() => selectDocument(item.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left text-sm font-bold ${
                          selectedDocument?.id === item.id
                            ? "bg-blue-700 text-white"
                            : "text-slate-800 hover:bg-blue-50 hover:text-blue-900"
                        }`}
                      >
                        {item.title}
                      </button>
                      {selectedDocument?.id === item.id && item.headings?.length > 0 && (
                        <div className="ml-3 mt-1 space-y-1 border-l border-slate-200 pl-3">
                          {item.headings.map((heading) => (
                            <a
                              key={`${item.id}:${heading.id}`}
                              href={`#${heading.id}`}
                              className="block rounded px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            >
                              {heading.title}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {filteredNavigation.length === 0 && (
              <div className="p-4 text-sm font-semibold text-slate-500">
                No help articles match that search.
              </div>
            )}
          </nav>
        </aside>

        <article id="help-article-top" className="help-article rounded-lg border border-slate-200 bg-white p-4 shadow sm:p-6 lg:p-8">
          <div className="mb-5 border-b border-slate-200 pb-4">
            <div className="text-xs font-black uppercase tracking-wide text-blue-700">{selectedDocument?.category}</div>
            <h2 className="mt-1 text-3xl font-black text-slate-950">{selectedDocument?.title}</h2>
            {selectedDocument?.description && (
              <p className="mt-2 max-w-3xl text-sm font-semibold text-slate-600">{selectedDocument.description}</p>
            )}
          </div>
          <MarkdownRenderer markdown={selectedDocument?.body || ""} />
        </article>
      </div>

      {guide.role === "captain" && showGoToTop && (
        <button
          type="button"
          onClick={goToTop}
          className="help-no-print fixed bottom-6 right-4 z-30 rounded-lg bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-lg shadow-slate-900/20 hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:ring-offset-2 md:right-6"
        >
          Go to Top
        </button>
      )}
    </main>
  );
}

function MarkdownRenderer({ markdown }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <div className="help-markdown space-y-4 text-slate-800">
      {blocks.map((block, index) => renderBlock(block, index))}
    </div>
  );
}

function renderBlock(block, index) {
  if (block.type === "heading") {
    const Tag = `h${Math.min(block.depth, 3)}`;
    const className = block.depth === 1
      ? "pt-2 text-3xl font-black text-slate-950"
      : block.depth === 2
        ? "pt-4 text-2xl font-black text-slate-950"
        : "pt-3 text-xl font-black text-slate-900";

    return (
      <Tag id={slugify(block.text)} key={index} className={className}>
        {renderInline(block.text)}
      </Tag>
    );
  }

  if (block.type === "paragraph") {
    return <p key={index} className="text-base leading-7">{renderInline(block.text)}</p>;
  }

  if (block.type === "list") {
    const Tag = block.ordered ? "ol" : "ul";
    return (
      <Tag key={index} className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-2 pl-6 text-base leading-7`}>
        {block.items.map((item, itemIndex) => (
          <li key={itemIndex}>{renderInline(item)}</li>
        ))}
      </Tag>
    );
  }

  if (block.type === "code") {
    return (
      <pre key={index} className="overflow-x-auto rounded-lg bg-slate-950 p-4 text-sm text-slate-100">
        <code>{block.text}</code>
      </pre>
    );
  }

  if (block.type === "quote") {
    return (
      <blockquote key={index} className="rounded-r-lg border-l-4 border-blue-500 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-950">
        {renderInline(block.text)}
      </blockquote>
    );
  }

  if (block.type === "image") {
    return (
      <figure key={index} className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <img src={block.src} alt={block.alt} className="w-full object-contain" />
        {(block.caption || block.alt) && (
          <figcaption className="border-t border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
            {block.caption || block.alt}
          </figcaption>
        )}
      </figure>
    );
  }

  return null;
}

function parseMarkdownBlocks(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const codeLines = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      blocks.push({ type: "code", text: codeLines.join("\n") });
      index += 1;
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", depth: heading[1].length, text: heading[2].trim() });
      index += 1;
      continue;
    }

    const image = line.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]+)")?\)$/);
    if (image) {
      blocks.push({ type: "image", alt: image[1], src: image[2], caption: image[3] || "" });
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoteLines.push(lines[index].replace(/^>\s?/, ""));
        index += 1;
      }
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line) || /^\s*\d+\.\s+/.test(line)) {
      const ordered = /^\s*\d+\.\s+/.test(line);
      const items = [];
      const pattern = ordered ? /^\s*\d+\.\s+/ : /^\s*[-*]\s+/;
      while (index < lines.length && pattern.test(lines[index])) {
        items.push(lines[index].replace(pattern, "").trim());
        index += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph = [];
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^(#{1,6})\s+/.test(lines[index]) &&
      !/^!\[/.test(lines[index]) &&
      !/^>\s?/.test(lines[index]) &&
      !/^\s*[-*]\s+/.test(lines[index]) &&
      !/^\s*\d+\.\s+/.test(lines[index]) &&
      !lines[index].startsWith("```")
    ) {
      paragraph.push(lines[index].trim());
      index += 1;
    }
    blocks.push({ type: "paragraph", text: paragraph.join(" ") });
  }

  return blocks;
}

function renderInline(text) {
  const parts = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const token = match[0];

    if (token.startsWith("`")) {
      parts.push(
        <code key={`${match.index}:code`} className="rounded bg-slate-100 px-1.5 py-0.5 text-sm font-bold text-slate-900">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**")) {
      parts.push(<strong key={`${match.index}:strong`}>{token.slice(2, -2)}</strong>);
    } else {
      const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      parts.push(
        <a key={`${match.index}:link`} href={link[2]} className="font-bold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900">
          {link[1]}
        </a>
      );
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
