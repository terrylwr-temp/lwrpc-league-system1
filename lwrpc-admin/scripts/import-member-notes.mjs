import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

const [inputPath, mode] = process.argv.slice(2);

if (!inputPath || !["--dry-run", "--apply"].includes(mode)) {
  console.error("Usage: node scripts/import-member-notes.mjs <csv-path> <--dry-run|--apply>");
  process.exit(1);
}

const env = await loadEnvFile(resolve(".env.local"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local.");
}

const rows = parseCsv(await readFile(resolve(inputPath), "utf8"));
const entriesByEmail = leagueEntriesByEmail(rows);
const emails = [...entriesByEmail.keys()];
const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const members = await loadMembers(supabase);
const matchedMemberCount = members.filter((member) => entriesByEmail.has(normalizeEmail(member.email))).length;
const membersByEmail = members.reduce((index, member) => {
  const email = normalizeEmail(member.email);
  if (!email) return index;
  (index.get(email) || index.set(email, []).get(email)).push(member);
  return index;
}, new Map());

const updates = [];
const unmatchedEmails = [];

for (const [email, entries] of entriesByEmail) {
  const matchedMembers = membersByEmail.get(email) || [];

  if (matchedMembers.length === 0) {
    unmatchedEmails.push(email);
    continue;
  }

  for (const member of matchedMembers) {
    const nextNotes = combineNotes(member.notes, entries);
    if (nextNotes !== String(member.notes || "").trim()) {
      updates.push({ id: member.id, notes: nextNotes || null });
    }
  }
}

console.log(JSON.stringify({
  sourceRows: rows.length,
  sourceMembers: emails.length,
  matchedMembers: matchedMemberCount,
  membersToUpdate: updates.length,
  unmatchedEmailCount: unmatchedEmails.length,
  unmatchedEmails: unmatchedEmails.slice(0, 25),
  mode,
}, null, 2));

if (mode === "--dry-run") process.exit(0);

for (const updateChunk of chunks(updates, 25)) {
  const updatedAt = new Date().toISOString();
  const results = await Promise.all(
    updateChunk.map((update) => supabase
      .from("members")
      .update({ notes: update.notes, updated_at: updatedAt })
      .eq("id", update.id))
  );
  const failedResult = results.find((result) => result.error);

  if (failedResult?.error) throw failedResult.error;
}

const verification = await loadMembersByIds(supabase, updates.map((update) => update.id));
const missingNotes = verification.filter((member) => !String(member.notes || "").trim()).length;

if (missingNotes > 0) {
  throw new Error(`${missingNotes} updated member records did not retain Notes values.`);
}

console.log(`Applied and verified ${updates.length} member Notes update${updates.length === 1 ? "" : "s"}.`);

async function loadEnvFile(path) {
  const source = await readFile(path, "utf8");
  return Object.fromEntries(
    source
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && line.includes("="))
      .map((line) => {
        const separator = line.indexOf("=");
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
        return [key, value];
      })
  );
}

function parseCsv(source) {
  const values = [];
  let row = [];
  let value = "";
  let inQuotes = false;

  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    const nextCharacter = source[index + 1];

    if (character === '"' && inQuotes && nextCharacter === '"') {
      value += '"';
      index += 1;
    } else if (character === '"') {
      inQuotes = !inQuotes;
    } else if (character === "," && !inQuotes) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !inQuotes) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.trim())) values.push(row);
      row = [];
      value = "";
    } else {
      value += character;
    }
  }

  row.push(value);
  if (row.some((cell) => cell.trim())) values.push(row);

  const [headers, ...dataRows] = values;
  return dataRows.map((dataRow) => Object.fromEntries(headers.map((header, index) => [header.trim(), dataRow[index] || ""])));
}

function leagueEntriesByEmail(rows) {
  const entriesByEmail = new Map();

  for (const row of rows) {
    const email = normalizeEmail(row.Email);
    const entry = [row.League, row.Division, row.Team].map((value) => String(value || "").trim()).join(" / ");

    if (!email || entry === " /  / ") continue;
    const entries = entriesByEmail.get(email) || new Set();
    entries.add(entry);
    entriesByEmail.set(email, entries);
  }

  return new Map([...entriesByEmail].map(([email, entries]) => [email, [...entries]]));
}

async function loadMembers(supabase) {
  const members = [];

  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from("members")
      .select("id, email, notes")
      .range(from, from + 999);

    if (error) throw error;
    members.push(...(data || []));
    if (!data || data.length < 1000) break;
  }

  return members;
}

async function loadMembersByIds(supabase, ids) {
  const members = [];

  for (const idChunk of chunks(ids, 100)) {
    const { data, error } = await supabase
      .from("members")
      .select("id, notes")
      .in("id", idChunk);

    if (error) throw error;
    members.push(...(data || []));
  }

  return members;
}

function combineNotes(existingNotes, entries) {
  const existingLines = String(existingNotes || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return [...new Set([...existingLines, ...entries])].join("\n");
}

function chunks(items, size) {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) => items.slice(index * size, index * size + size));
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}
