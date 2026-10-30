# Manual resource creation test with Postman

This guide tests the authenticated resource-create endpoint and confirms the
resource, score, and selected seeded tags in PostgreSQL.

Use a local/development database only. Do not run pending migrations against
production as part of this test.

## 1. Apply migrations and start the backend

From the repository root, check which migrations are pending:

```powershell
yarn typeorm migration:show -d apps/backend/src/data-source.ts
```

If the output shows pending migrations, apply them to the local/development
database configured in `.env`:

```powershell
yarn migration:run
```

This runs every pending migration, not just the tag seed. Do not continue if
the configured database is not the local/development database you intend to
test.

Start the backend in another terminal:

```powershell
yarn nx serve backend
```

The API base URL is:

```text
http://localhost:3000/api
```

## 2. Get the correct JWT from the browser

The endpoint requires a Cognito **ID token**, not an access token. The backend
checks the JWT signature, expiration, issuer, app-client audience,
`token_use: "id"`, and the `sub` and `email` claims.

In the browser where you are signed in:

1. Open Developer Tools → **Network**.
2. Find a request to `/api/auth/me` (reload or navigate if necessary).
3. Inspect **Request Headers** and copy the value after `Bearer ` in
   `Authorization`.
4. Do not paste the token into chat, a shared document, or a committed file.
   Treat it like a password.

If there is no `/api/auth/me` request, inspect the browser's Application/Storage
view for the Cognito **ID token** (`idToken`); Amplify's storage key can vary.
You can decode a copy locally to check the payload, but decoding does not
verify the signature. The payload should look approximately like this:

```json
{
  "iss": "https://cognito-idp.<region>.amazonaws.com/<user-pool-id>",
  "aud": "<cognito-app-client-id>",
  "token_use": "id",
  "sub": "<cognito-user-id>",
  "email": "your-user@example.org",
  "iat": 1790000000,
  "exp": 1790003600
}
```

The timestamps and identity values above are examples. Do not edit or construct
a JWT yourself; use the ID token issued by the logged-in frontend.

In Postman, either set **Authorization → Bearer Token** and paste the ID token,
or add this header manually:

```text
Authorization: Bearer <your-cognito-id-token>
```

Before creating a resource, confirm that the token maps to an application user:

```http
GET http://localhost:3000/api/auth/me
```

Use the same bearer token. Expect `200 OK` with a user object containing
`email`, `firstName`, and `lastName`. If it returns `403`, the email in the
token does not have a corresponding user row; resource creation will also
return `403`.

## 3. Confirm the seeded tag IDs

On a fresh database, the seed migration assigns the following IDs. Check that
the IDs and slugs match your database before using them. Since some selected
tags belong to the shared `common` category, use the ID lookup endpoint rather
than filtering only by `food_access`:

```http
POST http://localhost:3000/api/tags/findByIds
Content-Type: application/json
```

Send this JSON array as the request body:

```json
[1, 15, 24, 27, 32, 55, 71, 77, 84, 93, 100, 112, 130]
```

The endpoint returns tag objects with `tag_id`, `group`, `label`, and `slug`.
For this example, the expected rows are:

| ID | Group | Slug |
|---:|---|---|
| 1 | `food_assistance_type` | `food-pantry` |
| 15 | `food_type` | `produce` |
| 24 | `pricing` | `free` |
| 27 | `frequency` | `weekly` |
| 32 | `program_observation` | `food-appeared-organized` |
| 55 | `population` | `general-population` |
| 71 | `contact_method` | `phone-call` |
| 77 | `intake_process` | `walk-ins-accepted` |
| 84 | `required_documentation` | `government-issued-id` |
| 93 | `estimated_wait_time` | `same-day` |
| 100 | `accessibility` | `near-public-transportation` |
| 112 | `cultural_competency` | `lgbtq-affirming-environment` |
| 130 | `red_flag` | `long-waitlist` |

These are the IDs from the migration's first run against an empty `tags` table.
If the returned IDs differ, use the `tag_id` values from the lookup response and
replace the numbers in the POST body's `tags` array. The backend verifies that
each tag exists and applies to the resource category.

## 4. Create a resource

In Postman, create a request:

```http
POST http://localhost:3000/api/resources
```

Set:

```text
Authorization: Bearer <your-cognito-id-token>
Content-Type: application/json
```

Choose **Body → raw → JSON** and send:

```json
{
  "organization_name": "Postman Test Food Pantry",
  "program_name": "Postman Test Weekly Pantry",
  "category": "food_access",
  "address": "123 Test Street, Boston, MA 02118",
  "county": "Suffolk",
  "zip_code": "02118",
  "phone": "(617) 555-0100",
  "email": "postman-test@example.org",
  "website": "https://example.org/postman-test",
  "public_fields": ["website", "phone", "email"],
  "eligibility": "Open to all Massachusetts residents.",
  "last_verified_date": "2025-01-15",
  "outreach_date": "2025-01-14",
  "staff_contact_name": "Pat Example",
  "staff_contact_role": "Pantry Coordinator",
  "responsiveness": 4,
  "response_time": "1_3_days",
  "interaction_notes": "Contacted by phone; staff responded promptly.",
  "accessibility_notes": "Near public transportation.",
  "program_notes": "Open weekly.",
  "red_flag_concerns": "Long waitlist reported.",
  "can_refer_directly": true,
  "has_referral_contact": true,
  "referral_contact": "Pat Example",
  "provides_followup": true,
  "referral_realistic": "yes",
  "referral_notes": "Call before referring.",
  "recommendation": "strongly_recommend",
  "strengths": "Welcoming staff and fresh produce.",
  "followup_needed": "Confirm holiday hours.",
  "overall_rating": 5,
  "tags": [1, 15, 24, 27, 32, 55, 71, 77, 84, 93, 100, 112, 130],
  "custom_tags": []
}
```

`resource_id`, `score_id`, `completed_by`, `review_status`, and timestamps are
server-managed; do not include them. `completed_by` is derived from the
authenticated user's first and last names. `overall_rating` is saved in a
separate score row.

## 5. Expected response

Expect `201 Created` and a JSON resource object. The generated IDs and
timestamps will vary. The important parts should look like:

```json
{
  "resource_id": 123,
  "score_id": 456,
  "organization_name": "Postman Test Food Pantry",
  "program_name": "Postman Test Weekly Pantry",
  "category": "food_access",
  "address": "123 Test Street, Boston, MA 02118",
  "county": "Suffolk",
  "zip_code": "02118",
  "phone": "(617) 555-0100",
  "email": "postman-test@example.org",
  "website": "https://example.org/postman-test",
  "public_fields": ["website", "phone", "email"],
  "eligibility": "Open to all Massachusetts residents.",
  "review_status": "pending_review",
  "last_verified_date": "2025-01-15",
  "completed_by": "<your first and last name>",
  "outreach_date": "2025-01-14",
  "responsiveness": 4,
  "response_time": "1_3_days",
  "tags": [1, 15, 24, 27, 32, 55, 71, 77, 84, 93, 100, 112, 130]
}
```

The response contains the resource's `score_id`; it does not include
`overall_rating`, which lives in the `scores` table. The example shows the
important fields; some optional fields or timestamps may also appear in the
response.

Common failures:

- `401 Unauthorized`: token missing, expired, or invalid.
- `403 Forbidden`: the ID token email has no matching user row.
- `400 Bad Request`: invalid field, enum, or tag ID/category.
- `500 Internal Server Error`: check the backend log and database connection.

## 6. Verify rows in PostgreSQL

In `psql`, turn on expanded display so each row prints one column per line
(easier to read than a very wide table). Run this once per session:

```sql
\x on
```

The latest resource is the one with the highest `resource_id` (a serial
column), so you do not need to copy IDs from the response:

```sql
SELECT *
FROM resources
ORDER BY resource_id DESC
LIMIT 1;
```

Expect output like this. `resource_id`, `score_id`, `completed_by`,
`created_at`, and `updated_at` will differ in your database:

```text
-[ RECORD 1 ]-------+-------------------------------------------------
resource_id         | 123
score_id            | 456
organization_name   | Postman Test Food Pantry
program_name        | Postman Test Weekly Pantry
category            | food_access
address             | 123 Test Street, Boston, MA 02118
county              | Suffolk
zip_code            | 02118
phone               | (617) 555-0100
email               | postman-test@example.org
website             | https://example.org/postman-test
public_fields       | {website,phone,email}
eligibility         | Open to all Massachusetts residents.
review_status       | pending_review
last_verified_date  | 2025-01-15
completed_by        | <your first and last name>
outreach_date       | 2025-01-14
staff_contact_name  | Pat Example
staff_contact_role  | Pantry Coordinator
responsiveness      | 4
response_time       | 1_3_days
interaction_notes   | Contacted by phone; staff responded promptly.
accessibility_notes | Near public transportation.
program_notes       | Open weekly.
red_flag_concerns   | Long waitlist reported.
can_refer_directly  | t
has_referral_contact| t
referral_contact    | Pat Example
provides_followup   | t
referral_realistic  | yes
referral_notes      | Call before referring.
recommendation      | strongly_recommend
strengths           | Welcoming staff and fresh produce.
followup_needed     | Confirm holiday hours.
needs_changes_notes |
submission_rejection_notes |
tags                | {1,15,24,27,32,55,71,77,84,93,100,112,130}
created_at          | 2026-10-30 17:00:00.123456-04
updated_at          | 2026-10-30 17:00:00.123456-04
```

`needs_changes_notes` and `submission_rejection_notes` are empty (NULL) because
they are set later by reviewers. The exact column alignment `psql` prints may
differ slightly.

Check the score that belongs to that same resource:

```sql
SELECT s.*
FROM scores AS s
WHERE s.score_id = (
  SELECT score_id FROM resources ORDER BY resource_id DESC LIMIT 1
);
```

```text
-[ RECORD 1 ]--+--
score_id       | 456
overall_rating | 5
```

Check the tags attached to the latest resource:

```sql
SELECT t.*
FROM tags AS t
WHERE t.tag_id IN (
  SELECT unnest(tags)
  FROM (
    SELECT tags FROM resources ORDER BY resource_id DESC LIMIT 1
  ) AS latest
)
ORDER BY t.tag_id;
```

Expect 13 records, one per ID in the request (still in `\x on` format):

```text
-[ RECORD 1 ]----+-----------------------------------------
tag_id           | 1
category         | food_access
group            | food_assistance_type
label            | Food pantry
slug             | food-pantry
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 2 ]----+-----------------------------------------
tag_id           | 15
category         | food_access
group            | food_type
label            | Produce
slug             | produce
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 3 ]----+-----------------------------------------
tag_id           | 24
category         | food_access
group            | pricing
label            | Free
slug             | free
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 4 ]----+-----------------------------------------
tag_id           | 27
category         | food_access
group            | frequency
label            | Weekly
slug             | weekly
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 5 ]----+-----------------------------------------
tag_id           | 32
category         | food_access
group            | program_observation
label            | Food appeared organized
slug             | food-appeared-organized
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 6 ]----+-----------------------------------------
tag_id           | 55
category         | common
group            | population
label            | General population
slug             | general-population
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 7 ]----+-----------------------------------------
tag_id           | 71
category         | common
group            | contact_method
label            | Phone call
slug             | phone-call
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 8 ]----+-----------------------------------------
tag_id           | 77
category         | common
group            | intake_process
label            | Walk-ins accepted
slug             | walk-ins-accepted
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 9 ]----+-----------------------------------------
tag_id           | 84
category         | common
group            | required_documentation
label            | Government-issued ID
slug             | government-issued-id
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 10 ]---+-----------------------------------------
tag_id           | 93
category         | common
group            | estimated_wait_time
label            | Same day
slug             | same-day
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 11 ]---+-----------------------------------------
tag_id           | 100
category         | common
group            | accessibility
label            | Near public transportation
slug             | near-public-transportation
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 12 ]---+-----------------------------------------
tag_id           | 112
category         | common
group            | cultural_competency
label            | LGBTQ+ affirming environment
slug             | lgbtq-affirming-environment
allows_free_text | f
is_custom        | f
other_text       |
-[ RECORD 13 ]---+-----------------------------------------
tag_id           | 130
category         | common
group            | red_flag
label            | Long waitlist
slug             | long-waitlist
allows_free_text | f
is_custom        | f
other_text       |
```

This test sends no custom tags, so no new tag rows should be added (the total
tag count stays at 141).

To confirm all predetermined tags are seeded, switch back to the normal table
layout and count them per group. `ROLLUP` adds the total as the last row:

```sql
\x off

SELECT COALESCE("group"::text, 'TOTAL') AS "group", COUNT(*) AS count
FROM tags
WHERE is_custom = false
GROUP BY ROLLUP ("group")
ORDER BY GROUPING("group"), 1;
```

On a fresh database, expect exactly:

```text
         group          | count
------------------------+-------
 accessibility          |    12
 contact_method         |     6
 cultural_competency    |    18
 estimated_wait_time    |     7
 food_assistance_type   |    14
 food_type              |     9
 frequency              |     6
 housing_service_type   |    13
 intake_process         |     7
 population             |    16
 pricing                |     2
 program_observation    |    10
 red_flag               |    12
 required_documentation |     9
 TOTAL                  |   141
(15 rows)
```

If this test creates duplicate test resources, each successful POST creates a
new resource and score row; remove only test rows after verifying them, using
their returned IDs.
