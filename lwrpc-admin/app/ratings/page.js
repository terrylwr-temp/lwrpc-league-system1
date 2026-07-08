"use client";

import LoadingScreen from "../components/LoadingScreen";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AppHeader from "../components/AppHeader";
import { requireRole, supabase } from "../lib/auth";
import { confirmDeleteAction } from "../lib/confirmDelete";
import { confirmUnsavedChanges, useUnsavedChangesWarning } from "../lib/useUnsavedChangesWarning";

const PAGE_SIZE = 100;
const RATING_SELECT = "id, member_id, season_id, dupr_doubles_rating, dupr_reliability_rating, season_dupr_rating, season_primetime_rating, notes";

export default function RatingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [ratingsLoading, setRatingsLoading] = useState(false);

  const [members, setMembers] = useState([]);
  const [currentRosterMemberIds, setCurrentRosterMemberIds] = useState(new Set());
  const [seasons, setSeasons] = useState([]);
  const [ratings, setRatings] = useState([]);
  const [allRatings, setAllRatings] = useState([]);
  const [ratingImportRows, setRatingImportRows] = useState([]);
  const [ratingImportStatus, setRatingImportStatus] = useState("");
  const [isImportingRatings, setIsImportingRatings] = useState(false);
  const [isDeletingSeasonRatings, setIsDeletingSeasonRatings] = useState(false);
  const [copySourceSeason, setCopySourceSeason] = useState("");
  const [copyTargetSeason, setCopyTargetSeason] = useState("");
  const [isCopyingRatings, setIsCopyingRatings] = useState(false);
  const [isCleaningRatings, setIsCleaningRatings] = useState(false);

  useUnsavedChangesWarning(Boolean(copySourceSeason || copyTargetSeason), "ratings copy setup");

  const [selectedSeason, setSelectedSeason] = useState("");
  const [search, setSearch] = useState("");
  const [showCurrentRosterOnly, setShowCurrentRosterOnly] = useState(false);
  const [showMissingDoublesOnly, setShowMissingDoublesOnly] = useState(false);
  const [showNrDoublesOnly, setShowNrDoublesOnly] = useState(false);
  const [showNrAgeOnly, setShowNrAgeOnly] = useState(false);
  const [showInvalidDuprIdsOnly, setShowInvalidDuprIdsOnly] = useState(false);
  const [showRatingImportTools, setShowRatingImportTools] = useState(false);
  const [memberSort, setMemberSort] = useState({
    field: "name",
    direction: "asc",
  });
  const [page, setPage] = useState(1);
  const [requestedMemberId, setRequestedMemberId] = useState("");
  const requestedMemberRowRef = useRef(null);

  const checkAuth = useCallback(async function checkAuth() {
    const user = await requireRole(router, "league_manager");
    return !!user;
  }, [router]);

  const loadRatings = useCallback(async function loadRatings(seasonId) {
    if (!seasonId) {
      setRatings([]);
      return;
    }

    setRatingsLoading(true);

    const { data, error } = await supabase
      .from("member_season_ratings")
      .select(RATING_SELECT)
      .eq("season_id", seasonId);

    if (error) {
      alert(error.message);
      setRatingsLoading(false);
      return;
    }

    setRatings(data || []);
    setRatingsLoading(false);
  }, []);

  const loadAllRatings = useCallback(async function loadAllRatings() {
    const { data, error } = await supabase
      .from("member_season_ratings")
      .select(RATING_SELECT);

    if (error) {
      alert(error.message);
      return;
    }

    setAllRatings(data || []);
  }, []);

  const loadInitialData = useCallback(async function loadInitialData() {
    setLoading(true);

    const { data: memberData, error: memberError } = await supabase
      .from("members")
      .select("id, first_name, last_name, email, club_location, dupr_id, created_at, is_active_member")
      .or("is_active_member.eq.true,is_active_member.is.null")
      .order("last_name", { ascending: true });

    if (memberError) {
      alert(memberError.message);
      setLoading(false);
      return;
    }

    const { data: seasonData, error: seasonError } = await supabase
      .from("seasons")
      .select("*")
      .order("name", { ascending: true });

    if (seasonError) {
      alert(seasonError.message);
      setLoading(false);
      return;
    }

    const { rows: rosterRows, error: rosterError } = await loadAllRatingRosterRows();

    if (rosterError) {
      alert(rosterError.message);
      setLoading(false);
      return;
    }

    setMembers(memberData || []);
    setCurrentRosterMemberIds(
      new Set(
        (rosterRows || [])
          .filter((row) => row.teams?.is_active !== false)
          .map((row) => String(row.member_id))
      )
    );
    setSeasons((seasonData || []).filter((season) => season.is_active !== false));

    const activeSeasonRows = (seasonData || []).filter((season) => season.is_active !== false);
    const firstSeasonId = activeSeasonRows?.[0]?.id || "";
    setSelectedSeason(firstSeasonId);

    if (firstSeasonId) {
      await loadRatings(firstSeasonId);
    }

    await loadAllRatings();

    setLoading(false);
  }, [loadAllRatings, loadRatings]);

  async function updateRating(memberId, field, value) {
    if (!selectedSeason) {
      alert("Select a season first");
      return;
    }

    const cleanValue = normalizeRatingInput(field, value);

    const existing = ratings.find(
      (r) => r.member_id === memberId && r.season_id === selectedSeason
    );

    if (existing) {
      const { error } = await supabase
        .from("member_season_ratings")
        .update({
          [field]: cleanValue,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (error) {
        alert(error.message);
        return;
      }

      setRatings((current) =>
        current.map((r) =>
          r.id === existing.id ? { ...r, [field]: cleanValue } : r
        )
      );
      setAllRatings((current) =>
        current.map((r) =>
          r.id === existing.id ? { ...r, [field]: cleanValue } : r
        )
      );
    } else {
      const newRow = {
        member_id: memberId,
        season_id: selectedSeason,
        dupr_doubles_rating: null,
        dupr_reliability_rating: null,
        season_dupr_rating: null,
        season_primetime_rating: null,
        notes: null,
        [field]: cleanValue,
      };

      const { data, error } = await supabase
        .from("member_season_ratings")
        .insert(newRow)
        .select(RATING_SELECT)
        .single();

      if (error) {
        alert(error.message);
        return;
      }

      setRatings((current) => [...current, data]);
      setAllRatings((current) => [...current, data]);
    }
  }

  const getRating = useCallback(function getRating(memberId, field) {
    const row = ratings.find(
      (r) => r.member_id === memberId && r.season_id === selectedSeason
    );

    return row?.[field] ?? "";
  }, [ratings, selectedSeason]);

  async function updateMemberDuprId(memberId, value) {
    const cleanValue = String(value || "").trim() || null;

    const { error } = await supabase
      .from("members")
      .update({
        dupr_id: cleanValue,
        updated_at: new Date().toISOString(),
      })
      .eq("id", memberId);

    if (error) {
      alert(error.message);
      return;
    }

    setMembers((current) =>
      current.map((member) =>
        member.id === memberId ? { ...member, dupr_id: cleanValue } : member
      )
    );
  }

  function normalizeRatingInput(field, value) {
    if (value === "") return null;

    if (field === "notes") {
      return String(value || "").trim() || null;
    }

    if (field === "dupr_doubles_rating") {
      const text = String(value || "").trim();
      if (!text) return null;
      if (text.toUpperCase() === "NR") return "NR";

      const numberValue = Number(text);
      return Number.isNaN(numberValue) ? null : numberValue.toFixed(3);
    }

    const numberValue = Number(value);
    if (Number.isNaN(numberValue)) return null;

    if (field === "season_dupr_rating") {
      return Math.trunc(numberValue * 10) / 10;
    }

    return numberValue;
  }

  const hasDoublesRating = useCallback(function hasDoublesRating(memberId) {
    const row = ratings.find(
      (rating) =>
        rating.member_id === memberId &&
        rating.season_id === selectedSeason
    );
    const value = row?.dupr_doubles_rating ?? row?.season_dupr_rating;
    return value !== null && value !== undefined && value !== "";
  }, [ratings, selectedSeason]);

  const hasNumericRating = useCallback(function hasNumericRating(memberId, field) {
    const row = ratings.find(
      (rating) =>
        rating.member_id === memberId &&
        rating.season_id === selectedSeason
    );
    const value = row?.[field];
    return value !== null && value !== undefined && value !== "" && !Number.isNaN(Number(value));
  }, [ratings, selectedSeason]);

  function seasonLabel(seasonId) {
    return seasons.find((season) => season.id === seasonId)?.name || "Unknown Season";
  }

  function selectedSeasonLabel() {
    return selectedSeason ? seasonLabel(selectedSeason) : "No season selected";
  }

  function formatMemberCreatedAt(value) {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleDateString();
  }

  function compareMemberName(a, b) {
    const last = String(a.last_name || "").localeCompare(String(b.last_name || ""));
    if (last !== 0) return last;
    return String(a.first_name || "").localeCompare(String(b.first_name || ""));
  }

  function toggleMemberSort(field) {
    setMemberSort((current) => ({
      field,
      direction:
        current.field === field && current.direction === "asc" ? "desc" : "asc",
    }));
  }

  function sortIndicator(field) {
    if (memberSort.field !== field) return "";
    return memberSort.direction === "desc" ? " ↓" : " ↑";
  }

  const compareRatingValues = useCallback(function compareRatingValues(a, b, field) {
    const aValue = getRating(a.id, field);
    const bValue = getRating(b.id, field);
    const aNumber = Number(aValue);
    const bNumber = Number(bValue);
    const aHasNumber = aValue !== "" && !Number.isNaN(aNumber);
    const bHasNumber = bValue !== "" && !Number.isNaN(bNumber);

    if (aHasNumber && bHasNumber) return aNumber - bNumber;
    if (aHasNumber) return -1;
    if (bHasNumber) return 1;

    return String(aValue || "").localeCompare(String(bValue || ""));
  }, [getRating]);

  async function deleteRatingsForSelectedSeason() {
    if (!selectedSeason) {
      alert("Select a season first.");
      return;
    }

    const seasonName = selectedSeasonLabel();
    const seasonRatingCount = ratings.filter(
      (rating) => rating.season_id === selectedSeason
    ).length;

    const ok = confirmDeleteAction({
      title: `Delete all ${seasonRatingCount} rating record(s) for ${seasonName}?`,
      details: "This removes the imported season rating records used for roster checks, match setup rating totals, and division eligibility. You would need to re-import ratings to restore them.",
    });

    if (!ok) return;

    setIsDeletingSeasonRatings(true);

    const { error } = await supabase
      .from("member_season_ratings")
      .delete()
      .eq("season_id", selectedSeason);

    setIsDeletingSeasonRatings(false);

    if (error) {
      alert(error.message);
      return;
    }

    setRatings([]);
    setAllRatings((current) =>
      current.filter((rating) => rating.season_id !== selectedSeason)
    );
    setRatingImportRows([]);
    setRatingImportStatus(`Deleted all ratings for ${seasonName}.`);
  }

  function memberFullName(member) {
    return `${member.first_name || ""} ${member.last_name || ""}`.trim();
  }

  async function copyMemberName(member) {
    const name = memberFullName(member);
    if (!name) return;

    try {
      await navigator.clipboard.writeText(name);
    } catch {
      window.prompt("Copy player name", name);
    }
  }

  function normalizeText(value) {
    return String(value || "").trim();
  }

  function normalizeEmail(value) {
    return normalizeText(value).toLowerCase();
  }

  function normalizeName(value) {
    return normalizeText(value).toLowerCase().replace(/\s+/g, " ");
  }

  function findCsvValue(row, names) {
    const keys = Object.keys(row);
    for (const name of names) {
      const key = keys.find((candidate) => normalizeCsvHeader(candidate) === normalizeCsvHeader(name));
      if (key) return row[key];
    }
    return "";
  }

  function findAgeBasedRatingValue(row) {
    const exactValue = findCsvValue(row, [
      "age-based rating",
      "age based rating",
      "agebased rating",
      "age-based dupr rating",
      "age based dupr rating",
      "age dupr rating",
      "age rating",
      "age doubles rating",
      "age-based doubles rating",
      "age based doubles rating",
      "age bracket rating",
      "primetime rating",
      "prime time rating",
    ]);

    if (exactValue !== "") return exactValue;

    const ageKey = Object.keys(row).find((key) => {
      const normalized = normalizeCsvHeader(key);
      return (
        (normalized.includes("age") && normalized.includes("rating")) ||
        normalized.includes("primetime") ||
        normalized.includes("primetimerating")
      );
    });

    return ageKey ? row[ageKey] : "";
  }

  function normalizeCsvHeader(value) {
    return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  }

  function parseRating(value) {
    const cleaned = normalizeText(value).replace(/[^\d.]/g, "");
    if (!cleaned) return null;
    const rating = Number(cleaned);
    return Number.isNaN(rating) ? null : rating;
  }

  function parseDuprDoublesRating(value) {
    const text = normalizeText(value);
    if (!text) return null;
    if (text.toUpperCase() === "NR") return "NR";

    const rating = parseRating(text);
    return rating === null ? null : rating.toFixed(3);
  }

  function parseReliabilityRating(value) {
    const text = normalizeText(value);
    if (!text) return null;

    const rating = parseRating(text);
    return rating === null ? null : rating;
  }

  async function handleRatingsImportFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSeason) {
      alert("Select a season before importing ratings.");
      event.target.value = "";
      return;
    }

    const text = await file.text();
    const parsedRows = parseCsv(text);
    const byEmail = {};
    const byName = {};

    members.forEach((member) => {
      if (member.email) byEmail[normalizeEmail(member.email)] = member;
      byName[normalizeName(memberFullName(member))] = member;
      byName[normalizeName(`${member.last_name || ""}, ${member.first_name || ""}`)] = member;
    });

    const rows = parsedRows.map((row, index) => {
      const email = normalizeEmail(findCsvValue(row, ["email", "email address", "primary email"]));
      const firstName = normalizeText(findCsvValue(row, ["first name", "firstname", "first"]));
      const lastName = normalizeText(findCsvValue(row, ["last name", "lastname", "last"]));
      const name = normalizeText(findCsvValue(row, ["name", "member name", "player", "player name"]));
      const duprId = normalizeText(findCsvValue(row, ["dupr id", "duprid", "dupr", "dupr number"]));
      const duprDoublesRating = parseDuprDoublesRating(findCsvValue(row, ["doubles rating", "doubles", "dupr doubles", "dupr doubles rating", "doubles dupr", "rating"]));
      const duprReliabilityRating = parseReliabilityRating(findCsvValue(row, ["doublesReliability", "doubles reliability", "doubles reliability rating", "reliability", "reliability rating", "dupr reliability"]));
      const ageRating = parseRating(findAgeBasedRatingValue(row));
      const lookupName = name || `${firstName} ${lastName}`.trim();
      const member = (email && byEmail[email]) || byName[normalizeName(lookupName)] || null;

      const hasRating = duprDoublesRating !== null || duprReliabilityRating !== null || ageRating !== null;

      return {
        rowNumber: index + 1,
        action: member && hasRating ? "ready" : "skip",
        message: !member
          ? "No matching member by email or name."
          : hasRating
            ? "Matched member."
            : "Matched member, but no numeric rating or reliability was found in this CSV row.",
        memberId: member?.id || null,
        memberName: member ? memberFullName(member) : lookupName,
        email,
        duprId,
        shouldUpdateDuprId: Boolean(member && duprId && !member.dupr_id),
        duprDoublesRating,
        duprReliabilityRating,
        ageRating,
      };
    });

    setRatingImportRows(rows);
    setRatingImportStatus(`Previewed ${rows.length} row(s).`);
    event.target.value = "";
  }

  async function applyRatingsImport() {
    if (!selectedSeason) {
      alert("Select a season before importing ratings.");
      return;
    }

    const readyRows = ratingImportRows.filter((row) => row.action === "ready");
    if (readyRows.length === 0) {
      alert("No matched rating rows to import.");
      return;
    }

    if (!confirm(`Import ratings for ${readyRows.length} matched member(s)?`)) return;

    setIsImportingRatings(true);
    setRatingImportStatus("Importing ratings...");

    try {
      const now = new Date().toISOString();
      const existingByMember = {};
      ratings.forEach((rating) => {
        if (rating.season_id === selectedSeason) existingByMember[rating.member_id] = rating;
      });

      const memberUpdates = readyRows
        .filter((row) => row.shouldUpdateDuprId)
        .map((row) =>
          supabase
            .from("members")
            .update({ dupr_id: row.duprId, updated_at: now })
            .eq("id", row.memberId)
        );

      for (let i = 0; i < memberUpdates.length; i += 25) {
        const results = await Promise.all(memberUpdates.slice(i, i + 25));
        const failed = results.find((result) => result.error);
        if (failed?.error) throw new Error(failed.error.message);
      }

      const inserts = [];
      const updateRequests = [];

      readyRows.forEach((row) => {
        const payload = {
          updated_at: now,
        };

        if (row.duprDoublesRating !== null) payload.dupr_doubles_rating = row.duprDoublesRating;
        if (row.duprReliabilityRating !== null) payload.dupr_reliability_rating = row.duprReliabilityRating;
        if (row.ageRating !== null) payload.season_primetime_rating = row.ageRating;
        const existing = existingByMember[row.memberId];

        if (existing) {
          updateRequests.push(
            supabase.from("member_season_ratings").update(payload).eq("id", existing.id)
          );
        } else {
          inserts.push({
            member_id: row.memberId,
            season_id: selectedSeason,
            dupr_doubles_rating: row.duprDoublesRating,
            dupr_reliability_rating: row.duprReliabilityRating,
            season_dupr_rating: null,
            season_primetime_rating: row.ageRating,
            updated_at: now,
          });
        }
      });

      for (let i = 0; i < updateRequests.length; i += 25) {
        const results = await Promise.all(updateRequests.slice(i, i + 25));
        const failed = results.find((result) => result.error);
        if (failed?.error) throw new Error(failed.error.message);
      }

      if (inserts.length > 0) {
        const { error } = await supabase.from("member_season_ratings").insert(inserts);
        if (error) throw new Error(error.message);
      }

      setMembers((current) =>
        current.map((member) => {
          const imported = readyRows.find((row) => row.memberId === member.id && row.shouldUpdateDuprId);
          return imported ? { ...member, dupr_id: imported.duprId } : member;
        })
      );
      await loadRatings(selectedSeason);
      await loadAllRatings();
      setRatingImportRows([]);
      setRatingImportStatus(`Imported ${readyRows.length} rating row(s).`);
    } catch (error) {
      setRatingImportStatus(`Import failed: ${error.message}`);
    } finally {
      setIsImportingRatings(false);
    }
  }

  async function copyRatingsBetweenSeasons() {
    if (!copySourceSeason || !copyTargetSeason) {
      alert("Select both a source season and target season.");
      return;
    }

    if (copySourceSeason === copyTargetSeason) {
      alert("Source and target seasons must be different.");
      return;
    }

    const sourceName = seasonLabel(copySourceSeason);
    const targetName = seasonLabel(copyTargetSeason);
    const sourceRows = allRatings.filter((rating) => rating.season_id === copySourceSeason);

    if (sourceRows.length === 0) {
      alert(`No ratings found for ${sourceName}.`);
      return;
    }

    const ok = confirm(
      `Copy ${sourceRows.length} rating record(s) from ${sourceName} to ${targetName}?\n\nExisting target-season ratings for matching players will be updated. Missing target-season rows will be created.`
    );

    if (!ok) return;

    setIsCopyingRatings(true);

    const now = new Date().toISOString();
    const targetByMemberId = Object.fromEntries(
      allRatings
        .filter((rating) => rating.season_id === copyTargetSeason)
        .map((rating) => [String(rating.member_id), rating])
    );
    const inserts = [];
    const updateRequests = [];

    sourceRows.forEach((sourceRow) => {
      const payload = {
        dupr_doubles_rating: sourceRow.dupr_doubles_rating,
        dupr_reliability_rating: sourceRow.dupr_reliability_rating,
        season_dupr_rating: sourceRow.season_dupr_rating,
        season_primetime_rating: sourceRow.season_primetime_rating,
        updated_at: now,
      };
      const existing = targetByMemberId[String(sourceRow.member_id)];

      if (existing) {
        updateRequests.push(
          supabase.from("member_season_ratings").update(payload).eq("id", existing.id)
        );
      } else {
        inserts.push({
          member_id: sourceRow.member_id,
          season_id: copyTargetSeason,
          ...payload,
        });
      }
    });

    for (let i = 0; i < updateRequests.length; i += 25) {
      const results = await Promise.all(updateRequests.slice(i, i + 25));
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        alert(failed.error.message);
        setIsCopyingRatings(false);
        return;
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from("member_season_ratings").insert(inserts);

      if (error) {
        alert(error.message);
        setIsCopyingRatings(false);
        return;
      }
    }

    await loadAllRatings();

    if (selectedSeason === copyTargetSeason) {
      await loadRatings(copyTargetSeason);
    }

    setRatingImportStatus(`Copied ${sourceRows.length} rating record(s) from ${sourceName} to ${targetName}.`);
    setCopySourceSeason("");
    setCopyTargetSeason("");
    setIsCopyingRatings(false);
  }

  async function cleanRatingsForSelectedSeason() {
    if (!selectedSeason) {
      alert("Select a season first.");
      return;
    }

    const reliabilityThresholdText = window.prompt(
      "Reliability Rating threshold for NR-style cleanup?\n\nEnter 0 or leave blank to ignore Reliability Rating.",
      "0"
    );

    if (reliabilityThresholdText === null) return;

    const reliabilityThreshold = parseReliabilityThreshold(reliabilityThresholdText);

    if (reliabilityThreshold === null) {
      alert("Enter a valid reliability number, or 0 to ignore Reliability Rating.");
      return;
    }

    const reliabilityRuleText = reliabilityThreshold > 0
      ? `Reliability Rating values of ${reliabilityThreshold} or below also use the NR rule.`
      : "Reliability Rating will not change the cleanup rule.";
    const ok = confirm(
      `Clean ratings for ${selectedSeasonLabel()}?\n\nThis overwrites Season DUPR Rating for players in this season using DUPR Doubles Rating. NR values use the player's highest division Rating Range Max minus 0.5.\n\n${reliabilityRuleText}`
    );

    if (!ok) return;

    setIsCleaningRatings(true);
    setRatingImportStatus("Cleaning ratings...");

    const { data: rosterRows, error: rosterError } = await supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          is_active,
          divisions (
            id,
            max_dupr,
            leagues (
              id,
              season_id
            )
          )
        )
      `);

    if (rosterError) {
      alert(rosterError.message);
      setIsCleaningRatings(false);
      return;
    }

    const maxRatingByMemberId = {};

    (rosterRows || []).forEach((row) => {
      const team = row.teams;
      const division = team?.divisions;
      const maxDupr = Number(division?.max_dupr);

      if (
        team?.is_active === false ||
        String(division?.leagues?.season_id || "") !== String(selectedSeason) ||
        Number.isNaN(maxDupr)
      ) {
        return;
      }

      const key = String(row.member_id);
      maxRatingByMemberId[key] = Math.max(maxRatingByMemberId[key] ?? 0, maxDupr);
    });

    const now = new Date().toISOString();
    const rowsByMemberId = Object.fromEntries(
      ratings
        .filter((rating) => String(rating.season_id) === String(selectedSeason))
        .map((rating) => [String(rating.member_id), rating])
    );
    const inserts = [];
    const updateRequests = [];
    let cleanedCount = 0;
    let skippedCount = 0;

    members.forEach((member) => {
      const existing = rowsByMemberId[String(member.id)];
      const rawValue = existing?.dupr_doubles_rating;
      const cleanedValue = cleanedSeasonDuprRating(
        rawValue,
        maxRatingByMemberId[String(member.id)],
        existing?.dupr_reliability_rating,
        reliabilityThreshold
      );

      if (cleanedValue === null) {
        skippedCount += 1;
        return;
      }

      cleanedCount += 1;

      const payload = {
        season_dupr_rating: cleanedValue,
        updated_at: now,
      };

      if (existing) {
        updateRequests.push(
          supabase.from("member_season_ratings").update(payload).eq("id", existing.id)
        );
      } else {
        inserts.push({
          member_id: member.id,
          season_id: selectedSeason,
          dupr_doubles_rating: null,
          dupr_reliability_rating: null,
          season_primetime_rating: null,
          ...payload,
        });
      }
    });

    for (let i = 0; i < updateRequests.length; i += 25) {
      const results = await Promise.all(updateRequests.slice(i, i + 25));
      const failed = results.find((result) => result.error);
      if (failed?.error) {
        alert(failed.error.message);
        setIsCleaningRatings(false);
        return;
      }
    }

    if (inserts.length > 0) {
      const { error } = await supabase.from("member_season_ratings").insert(inserts);

      if (error) {
        alert(error.message);
        setIsCleaningRatings(false);
        return;
      }
    }

    await loadRatings(selectedSeason);
    await loadAllRatings();
    setRatingImportStatus(`Cleaned ${cleanedCount} Season DUPR rating(s). Skipped ${skippedCount} player(s) without a numeric DUPR Doubles Rating or usable NR team range.${reliabilityThreshold > 0 ? ` Reliability threshold applied at ${reliabilityThreshold} or below.` : ""}`);
    setIsCleaningRatings(false);
  }

  useEffect(() => {
    async function run() {
      const ok = await checkAuth();

      if (ok) {
        await loadInitialData();
      }
    }

    run();
  }, [checkAuth, loadInitialData]);

  useEffect(() => {
    setRequestedMemberId(new URLSearchParams(window.location.search).get("member") || "");
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, selectedSeason, showCurrentRosterOnly, showMissingDoublesOnly, showNrDoublesOnly, showNrAgeOnly, showInvalidDuprIdsOnly]);

  useEffect(() => {
    if (!requestedMemberId || loading) return;

    setSearch("");
    setShowCurrentRosterOnly(false);
    setShowMissingDoublesOnly(false);
    setShowNrDoublesOnly(false);
    setShowNrAgeOnly(false);
    setShowInvalidDuprIdsOnly(false);
    setMemberSort({ field: "name", direction: "asc" });
  }, [loading, requestedMemberId]);

  useEffect(() => {
    if (!loading && selectedSeason) {
      loadRatings(selectedSeason);
    }

    if (!selectedSeason) {
      setRatings([]);
    }
  }, [loading, loadRatings, selectedSeason]);

  const filteredMembers = useMemo(() => {
    const q = search.trim().toLowerCase();
    let nextMembers = members;

    if (showCurrentRosterOnly) {
      nextMembers = nextMembers.filter((member) =>
        currentRosterMemberIds.has(String(member.id))
      );
    }

    if (showMissingDoublesOnly) {
      nextMembers = nextMembers.filter((member) => !hasDoublesRating(member.id));
    }

    if (showNrDoublesOnly) {
      nextMembers = nextMembers.filter((member) => !hasNumericRating(member.id, "dupr_doubles_rating"));
    }

    if (showNrAgeOnly) {
      nextMembers = nextMembers.filter((member) => !hasNumericRating(member.id, "season_primetime_rating"));
    }

    if (showInvalidDuprIdsOnly) {
      nextMembers = nextMembers.filter((member) => String(member.dupr_id || "").trim().length !== 6);
    }

    if (q) {
      nextMembers = nextMembers.filter((member) => {
      const fullName = `${member.first_name || ""} ${member.last_name || ""}`;
      const reverseName = `${member.last_name || ""} ${member.first_name || ""}`;

      return (
        fullName.toLowerCase().includes(q) ||
        reverseName.toLowerCase().includes(q) ||
        (member.club_location || "").toLowerCase().includes(q) ||
        (member.dupr_id || "").toLowerCase().includes(q)
      );
      });
    }

    return [...nextMembers].sort((a, b) => {
      let result = compareMemberName(a, b);

      if (memberSort.field === "created_at") {
        const aTime = new Date(a.created_at || 0).getTime() || 0;
        const bTime = new Date(b.created_at || 0).getTime() || 0;
        result = aTime - bTime || compareMemberName(a, b);
      }

      if (memberSort.field === "dupr_id") {
        result = String(a.dupr_id || "").localeCompare(String(b.dupr_id || "")) || compareMemberName(a, b);
      }

      if (["dupr_doubles_rating", "dupr_reliability_rating", "season_dupr_rating", "season_primetime_rating"].includes(memberSort.field)) {
        result = compareRatingValues(a, b, memberSort.field) || compareMemberName(a, b);
      }

      return memberSort.direction === "desc" ? -result : result;
    });
  }, [compareRatingValues, currentRosterMemberIds, hasDoublesRating, hasNumericRating, memberSort, members, search, showCurrentRosterOnly, showInvalidDuprIdsOnly, showMissingDoublesOnly, showNrAgeOnly, showNrDoublesOnly]);

  const totalPages = Math.max(1, Math.ceil(filteredMembers.length / PAGE_SIZE));

  const pagedMembers = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredMembers.slice(start, start + PAGE_SIZE);
  }, [filteredMembers, page]);

  useEffect(() => {
    if (!requestedMemberId || loading || filteredMembers.length === 0) return;

    const memberIndex = filteredMembers.findIndex((member) => String(member.id) === String(requestedMemberId));
    if (memberIndex < 0) return;

    const targetPage = Math.floor(memberIndex / PAGE_SIZE) + 1;
    setPage((currentPage) => currentPage === targetPage ? currentPage : targetPage);
  }, [filteredMembers, loading, requestedMemberId]);

  useEffect(() => {
    if (!requestedMemberId || loading || !requestedMemberRowRef.current) return;

    const scrollTimer = window.setTimeout(() => {
      requestedMemberRowRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 50);

    return () => window.clearTimeout(scrollTimer);
  }, [loading, page, pagedMembers, requestedMemberId]);

function goToPage(value) {
  const requestedPage = Number(value);

  if (!requestedPage || requestedPage < 1) {
    setPage(1);
    return;
  }

  if (requestedPage > totalPages) {
    setPage(totalPages);
    return;
  }

  setPage(requestedPage);
}
  if (loading) {
    return <LoadingScreen subtitle="Loading Member Ratings..." />;
  }

  return (
    <main className="min-h-screen bg-slate-100 px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
      <div className="mx-auto max-w-7xl">
        <AppHeader
          title="Season Ratings"
          subtitle="Manage each player's season-specific doubles and age-based ratings."
        />

        <div className="rounded-2xl bg-white p-4 shadow sm:p-6">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              Ratings Filters
            </h2>

            <div className="rounded-xl bg-slate-900 px-5 py-3 text-white sm:text-right">
              <div className="text-xs uppercase tracking-wide text-slate-300">
                Players
              </div>
              <div className="text-2xl font-bold">{filteredMembers.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Season
              </label>

              <select
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select Season</option>

                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Search Players
              </label>

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, location, or DUPR ID"
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedSeason(seasons?.[0]?.id || "");
                  setShowCurrentRosterOnly(false);
                  setShowMissingDoublesOnly(false);
                  setShowNrDoublesOnly(false);
                  setShowNrAgeOnly(false);
                  setShowInvalidDuprIdsOnly(false);
                  setPage(1);
                }}
                className="w-full rounded-xl bg-slate-200 px-4 py-3 font-semibold hover:bg-slate-300"
              >
                Clear Filters
              </button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowCurrentRosterOnly((value) => !value)}
              className={`rounded-xl px-4 py-3 font-semibold ${
                showCurrentRosterOnly
                  ? "bg-emerald-700 text-white hover:bg-emerald-800"
                  : "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
              }`}
            >
              {showCurrentRosterOnly ? "Show All Players" : "Current Rosters Only"}
            </button>

            <button
              type="button"
              onClick={() => setShowMissingDoublesOnly((value) => !value)}
              className={`rounded-xl px-4 py-3 font-semibold ${
                showMissingDoublesOnly
                  ? "bg-amber-600 text-white hover:bg-amber-700"
                  : "bg-amber-100 text-amber-950 hover:bg-amber-200"
              }`}
            >
              {showMissingDoublesOnly ? "Show All Ratings" : "Missing DUPR Doubles Rating"}
            </button>

            <button
              type="button"
              onClick={() => setShowNrDoublesOnly((value) => !value)}
              className={`rounded-xl px-4 py-3 font-semibold ${
                showNrDoublesOnly
                  ? "bg-red-700 text-white hover:bg-red-800"
                  : "bg-red-100 text-red-900 hover:bg-red-200"
              }`}
            >
              NR DUPR Rating
            </button>

            <button
              type="button"
              onClick={() => setShowNrAgeOnly((value) => !value)}
              className={`rounded-xl px-4 py-3 font-semibold ${
                showNrAgeOnly
                  ? "bg-purple-700 text-white hover:bg-purple-800"
                  : "bg-purple-100 text-purple-900 hover:bg-purple-200"
              }`}
            >
              NR Age-Based Rating
            </button>

            <button
              type="button"
              onClick={() => setShowInvalidDuprIdsOnly((value) => !value)}
              className={`rounded-xl px-4 py-3 font-semibold ${
                showInvalidDuprIdsOnly
                  ? "bg-slate-800 text-white hover:bg-slate-900"
                  : "bg-slate-200 text-slate-900 hover:bg-slate-300"
              }`}
            >
              Missing / Invalid DUPR ID
            </button>

            <button
              type="button"
              onClick={() => setShowRatingImportTools((value) => !value)}
              className={`rounded-xl px-4 py-3 font-semibold ${
                showRatingImportTools
                  ? "bg-blue-700 text-white hover:bg-blue-800"
                  : "bg-blue-100 text-blue-900 hover:bg-blue-200"
              }`}
            >
              {showRatingImportTools ? "Hide Data Tools" : "Data Tools"}
            </button>
          </div>
        </div>

        {showRatingImportTools && (
        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Ratings Import
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Import a CSV with member name/email, DUPR ID, doubles rating, reliability rating, and age-based rating for the selected season.
              </p>
              <p className="mt-1 text-xs text-slate-500">
                DUPR IDs are only written when the member does not already have one.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <label className="cursor-pointer rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white hover:bg-slate-800">
                Upload Ratings CSV
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleRatingsImportFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={applyRatingsImport}
                disabled={isImportingRatings || ratingImportRows.filter((row) => row.action === "ready").length === 0}
                className="rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isImportingRatings ? "Importing..." : "Apply Ratings Import"}
              </button>
            </div>

            <div className="flex items-end">
              <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={cleanRatingsForSelectedSeason}
                  disabled={!selectedSeason || ratingsLoading || isCleaningRatings || ratings.length === 0}
                  className="rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCleaningRatings ? "Cleaning..." : "Clean Ratings"}
                </button>

                <button
                  type="button"
                  onClick={deleteRatingsForSelectedSeason}
                  disabled={
                    !selectedSeason ||
                    ratingsLoading ||
                    isDeletingSeasonRatings ||
                    ratings.length === 0
                  }
                  className="rounded-xl bg-red-700 px-4 py-3 font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingSeasonRatings
                    ? "Deleting..."
                    : "Delete Season Ratings"}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 rounded-2xl border border-blue-200 bg-white p-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Copy From Season
              </label>
              <select
                value={copySourceSeason}
                onChange={(e) => setCopySourceSeason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select Source Season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">
                Copy To Season
              </label>
              <select
                value={copyTargetSeason}
                onChange={(e) => setCopyTargetSeason(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-3"
              >
                <option value="">Select Target Season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={copyRatingsBetweenSeasons}
              disabled={isCopyingRatings || !copySourceSeason || !copyTargetSeason}
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isCopyingRatings ? "Copying..." : "Copy Ratings"}
            </button>
          </div>

          {ratingImportStatus && (
            <div className="mt-3 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-slate-700">
              {ratingImportStatus}
            </div>
          )}

          {ratingImportRows.length > 0 && (
            <div className="mt-4 overflow-x-auto rounded-xl bg-white">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-slate-900 text-xs uppercase tracking-wide text-white">
                  <tr>
                    <th className="p-3 text-left">Row</th>
                    <th className="p-3 text-left">Status</th>
                    <th className="p-3 text-left">Member</th>
                    <th className="p-3 text-left">Email</th>
                    <th className="p-3 text-left">DUPR ID</th>
                    <th className="p-3 text-left">DUPR Doubles</th>
                    <th className="p-3 text-left">Reliability</th>
                    <th className="p-3 text-left">Age-Based</th>
                    <th className="p-3 text-left">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {ratingImportRows.slice(0, 50).map((row) => (
                    <tr key={row.rowNumber} className="border-b border-slate-100">
                      <td className="p-3">{row.rowNumber}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-bold uppercase ${
                          row.action === "ready" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {row.action}
                        </span>
                      </td>
                      <td className="p-3 font-semibold text-slate-900">{row.memberName}</td>
                      <td className="p-3">{row.email}</td>
                      <td className="p-3">{row.duprId}{row.shouldUpdateDuprId ? " (will update)" : ""}</td>
                      <td className="p-3">{row.duprDoublesRating ?? ""}</td>
                      <td className="p-3">{row.duprReliabilityRating ?? ""}</td>
                      <td className="p-3">{row.ageRating ?? ""}</td>
                      <td className="p-3 text-slate-600">{row.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {ratingImportRows.length > 50 && (
                <div className="px-4 py-3 text-sm text-slate-500">
                  Showing first 50 preview rows.
                </div>
              )}
            </div>
          )}
        </div>
        )}

        <div className="mt-6 rounded-2xl bg-white shadow">
          <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-slate-600">
              Showing{" "}
              <span className="font-semibold text-slate-900">
                {filteredMembers.length === 0
                  ? 0
                  : (page - 1) * PAGE_SIZE + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-900">
                {Math.min(page * PAGE_SIZE, filteredMembers.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-900">
                {filteredMembers.length}
              </span>{" "}
              players
              {ratingsLoading ? " - loading ratings..." : ""}
              <span className="ml-2 inline-flex whitespace-nowrap rounded-full bg-blue-100 px-3 py-1 text-sm font-black uppercase text-blue-900">
                Based on the {selectedSeasonLabel()}
              </span>
            </div>

            <div className="flex justify-start md:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="text-sm font-semibold text-slate-700">
                  Page {page} of {totalPages}
                </div>

                <input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={page}
                  onChange={(e) => goToPage(e.target.value)}
                  className="w-20 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                />

                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-[68vh] overflow-auto overscroll-contain md:max-h-none md:overflow-visible">
            <table className="min-w-[1120px] md:min-w-full">
            <thead className="bg-slate-900 text-sm uppercase tracking-wide text-white">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("name", memberSort)} data-sort-indicator={sortIndicator("name")}>
                  <SortHeader
                    active={memberSort.field === "name"}
                    direction={memberSort.direction}
                    label="Player"
                    onClick={() => toggleMemberSort("name")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("created_at", memberSort)} data-sort-indicator={sortIndicator("created_at")}>
                  <SortHeader
                    active={memberSort.field === "created_at"}
                    direction={memberSort.direction}
                    label="Added"
                    onClick={() => toggleMemberSort("created_at")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("dupr_id", memberSort)} data-sort-indicator={sortIndicator("dupr_id")}>
                  <SortHeader
                    active={memberSort.field === "dupr_id"}
                    direction={memberSort.direction}
                    label="DUPR ID"
                    onClick={() => toggleMemberSort("dupr_id")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("dupr_doubles_rating", memberSort)} data-sort-indicator={sortIndicator("dupr_doubles_rating")}>
                  <SortHeader
                    active={memberSort.field === "dupr_doubles_rating"}
                    direction={memberSort.direction}
                    label="DUPR Doubles"
                    onClick={() => toggleMemberSort("dupr_doubles_rating")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("dupr_reliability_rating", memberSort)} data-sort-indicator={sortIndicator("dupr_reliability_rating")}>
                  <SortHeader
                    active={memberSort.field === "dupr_reliability_rating"}
                    direction={memberSort.direction}
                    label="Reliability Rating"
                    onClick={() => toggleMemberSort("dupr_reliability_rating")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("season_dupr_rating", memberSort)} data-sort-indicator={sortIndicator("season_dupr_rating")}>
                  <SortHeader
                    active={memberSort.field === "season_dupr_rating"}
                    direction={memberSort.direction}
                    label="Season DUPR"
                    onClick={() => toggleMemberSort("season_dupr_rating")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left" aria-sort={sortAria("season_primetime_rating", memberSort)} data-sort-indicator={sortIndicator("season_primetime_rating")}>
                  <SortHeader
                    active={memberSort.field === "season_primetime_rating"}
                    direction={memberSort.direction}
                    label="Age-Based"
                    onClick={() => toggleMemberSort("season_primetime_rating")}
                  />
                </th>
                <th className="sticky top-0 z-20 bg-slate-900 px-4 py-4 text-left">DUPR Notes</th>
              </tr>
            </thead>

            <tbody>
              {pagedMembers.map((member) => {
                const missingDoublesRating = !hasDoublesRating(member.id);

                return (
                  <tr
                    key={member.id}
                    ref={String(member.id) === String(requestedMemberId) ? requestedMemberRowRef : null}
                    className={`border-b border-slate-100 ${
                      String(member.id) === String(requestedMemberId)
                        ? "bg-blue-50 ring-2 ring-inset ring-blue-300 hover:bg-blue-100"
                        : missingDoublesRating
                        ? "bg-amber-50 hover:bg-amber-100"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 font-semibold text-slate-900">
                          {member.last_name}, {member.first_name}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => copyMemberName(member)}
                            aria-label={`Copy name for ${member.first_name} ${member.last_name}`}
                            title="Copy name"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                          >
                            <CopyIcon />
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (confirmUnsavedChanges()) router.push(`/members/${member.id}`);
                            }}
                            aria-label={`Edit member ${member.first_name} ${member.last_name}`}
                            title="Edit member"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-blue-800 hover:bg-blue-200"
                          >
                            <EditIcon />
                          </button>
                        </div>
                      </div>

                    </td>

                    <td className="px-4 py-4 text-sm text-slate-700">
                      {formatMemberCreatedAt(member.created_at)}
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-dupr-id`}
                        type="text"
                        defaultValue={member.dupr_id || ""}
                        onBlur={(e) => {
                          const cleanValue = e.target.value.trim();
                          e.target.value = cleanValue;
                          updateMemberDuprId(member.id, cleanValue);
                        }}
                        className="w-28 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="DUPR ID"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-${selectedSeason}-dupr-doubles`}
                        type="text"
                        defaultValue={getRating(member.id, "dupr_doubles_rating")}
                        onBlur={(e) => {
                          const cleanValue = normalizeRatingInput("dupr_doubles_rating", e.target.value);
                          e.target.value = cleanValue ?? "";
                          updateRating(
                            member.id,
                            "dupr_doubles_rating",
                            e.target.value
                          );
                        }}
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="3.999 or NR"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-${selectedSeason}-dupr-reliability`}
                        type="number"
                        step="0.01"
                        defaultValue={getRating(member.id, "dupr_reliability_rating")}
                        onBlur={(e) => {
                          const cleanValue = normalizeRatingInput("dupr_reliability_rating", e.target.value);
                          e.target.value = cleanValue ?? "";
                          updateRating(
                            member.id,
                            "dupr_reliability_rating",
                            e.target.value
                          );
                        }}
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="60"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-${selectedSeason}-season-dupr`}
                        type="number"
                        step="0.01"
                        defaultValue={getRating(member.id, "season_dupr_rating")}
                        onBlur={(e) => {
                          const cleanValue = normalizeRatingInput("season_dupr_rating", e.target.value);
                          e.target.value = cleanValue ?? "";
                          updateRating(
                            member.id,
                            "season_dupr_rating",
                            e.target.value
                          );
                        }}
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="3.50"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <input
                        key={`${member.id}-${selectedSeason}-age`}
                        type="number"
                        step="0.01"
                        defaultValue={getRating(
                          member.id,
                          "season_primetime_rating"
                        )}
                        onBlur={(e) =>
                          updateRating(
                            member.id,
                            "season_primetime_rating",
                            e.target.value
                          )
                        }
                        className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                        placeholder="3.50"
                      />
                    </td>

                    <td className="px-4 py-4">
                      <textarea
                        key={`${member.id}-${selectedSeason}-dupr-notes`}
                        defaultValue={getRating(member.id, "notes")}
                        onBlur={(e) =>
                          updateRating(
                            member.id,
                            "notes",
                            e.target.value
                          )
                        }
                        className="min-h-16 w-48 resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm"
                        placeholder="DUPR notes"
                      />
                    </td>
                  </tr>
                );
              })}
              {pagedMembers.length === 0 && (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    No players found.
                  </td>
                </tr>
              )}
            </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-4">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <div className="text-sm font-semibold text-slate-700">
              Page {page} of {totalPages}
            </div>

            <input
              type="number"
              min="1"
              max={totalPages}
              value={page}
              onChange={(e) => goToPage(e.target.value)}
              className="w-20 rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

function SortHeader({ active, direction, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex flex-col items-start gap-1 rounded-lg px-2 py-1 text-left font-black text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-300"
    >
      <span className={`rounded-full px-2 py-0.5 text-[10px] ${active ? "bg-blue-300 text-slate-950" : "bg-white/10 text-slate-300"}`}>
        {active ? (direction === "asc" ? "ASC" : "DESC") : "SORT"}
      </span>
      <span>{label}</span>
    </button>
  );
}

function CopyIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="8" y="8" width="11" height="11" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 20h9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function sortAria(field, memberSort) {
  if (memberSort.field !== field) return "none";
  return memberSort.direction === "asc" ? "ascending" : "descending";
}

async function loadAllRatingRosterRows() {
  const pageSize = 1000;
  let from = 0;
  const rows = [];

  while (true) {
    const { data, error } = await supabase
      .from("team_members")
      .select(`
        member_id,
        teams (
          id,
          is_active
        )
      `)
      .range(from, from + pageSize - 1);

    if (error) return { rows: [], error };

    rows.push(...(data || []));

    if (!data || data.length < pageSize) break;

    from += pageSize;
  }

  return { rows, error: null };
}

function parseCsv(text) {
  const lines = text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .filter((line) => line.trim() !== "");

  if (lines.length === 0) return [];

  const headers = splitCsvLine(lines[0]);

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] || "";
    });

    return row;
  });
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      i++;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function parseReliabilityThreshold(value) {
  const text = String(value || "").trim();
  if (!text) return 0;

  const threshold = Number(text);
  if (Number.isNaN(threshold) || threshold < 0) return null;

  return threshold;
}

function cleanedSeasonDuprRating(rawValue, highestMaxRating, reliabilityValue = null, reliabilityThreshold = 0) {
  const text = String(rawValue ?? "").trim();
  const reliabilityNumber = Number(reliabilityValue);
  const hasLowReliability =
    Number(reliabilityThreshold || 0) > 0 &&
    reliabilityValue !== null &&
    reliabilityValue !== undefined &&
    String(reliabilityValue).trim() !== "" &&
    !Number.isNaN(reliabilityNumber) &&
    reliabilityNumber <= Number(reliabilityThreshold);

  if (hasLowReliability || text.toUpperCase() === "NR") {
    const maxRating = Number(highestMaxRating);
    if (Number.isNaN(maxRating) || maxRating <= 0) return null;

    return truncateToTenth(maxRating - 0.5);
  }

  if (!text) return null;

  const numberValue = Number(text);
  if (Number.isNaN(numberValue)) return null;

  return truncateToTenth(numberValue);
}

function truncateToTenth(value) {
  return Math.trunc(Number(value) * 10) / 10;
}


