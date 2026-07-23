"use client";

import { useMemo, useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { formatPhoneNumberForStorage } from "../lib/phone";
import { isValidEmailAddress, normalizeEmailAddress } from "../lib/email";
import { useRouter } from "next/navigation";
import { appConfirm } from "../lib/appDialog";

const INACTIVE_PROTECTED_ROLES = new Set(["league_manager", "club_pro", "commissioner"]);

export default function MemberImportPage() {
  const router = useRouter();

  const [fileName, setFileName] = useState("");
  const [preview, setPreview] = useState([]);
  const [missingMembers, setMissingMembers] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importStatus, setImportStatus] = useState("");
  const [importSummary, setImportSummary] = useState(null);

  async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportStatus("");
    setImportSummary(null);

    const text = await file.text();
    const parsed = parseCsv(text);

    await buildPreview(parsed);
  }

  function normalizeEmail(value) {
    return normalizeEmailAddress(value);
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeDate(value) {
    const raw = normalizeText(value);
    if (!raw) return "";

    const isoMatch = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) {
      const [, year, month, day] = isoMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (slashMatch) {
      const [, month, day, yearValue] = slashMatch;
      const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }

    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString().slice(0, 10);
    }

    return "";
  }

  function findValue(row, possibleNames) {
    const keys = Object.keys(row);

    for (const name of possibleNames) {
      const foundKey = keys.find(
        key => key.trim().toLowerCase() === name.toLowerCase()
      );

      if (foundKey) return row[foundKey];
    }

    return "";
  }

  async function buildPreview(parsedRows) {
    await checkAuth();

    const { data: memberData, error } = await supabase
      .from("members")
      .select(`
        id,
        email,
        first_name,
        last_name,
        phone,
        membershipworks_id,
        membershipworks_account_id,
        membership_status,
        membership_level,
        membership_levels,
        renewal_date,
        is_active_member,
        user_roles (
          role
        )
      `)
      .range(0, 5000);

    if (error) {
      alert(error.message);
      return;
    }

    const currentMembers = memberData || [];
    const byEmail = {};
    const byMembershipWorksId = {};

    currentMembers.forEach(member => {
      if (member.email) {
        byEmail[normalizeEmail(member.email)] = member;
      }

      const storedId =
        member.membershipworks_account_id ||
        member.membershipworks_id;

      if (storedId) {
        byMembershipWorksId[String(storedId)] = member;
      }
    });

    const previewRows = parsedRows.map((row, index) => {
      const email = normalizeEmail(
        findValue(row, ["email", "email address", "primary email"])
      );

      const firstName = normalizeText(
        findValue(row, ["first name", "firstname", "first"])
      );

      const lastName = normalizeText(
        findValue(row, ["last name", "lastname", "last"])
      );

      const membershipWorksId = normalizeText(
        findValue(row, [
          "membershipworks id",
          "membershipworks account id",
          "account id",
          "accountid",
          "account #",
          "account number",
          "member id",
          "id",
          "contact id"
        ])
      );

const membershipStatus = normalizeText(
  findValue(row, [
    "status",
    "membership status",
    "account status",
    "member status"
  ])
);
const membershipLevel = normalizeText(
  findValue(row, [
    "membership",
    "membership level",
    "membership levels",
    "membership type",
    "level",
    "plan",
    "member level"
  ])
);
const clubLocation = normalizeText(
  findValue(row, [
    "club/location",
    "club location",
    "home club",
    "home community",
    "community",
    "location",
    "primary club",
    "organization",
    "groups",
    "group",
    "membership group"
  ])
);
      const phone = formatPhoneNumberForStorage(normalizeText(
        findValue(row, [
          "phone",
          "phone number",
          "primary phone",
          "mobile phone",
          "mobile",
          "cell phone",
          "cell",
          "home phone",
          "work phone",
          "telephone",
          "contact phone"
        ])
      ));

      const duprId = normalizeText(
        findValue(row, [
          "dupr id",
          "dupr",
          "dupr number",
          "dupr account",
          "dupr account id",
          "pickleball id",
          "custom field: dupr id",
          "custom field - dupr id",
          "member dupr id"
        ])
      );

      const renewalDate = normalizeDate(
        findValue(row, [
          "renewal date",
          "next renewal date",
          "membership renewal date",
          "renew date",
          "membership renew date",
          "expiration date",
          "expiry date",
          "expires",
          "expires on",
          "membership expires",
          "membership expiration",
          "paid through",
          "paid thru"
        ])
      );
      let matchedMember = null;
      let matchType = "";

      if (membershipWorksId && byMembershipWorksId[membershipWorksId]) {
        matchedMember = byMembershipWorksId[membershipWorksId];
        matchType = "account id";
      } else if (email && byEmail[email]) {
        matchedMember = byEmail[email];
        matchType = "email";
      }

      let action = "new";
      let message = "New member will be created.";

      if (matchedMember && matchType === "account id") {
        action = "update";
        message = "Matched existing member by account id.";
      } else if (!email) {
        action = "skip";
        message = "Missing email address.";
      } else if (!isValidEmailAddress(email)) {
        action = "skip";
        message = "Invalid email address format.";
      } else if (matchedMember) {
        action = "update";
        message = `Matched existing member by ${matchType}.`;
      }

return {
  rowNumber: index + 1,
  action,
  email,
  firstName,
  lastName,
  membershipWorksId,
  membershipStatus,
  membershipLevel,
  clubLocation,
  phone,
  duprId,
  renewalDate,
  matchedMember,
  matchedMemberId: matchedMember?.id || null,
  matchType,
  hasInactiveProtectedRole: memberHasInactiveProtectedRole(matchedMember),
  message,
  raw: row
};
    });

    const importEmails = new Set(
      previewRows.map(row => normalizeEmail(row.email)).filter(Boolean)
    );

    const importMembershipWorksIds = new Set(
      previewRows
        .map(row => String(row.membershipWorksId || "").trim())
        .filter(Boolean)
    );

    const missing = currentMembers.filter(member => {
      if (member.is_active_member === false) return false;
      if (memberHasInactiveProtectedRole(member)) return false;

      const email = normalizeEmail(member.email);

      const storedId = String(
        member.membershipworks_account_id ||
        member.membershipworks_id ||
        ""
      ).trim();

      if (storedId && importMembershipWorksIds.has(storedId)) {
        return false;
      }

      if (email && importEmails.has(email)) {
        return false;
      }

      return true;
    });

    setPreview(previewRows);
    setMissingMembers(missing);
  }

  async function applyImport() {
    if (preview.length === 0) {
      alert("Upload and preview a file first.");
      return;
    }

    const ok = await appConfirm(
      "Apply this import? New members will be added and existing members will be updated.",
      { title: "Apply member import", confirmLabel: "Apply import", tone: "warning" }
    );

    if (!ok) return;

    setIsProcessing(true);
    setImportStatus("Preparing bulk import...");
    setImportSummary(null);

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      let importedByMemberId = null;

      if (user?.email) {
        const { data: memberData } = await supabase
          .from("members")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        importedByMemberId = memberData?.id || null;
      }

      const counts = {
        new_members: preview.filter(row => row.action === "new").length,
        updated_members: preview.filter(row => row.action === "update").length,
        skipped_rows: preview.filter(row => row.action === "skip").length,
        inactive_members: missingMembers.length
      };

      setImportStatus("Creating import batch...");

      const { data: batch, error: batchError } = await supabase
        .from("member_import_batches")
        .insert({
          source: "membershipworks",
          file_name: fileName,
          imported_by_member_id: importedByMemberId,
          total_rows: preview.length,
          ...counts
        })
        .select()
        .single();

      if (batchError) {
        throw new Error(batchError.message);
      }

      setImportStatus("Writing import audit log...");

      const auditRows = preview.map(row => ({
        batch_id: batch.id,
        row_number: row.rowNumber,
        action: row.action,
        email: row.email,
        first_name: row.firstName,
        last_name: row.lastName,
        membershipworks_id: row.membershipWorksId || null,
        message: row.message,
        raw_data: row.raw
      }));

      const { error: auditError } = await supabase
        .from("member_import_rows")
        .insert(auditRows);

      if (auditError) {
        throw new Error(auditError.message);
      }

      setImportStatus("Processing members with protected updates...");
      const result = await processMemberImportRows();

      setImportSummary({
        newMembers: result?.newMembers || 0,
        updatedMembers: result?.updatedMembers || 0,
        skippedRows: result?.skippedRows || 0,
        missingMembers: missingMembers.length,
        totalRows: preview.length
      });

      setImportStatus(
        `Import completed successfully. ${preview.length} records processed.`
      );
    } catch (err) {
      console.error(err);
      setImportStatus(`Import failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  async function processMemberImportRows() {
    const rows = preview.filter((row) => row.action !== "skip");
    const now = new Date().toISOString();
    const newRows = rows.filter((row) => row.action === "new");
    const updateRows = rows.filter((row) => row.action === "update");

    if (newRows.length > 0) {
      const inserts = newRows.map((row) => ({
        email: row.email || null,
        first_name: row.firstName || null,
        last_name: row.lastName || null,
        phone: row.phone || null,
        membershipworks_account_id: row.membershipWorksId || manualMembershipWorksAccountId(),
        membership_status: "Active",
        membership_level: row.membershipLevel || null,
        membership_levels: row.membershipLevel || null,
        club_location: row.clubLocation || null,
        dupr_id: row.duprId || null,
        renewal_date: row.renewalDate || null,
        is_active_member: true,
        updated_at: now,
      }));

      const { error } = await supabase.from("members").insert(inserts);
      if (error) throw new Error(error.message);
    }

    const updates = updateRows.map((row) => {
      const existing = row.matchedMember || {};
      const matchedByAccountId = row.matchType === "account id";
      const protectedStatus = row.hasInactiveProtectedRole === true;
      const payload = {
        updated_at: now
      };

      if (!protectedStatus) {
        payload.membership_status = "Active";
        payload.is_active_member = true;
      }

      if (row.email && isValidEmailAddress(row.email)) payload.email = row.email;
      if (row.phone) payload.phone = row.phone;
      if (row.renewalDate) payload.renewal_date = row.renewalDate;

      if (
        row.membershipWorksId &&
        (!existing.membershipworks_account_id ||
          String(existing.membershipworks_account_id).startsWith("manual:")) &&
        !existing.membershipworks_id
      ) {
        payload.membershipworks_account_id = row.membershipWorksId;
      }

      if (row.firstName && (matchedByAccountId || !existing.first_name)) payload.first_name = row.firstName;
      if (row.lastName && (matchedByAccountId || !existing.last_name)) payload.last_name = row.lastName;
      if (row.clubLocation && !existing.club_location) payload.club_location = row.clubLocation;
      if (row.duprId && !existing.dupr_id) payload.dupr_id = row.duprId;
      if (row.membershipLevel && !existing.membership_level) payload.membership_level = row.membershipLevel;
      if (row.membershipLevel && !existing.membership_levels) payload.membership_levels = row.membershipLevel;

      return { row, payload };
    });

    const batchSize = 25;

    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(({ row, payload }) => {
          let query = supabase.from("members").update(payload);

          if (row.matchedMemberId) {
            query = query.eq("id", row.matchedMemberId);
          } else if (row.email) {
            query = query.eq("email", row.email);
          } else if (row.membershipWorksId) {
            query = query.eq("membershipworks_account_id", row.membershipWorksId);
          }

          return query;
        })
      );

      const failed = results.find((result) => result.error);
      if (failed?.error) throw new Error(failed.error.message);
    }

    return {
      newMembers: newRows.length,
      updatedMembers: updateRows.length,
      skippedRows: preview.filter(row => row.action === "skip").length
    };
  }

  async function markMemberInactive(memberId) {
    const member = missingMembers.find((row) => String(row.id) === String(memberId));

    if (memberHasInactiveProtectedRole(member)) {
      alert("League Managers, Club Pros, and Commissioners are protected from inactive cleanup.");
      return;
    }

    const ok = await appConfirm("Mark this member inactive?", { title: "Mark member inactive", confirmLabel: "Mark inactive", tone: "warning" });
    if (!ok) return;

    const { error } = await supabase
      .from("members")
      .update({
        is_active_member: false,
        updated_at: new Date().toISOString()
      })
      .eq("id", memberId);

    if (error) {
      alert(error.message);
      return;
    }

    setMissingMembers(prev =>
      prev.filter(member => member.id !== memberId)
    );
  }

  async function markAllMissingInactive() {
    if (missingMembers.length === 0) {
      alert("No missing members.");
      return;
    }

    const ok = await appConfirm(
      `Mark ${missingMembers.length} missing members inactive?`,
      { title: "Mark missing members inactive", confirmLabel: "Mark inactive", tone: "warning" }
    );

    if (!ok) return;

    const eligibleMembers = missingMembers.filter(
      (member) => !memberHasInactiveProtectedRole(member)
    );

    if (eligibleMembers.length === 0) {
      alert("No eligible missing members. League Managers, Club Pros, and Commissioners are protected.");
      return;
    }

    const ids = eligibleMembers.map(member => member.id);

    const { error } = await supabase
      .from("members")
      .update({
        is_active_member: false,
        updated_at: new Date().toISOString()
      })
      .in("id", ids);

    if (error) {
      alert(error.message);
      return;
    }

    alert(`${eligibleMembers.length} members marked inactive.`);
    setMissingMembers(prev =>
      prev.filter(member => !ids.includes(member.id))
    );
  }

  const stats = useMemo(() => {
    return {
      total: preview.length,
      newCount: preview.filter(row => row.action === "new").length,
      updateCount: preview.filter(row => row.action === "update").length,
      skipCount: preview.filter(row => row.action === "skip").length,
      missingCount: missingMembers.length
    };
  }, [preview, missingMembers]);

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">

        <AppHeader
          title="MembershipWorks Import"
          subtitle="Preview, sync, and audit member exports before applying changes."
        />

        <div className="rounded-2xl bg-white p-6 shadow">

          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900">
              Upload MembershipWorks CSV
            </h2>

            <button
              type="button"
              onClick={() =>
                alert(
`Recommended MembershipWorks Export Fields:

Required:
- Email
- First Name
- Last Name

Recommended:
- Account ID
- Membership Status
- Membership Level
- Phone
- DUPR ID
- Renewal Date
- Club Location

Optional:
- Address
- City
- State
- Zip

Field names are flexible and common variations are supported automatically.`
                )
              }
              className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800 hover:bg-blue-200"
              title="MembershipWorks Import Help"
            >
              ?
            </button>
          </div>

          <p className="mt-2 text-sm text-slate-600">
            Upload a CSV export from MembershipWorks. The system will preview new, updated, skipped, and missing records before applying changes.
          </p>

          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="mt-5 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"
          />

          {fileName && (
            <div className="mt-3 text-sm text-slate-600">
              Selected file: <span className="font-semibold">{fileName}</span>
            </div>
          )}

        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-5">
          <StatCard label="Rows" value={stats.total} />
          <StatCard label="New" value={stats.newCount} />
          <StatCard label="Updates" value={stats.updateCount} />
          <StatCard label="Skipped" value={stats.skipCount} />
          <StatCard label="Missing" value={stats.missingCount} />
        </div>

        {importStatus && (
          <div
            className={`mt-6 rounded-xl p-4 text-sm ${
              importStatus.toLowerCase().includes("failed")
                ? "bg-red-50 text-red-900"
                : importStatus.toLowerCase().includes("completed")
                  ? "bg-green-50 text-green-900"
                  : "bg-blue-50 text-blue-900"
            }`}
          >
            <div className="font-bold">
              Import Status
            </div>

            <div className="mt-1">
              {importStatus}
            </div>
          </div>
        )}

        {importSummary && (
          <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-5">

            <div className="text-lg font-bold text-green-900">
              Import Completed Successfully
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-5">

              <SummaryBox label="Rows Processed" value={importSummary.totalRows} />
              <SummaryBox label="New Members" value={importSummary.newMembers} />
              <SummaryBox label="Updated" value={importSummary.updatedMembers} />
              <SummaryBox label="Skipped" value={importSummary.skippedRows} />
              <SummaryBox label="Missing" value={importSummary.missingMembers} />

            </div>

          </div>
        )}

        {missingMembers.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Members Missing From Import
                </h2>

                <p className="mt-1 text-sm text-slate-600">
                  These members exist in the league system but were not found in the uploaded MembershipWorks export. Review before marking inactive.
                </p>
              </div>

              <div className="flex items-center gap-3">

                <div className="rounded-xl bg-red-100 px-5 py-3 text-red-900">
                  <div className="text-xs uppercase tracking-wide">
                    Missing
                  </div>

                  <div className="text-2xl font-bold">
                    {missingMembers.length}
                  </div>
                </div>

                <button
                  onClick={markAllMissingInactive}
                  className="rounded-xl bg-red-700 px-5 py-3 font-semibold text-white hover:bg-red-800"
                >
                  Mark All Missing Inactive
                </button>

              </div>

            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">

                <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Member</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {missingMembers.map(member => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >

                      <td className="p-3 font-semibold text-slate-900">
                        {member.last_name}, {member.first_name}
                      </td>

                      <td className="p-3 text-slate-700">
                        {member.email || ""}
                      </td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                            member.is_active_member === false
                              ? "bg-red-100 text-red-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {member.is_active_member === false
                            ? "Inactive"
                            : "Active"}
                        </span>
                      </td>

                      <td className="p-3">
                        <button
                          onClick={() =>
                            markMemberInactive(member.id)
                          }
                          className="rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
                        >
                          Mark Inactive
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </div>
        )}

        {preview.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white p-6 shadow">

            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                Import Preview
              </h2>

              <button
                onClick={applyImport}
                disabled={isProcessing}
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:opacity-50"
              >
                {isProcessing ? "Importing..." : "Apply Import"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">

                <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Row</th>
                    <th className="p-3 text-left">Action</th>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">Phone</th>
                    <th className="p-3 text-left">DUPR ID</th>
                    <th className="p-3 text-left">Renewal</th>
                    <th className="p-3 text-left">Account ID</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Message</th>
                  </tr>
                </thead>

                <tbody>
                  {preview.map(row => (
                    <tr
                      key={row.rowNumber}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="p-3">{row.rowNumber}</td>

                      <td className="p-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
                            row.action === "new"
                              ? "bg-green-100 text-green-800"
                              : row.action === "update"
                                ? "bg-blue-100 text-blue-800"
                                : "bg-red-100 text-red-800"
                          }`}
                        >
                          {row.action}
                        </span>
                      </td>

                      <td className="p-3 font-semibold text-slate-900">
                        {row.lastName}, {row.firstName}
                      </td>

                      <td className="p-3 text-slate-700">
                        {row.email || ""}
                      </td>

                      <td className="p-3 text-slate-700">
                        {row.phone || ""}
                      </td>

                      <td className="p-3 text-slate-700">
                        {row.duprId || ""}
                      </td>

                      <td className="p-3 text-slate-700">
                        {row.renewalDate || ""}
                      </td>

                      <td className="p-3 text-slate-700">
                        {row.membershipWorksId || ""}
                      </td>

                      <td className="p-3 text-slate-700">
                        {row.membershipStatus || ""}
                      </td>

                      <td className="p-3 text-slate-600">
                        {row.message}
                      </td>
                    </tr>
                  ))}
                </tbody>

              </table>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

function memberHasInactiveProtectedRole(member) {
  return (member?.user_roles || []).some((roleRow) =>
    INACTIVE_PROTECTED_ROLES.has(roleRow.role)
  );
}

function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter(line => line.trim() !== "");

  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map(line => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

function splitCsvLine(line) {
  const result = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());

  return result;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-3xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function SummaryBox({ label, value }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-2 text-2xl font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function manualMembershipWorksAccountId() {
  return `manual:${crypto.randomUUID()}`;
}

