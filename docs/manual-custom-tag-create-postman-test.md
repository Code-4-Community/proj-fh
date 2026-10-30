# Manual custom tag creation test with Postman

This guide tests custom "Other" tags sent with `POST /api/resources`. It
confirms the custom tags are created from their group's "Other" template,
attached to the resource, and reused when the same text is sent again.

Use a local/development database only. This guide follows
[manual-resource-create-postman-test.md](./manual-resource-create-postman-test.md);
complete that guide's sections 1 and 2 first (migrations, running the backend,
and getting your Cognito ID token).

## 1. How custom tags work

Some groups end with an "Other" option that lets the user type free text. In
the database each of these is a template tag (`allows_free_text = true`, slug
`other`). Clients never send a template tag's ID. Instead they send
`custom_tags` with the group and the typed text, and the backend:

1. Finds the group's template tag.
2. Creates a new tag (`is_custom = true`, `other_text` = the typed text, slug
   `other-<text-as-slug>`) in the same transaction as the resource, or reuses
   the existing custom tag with the same slug in that group.
3. Adds the custom tag's ID to the resource's `tags`.

## 2. Confirm the starting state

In `psql`:

```sql
\x off

SELECT COUNT(*) FROM tags;
```

On a fresh database, expect:

```text
 count
-------
   141
(1 row)
```

```sql
SELECT COUNT(*) FROM tags WHERE is_custom = true;
```

```text
 count
-------
     0
(1 row)
```

If your counts differ, note them; the later checks are relative to them (this
test adds 3 tag rows).

Find the template IDs, which you will use in the error test in section 6:

```sql
SELECT tag_id, category, "group", slug
FROM tags
WHERE allows_free_text = true
ORDER BY tag_id;
```

On a fresh database, expect 8 rows (one per group that accepts custom text):

```text
 tag_id |  category   |         group          | slug
--------+-------------+------------------------+-------
     31 | food_access | frequency              | other
     ...
(8 rows)
```

Only the `frequency` row (`31`) is needed below.

## 3. Create a resource with custom tags

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
  "organization_name": "Postman Custom Tag Test Pantry",
  "program_name": "Postman Custom Tag Test Program",
  "category": "food_access",
  "address": "123 Test Street, Boston, MA 02118",
  "county": "Suffolk",
  "zip_code": "02118",
  "phone": "(617) 555-0100",
  "email": "postman-custom-tag-test@example.org",
  "website": "https://example.org/postman-custom-tag-test",
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
  "program_notes": "Open twice a week.",
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
  "tags": [1, 15, 24, 32, 55, 71, 77, 84, 93, 100, 112, 130],
  "custom_tags": [
    { "group": "frequency", "other_text": "Twice a week" },
    { "group": "population", "other_text": "Refugee families" },
    { "group": "required_documentation", "other_text": "Proof of address letter" }
  ]
}
```

This is the body from the first guide with two differences:

- The seeded `weekly` tag (`27`) is removed from `tags`, because `frequency` is
  single-select and the custom frequency answer takes its place.
- Three `custom_tags` are added. `population` is multi-select, so the seeded
  "General population" tag (`55`) stays alongside the custom population.

Do not put the template "Other" tag IDs in `tags`.

## 4. Expected response

Expect `201 Created`. The generated IDs and timestamps will vary. The important
parts:

```json
{
  "resource_id": 124,
  "score_id": 457,
  "organization_name": "Postman Custom Tag Test Pantry",
  "category": "food_access",
  "review_status": "pending_review",
  "tags": [1, 15, 24, 32, 55, 71, 77, 84, 93, 100, 112, 130, 142, 143, 144]
}
```

`tags` is the 12 IDs you sent followed by the 3 new custom tag IDs, in the
order of `custom_tags`. The new IDs continue the tag sequence; on a fresh
database they are `142`, `143`, `144`. If an earlier request failed after
creating tags, the sequence may have skipped numbers, so use whatever IDs your
response returned.

## 5. Verify rows in PostgreSQL

Turn on expanded display:

```sql
\x on
```

The custom tags that were created, in the same format as the first guide:

```sql
SELECT *
FROM tags
WHERE is_custom = true
ORDER BY tag_id;
```

```text
-[ RECORD 1 ]----+-----------------------------------------
tag_id           | 142
category         | food_access
group            | frequency
label            | Other
slug             | other-twice-a-week
allows_free_text | f
is_custom        | t
other_text       | Twice a week
-[ RECORD 2 ]----+-----------------------------------------
tag_id           | 143
category         | common
group            | population
label            | Other
slug             | other-refugee-families
allows_free_text | f
is_custom        | t
other_text       | Refugee families
-[ RECORD 3 ]----+-----------------------------------------
tag_id           | 144
category         | common
group            | required_documentation
label            | Other
slug             | other-proof-of-address-letter
allows_free_text | f
is_custom        | t
other_text       | Proof of address letter
```

Each custom tag copies its template's `category` and `label`
(`Other`), has `allows_free_text = f`, and stores the typed text in
`other_text`.

The latest resource and its tags:

```sql
SELECT resource_id, organization_name, tags
FROM resources
ORDER BY resource_id DESC
LIMIT 1;
```

```text
-[ RECORD 1 ]-----+------------------------------------------------------------
resource_id       | 124
organization_name | Postman Custom Tag Test Pantry
tags              | {1,15,24,32,55,71,77,84,93,100,112,130,142,143,144}
```

The tag rows overall:

```sql
\x off

SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE is_custom) AS custom
FROM tags;
```

```text
 total | custom
-------+--------
   144 |      3
(1 row)
```

## 6. Verify reuse and error handling

### Same text reuses the custom tag

Send the exact same request from section 3 again. Expect `201 Created` with
the same three custom IDs at the end of `tags` (`142`, `143`, `144`) and a new
`resource_id`. Then:

```sql
SELECT COUNT(*) AS total,
       COUNT(*) FILTER (WHERE is_custom) AS custom
FROM tags;
```

```text
 total | custom
-------+--------
   144 |      3
(1 row)
```

No new tag rows are created. Reuse matches on the group and the text's slug, so
`twice a week` or ` Twice  a Week ` would also reuse `142`.

### Sending the template ID is rejected

Change the request body so `tags` contains the `frequency` template ID from
section 2 (`31`) instead of a custom tag:

```json
"tags": [1, 15, 24, 31, 32, 55, 71, 77, 84, 93, 100, 112, 130],
"custom_tags": []
```

Expect `400 Bad Request`:

```json
{
  "message": "Tag ID(s) 31 are \"Other\" options and must be sent as custom_tags with text.",
  "error": "Bad Request",
  "statusCode": 400
}
```

No resource, score, or tag is created.

### Group rules still apply

With `custom_tags` containing `{ "group": "frequency", "other_text": "Twice a
week" }`, put the seeded `weekly` tag (`27`) back in `tags`. Expect `400 Bad
Request` with `Only one tag is allowed in the frequency group.`

### Rejected requests do not leave tags behind

Custom tags are created in the same transaction as the resource and score, so
after any `400` above the count query still returns `total = 144, custom = 3`
(a custom tag that was only part of the rejected request is rolled back).

## 7. Clean up

Each successful POST creates a resource and a score row. Remove only the test
rows after verifying them, using the IDs returned in the responses. The custom
tags can stay; they are reused by later tests.
