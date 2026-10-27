# Refactor plan: Resources and Tags

Plan only. No code has been changed.

## Decisions

- Each resource has **one category**, stored as a single enum value (not an array). The name `category` stays.
- Making categories extensible is **out of scope**. Adding a category later means a code change and a migration.
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
- The tag-level `Category` enum is removed and replaced by tag groups (section 3). `Category` then only ever means the resource category.
- `CreateResourceDto.category` changes from `Category[]` to `Category`, and the "at least one" check goes away.

## 2. `Resource` entity

**Kept:**
- `resource_id`, `score_id`, `name` (organization), `address`, `county`, `zip_code`, `phone`, `email`, `website`
- `eligibility` (now also the form's "describe eligibility requirements")
- `vetting_status`
- `last_verified_date` (the form's "Date Information Verified")

**Changed:**
- `category` becomes a single enum value.
- The `tags int[]` column is replaced by the `resource_tags` join table.

**Removed:** `description`, `reviewer_notes`.

**Added (shared across categories, nullable where a category won't use them):**

| Form section | Fields |
|---|---|
| 1 Basic info | `program_name`, `completed_by`, `outreach_date`, `staff_contact_name`, `staff_contact_role`, `public_fields` (`text[]` of website, phone, email, address) |
| 3 Outreach | `responsiveness` (1-5), `response_time` (enum), `interaction_notes` |
| 4 Intake | `estimated_wait_time` (enum), `accessibility_notes` |
| 5 Concerns | `red_flag_concerns` |
| 6 Referral | `can_refer_directly`, `has_referral_contact`, `referral_contact`, `provides_followup`, `referral_realistic` (yes/no/maybe), `referral_notes` |
| 7 Assessment | `recommendation` (enum), `strengths`, `followup_needed`, `overall_rating` (1-5) |
| Housekeeping | `created_at`, `updated_at` |

- The food form's Section 2 "Notes" becomes a nullable `program_notes`.
- The fixed-choice enums (response time, wait time, recommendation, yes/no/maybe) are code enums, since both forms share them.

## 3. Tags: grouped and normalized

- **`tag_groups`:** `group_id`, `key`, `label`, `selection` (`single` or `multi`).
- **`tags`:** serial `tag_id`, `group_id`, `label`, `slug` (unique within its group), `sort_order`, `is_active`.
- **`resource_tags`:** composite PK `(resource_id, tag_id)`, with FKs.

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
| housing_service_type | multi |

- **Seeding:** rewritten from the exact form options, with no hand-numbered IDs. The old seed is replaced, and population is the union of both forms' options.
- **Validation:** every tag ID must exist, and a single-select group allows at most one tag.
- Nothing ties a tag to a category. The frontend decides which groups to show on each form. The API stores and returns what it is given.

## 4. Yes/No/Unsure tables

These cover the accessibility, cultural competency and food observation tables.

- **`checklist_items`:** `item_id`, `key`, `label`, `section` (`accessibility | cultural | observation`), `allowed_answers`.
- **`resource_checklist_answers`:** PK `(resource_id, item_id)`, plus `answer`.
- **Seeded:** 6 accessibility rows, 6 cultural rows ("inapplicable" is an allowed answer), 5 food observation rows.
- **Validation:** the item must exist and the answer must be in its `allowed_answers`.
- Items are not scoped by category.

## 5. Validation

- Validation moves from the hand-written block in `resources.service.ts` to `class-validator` DTOs. Check whether `class-validator`, `class-transformer` and `ValidationPipe` are already set up before adding any dependency.
- The service keeps only the checks that need the database (tag IDs exist, single-select groups, checklist answers).

## 6. API

- `POST /resources` and `PATCH /resources/:id` take a single `category`, the shared fields, `tag_ids` and `checklist` (`[{ item_key, answer }]`).
- `GET /resources` filters by `category`, `county`, `zip_code` and `tag_ids`. It returns tags grouped by group, plus checklist answers.
- `GET /tags` returns all groups with their tags.
- Internal fields are returned as-is for now. `public_fields` masking will be handled with access control.

## 7. Order of work

1. Replace the existing tag and resource migrations with a new one, since there is no data. If those migrations have already run on a shared environment, write a forward migration instead.
2. Rewrite the entities and seed data.
3. Write the DTOs and validation.
4. Update the services and controllers, plus anything in the `Score` module that references `Resource`.
5. Rewrite the specs: `resources.service.spec.ts`, `tags.service.spec.ts` and `resources.controller.spec.ts`.
6. Find and update frontend and shared-type usages of `Category`.
7. Run the build and tests.

## Assumptions to confirm

- The `other` category stays in the enum.
- `program_notes` is the right home for the food form's Section 2 "Notes".
- If the existing migrations have run anywhere shared, a forward migration is needed instead of replacing them.
