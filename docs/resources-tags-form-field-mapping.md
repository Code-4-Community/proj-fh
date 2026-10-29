# Form field mapping: Food and Housing vetting forms

Companion to [resources-tags-refactor-plan.md](./resources-tags-refactor-plan.md) and [resources-tags-end-state-schema.md](./resources-tags-end-state-schema.md). For every question and answer option on `FoodForm.txt` and `HousinForm.txt` it names the schema location that stores the answer.

## How to read this

- **`resources.<column>`** means that column on the `resources` table. A form's category sets `resources.category` (`food_access` for the food form, `housing` for the housing form).
- **`tags` table, group `<key>`** means rows in the `tags` table whose `group` equals that key. Each selected option is one `tags` row, and its `tag_id` is stored in the `resources.tags` array. Groups are the `tag_group` enum; single or multi selection is defined in code. The tag's `category` is `common` (valid on both forms) or one form's category.
- **Single** and **multi** are the group's `selection` value. Single allows at most one tag per resource.
- **Other + text**: the group has a seeded "Other" tag with `allows_free_text = true`. The typed text becomes a custom tag row (`is_custom = true`, `other_text` set) in the same group. See the end-state schema.
- **Yes / Unsure table**: each row has a Yes tag and an "(unsure)" tag. "No" is neither tag. Both tags for one row are rejected.
- Required (`*`) questions map to `NOT NULL` columns. Option labels below are the form's wording, and slugs are derived from them.

## 1. Basic Information (both forms)

| Question | Required | Type | Maps to |
|---|---|---|---|
| Name of Staff Member Completing this Form | no (not asked) | none | `resources.submitted_by_user_id`, a nullable FK to `users.id` set from the logged-in user |
| Date of Outreach | yes | date | `resources.outreach_date` |
| Organization Name | yes | short text | `resources.organization_name` |
| Program Name | yes | short text | `resources.program_name` |
| Website | yes | short text | `resources.website` |
| Phone Number | yes | short text | `resources.phone` |
| Email Address | yes | short text | `resources.email` |
| Address | no | short text | `resources.address` |
| What is the Zip Code? | no | short text | `resources.zip_code` |
| What Country [sic: County] is the Organization in? | no | single choice | `resources.county` (enum, 14 options below) |
| Which of the above can we display on the website | yes | multi-select | `resources.public_fields` (`public_field[]`, enum array) |
| Staff Contact Name | yes | short text | `resources.staff_contact_name` |
| Staff Contact Name Role | yes | short text | `resources.staff_contact_role` |
| Date Information Verified | yes | date | `resources.last_verified_date` |

The form label says "Country". The data is a county, so it maps to `resources.county`.

**County options** (all map to a `resources.county` enum value): Suffolk, Middlesex, Norfolk, Essex, Worcester, Plymouth, Hampden, Hampshire, Berkshire, Barnstable, Bristol, Dukes, Nantucket, Franklin.

**Display options** (enum `public_field`, stored as an array in `resources.public_fields`): Website → `website`, Phone number → `phone`, Email address → `email`, Address → `address`. Any of these four not in the array is non-public.

## 2a. Food Program Information (food form only, category `food_access`)

| Question | Required | Type | Maps to |
|---|---|---|---|
| Type of Food Assistance | yes | multi-select | `tags` table, group `food_assistance_type`, category `food_access` |
| Food Types | no | multi-select | `tags` table, group `food_type`, category `food_access` |
| Pricing | no | multi-select | `tags` table, group `pricing`, category `food_access` |
| Population(s) served | yes | multi-select | `tags` table, group `population` (see section 2c) |
| Frequency of Services | yes | single choice | `tags` table, group `frequency` (single), category `food_access` |
| Observation | yes | Yes / No / Unsure table | `tags` table, group `program_observation`, category `food_access` |
| Notes | no | short text | `resources.program_notes` |

**Type of Food Assistance options** (each one tag in `food_assistance_type`): Food pantry, Community meals, Grocery vouchers, SNAP/WIC enrollment assistance, Emergency food assistance, Mobile food distribution, Medically tailored meals, Cultural/Religious Dietary Options, Accepts EBT, Food Assistance, Farm Training, Farmers Market, Discounted Food, Child Nutrition Programs.

**Food Types options** (`food_type`): Produce, Packaged Food, Bread, Prepared meal, Household supplies, Frozen food, Meat, Milk, Eggs.

**Pricing options** (`pricing`): the form lists "Free or Reduced" as the options. It is stored as two tags, **Free** and **Reduced**. This is an assumption to confirm with the form owner.

**Frequency options** (`frequency`, single): Daily, Weekly, Biweekly, Monthly, Emergency only, Other + text.

**Observation rows** (each row is a Yes tag and an "(unsure)" tag in `program_observation`, so 10 tags):

| Row | Yes tag | Unsure tag |
|---|---|---|
| Food appeared organized | `food-appeared-organized` | `food-appeared-organized-unsure` |
| Nutritional options available | `nutritional-options-available` | `nutritional-options-available-unsure` |
| Cultural food options available | `cultural-food-options-available` | `cultural-food-options-available-unsure` |
| Staff appeared respectful | `staff-appeared-respectful` | `staff-appeared-respectful-unsure` |
| Environment felt welcoming | `environment-felt-welcoming` | `environment-felt-welcoming-unsure` |

## 2b. Housing Program Information (housing form only, category `housing`)

| Question | Required | Type | Maps to |
|---|---|---|---|
| What services does the organization provide? | yes | multi-select | `tags` table, group `housing_service_type`, category `housing` |
| Population(s) served | yes | multi-select | `tags` table, group `population` (see section 2c) |

**Service options** (`housing_service_type`): Emergency shelter, Transitional housing, Permanent housing, Rental assistance, Housing navigation/case management, Rapid rehousing, Domestic violence shelter, Youth housing, Recovery housing, LGBTQ+ affirming housing, Section 8, Basic Needs, Other + text.

## 2c. Population(s) served (group `population`, multi)

One group, with each option's tag category set by which form lists it.

| Option | Food form | Housing form | Tag category |
|---|---|---|---|
| General population | yes | yes | `common` |
| Families | yes | yes | `common` |
| Youth | yes | yes | `common` |
| Older adults | yes | yes | `common` |
| LGBTQ+ individuals | yes | yes | `common` |
| Immigrants/refugees | yes | yes | `common` |
| People with disabilities | yes | yes | `common` |
| Unhoused individuals | yes | yes | `common` |
| Other + text | yes | yes | `common` |
| Individuals with chronic illness | yes | no | `food_access` |
| Individuals with HIV/AIDS | no | yes | `housing` |
| Women Only | no | yes | `housing` |
| Women and Children Only | no | yes | `housing` |
| Unaccompanied Youth | no | yes | `housing` |
| Survivors of Domestic Violence | no | yes | `housing` |
| Veterans | no | yes | `housing` |

## 3. Initial Contact & Responsiveness (both forms, all tags `common`)

| Question | Required | Type | Maps to |
|---|---|---|---|
| How did you interact with the organization? | yes | multi-select | `tags` table, group `contact_method` |
| Was the organization responsive? (1-5) | yes | rating | `resources.responsiveness` (smallint, CHECK 1-5; 1 = unable to contact, 5 = very responsive) |
| Approximate response time | yes | single choice | `resources.response_time` (enum) |
| Notes on interaction with staff | yes | short text | `resources.interaction_notes` |

**Contact method options** (`contact_method`): Phone call, Email, In person visit, Website review, Virtual meeting, Other + text.

**Response time options** (enum `response_time` on `resources.response_time`): Same Day → `same_day`, 1-3 days → `1_3_days`, 1 week+ → `1_week_plus`, No response → `no_response`.

## 4. Accessibility & Intake (both forms, all tags `common`)

| Question | Required | Type | Maps to |
|---|---|---|---|
| Intake process | yes | multi-select | `tags` table, group `intake_process` |
| Required Documentation | yes | multi-select | `tags` table, group `required_documentation` |
| Accessibility Questions | yes | Yes / No / Unsure table | `tags` table, group `accessibility` |
| Estimated wait time | yes | single choice | `tags` table, group `estimated_wait_time` (single) |
| Please describe the eligibility requirements | no | free text | `resources.eligibility` |
| Accessibility notes | yes | short text | `resources.accessibility_notes` |

**Intake process options** (`intake_process`): Walk-ins accepted, Appointment required, Referral required, Online application available, Phone intake available, In-person intake only, Other + text.

**Required documentation options** (`required_documentation`): Government-issued ID, Proof of address, Proof of income, Insurance information, Social security number, Referral form, Immigration documentation, No documentation required, Other + text.

**Estimated wait time options** (`estimated_wait_time`, single): Same day, 1-7 days, 1-4 weeks, 1-3 months, More than 3 months, Unknown, Other + text.

**Accessibility rows** (each row is a Yes tag and an "(unsure)" tag in `accessibility`, so 12 tags):

| Row | Yes tag | Unsure tag |
|---|---|---|
| Near public transportation | `near-public-transportation` | `near-public-transportation-unsure` |
| ADA accessible | `ada-accessible` | `ada-accessible-unsure` |
| Multilingual services available | `multilingual-services-available` | `multilingual-services-available-unsure` |
| Website easy to navigate | `website-easy-to-navigate` | `website-easy-to-navigate-unsure` |
| Hours clearly listed | `hours-clearly-listed` | `hours-clearly-listed-unsure` |
| Intake process clearly explained | `intake-process-clearly-explained` | `intake-process-clearly-explained-unsure` |

The eligibility question appears in Section 2 on the food form and after Accessibility notes on the housing form. Both write to `resources.eligibility`.

## 5. Cultural Competency & Inclusivity (both forms, all tags `common`)

| Question | Required | Type | Maps to |
|---|---|---|---|
| Observation | yes | Yes / No / Unsure / Inapplicable table | `tags` table, group `cultural_competency` |
| What are red flags of this organization? | yes | multi-select | `tags` table, group `red_flag` |
| Describe concerns | yes | short text | `resources.red_flag_concerns` |

**Observation rows** (each row is a Yes tag, an "(unsure)" tag and an "(inapplicable)" tag in `cultural_competency`, so 18 tags):

| Row | Yes tag | Unsure tag | Inapplicable tag |
|---|---|---|---|
| LGBTQ+ affirming environment | `lgbtq-affirming-environment` | `lgbtq-affirming-environment-unsure` | `lgbtq-affirming-environment-inapplicable` |
| Trauma-informed practices evident | `trauma-informed-practices-evident` | `trauma-informed-practices-evident-unsure` | `trauma-informed-practices-evident-inapplicable` |
| Staff culturally responsive | `staff-culturally-responsive` | `staff-culturally-responsive-unsure` | `staff-culturally-responsive-inapplicable` |
| Multilingual materials available | `multilingual-materials-available` | `multilingual-materials-available-unsure` | `multilingual-materials-available-inapplicable` |
| Inclusive/nonjudgmental environments | `inclusive-nonjudgmental-environments` | `inclusive-nonjudgmental-environments-unsure` | `inclusive-nonjudgmental-environments-inapplicable` |
| Gender-inclusive forms/policies | `gender-inclusive-forms-policies` | `gender-inclusive-forms-policies-unsure` | `gender-inclusive-forms-policies-inapplicable` |

**Inapplicable has its own tag** (slug suffix `-inapplicable`, label suffix "(inapplicable)"). At most one of the Yes, Unsure and Inapplicable tags can be on a resource for a given row. "No" is still the absence of all three.

**Red flag options** (`red_flag`): Long waitlist, Difficult intake process (listed twice on the forms, stored once), Limited resources, Inconsistent hours, Poor communication, Restrictive eligibility requirements, Unsafe or unclean environment, Lack of language access, Outdated information online, Transportation barriers, Staff appeared dismissive/unhelpful, Other + text.

## 6. Referral Process (both forms)

| Question | Required | Type | Maps to |
|---|---|---|---|
| Can Fenway Health refer directly to this organization? | yes | yes / no | `resources.can_refer_directly` (boolean) |
| Is there a direct referral contact? | yes | yes / no | `resources.has_referral_contact` (boolean) |
| Who is the direct referral contact? | no | short text | `resources.referral_contact` (nullable) |
| Does the organization provide follow-up or referral updates? | yes | yes / no | `resources.provides_followup` (boolean) |
| Did the referral process seem realistic and manageable for patients? | yes | yes / no / maybe | `resources.referral_realistic` (enum `yes_no_maybe`: `yes`, `no`, `maybe`) |
| Referral Process Notes | yes | short text | `resources.referral_notes` |

## 7. Final Intern Assessment (both forms)

| Question | Required | Type | Maps to |
|---|---|---|---|
| Would you feel comfortable referring Fenway Health patients here? | yes | single choice | `resources.recommendation` (enum) |
| Main strengths of organization | yes | short text | `resources.strengths` |
| Additional follow-up needed | yes | short text | `resources.followup_needed` |
| Overall rating (1-5) | yes | rating | `scores.overall_rating` (smallint, CHECK 1-5; 1 = very poor, 5 = excellent), reached through `resources.score_id` |

**Recommendation options** (enum `recommendation` on `resources.recommendation`): Yes – strongly recommend → `strongly_recommend`, Yes – recommend with minor concerns → `recommend_minor_concerns`, Recommend with caution → `recommend_with_caution`, No – not recommended currently → `not_recommended`, Needs additional review → `needs_review`.

## Not on the forms

These columns are set by the system or by reviewers, not by the form. All are on the `resources` table.

| Column | Source |
|---|---|
| `resources.resource_id`, `resources.created_at`, `resources.updated_at` | generated |
| `resources.category` | which form was used |
| `resources.score_id` | scoring system; the `scores` row it points to holds `scores.overall_rating` |
| `resources.review_status` | review workflow |
| `resources.needs_changes_notes` | reviewer, optional |
| `resources.submission_rejection_notes` | reviewer, optional |

## Coverage check

- Every question on both forms is listed above. Nothing on either form is unmapped.
- Differences between the forms: the food form adds Section 2a (food assistance type, food types, pricing, frequency, observation, notes) and the `chronic illness` population option. The housing form adds Section 2b (service types) and six housing-only population options.
- Every tag group in the schema is used by at least one question: `population`, `intake_process`, `required_documentation`, `contact_method`, `red_flag`, `food_assistance_type`, `food_type`, `pricing`, `frequency`, `estimated_wait_time`, `housing_service_type`, `accessibility`, `cultural_competency`, `program_observation`.
