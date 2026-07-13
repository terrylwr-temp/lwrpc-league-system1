import fs from "fs";
import path from "path";

const HELP_ROOT = path.join(process.cwd(), "content", "help");

export const HELP_ROLE_CONFIG = {
  captain: {
    label: "User",
    title: "User Help Center",
    description: "User guidance for the Player Dashboard and Captain Dashboard.",
  },
  player: {
    label: "Player",
    title: "Player Help Center",
    description: "Player help content can be added under content/help/player.",
  },
  commissioner: {
    label: "Commissioner",
    title: "Commissioner Help Center",
    description: "Commissioner help content can be added under content/help/commissioner.",
  },
  "club-pro": {
    label: "Club Pro",
    title: "Club Pro Help Center",
    description: "Club Pro help content can be added under content/help/club-pro.",
    folder: "club-pro",
  },
  "league-manager": {
    label: "League Manager",
    title: "League Manager Help Center",
    description: "League Manager help content can be added under content/help/league-manager.",
    folder: "league-manager",
  },
};

export function helpRoleConfig(role) {
  const normalizedRole = String(role || "").replaceAll("_", "-");
  return HELP_ROLE_CONFIG[normalizedRole] || null;
}

export function loadHelpGuide(role) {
  const config = helpRoleConfig(role);
  if (!config) return null;

  const normalizedRole = String(role || "").replaceAll("_", "-");
  const folderName = config.folder || normalizedRole;
  const roleRoot = path.join(HELP_ROOT, folderName);

  if (!fs.existsSync(roleRoot)) {
    return {
      role: normalizedRole,
      ...config,
      documents: [],
      navigation: [],
    };
  }

  const documents = walkMarkdownFiles(roleRoot)
    .map((filePath) => helpDocumentFromFile(roleRoot, filePath))
    .sort((first, second) =>
      first.order - second.order ||
      first.category.localeCompare(second.category) ||
      first.title.localeCompare(second.title)
    );

  return {
    role: normalizedRole,
    ...config,
    documents,
    navigation: navigationTree(documents),
  };
}

function walkMarkdownFiles(root) {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      return walkMarkdownFiles(entryPath);
    }

    return entry.isFile() && entry.name.endsWith(".md") ? [entryPath] : [];
  });
}

function helpDocumentFromFile(root, filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const { frontmatter, body } = parseFrontmatter(raw);
  const relativePath = path.relative(root, filePath).replaceAll("\\", "/");
  const slug = relativePath.replace(/\.md$/i, "");
  const title = frontmatter.title || titleFromSlug(slug);
  const category = frontmatter.category || categoryFromPath(relativePath);
  const headings = extractHeadings(body);

  return {
    id: slug,
    path: relativePath,
    title,
    category,
    description: frontmatter.description || firstParagraph(body),
    order: Number(frontmatter.order || 999),
    body,
    headings,
    searchText: [title, category, frontmatter.description, body]
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

function parseFrontmatter(raw) {
  const text = String(raw || "").replace(/^\uFEFF/, "");
  if (!text.startsWith("---")) return { frontmatter: {}, body: text.trim() };

  const end = text.indexOf("\n---", 3);
  if (end === -1) return { frontmatter: {}, body: text.trim() };

  const frontmatterText = text.slice(3, end).trim();
  const body = text.slice(end + 4).trim();
  const frontmatter = {};

  frontmatterText.split(/\r?\n/).forEach((line) => {
    const separator = line.indexOf(":");
    if (separator === -1) return;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key) frontmatter[key] = value;
  });

  return { frontmatter, body };
}

function navigationTree(documents) {
  const byCategory = new Map();

  documents.forEach((document) => {
    if (!byCategory.has(document.category)) byCategory.set(document.category, []);
    byCategory.get(document.category).push({
      id: document.id,
      title: document.title,
      description: document.description,
      headings: document.headings,
    });
  });

  return [...byCategory.entries()].map(([category, items]) => ({
    category,
    items,
  }));
}

function extractHeadings(markdown) {
  return String(markdown || "")
    .split(/\r?\n/)
    .map((line) => line.match(/^(#{2,3})\s+(.+)$/))
    .filter(Boolean)
    .map((match) => ({
      depth: match[1].length,
      title: stripMarkdown(match[2]),
      id: slugify(stripMarkdown(match[2])),
    }));
}

function firstParagraph(markdown) {
  return String(markdown || "")
    .split(/\n\s*\n/)
    .map((block) => stripMarkdown(block).trim())
    .find((block) => block && !block.startsWith("#")) || "";
}

function categoryFromPath(relativePath) {
  const parts = relativePath.split("/");
  if (parts.length <= 1) return "Guide";
  return titleFromSlug(parts[0]);
}

function titleFromSlug(value) {
  return String(value || "")
    .split("/")
    .pop()
    .replace(/^\d+[-_]/, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stripMarkdown(value) {
  return String(value || "")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ");
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
