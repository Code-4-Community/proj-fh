# Manual test: `completed_by_user_id` and `GET /resources/mine` with Postman

This guide tests that a created resource is linked to its submitter by
`users.id`, that `GET /api/resources/mine` returns only the caller's own
resources, and that removing the submitting user clears the link (sets
`completed_by_user_id` to `null`) while the resource and its `completed_by`
name are kept.

Complete sections 1 and 2 of
[manual-resource-create-postman-test.md](./manual-resource-create-postman-test.md)
first: apply migrations, start the backend, and get a Cognito **ID token**
for a staff user. You will need a **second** staff user and their ID token
as well, to confirm `GET /resources/mine` does not leak the first user's
resources. If you don't have a second test account, ask an admin to invite
one (see `be-add-staff`/invite-user docs) and sign in as them once to confirm
they land in the database.

Use a local/development database only.

All requests use base URL `http://localhost:3000/api`.

## 1. Confirm both users exist

```http
GET http://localhost:3000/api/auth/me
```

Call this once with each user's bearer token. Expect `200 OK` with that
user's `email`, `firstName`, and `lastName` each time. Note each user's
database id for later:

```sql
\x on

SELECT id, "firstName", "lastName", email, status
FROM users
WHERE email IN ('<user-a-email>', '<user-b-email>');
```

## 2. Create a resource as User A

```http
POST http://localhost:3000/api/resources
Authorization: Bearer <user-a-id-token>
Content-Type: application/json
```

Send the same body as section 4 of
[manual-resource-create-postman-test.md](./manual-resource-create-postman-test.md).

Expect `201 Created`. Note the returned `resource_id`. The response body does
not include `completed_by_user_id`; verify it in `psql`. `\x on` prints one
field per line (field name, then value) instead of one wide row, which is
easier to read with a table this wide:

```sql
\x on

SELECT *
FROM resources
ORDER BY resource_id DESC
LIMIT 1;
```

Expect (truncated to the relevant fields; the rest of the resource's columns
print the same way):

```text
-[ RECORD 1 ]---------+---------------------------
resource_id           | <new id>
organization_name     | Postman Test Food Pantry
completed_by          | <User A's first and last name>
completed_by_user_id  | <User A's users.id>
```

`completed_by_user_id` matches the id you looked up for User A in step 1.

## 3. `GET /resources/mine` as User A

```http
GET http://localhost:3000/api/resources/mine
Authorization: Bearer <user-a-id-token>
```

Expect `200 OK` with an array that includes the resource created in step 2,
ordered newest first. Every row's `completed_by_user_id` equals User A's id.
The resource from step 2 is `pending_review`, so it's returned either way, but
confirm none of User A's other resources have `review_status` of `rejected`
or `archived`; by default this endpoint leaves those out.

To include them, add the query parameter:

```http
GET http://localhost:3000/api/resources/mine?include_rejected_and_archived=true
Authorization: Bearer <user-a-id-token>
```

Expect `200 OK` with User A's full resource list, including any `rejected`
or `archived` rows.

Common failures:

- `401 Unauthorized`: token missing, expired, or invalid.
- `403 Forbidden`: the ID token's email has no matching user row. Message:
  `No user record exists for <email>.`

## 4. `GET /resources/mine` as User B returns none of User A's resources

```http
GET http://localhost:3000/api/resources/mine
Authorization: Bearer <user-b-id-token>
```

If User B has never submitted a resource, expect `200 OK` with `[]` — not a
`404`. If User B has submitted resources of their own (from an earlier test
run), expect `200 OK` with only those resources; the resource from step 2 must
not appear.

Confirm with no token at all:

```http
GET http://localhost:3000/api/resources/mine
```

Expect `401 Unauthorized`.

## 5. Remove User A and confirm the link clears, not the resource

> **Warning:** this permanently deletes User A from Cognito and the database.
> Use a disposable test account, not your own.

As an **admin** user:

```http
DELETE http://localhost:3000/api/users/<user-a-id>
Authorization: Bearer <admin-id-token>
```

Expect `200 OK`. Then re-check the resource from step 2:

```sql
\x on

SELECT resource_id, organization_name, completed_by, completed_by_user_id
FROM resources
WHERE resource_id = <resource id from step 2>;
```

Expect:

```text
-[ RECORD 1 ]------+---------------------------
resource_id        | <id from step 2>
organization_name  | Postman Test Food Pantry
completed_by       | <User A's first and last name, unchanged>
completed_by_user_id |
```

The resource still exists, `completed_by` still shows User A's name, and
`completed_by_user_id` is now empty (`null`). The row was not deleted and no
foreign-key error was raised by the `DELETE`.

Calling `GET /resources/mine` with User A's old token now fails at the
authentication layer (the Cognito account no longer exists), not because of
this feature.

## 6. Confirm the database constraint directly (optional)

If you want to see the `ON DELETE SET NULL` behavior without going through
the removal endpoint (for example, to test a user created directly in the
database), run this in `psql` **inside a transaction you roll back**, so you
don't lose real data:

```sql
BEGIN;

-- Pick any existing resource and point it at a throwaway user.
INSERT INTO users (status, "firstName", "lastName", email)
VALUES ('COMMUNITY_STAFF', 'Temp', 'User', 'temp-fk-check@example.invalid')
RETURNING id;
-- note the returned id as <temp_id>

UPDATE resources
SET completed_by_user_id = <temp_id>
WHERE resource_id = <any resource id>;

DELETE FROM users WHERE id = <temp_id>;

SELECT resource_id, completed_by, completed_by_user_id
FROM resources
WHERE resource_id = <any resource id>;
-- expect completed_by_user_id to be null, completed_by unchanged

ROLLBACK;
```

`ROLLBACK` undoes all of the above, including the temporary user and the
update to the resource, so the database is left exactly as it was.

## 7. Clean up

Remove the resource and score created in step 2 by their ids. If User B was
created only for this test, remove them the same way as User A (section 5),
using an admin token.
