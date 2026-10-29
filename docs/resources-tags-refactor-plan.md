# Refactor plan: Resources and Tags

Plan only. No code has been changed.

## Decisions

- Each resource has **one category**, stored as a single enum value (not an array). The name `category` stays.
- Categories should be **able to be extended**, and the design shouldn't lock them in. But building generic extensibility machinery is **not part of this refactor** and doesn't block it. Instead, the refactor delivers documentation on how to add a new category (section 8). Today that means one new enum value, a migration, and seed rows.
- Tag scoping is dropped. Tags are plain groups with no per-category scoping.
- **Kept:** `eligibility`, `score_id`, `vetting_status`, `last_verified_date`, and the existing contact and location fields.
- **Removed:** `description` and `reviewer_notes`. The specific notes fields from the forms replace the reviewer notes.
- There is no existing data, so tables can be replaced instead of backfilled.
- Internal assessment fields (rating, recommendation, red flags) are returned in public responses for now. Access control comes later.

## What the forms say

The Food and Housing vetting forms (`FoodForm.txt`, `HousinForm.txt`) are identical except for Section 2.

- **Shared (Sections 1, 3-7):** basic info, outreach, accessibility and intake, eligibility, cultural competency, red flags, referral, final assessment.
- **Food only:**
  - food assistance types, food types, pricing and frequency of services;
  - a Yes/No/Unsure observation table;
  - a free-text "Notes" question.
- **Housing only:** housing services (including Section 8 and Basic Needs).
- **Population:** the two forms offer different options, and the tag list uses the union of both.
- The forms say "Country" but list counties. This maps to the existing `County` enum.

## Problems in the current code

- There are two different enums named `Category`:
  - `apps/backend/src/resources/types.ts` has the resource-level one;
  - `apps/backend/src/tags/types.ts` has the tag-level one, which `tag.entity.ts` uses.
- `Resource.category` is an enum array, so a resource can have several categories.
- `Resource.tags` is an `int[]` with no foreign keys, so nothing enforces that a tag exists.
- The seed in `1789479716331-seed_tags.ts` doesn't match the form options, and its IDs are hand-numbered.
- Most vetting-form data has no place to live.
- Validation is a long hand-written block in `resources.service.ts`.

## 1. Category

- `Resource.category` becomes a single Postgres enum column, `category: Category`, replacing `Category[]`.
- Enum values: `FOOD_ACCESS = 'food_access'`, `HOUSING = 'housing'`, and `OTHER = 'other'` (kept, since it is already in the enum).
- The tag-level `Category` enum is replaced by `TagCategory` in `tags/types.ts`. Its values are the resource `Category` values plus `common` (`food_access`, `housing`, `other`, `common`). A tag's category says which resources it applies to: its own resource category, or `common` for all of them. Tag groups (section 3) replace the old tag-level values like `food_service_type`.
- `CreateResourceDto.category` changes from `Category[]` to `Category`, and the "at least one" check goes away.

## 2. `Resource` entity

**Kept:**
- `resource_id`, `score_id`, `address`, `county`, `zip_code`, `phone`, `email`, `website`
- `eligibility` (now also the form's "describe eligibility requirements")
- `vetting_status`
- `last_verified_date` (the form's "Date Information Verified")

**Changed:**
- `name` is renamed to `organization_name` (the form's "Organization Name"). The rename touches the entity, DTOs, service, specs, Postman collections, and any frontend or shared-type usage.
- `category` becomes a single enum value.
- The `tags int[]` column is unchanged: it stays on the resource as a list of tag IDs.

**Removed:** `description`, `reviewer_notes`.

**Added (shared across categories, nullable where a category won't use them):**

| Form section | Fields |
|---|---|
| 1 Basic info | `program_name`, `completed_by`, `outreach_date`, `staff_contact_name`, `staff_contact_role`, `public_fields` (`public_field[]`, enum of website, phone, email, address) |
| 3 Outreach | `responsiveness` (1-5), `response_time` (enum), `interaction_notes` |
| 4 Intake | `accessibility_notes` (estimated wait time is now a single-select tag group, see section 3) |
| 5 Concerns | `red_flag_concerns` |
| 6 Referral | `can_refer_directly`, `has_referral_contact`, `referral_contact`, `provides_followup`, `referral_realistic` (yes/no/maybe), `referral_notes` |
| 7 Assessment | `recommendation` (enum), `strengths`, `followup_needed`. The overall rating (1-5) is not on `resources`; it goes on the `scores` table (section 2a). |
| Review | `needs_changes_notes` (optional), `submission_rejection_notes` (optional) |
| Housekeeping | `created_at`, `updated_at` |

- The food form's Section 2 "Notes" becomes a nullable `program_notes`.
- The fixed-choice enums (response time, recommendation, yes/no/maybe) are code enums, since both forms share them.

## 2a. `Score` entity

The form's overall rating is scoring information, so it lives on the `scores` table, which `resources.score_id` points to. `Score` (`score/score.entity.ts`) currently has only `score_id`.

- Add `overall_rating` (`smallint`, not null, CHECK 1-5; 1 = very poor, 5 = excellent).
- `Resource.score_id` stays as it is. The FK from `resources.score_id` to `scores.score_id` is still to be added when that relationship is established.
- The `ScoreService` and `ScoreController` return the new column through the existing `findOneById`. Creating a resource from a form needs a way to create its `Score` row; the service change for this is part of step 4 of section 9.
- Because `resources.create()` currently sets `score_id` to `0` with no matching score row, that default needs a decision before the FK is added.

## 3. Tags: grouped and normalized

- **`tag_groups`:** `group_id`, `key`, `label`, `selection` (`single` or `multi`).
- **`tags`:** serial `tag_id`, `category` (`TagCategory`: a resource category or `common`), `group_id`, `label`, `slug` (unique within its group), `sort_order`, `is_active`, `allows_free_text` (true on each group's seeded "Other" tag), `is_custom`, and a nullable `other_text` (set only on custom tags).
- Resources keep `tags int[]`, a list of tag IDs on the resource itself. There is no join table. Tags are deactivated rather than deleted so IDs don't dangle.

| Group | Selection |
|---|---|
| population | multi |
| intake_process | multi |
| required_documentation | multi |
| contact_method | multi |
| red_flag | multi |
| food_assistance_type | multi |
| food_type | multi |
| pricing | multi |
| frequency | single |
| estimated_wait_time | single |
| housing_service_type | multi |

- **Seeding:** rewritten from the exact form options, with no hand-numbered IDs. The old seed is replaced, and population is the union of both forms' options.
- **Validation:**
  - every tag ID must exist, and the service checks this because the array has no foreign key;
  - every tag's category must be `common` or equal to the resource's category;
  - a single-select group allows at most one tag, and custom tags count toward that limit.
- **"Other" options:** many form questions have an "Other" choice with a free-text box (population, intake process, required documentation, contact method, red flags, frequency, wait time, housing services). Each group's seeded "Other" tag has `allows_free_text`, and it works as a template:
  - when a user submits "Other" with text, the service creates a new tag row in that group (`is_custom = true`, `other_text` set, `slug = 'other-' + slugified text`), or reuses an existing custom tag with the same slug;
  - the new tag's ID is stored in `resources.tags`;
  - custom tags are returned by every tag retrieval method like any other tag, and `is_custom` identifies them;
  - submitting the template "Other" tag without text is rejected.
- **Tag category:**
  - `common` tags apply to every resource. Examples are population, intake process, required documentation, contact method, red flags, estimated wait time, and the accessibility and cultural tags.
  - `food_access` tags are the food-only groups (food assistance type, food type, pricing, frequency, and the food observation rows). `housing` tags are the housing service types.
  - Population options that appear on only one form (chronic illness for food, HIV/AIDS and Women Only for housing) take that form's category, and the rest are `common`.
  - A custom "Other" tag copies the category of its template.
  - Category is the only scoping. There is no per-group or per-row scoping.
- Nothing is enforced beyond the category: the frontend still decides which groups to show on each form.

## 4. Yes/No/Unsure tables as tags

These cover the accessibility, cultural competency and food observation tables. They are ordinary tags, with no extra tables.

- **Groups (all multi-select):** `accessibility`, `cultural_competency`, `program_observation`.
- **Two tags per table row, three for the cultural table:**
  - a "Yes" tag, labelled with the row text (for example "ADA accessible", slug `ada-accessible`);
  - an "Unsure" tag (for example "ADA accessible (unsure)", slug `ada-accessible-unsure`);
  - cultural competency rows only: an "Inapplicable" tag (slug suffix `-inapplicable`).
- **"No" is the absence of all of them.** Nothing is stored for it.
- **Seeded rows:** 6 accessibility, 6 cultural, 5 food observation. That is 12 + 18 + 10 = 40 tags.
- **Validation:** a resource can have at most one tag per row (Yes, Unsure or Inapplicable). The service pairs them by the `-unsure` and `-inapplicable` slug suffixes.
- **Limitation:** "No" can't be told apart from "not answered". Both are treated as no tag.

## 5. Validation

- Validation moves from the hand-written block in `resources.service.ts` to `class-validator` DTOs. Check whether `class-validator`, `class-transformer` and `ValidationPipe` are already set up before adding any dependency.
- The service keeps only the checks that need the database (tag IDs exist, single-select groups, Yes/Unsure exclusivity).

## 6. API

- `POST /resources` and `PATCH /resources/:id` take a single `category`, the shared fields, `tags` (`[{ tag_id, other_text? }]`, where `other_text` is only valid with an "Other" template tag; the service turns it into a custom tag ID before saving).
- `GET /resources` filters by `category`, `county`, `zip_code` and `tags`. It returns tags grouped by group.
- **Tags endpoints:** build on the existing methods.
  - `POST /tags/findByIds` and `GET /tags/:tagId` stay as they are. Their responses keep `category` (now a `TagCategory`) and add `group_id`, `is_custom` and `other_text`.
  - `GET /tags/category/:category` stays and accepts a `TagCategory`. It returns that category's tags only; a client wanting a form's full list also asks for `common`. Without a filter it returns every tag, custom ones included. An optional `is_custom` query parameter (`true` or `false`) filters on that column; the frontend passes `is_custom=false` to fetch only seeded tags for its cached slug-to-ID map (see [resources-tags-submission-flow.md](./resources-tags-submission-flow.md)).
  - `GET /tags/group/:groupKey` is added and returns every tag in a group, custom ones included, and accepts the same optional `is_custom` parameter.
  - No new `GET /tags` list endpoint is added.
- Internal fields are returned as-is for now. `public_fields` masking will be handled with access control.

## 7. Postman tests

The collections live in `postman-tests/`. Two are in scope and two are not.

**In scope:**

- `resources-success.postman_collection.json`:
  - **Create:** the body sends `"name"` and `"category": ["food_access"]`. Change `name` to `organization_name`, change `category` to a single value, and add the new required fields (`program_name`, the outreach, intake, referral and assessment fields, `tags`). Include one "Other" tag with `other_text`.
  - **Update:** the body sends `reviewer_notes`, which is removed. Use the new notes fields instead (for example `needs_changes_notes`).
  - **Find:** the body filters on `name`, which becomes `organization_name`. Also filter on the single `category` value, and on `tags` if it is supported.
  - **FindByIds:** check that its assertions still match the new response shape (grouped tags).
- `tags-success.postman_collection.json`:
  - **GetTagsByCategory** calls `/tags/category/food_service_type`, which is no longer a valid category. Change it to `/tags/category/food_access` and add a `/tags/category/common` case. Add a case for `GET /tags/group/:groupKey`. Add cases for the `is_custom` filter: `?is_custom=false` returns no custom tags, `?is_custom=true` returns only custom tags (create one first by submitting a resource with `custom_tags`), and no parameter returns both.
  - **FindByIds** and **GetTagById:** update the assertions for the new tag shape (`group_id`, `is_custom`, `other_text`, no hand-numbered IDs).
- Add failure-path cases, using the project's `*-success` / `*-failure` collection naming if it has one. For example: an unknown tag ID, two tags in a single-select group, and both the Yes and Unsure tag for the same row.

**Out of scope (no changes expected):**

- `users-success.postman_collection.json`
- `app-success.postman_collection.json`

These don't touch resources or tags. They are only re-run to confirm nothing regressed.

## 8. Documentation: adding a new category

Deliverable: a short guide at `docs/adding-a-resource-category.md`, written once the refactor lands so it matches the real code. It doesn't block the refactor. It covers the steps below.

1. **Add the enum value** to `Category` in `resources/types.ts`.
2. **Write a migration** that adds the value to the Postgres `category` enum. `ALTER TYPE ... ADD VALUE` needs care inside a transaction, so the guide explains how to do it with TypeORM.
3. **Seed the category's tags** with that category, or `common` when shared. Reuse the shared groups; add new tag groups and tags only for what is specific to the category. The migration must also extend the `tag_category` enum.
4. **Reuse the shared `Resource` columns.** The vetting-form fields are shared, so most new categories need no new columns. The guide says when a category needs one, and that a new nullable column on `resources` is the default approach for one or two fields.
5. **Update DTO validation** if the new category has any category-specific rules.
6. **Update the frontend form** so it shows the new category's tag groups.
7. **Add tests** for the category in the service spec and the Postman collections.

Open item: if several future categories need their own structured fields, revisit per-category detail tables then. This refactor doesn't decide that.

## 9. Order of work

1. Replace the existing tag and resource migrations with a new one, since there is no data. If those migrations have already run on a shared environment, write a forward migration instead.
2. Rewrite the entities and seed data.
3. Write the DTOs and validation.
4. Update the services and controllers, plus anything in the `Score` module that references `Resource`.
5. Rewrite the specs: `resources.service.spec.ts`, `tags.service.spec.ts` and `resources.controller.spec.ts`.
6. Update the Postman collections listed in section 7.
7. Find and update frontend and shared-type usages of `Category`.
8. Run the build, the unit tests and the Postman collections.
9. Write the "adding a new category" guide from section 8.

## Assumptions to confirm

- The `other` category stays in the enum.
- `program_notes` is the right home for the food form's Section 2 "Notes".
- If the existing migrations have run anywhere shared, a forward migration is needed instead of replacing them.
