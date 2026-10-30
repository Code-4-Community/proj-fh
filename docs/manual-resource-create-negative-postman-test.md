# Manual negative and edge-case tests for creating resources with Postman

This guide tests what `POST /api/resources` rejects, and what it accepts in
unusual-but-valid cases. Every rejected request should leave the database
unchanged.

Complete sections 1 and 2 of
[manual-resource-create-postman-test.md](./manual-resource-create-postman-test.md)
first (migrations, running the backend, and getting your Cognito ID token).
The tag IDs below assume a freshly seeded `tags` table; confirm them with the
lookup in section 3 of that guide.

Use a local/development database only.

## 1. Setup

### Baseline counts

In `psql`, before you start and after every test, run:

```sql
\x off

SELECT (SELECT COUNT(*) FROM resources) AS resources,
       (SELECT COUNT(*) FROM scores)    AS scores,
       (SELECT COUNT(*) FROM tags)      AS tags;
```

On a fresh database, expect:

```text
 resources | scores | tags
-----------+--------+------
         0 |      0 |  141
(1 row)
```

Write down your numbers. Every test below says whether they should change.
Counts are what you compare; serial IDs are not (a rolled-back insert still
consumes a number, so IDs can skip).

### Base request

All tests send `POST http://localhost:3000/api/resources` with:

```text
Authorization: Bearer <your-cognito-id-token>
Content-Type: application/json
```

and this **base body**. Each test says which fields to change:

```json
{
  "organization_name": "Postman Negative Test Pantry",
  "program_name": "Postman Negative Test Program",
  "category": "food_access",
  "address": "123 Test Street, Boston, MA 02118",
  "county": "Suffolk",
  "zip_code": "02118",
  "phone": "(617) 555-0100",
  "email": "postman-negative-test@example.org",
  "website": "https://example.org/postman-negative-test",
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

Errors from the backend have this shape; only `message` differs:

```json
{
  "message": "County must be a valid Massachusetts county.",
  "error": "Bad Request",
  "statusCode": 400
}
```

## 2. Authentication and access

| # | Change | Expected status | Expected `message` |
|---|---|---|---|
| 2.1 | Remove the `Authorization` header | `401` | `Unauthorized` |
| 2.2 | Use the Cognito **access token** instead of the ID token | `401` | `A Cognito ID token is required.` |
| 2.3 | Edit one character of the token (it is signed, so this breaks it) | `401` | `Unauthorized` |
| 2.4 | Use an **expired** ID token (wait out its lifetime, or reuse an old one) | `401` | `Unauthorized` |
| 2.5 | Use a valid ID token for an email that has **no row in the backend `users` table** (for example a second Cognito account that was never added) | `403` | `No user record exists for <that email>.` |

Baseline counts must not change for any of these. The validation tests that
follow run after authentication, so authentication failures never reach them.

## 3. Field validation

Each row changes one field in the base body. All expect `400 Bad Request` and
unchanged baseline counts.

| # | Change | Expected `message` |
|---|---|---|
| 3.1 | `"county": "Atlantis"` | `County must be a valid Massachusetts county.` |
| 3.2 | `"zip_code": "2118"` | `Zip code must be a 5-digit or ZIP+4 code.` |
| 3.3 | `"responsiveness": 6` | `Responsiveness must be an integer from 1 to 5.` |
| 3.4 | `"overall_rating": 6` | `Overall rating must be an integer from 1 to 5.` |
| 3.5 | Delete the `staff_contact_name` line | `Staff contact name is required and must be at most 255 characters.` |
| 3.6 | `"public_fields": ["website", "fax"]` | `Public fields must be a list of: website, phone, email, address.` |
| 3.7 | `"category": "transport"` | `Category must be one of: food_access, housing, other.` |
| 3.8 | `"email": "not-an-email"` | `Email must be a valid email address.` |
| 3.9 | `"last_verified_date": "2025-13-40"` | `Last verified date must be a valid date, e.g. 2026-10-05.` |
| 3.10 | `"can_refer_directly": "yes"` | `Can refer directly must be true or false.` |
| 3.11 | `"tags": "1,15"` | `Tags must be a list of integer tag IDs.` |

## 4. Tag rules

Each row changes `tags` (and sometimes `custom_tags`) in the base body. All
expect `400 Bad Request` and unchanged baseline counts.

| # | Change | Expected `message` |
|---|---|---|
| 4.1 | Wrong category: add housing tag `42` to `tags` | `Tag ID(s) 42 do not apply to food_access resources.` |
| 4.2 | Nonexistent tag: add `9999` to `tags` | `Tag ID(s) not found: 9999.` |
| 4.3 | Single-select group: send both `27` (weekly) and `28` (biweekly) | `Only one tag is allowed in the frequency group.` |
| 4.4 | Single-select group: send both `93` (same day) and `94` | `Only one tag is allowed in the estimated_wait_time group.` |
| 4.5 | Row group: send both `100` (near public transportation) and `101` (its "unsure" answer) | `Only one answer (yes, unsure or inapplicable) is allowed per row in accessibility: near-public-transportation.` |
| 4.6 | Template ID: add `31` (frequency "Other") | `Tag ID(s) 31 are "Other" options and must be sent as custom_tags with text.` |

If you set both `27` and `28`, check the message names whichever single-select
group is violated; you only need one of them to fail per request.

### Custom tag edge cases

Use the base body (`tags` as given) and set only `custom_tags`. All expect
`400 Bad Request` and unchanged baseline counts.

| # | `custom_tags` | Expected `message` |
|---|---|---|
| 4.7 | `[{ "group": "population", "other_text": "" }]` | `Custom tag text is required and must be at most 255 characters.` |
| 4.8 | `[{ "group": "population", "other_text": "!!!" }]` | `Custom tag text for group population must contain letters or numbers.` |
| 4.9 | `[{ "group": "pricing", "other_text": "Sliding scale" }]` (pricing has no "Other" option) | `The pricing group does not accept custom text.` |
| 4.10 | `[{ "group": "housing_service_type", "other_text": "Tiny homes" }]` on this food resource | `The housing_service_type group does not apply to food_access resources.` |
| 4.11 | `[{ "group": "nonsense", "other_text": "x" }]` | `Custom tag group must be one of: ` followed by the group list |
| 4.12 | `other_text` of 256 characters | `Custom tag text is required and must be at most 255 characters.` |

Also remember from the custom-tag guide: sending `frequency` custom text while
`27` stays in `tags` is rejected as `Only one tag is allowed in the frequency group.`

## 5. Duplicate tag IDs are accepted

Set `"tags": [1, 1, 15, 15, 24, 27, 32, 55, 71, 77, 84, 93, 100, 112, 130]`.

Expect `201 Created`, and the response `tags` array has each ID once:

```json
"tags": [1, 15, 24, 27, 32, 55, 71, 77, 84, 93, 100, 112, 130]
```

Baseline counts: `resources` and `scores` each go up by `1`; `tags` is
unchanged. Remember this resource when you clean up (section 10).

## 6. A failed request leaves nothing behind

Custom tags, the score, and the resource are created in one transaction. To
prove a failure rolls back the custom tag that was created before it:

1. Record the baseline counts.
2. Send the base body with:

   ```json
   "tags": [1, 15, 24, 27, 32, 55, 71, 77, 84, 93, 100, 112, 130, 9999],
   "custom_tags": [
     { "group": "population", "other_text": "Rollback test group" }
   ]
   ```

3. Expect `400 Bad Request` with `Tag ID(s) not found: 9999.`
4. Re-run the baseline counts. All three numbers are unchanged:

   ```text
    resources | scores | tags
   -----------+--------+------
            1 |      1 |  141
   (1 row)
   ```

   (`1` in the first two columns here comes from the section 5 resource; your
   numbers should equal your own earlier baseline.)

5. Confirm the custom tag was not kept:

   ```sql
   SELECT COUNT(*) FROM tags WHERE other_text = 'Rollback test group';
   ```

   ```text
    count
   -------
        0
   (1 row)
   ```

## 7. Server-managed fields are ignored

Send the base body plus fields the server controls. Replace `<existing_id>` with
the `resource_id` of a resource you already created:

```json
"resource_id": <existing_id>,
"score_id": 1,
"review_status": "approved_published",
"completed_by": "Someone Else",
"needs_changes_notes": "injected note",
"submission_rejection_notes": "injected note",
"created_at": "2000-01-01T00:00:00.000Z"
```

Expect `201 Created`, and in the response:

- `resource_id` is a **new** ID, not `<existing_id>`.
- `review_status` is `pending_review`.
- `completed_by` is your own first and last name.
- `needs_changes_notes` and `submission_rejection_notes` are `null` (or absent).
- `created_at` is the current time, not 2000.

Then in `psql` confirm the original resource was not touched:

```sql
\x on

SELECT resource_id, score_id, completed_by, review_status, needs_changes_notes, created_at
FROM resources
WHERE resource_id = <existing_id>;
```

Expect its original values, not the injected ones. Baseline counts: `resources`
and `scores` each go up by `1`.

## 8. Housing resource

Everything so far used `food_access`. A housing resource uses housing tags and
cannot use food tags.

Send the base body with `"category": "housing"` and:

```json
"organization_name": "Postman Housing Test Org",
"program_name": "Postman Housing Test Program",
"tags": [42, 51, 55, 71, 77, 84, 93, 100, 112, 130],
"custom_tags": []
```

Here `42` is Emergency shelter and `51` is LGBTQ+-affirming housing, both in
`housing_service_type` (multi-select). The rest are `common` tags.

Expect `201 Created`, `"category": "housing"` and the same `tags` array.
Verify:

```sql
\x on

SELECT resource_id, organization_name, category, tags
FROM resources
ORDER BY resource_id DESC
LIMIT 1;
```

```text
-[ RECORD 1 ]-----+---------------------------------------
resource_id       | <new id>
organization_name | Postman Housing Test Org
category          | housing
tags              | {42,51,55,71,77,84,93,100,112,130}
```

Then send the same body but with a food tag, `"tags": [1, 55]`. Expect `400`:
`Tag ID(s) 1 do not apply to housing resources.`

## 9. Minimal body

Send only the fields that are required, with no optional fields at all. Use a
`tags` of `[]` so no tag lookup is needed:

```json
{
  "organization_name": "Postman Minimal Test",
  "program_name": "Postman Minimal Program",
  "category": "food_access",
  "county": "Suffolk",
  "zip_code": "02118",
  "last_verified_date": "2025-01-15",
  "outreach_date": "2025-01-14",
  "staff_contact_name": "Pat Example",
  "staff_contact_role": "Coordinator",
  "responsiveness": 3,
  "response_time": "same_day",
  "interaction_notes": "Notes.",
  "accessibility_notes": "Notes.",
  "red_flag_concerns": "None.",
  "can_refer_directly": false,
  "has_referral_contact": false,
  "provides_followup": false,
  "referral_realistic": "maybe",
  "referral_notes": "Notes.",
  "recommendation": "needs_review",
  "strengths": "Notes.",
  "followup_needed": "Notes.",
  "overall_rating": 3,
  "tags": []
}
```

Expect `201 Created`. Verify the defaults:

```sql
\x on

SELECT *
FROM resources
ORDER BY resource_id DESC
LIMIT 1;
```

```text
-[ RECORD 1 ]-------------+-------------------------------------------------
resource_id               | <new id>
score_id                  | <new id>
organization_name         | Postman Minimal Test
program_name              | Postman Minimal Program
category                  | food_access
address                   |
county                    | Suffolk
zip_code                  | 02118
phone                     |
email                     |
website                   |
public_fields             | {}
eligibility               |
review_status             | pending_review
last_verified_date        | 2025-01-15
completed_by              | <your first and last name>
outreach_date             | 2025-01-14
staff_contact_name        | Pat Example
staff_contact_role        | Coordinator
responsiveness            | 3
response_time             | same_day
interaction_notes         | Notes.
accessibility_notes       | Notes.
program_notes             |
red_flag_concerns         | None.
can_refer_directly        | f
has_referral_contact      | f
referral_contact          |
provides_followup         | f
referral_realistic        | maybe
referral_notes            | Notes.
recommendation            | needs_review
strengths                 | Notes.
followup_needed           | Notes.
needs_changes_notes       |
submission_rejection_notes|
tags                      | {}
created_at                | <timestamp>
updated_at                | <timestamp>
```

The optional columns (`address`, `phone`, `email`, `website`, `eligibility`,
`program_notes`, `referral_contact`, and the two notes) are empty (NULL),
`public_fields` is `{}`, and `tags` is `{}`.

## 10. Clean up

Every successful POST in this guide (sections 5, 7, 8 and 9) created a resource
and a score. Use `psql` to remove only the test rows you created, after
verifying them, by their IDs. Custom tags are not created by any successful
test here.
