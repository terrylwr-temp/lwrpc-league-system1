# Read-only identity classification query

Used for the 2026-09-07 dry run. No emails/IDs are returned by the aggregate SELECT. To obtain a protected manual-review page, replace only the final SELECT as shown below; do not expose it through a browser RPC/public view. Eligibility is deliberately more conservative than structural completeness.

```sql
WITH a AS (
 SELECT id,lower(btrim(email)) e,email_confirmed_at,deleted_at,banned_until,is_anonymous,email_change
 FROM auth.users
), c AS (
 SELECT a.*,r.id rid,r.member_id linked,r.role ar,
  (SELECT count(*) FROM public.members m WHERE lower(btrim(m.email))=a.e) mc,
  (SELECT count(*) FROM a a2 WHERE a2.e=a.e) ac,
  (SELECT m.id FROM public.members m WHERE lower(btrim(m.email))=a.e ORDER BY m.id LIMIT 1) candidate
 FROM a LEFT JOIN public.user_roles r ON r.user_id=a.id
), d AS (
 SELECT c.*,m.is_active_member active,
  (SELECT count(*) FROM public.user_roles r WHERE r.member_id=c.candidate) rc,
  (SELECT count(*) FROM public.user_roles r WHERE r.member_id=c.candidate
    AND r.user_id IS NOT NULL AND r.user_id<>c.id) competitors,
  (SELECT count(*) FROM public.user_roles r WHERE r.member_id=c.candidate
    AND r.role IS DISTINCT FROM c.ar) different_roles
 FROM c LEFT JOIN public.members m ON m.id=c.candidate
), classified AS (
 SELECT *,CASE
  WHEN linked IS NOT NULL THEN CASE WHEN linked=candidate AND mc=1 AND competitors=0
    THEN 'A_COMPLETE' ELSE 'F_CONFLICT' END
  WHEN e IS NULL OR e='' OR e !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR email_confirmed_at IS NULL OR deleted_at IS NOT NULL OR banned_until>now()
    OR is_anonymous IS TRUE OR coalesce(email_change,'')<>'' THEN 'G_UNUSABLE_OR_UNVERIFIED'
  WHEN mc=0 THEN 'D_NO_MEMBER'
  WHEN mc>1 OR ac>1 THEN 'E_DUPLICATE'
  WHEN competitors>0 THEN 'F_CONFLICT'
  WHEN active IS DISTINCT FROM true THEN 'H_INACTIVE_MEMBER'
  WHEN rc>1 THEN 'H_MULTIPLE_ROLE_ROWS'
  WHEN rid IS NOT NULL AND rc=1 AND different_roles=0
    AND ar IN ('player','captain','club_pro','league_manager','commissioner') THEN 'C_SAFE_IDENTICAL_SPLIT'
  WHEN rid IS NOT NULL AND rc=0
    AND ar IN ('player','captain','club_pro','league_manager','commissioner') THEN 'B_SAFE_AUTH_ROW'
  WHEN rid IS NULL AND rc=1 AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.member_id=candidate
    AND r.user_id IS NULL AND r.role IN ('player','captain','club_pro','league_manager','commissioner')) THEN 'B_SAFE_MEMBER_ROW'
  WHEN rid IS NULL AND rc=0 THEN 'H_NO_EXISTING_ROLE'
  ELSE 'H_ROLE_REVIEW' END category
 FROM d
)
SELECT category,count(*) FROM classified GROUP BY category ORDER BY category;
```

Protected manual-review SELECT to append to the same CTE, using bound cursor `$1` (nullable UUID); returns no names/emails. The `candidate` is only a diagnostic candidate, never authority to repair when classification is held. Under duplicate matching it is a deterministic representative, not a selected identity.

```sql
SELECT id AS auth_user_id, rid AS auth_role_row_id, linked AS linked_member_id,
       candidate AS candidate_member_id, category
FROM classified
WHERE left(category,1) IN ('D','E','F','G','H')
  AND ($1::uuid IS NULL OR id>$1::uuid)
ORDER BY id LIMIT 25;
```
