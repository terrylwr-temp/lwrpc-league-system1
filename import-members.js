require("dotenv").config();

const fs = require("fs");
const { parse } = require("csv-parse");
const { createClient } = require("@supabase/supabase-js");

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function getValue(row, key) {
  const normalizedKey = Object.keys(row).find(
    k => k.trim().toLowerCase() === key.toLowerCase()
  );
  return normalizedKey ? row[normalizedKey] : null;
}

async function importMembers() {
  const rows = [];

  fs.createReadStream("members.csv")
    .on("error", err => {
      console.error("Could not read members.csv:", err.message);
    })
    .pipe(parse({
      columns: true,
      trim: true,
      bom: true,
      relax_quotes: true
    }))
    .on("data", row => rows.push(row))
    .on("error", err => {
      console.error("CSV parse error:", err.message);
    })
    .on("end", async () => {
      console.log("CSV rows loaded:", rows.length);

      let inserted = 0;
      let updated = 0;
      let errors = 0;

      for (const row of rows) {
        const accountId = getValue(row, "Account ID");

        console.log("Processing:", getValue(row, "Account Name"), accountId);

        if (!accountId) {
          console.log("Skipped row with missing Account ID:", getValue(row, "Account Name"));
          errors++;
          continue;
        }

        const member = {
          membershipworks_account_id: accountId,
          full_name:
            getValue(row, "Account Name") ||
            `${getValue(row, "First Name") || ""} ${getValue(row, "Last Name") || ""}`.trim() ||
            null,
          first_name: getValue(row, "First Name") || null,
          last_name: getValue(row, "Last Name") || null,
          phone: getValue(row, "Contact Phone") || null,
          email: getValue(row, "Email") || null,
          club_location: getValue(row, "Club/Location") || null,
          self_rating: getValue(row, "Self Rating") || null,
          dupr_id: getValue(row, "DUPR ID") || null,
          member_comment: getValue(row, "Comment") || null,
          waiver_status: getValue(row, "Waiver (Click to see details)") || null,
          stripe_customer_id: getValue(row, "Stripe Customer ID") || null,
          profile_image_urls: getValue(row, "Profile gallery image URL")
            ? [getValue(row, "Profile gallery image URL")]
            : null,
          membership_levels: getValue(row, "LWR Pickleball Club Membership") || null,
          membership_addons: null,
          labels: null,
          billing_method: getValue(row, "Billing Method") || null,
          auto_recurring_billing_id: getValue(row, "Auto Billing ID") || null,
          ip_address: getValue(row, "IP Address") || null,
          last_imported_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        if (getValue(row, "Join Date")) {
          member.join_date = getValue(row, "Join Date");
        }

        if (getValue(row, "Renewal Date")) {
          member.renewal_date = getValue(row, "Renewal Date");
        }

        const { data: existingMember, error: lookupError } = await supabase
          .from("members")
          .select("id")
          .eq("membershipworks_account_id", accountId)
          .maybeSingle();

        if (lookupError) {
          console.log("Lookup error:", getValue(row, "Account Name"), lookupError.message);
          errors++;
          continue;
        }

        const result = existingMember
          ? await supabase
              .from("members")
              .update(member)
              .eq("membershipworks_account_id", accountId)
          : await supabase
              .from("members")
              .insert(member);

        if (result.error) {
          console.log("Error importing:", getValue(row, "Account Name"), result.error.message);
          errors++;
        } else if (existingMember) {
          updated++;
        } else {
          inserted++;
        }
      }

      console.log("Import complete");
      console.log("Inserted:", inserted);
      console.log("Updated:", updated);
      console.log("Errors:", errors);
    });
}

importMembers();