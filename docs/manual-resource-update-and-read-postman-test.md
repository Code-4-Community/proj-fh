# Manual update and read-back tests for resources with Postman

This guide tests reading resources back (`POST /api/resources/find` and
`POST /api/resources/findByIds`) and updating one (`PATCH /api/resources/:id`).

Complete sections 1 and 2 of
[manual-resource-create-postman-test.md](./manual-resource-create-postman-test.md)
first, then create the resource from section 4 of that guide. The IDs below
assume it was your first resource: `resource_id` `1` with `score_id` `1`.
Replace them with the values from your response.

Use a local/development database only.

> **Authentication note:** at the time of writing, only `POST /api/resources`
> requires the bearer token. `find`, `findByIds` and `PATCH` have no auth guard,
> so you can send them without an `Authorization` header. Sending the token is
> harmless. If a guard is added later, add the header.

All requests use `Content-Type: application/json` and base URL
`http://localhost:3000/api`.

## 1. Read it back

### findByIds

```http
POST http://localhost:3000/api/resources/findByIds
```

Body:

```json
[1]
```

Expect `200 OK` and an array with the one resource, including `resource_id`,
`score_id`, `organization_name`, `tags`, and the other columns as created.

Body `[999999]` returns `404 Not Found`:

```json
{
  "message": "No resources found with IDs [999999]",
  "error": "Not Found",
  "statusCode": 404
}
```

Body `["abc"]` returns `400 Bad Request` (it must be an array of numbers).

### find

```http
POST http://localhost:3000/api/resources/find
```

| # | Body | Expected |
|---|---|---|
| 1.1 | `{ "organization_name": "Postman Test Food Pantry" }` | `200` with every resource of that exact name |
| 1.2 | `{ "county": "Suffolk", "category": "food_access" }` | `200`; only resources matching **both** fields |
| 1.3 | `{ "tags": [1, 15] }` | `200`; resources whose `tags` contain both `1` and `15` (extra tags are fine, order does not matter) |
| 1.4 | `{ "public_fields": ["website"] }` | `200`; resources whose `public_fields` contain `website` |
| 1.5 | `{ "organization_name": "No Such Organization" }` | `404`, `No resources found matching the given fields.` |
| 1.6 | `{ "county": "Atlantis" }` | `400`, `Invalid county (received "Atlantis"): must be a valid Massachusetts county.` |
| 1.7 | `{ "overall_rating": 5 }` | `200` with the resources whose score has `overall_rating` 5, or `404` if no score has that rating (the rating lives on the score and is matched through it) |
| 1.8 | `{ "program_name": null }` | `400`, `Fields can't be null when searching: program_name.` |
| 1.9 | `[1]` (an array instead of an object) | `400`, `The request body must be an object of resource fields.` |

## 2. Update with PATCH

```http
PATCH http://localhost:3000/api/resources/1
```

Only the fields you send are validated and changed. The response is the **full**
updated resource.

Before each test, you can look at the row in `psql`:

```sql
\x on

SELECT resource_id, score_id, program_name, program_notes, review_status, needs_changes_notes, completed_by, tags, created_at, updated_at FROM resources WHERE resource_id = 1;
```

### 2.1 Change one field

Body:

```json
{ "program_name": "Postman Test Weekly Pantry (Updated)" }
```

Expect `200 OK` with the whole resource; `program_name` is the new value and
everything else, including `tags`, `score_id`, and `completed_by`, is
unchanged. In `psql`, `program_name` changed and `updated_at` is later than
`created_at`:

```text
-[ RECORD 1 ]-------+----------------------------------------
resource_id         | 1
score_id            | 1
program_name        | Postman Test Weekly Pantry (Updated)
program_notes       | Open weekly.
review_status       | pending_review
needs_changes_notes |
completed_by        | <your first and last name>
tags                | {1,15,24,27,32,55,71,77,84,93,100,112,130}
created_at          | <timestamp>
updated_at          | <later timestamp>
```

### 2.2 Change the overall rating

Body:

```json
{ "overall_rating": 3 }
```

Expect `200 OK`. The response does not include `overall_rating`; it lives on the
score. Verify:

```sql
\x off

SELECT * FROM scores WHERE score_id = 1;
```

```text
 score_id | overall_rating
----------+----------------
        1 |              3
(1 row)
```

No new score row is created (`SELECT COUNT(*) FROM scores;` is unchanged).

### 2.3 Clear a nullable field

Body:

```json
{ "program_notes": null }
```

Expect `200 OK` with `"program_notes": null`; in `psql` the `program_notes`
column is empty.

A non-nullable field rejects `null`. Body `{ "program_name": null }` returns
`400`: `Invalid program_name (received null): required and must be at most 255 characters.`

### 2.4 Fields that cannot be changed

Body (only fields that are not editable):

```json
{ "completed_by": "Someone Else", "score_id": 99, "resource_id": 99 }
```

Expect `400 Bad Request` naming every field that was refused:
`Field(s) can't be updated: completed_by, score_id, resource_id. Editable fields are: ...`

Body with one valid field alongside them:

```json
{ "program_name": "Postman Test Weekly Pantry", "completed_by": "Someone Else", "score_id": 99 }
```

Expect the same `400`, naming `completed_by, score_id`. Nothing is saved, so
`program_name` keeps its stored value. Unknown fields (for example
`{ "not_a_field": "x" }`) are rejected the same way.

### 2.5 Review status

Body:

```json
{ "review_status": "needs_changes", "needs_changes_notes": "Please confirm the phone number." }
```

Expect `200 OK`; both columns changed in `psql`.

Body `{ "review_status": "approved_published" }` returns `200 OK`.

The removed status is rejected. Body `{ "review_status": "sent_back_for_review" }`
returns `400`: `Invalid review_status (received "sent_back_for_review"): must be one of: pending_review, approved_published, rejected, archived, needs_changes.`

### 2.6 Replace the tags

Body:

```json
{ "tags": [1, 15, 24, 28] }
```

Expect `200 OK` and `"tags": [1, 15, 24, 28]`. This **replaces** the whole
array; it does not merge with the old tags. In `psql`, `tags` is `{1,15,24,28}`.

Tag rules still apply. Body `{ "tags": [1, 27, 28] }` returns `400`:
`Only one tag is allowed in the frequency group.`

### 2.7 Add a custom tag while keeping the existing tags

Body:

```json
{ "custom_tags": [{ "group": "population", "other_text": "Refugee families" }] }
```

Sending `custom_tags` without `tags` keeps the stored tags and adds the custom
one. Expect `200 OK` and a `tags` array that is the existing IDs followed by the
new custom tag's ID. In `psql`:

```sql
\x off

SELECT tag_id, "group", slug, is_custom, other_text
FROM tags
WHERE is_custom = true
ORDER BY tag_id;
```

```text
 tag_id |    group    |          slug          | is_custom |    other_text
--------+-------------+------------------------+-----------+------------------
    142 | population  | other-refugee-families | t         | Refugee families
(1 row)
```

If you already ran the custom-tag guide, this tag already exists and is reused.

### 2.8 Changing category re-checks the tags

Body:

```json
{ "category": "housing" }
```

The stored tags include food tags, so expect `400 Bad Request`:
`Tag ID(s) 1, 15, 24, 28 do not apply to housing resources.` (the IDs listed are
the food tags currently stored). Nothing is saved.

To change category you must send matching tags in the same request:

```json
{ "category": "housing", "tags": [42, 55, 71] }
```

Expect `200 OK`.

### 2.9 Invalid and missing ids

| # | Request | Expected |
|---|---|---|
| 2.9.1 | `PATCH /api/resources/abc` with a valid body | `400`, `Invalid resource id 'abc' in the URL: id must be an integer (for example /resources/12).` |
| 2.9.2 | `PATCH /api/resources/999999` with `{ "program_name": "x" }` | `404`, `Resource with id 999999 was not found.` |
| 2.9.3 | `PATCH /api/resources/1` with `{}` | `400`, `At least one of the following fields must be provided:` followed by the field list |
| 2.9.4 | `PATCH /api/resources/1` with `{ "zip_code": "2118" }` | `400`, `Invalid zip_code (received "2118"): must be a 5-digit or ZIP+4 code.` |

After every `400` or `404`, the row in `psql` is unchanged.

## 3. Clean up

After verifying, remove the test resource and its score by their IDs. The
custom tag from 2.7 can stay.
