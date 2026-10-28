# Bulk Import: Importing the SDOH Resource Sheet into the Database

**Ticket:** #28 Bulk import spike · **Branch:** `28-dev-bulk-import-spike` · **Status:** Draft for review

## Summary

Fenway Health keeps its existing SDOH resources in a Google Sheet with 52 resources. This proposal describes how an admin imports that sheet into the `resources` table.

The admin exports the sheet as a CSV file and uploads it (or a developer runs a one-off script instead; see Section 1). The backend cleans each column, validates every row, and groups likely duplicates, then returns a preview without saving anything. The admin decides which duplicates to keep and uploads the same file again with those decisions. The backend then saves the final rows in one transaction. Every imported resource lands as `pending review`, so reviewers still vet each one before it is published.

**Scope** (confirmed with the TL): this is a **one-time import** of this sheet, not a long-term tool. Rows may be added to the sheet before the import runs, so the import must handle values it has not seen yet. Importing other sheets and handling changes to the sheet's columns are out of scope.

**All examples in this doc are made up.** No rows, organization names, or cell values from the sheet are reproduced, because the sheet is confidential. Counts (such as how many rows mention housing) describe the sheet without quoting it.

**The spreadsheet is never committed to the repo.** Its share link is currently editable by anyone, so it is shared by DM only. Keep the file and any CSV export outside the repo or in a gitignored folder.

## How this doc is organized

If you are new to this, start with **Section 1**, which walks through the whole import from start to finish.

| Section | Covers                                                                                                                                                                               |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1       | How the import works: the end-to-end process                                                                                                                                         |
| 2 to 7  | One section per spreadsheet column: what the database expects, what the data looks like, how the import parses it, and worked examples. Section 2.5 also covers removing duplicates. |
| 8       | Database fields the spreadsheet does not have                                                                                                                                        |
| 9       | Tools and packages                                                                                                                                                                   |
| 10      | Schema compatibility                                                                                                                                                                 |
| 11      | Action items checklist                                                                                                                                                               |
| 12      | Open questions                                                                                                                                                                       |
| 13      | Future improvements (out of scope)                                                                                                                                                   |

| Spreadsheet column | Database column(s)                                          | Required?                    | Section |
| ------------------ | ----------------------------------------------------------- | ---------------------------- | ------- |
| Organization       | `name`                                                      | Yes                          | 2       |
| Service Type       | `category`                                                  | Yes                          | 3       |
| Address            | `address`, `zip_code`, `county` (and `city` under Option 2) | `zip_code` and `county`: yes | 4       |
| Phone              | `phone`                                                     | No                           | 5       |
| Email              | `email`                                                     | No                           | 6       |
| Eligibility        | `eligibility`                                               | No                           | 7       |

**Each column is cleaned on its own, but duplicates are found once, after every row is cleaned, by comparing whole rows** (Section 2.5).

---

## 1. How the import works

This section follows the spec's admin upload flow. Because the import runs only once, a one-off backend script with a dry-run report may be enough instead; that is an open question (Section 12). The column cleaning, duplicate detection, and saving in Sections 2 to 8 work the same either way.

### Before the first import

Complete the one-time address setup in Section 4.5 Part A, and the refactor that makes `validateResourceFields` and the ZIP rule reusable (Section 9).

### Each import

1. **Clean the source sheet.** With the PM and Fenway, fix typos in organization names and confirm the suspected duplicates found in the audit before exporting.
2. **Export the sheet as CSV** from Google Sheets (File, then Download, then Comma-separated values). Google Sheets exports only the tab you are viewing, so export each tab if resources are split across tabs. Do not open and re-save the CSV in Excel, which strips leading zeros from ZIPs and can garble apostrophes. Never commit the file.
3. **Preview: upload the CSV to `POST /api/import/preview`** (proposed route) as a file, with an explicit file size limit (Section 1.1). Nothing is saved during the preview.
4. **Check the header row.** If the Organization, Service Type, or Address column is missing, reject the whole file with a clear message. The columns are not expected to change, so this only guards against uploading the wrong file.
5. **Clean and map every row.** Each column is handled as described in Sections 2 to 7, and the remaining fields are filled in as described in Section 8.
6. **Validate every row** with the shared resource validator. Each row is valid, valid with warnings, or rejected with a reason.
7. **Find duplicates** within the file and against the database (Section 2.5).
8. **Return the preview** as JSON, with: counts; rejected rows with reasons; warnings; duplicate groups with their labels and suggested rows; ZIPs that need a county choice (Section 4.5); and a fingerprint of the file (a SHA-256 hash).
9. **The admin reviews the preview.** They can fix rejected rows in the sheet and start again from step 2, or continue. They make a choice for each duplicate group and each ZIP that needs a county.
10. **Finalize: upload the same CSV to `POST /api/import/finalize`** (proposed route), along with the admin's choices and the fingerprint from step 8. If the fingerprint does not match, the backend rejects the request with "File changed since preview. Run the preview again."
11. **Repeat steps 4 to 7 on the same file.** Because the file is identical, every row matches the preview. The backend then applies the admin's choices and validates the final rows again.
12. **Save all remaining rows in one TypeORM transaction.** If any row fails to save, Postgres rolls back the whole batch and nothing is saved.
13. **Return a report** with how many resources were imported, skipped as duplicates, and rejected, plus the details of each skipped and rejected row.
14. **Reviewers vet the imported resources.** They appear in the review queue as `pending review`, where reviewers score them, add tags, and fill in missing fields like description and website.

**The import is meant to run once.** The TL confirmed this is a one-time import, not a long-term tool. The check against resources already in the database (Section 2.5.4) still matters as a safety net: it prevents duplicates if the import has to be retried after a failed run, or if some resources were already created through the app.

**Access (in-app upload only):** both routes should be restricted to admins once authentication is in place. Until there is an admin UI, both routes can be tested by calling them directly with an API client.

### 1.1. Upload size limits

This applies only if the import is an in-app upload. Two backend defaults affect how the CSV reaches the backend:

- **Request bodies are capped at 100 KB.** The backend uses Nest's default body handling (`apps/backend/src/main.ts`), which keeps Express's 100 KB limit for JSON and form bodies. Sending a large sheet's parsed rows as JSON could be rejected with a 413 error.
- **File uploads have no size limit.** Nest handles file uploads with multer, which comes with `@nestjs/platform-express`. No backend code accepts files yet, and multer has no file size limit unless one is set.

**Recommendation:** upload the CSV as a file on both the preview and finalize calls, instead of sending parsed rows as JSON, and set an explicit file size limit on both routes. The frontend's nginx config does not sit in front of the API, so it adds no limit of its own. Any proxy in the real deployment is not in the repo and still needs checking.

---

## 2. Organization

### 2.1. What the database expects

| Column | Type           | Required? | Rule                                                                                                             |
| ------ | -------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `name` | `varchar(255)` | **Yes**   | At most 255 characters, checked by `validateResourceFields` in `apps/backend/src/resources/resources.service.ts` |

### 2.2. What the source data looks like

- Every row has an organization name, and all names are under 255 characters.
- **The same organization can appear more than once.** That is expected: one organization can run several services or locations, so each row is its own resource.
- **One organization appears under two spellings** in three rows (for example, "Sunrise Housing" twice and "Sunrise Housing Services" once), all sharing an address and phone number.
- **Another organization may appear under two different names**: once by its acronym and once by its full name (for example, "ECA Housing" and "Example Community Action (ECA)").
- **Seven names have trailing spaces** (for example, `Example Pantry `).
- **One name has a typo** that should be fixed in the sheet before importing.
- **Two names use curly apostrophes** (`’` instead of `'`), as in `Sam’s Kitchen`. Staff type the straight one, so searches could miss them.

### 2.3. How the import parses it

1. **Export the sheet as CSV** from Google Sheets. Do not open and re-save it in Excel, which can garble apostrophes and other special characters.
2. **Parse the CSV** with `csv-parse`, which turns each row into an object keyed by column name, and read the Organization value.
3. **Trim** leading and trailing spaces, and collapse double spaces inside the name.
4. **Convert curly apostrophes to straight ones**, so search works consistently.
5. **Reject the row if the name is missing**, including placeholder text (`N/A`, `none`, `-`, `TBD`), because `name` is required.
6. **Reject the row if the name is over 255 characters.**
7. **Store everything else exactly as written.** Capitalization is not changed, because names contain acronyms (like YMCA or LGBTQ+) that automatic capitalization would break.
8. **Typos are fixed in the sheet before importing**, not by the import.

### 2.4. Worked examples

| Organization cell                      | Saved `name`     | Outcome                             |
| -------------------------------------- | ---------------- | ----------------------------------- |
| `Example Pantry `                      | `Example Pantry` | Valid (trailing space removed)      |
| `Sam’s Kitchen`                        | `Sam's Kitchen`  | Valid (apostrophe standardized)     |
| `Example LGBTQ+ Youth Alliance (ELYA)` | Unchanged        | Valid                               |
| Blank or `N/A`                         | None             | Rejected: organization name missing |

### 2.5. Removing duplicates

Duplicates are found once, after every column is cleaned (Sections 2 to 7), by comparing whole rows. The check uses the name key described here, plus a phone key and an address key built from the cleaned Phone and Address columns.

#### 2.5.1. Why it's needed

The database has no unique constraints apart from the primary key, so nothing stops the same resource from being saved twice. The spec requires duplicates to be identified before publishing. Name alone cannot be the rule: it would merge an organization's separate services into one, and it would miss two spellings of the same organization, like "Sunrise Housing" and "Sunrise Housing Services".

#### 2.5.2. Comparison keys

After every row is cleaned, the import builds three keys per row. The keys are only used for comparing; saved values are unchanged.

| Key         | How it's built                                                                                                                               |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**    | Lowercase; straighten apostrophes; treat `&` and `and` the same; remove punctuation and spaces; drop generic words like "services" and "inc" |
| **Phone**   | Digits only, with any extension removed (Section 5.3)                                                                                        |
| **Address** | Lowercase; remove punctuation; standardize abbreviations like "street" to "st"                                                               |

Blank keys are skipped. Otherwise every row with no phone would be grouped together.

#### 2.5.3. How groups are found

1. **Build the three keys for every row in the file.**
2. **Load existing resources from the database** and build the same keys for them, marked as existing.
3. **Put rows into buckets by each key.** Any bucket with two or more rows is a match.
4. **Merge overlapping buckets into groups.** If row A matches row B by name, and row B matches row C by phone, all three form one group.
5. **Label each group.** If the names match and the phone or address also matches, it is a **likely duplicate**. Otherwise it is a **possible duplicate**.
6. **Suggest which row to keep:** the row with the most fields filled in; if tied, the one with no warnings; if still tied, the first row.

#### 2.5.4. Defaults and decisions

Every group is shown to the admin in the preview before anything is saved.

| Group                                                      | Default                                                                    | Admin can choose         |
| ---------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------ |
| **Likely duplicate**                                       | Keep the suggested row, skip the rest                                      | Another row, or keep all |
| **Possible duplicate** (only the phone or address matches) | Keep all, because one agency can run several programs from the same office | Keep one                 |
| **Matches a resource already in the database**             | Skip the spreadsheet rows, so vetted data is never overwritten             | Keep them anyway         |

The import never merges or deletes rows on its own. Skipped rows are not deleted from the spreadsheet; they are just not imported.

#### 2.5.5. Examples

- **Two spellings (likely duplicate):** in the made-up example, "Sunrise Housing" (twice) and "Sunrise Housing Services" share a name key (`sunrisehousing`, once generic words like "Services" are dropped), a phone, and an address. They form one group, the admin keeps one row, and the other two are not imported. The sheet has one case like this.
- **Acronym vs. full name (possible duplicate, still to check):** "ECA Housing" and "Example Community Action (ECA)" can never match by name. If they share a phone or address, they form a possible-duplicate group, and the admin keeps both if they are different programs.
- **Shared numbers:** some organizations list a shared number, such as a statewide hotline or 211. Those rows group together even though they are different organizations, and the admin keeps all of them.

**Future improvement:** fuzzy name matching (edit distance) would also catch typos like "Sunrise Housng" (Section 13). In a sheet this size, the phone and address keys already catch these cases.

---

## 3. Service Type

The **Service Type** column describes what each organization offers. The import uses it to set each resource's `category`, which is what staff filter by (for example, "Housing" or "Food").

**In short: the Service Type text is used to decide the category, but the text itself is not saved.** The import splits the text into separate services and checks each one for keywords. Every match adds a category label (`housing`, `food_access`, or `other`) to the resource's `category` list, and any service that is neither housing nor food adds `other`, including kinds of services the import has not seen before. Only that list is saved, on the same database row as the organization's name, address, and other details. The original text is kept only if the team decides to copy it into `description` (Section 12).

### 3.1. What the database expects

| Column     | Type                                 | Required? | Rule                                                                                                                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------------------ | --------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category` | `resources_category_enum[]` (a list) | **Yes**   | Must be a non-empty list, checked by `validateResourceFields` (`resources.service.ts:65-75`). Each value must exactly match a stored value of the `Category` enum: `food_access`, `housing`, or `other` (`resources/types.ts:1-9`). The check is case-sensitive, so the key `FOOD_ACCESS` fails. Anything else returns a 400: "Category must be a non-empty list of: food_access, housing, other." |

The database enum has the same three values (`1790210931556-CreateResourcesTable.ts:8`). A plain string like `'housing'` is rejected; it has to be a list, like `['housing']`.

**One resource can have more than one category.** The enum's own comment in `types.ts` gives this exact case: an organization that offers both food and housing assistance.

**The validator does not catch repeated values.** `['housing', 'housing']` passes. The import adds each category at most once (step 7 in Section 3.3), so imported rows never have repeats.

### 3.2. What the source data looks like

- **Every one of the 52 rows has a Service Type.** The column is complete, with no blank cells.
- **Service Type is free text, not a category.** The 52 rows use 42 different values (after trimming spaces), ranging from a single phrase (for example, "Food Pantry") to a list of several services.
- **Most cells list several services, separated by commas** (for example, "Rental Help, Housing Search, Furniture Bank"). One cell separates two services with ` + ` instead, and one has a list inside parentheses (for example, "Food Help (SNAP, WIC, school meals)").
- **`&` and "and" usually join words inside one service** rather than separating services, as in "Short-Term & Long-Term Housing".
- **Several values have trailing spaces**, and one has a stray space before a comma (for example, "Emergency Housing , Job Training").
- **Every row mentions housing, food, or both**, so every row gets at least one of those categories.
- **Ten rows also list a service that is neither housing nor food**, such as domestic violence support, job training, or a furniture bank, so they get `other` as well.
- **The sheet is almost entirely housing.** 51 rows mention housing, only 6 mention food, and only 1 is food-only. The spec says the initial focus is food security, so this is listed as an open question (Section 12).
- **Some rows describe referrals** rather than direct services, for example "housing referrals" or "pantry referrals". This matters for tags (Section 3.5), not for category.

A lookup table listing every exact value would break on any new or slightly different wording, including in rows added to the sheet later, so the import splits each cell into services and matches keywords instead.

### 3.3. How the import parses it

**One row, start to finish:**

| Step                                    | Value                                                     |
| --------------------------------------- | --------------------------------------------------------- |
| Service Type cell                       | `Rental Help, Housing Search, Furniture Bank`             |
| Lowercased copy, used only for matching | `rental help, housing search, furniture bank`             |
| Split into services                     | `rental help` · `housing search` · `furniture bank`       |
| `rental help`                           | Matches "rent\*", so `housing` is added                   |
| `housing search`                        | Matches "housing", so `housing` (already added)           |
| `furniture bank`                        | Matches neither list, so `other` is added, with a warning |
| Saved on the resource's row             | `category: ['housing', 'other']`                          |

This is still **one resource**. In the app, it appears under both the Housing and Other filters, because each filter checks whether its label is in the list. Nothing is copied or moved.

**The steps:**

1. **Read the Service Type value** for the row and trim surrounding spaces. Then make a **lowercased copy** for matching, because a keyword like `housing` would not match "Housing" or "HOUSING" otherwise. The original text is never changed, and the copy is thrown away after matching.
2. **Reject the row if the cell is empty** or placeholder text (`N/A`, `none`, `-`, `TBD`), because `category` is required.
3. **Split the copy into separate services** at commas, semicolons, line breaks, and ` + ` (a plus sign with spaces around it), and trim each piece. Do not split inside parentheses, and do not split at `&` or "and", which usually join words inside one service.

   ```ts
   // Split at , ; a line break, or " + ", but not inside parentheses
   const services = forMatching
     .split(/(?:[,;\n]|\s\+\s)(?![^(]*\))/)
     .map((s) => s.trim())
     .filter((s) => s.length > 0);
   ```

4. **Check each service against the housing and food keyword lists** (below). A service that matches a list adds that category.
5. **A service that matches neither list adds `other`**, with a warning in the preview naming the exact service that triggered it. This catches every kind of service, including new ones, without listing them.
6. **Also check the whole cell for the `other` keywords** (domestic violence, legal). This catches them even inside a housing phrase, such as "Housing Legal Help", which is one service and would otherwise only get `housing`.
7. **Combine the results, adding each category once.** A cell can end up with any mix of `housing`, `food_access`, and `other`, and the result is still **one resource**.
8. **Use the values from the `Category` enum in `resources/types.ts`** (like `food_access`), never hand-typed strings. The enum's *keys* (like `FOOD_ACCESS`) are not valid in the database, and a frontend test already mixes the two up.

   ```ts
   const categories = new Set<Category>();

   categories.add(Category.FOOD_ACCESS);   // adds the stored value 'food_access'
   categories.add('FOOD_ACCESS');          // does not compile: a hand-typed string is not a Category
   ```

   Typing the set as `Set<Category>` means TypeScript rejects any hand-typed string, including the key `FOOD_ACCESS` and typos like `'food_acess'`, before the code even runs.

9. **Keep the keyword lists in one place in the code**, so a new phrasing can be handled by adding one keyword, without changing the matching logic.

#### Keyword lists

| Category                            | Keywords (`*` = any ending)                                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `housing`                           | housing, shelter\*, rent\*, section 8, homeless\*, evict\*, foreclos\*, homeownership, utilit\*, fuel, energy |
| `food_access`                       | food, snap, wic, hip, grocer\*, meal\*, pantr\*                                                               |
| `other` (checked on the whole cell) | domestic violence, legal                                                                                      |

```ts
const CATEGORY_KEYWORDS = {
  [Category.HOUSING]:     ['housing', 'shelter*', 'rent*', 'section 8', 'homeless*', 'evict*', 'foreclos*', 'homeownership', 'utilit*', 'fuel', 'energy'],
  [Category.FOOD_ACCESS]: ['food', 'snap', 'wic', 'hip', 'grocer*', 'meal*', 'pantr*'],
};
const OTHER_KEYWORDS = ['domestic violence', 'legal'];

// "grocer*" matches any word starting with "grocer"; "hip" matches only the whole word
const toPattern = (keyword: string) =>
  keyword.endsWith('*')
    ? new RegExp(`\\b${keyword.slice(0, -1)}\\w*`)
    : new RegExp(`\\b${keyword}\\b`);
```

**Every keyword must start a word.** This is what stops "hip" from matching inside "homeownership": HIP is a food benefit program, and a plain "contains" check would tag every homeownership program as food. It also stops `rent*` from matching inside "parent".

**A keyword ending in `*` matches any ending.** `grocer*` covers "grocery", "groceries", and even a typo like "groceriees", and `homeless*` covers "homeless" and "homelessness". Short or ambiguous keywords stay exact on purpose: `hip*` would also match "hipaa", and `snap*` would match "snapshot".

**Why utility, fuel, and energy count as housing.** The schema's own tags put "Utility Assistance" under housing services, so "Utility Assistance", "Fuel Assistance", and "Energy Programs" are treated as housing rather than `other`.

**Why split only at commas, semicolons, line breaks, and ` + `.** In this sheet, those separate services, while `&` and "and" join words inside one service. Splitting at `&` would leave "Short-Term" on its own in "Short-Term & Long-Term Housing", matching no keyword, and wrongly add `other`. A `+` only counts as a separator when it has spaces around it, because a plain `+` is part of "LGBTQ+": splitting there would turn "Youth Shelter" in "LGBTQ+ Youth Shelter" into a separate service. Commas inside parentheses are left alone for the same reason: "(SNAP, WIC, school meals)" describes one service.

#### Drawbacks of splitting

- **`other` becomes broad.** Every service that is not housing or food lands there, including housing-related ones like outreach or family stabilization. Reviewers can remove `other` during vetting, and words that keep showing up can be added to the housing list.
- **Notes in the cell become services.** A piece like "call first" or "ages 60+" would add `other`. The preview warning names the piece, so the admin can spot it.
- **Results depend on punctuation.** `&` and "and" are not split, so "Basic Needs" adds `other` after a comma but not in "Housing & Basic Needs". A `+` without spaces is not split either, so "Housing+Food" would stay one service.
- **Typos become `other` instead of being rejected.** A cell that is only "Fod" imports as `other`, with a warning, instead of being caught.
- **Slightly more code and tests** than matching the whole cell: splitting, the parentheses and ` + ` rules, and the warnings.

#### Alternative considered: keep the cell whole

The simpler alternative checks the whole cell against all three keyword lists without splitting it, and gives a resource `other` only if the cell contains an `other` keyword (domestic violence, legal, workforce). A row that matches nothing is rejected.

|                                                         | Keep the cell whole                           | Split into services (chosen)                  |
| ------------------------------------------------------- | --------------------------------------------- | --------------------------------------------- |
| **Rows that get `other` in this sheet**                 | 4                                             | 10                                            |
| **Services in no keyword list** (like "Furniture Bank") | Ignored                                       | Added as `other`                              |
| **New kinds of services in rows added later**           | Missed until someone adds a keyword           | Caught automatically                          |
| **What `other` means to staff**                         | Specific: domestic violence, legal, workforce | Broad: also includes housing-related services |
| **Typos** (a cell that is only "Fod")                   | Rejected                                      | Imported as `other`, with a warning           |
| **Code and tests**                                      | Simpler                                       | Slightly more                                 |

**Why splitting was chosen:** the TL confirmed that rows may be added to the sheet before the import runs (the app's finish date is more than a year out), so the import must handle Service Types it has not seen yet. Splitting categorizes new kinds of services automatically, without anyone having to update a keyword list first.

**The original Service Type text is not saved anywhere by default**, so details like "Furniture Bank" are lost unless the text is copied into `description`. Whether to do that is an open question (Section 12). Copying it would also let reviewers see the full text while vetting and adding tags.

### 3.4. Worked examples

| Service Type cell                                   | Saved `category`         | Note                                                                 |
| --------------------------------------------------- | ------------------------ | -------------------------------------------------------------------- |
| `Section 8 Vouchers, Housing Search`                | `housing`                | Both services match housing                                          |
| `Shelter + Domestic Violence Support`               | `housing`, `other`       | Split at ` + `; "Domestic Violence Support" matches neither list     |
| `Housing Help, SNAP, Utility Assistance`            | `housing`, `food_access` | Every service matches; "Utility Assistance" counts as housing        |
| `Low-Cost Groceries & SNAP/HIP Access`              | `food_access`            | One service (not split at `&`); "grocer\*" and "snap" match          |
| `Homeownership Classes, Rental Assistance`          | `housing`                | Not food: "hip" inside "homeownership" is not a word on its own      |
| `Housing Legal Help`                                | `housing`, `other`       | One service; the keyword "legal" adds `other`                        |
| `Rental Help, Housing Search, Furniture Bank`       | `housing`, `other`       | "Furniture Bank" matches neither list                                |
| `Emergency Housing , Job Training`                  | `housing`, `other`       | The stray space does not matter; "Job Training" matches neither list |
| `Emergency Shelter, Short-Term & Long-Term Housing` | `housing`                | Not split at `&`, so "Short-Term" is not its own service             |
| `LGBTQ+ Youth Shelter`                              | `housing`                | Not split: the `+` in "LGBTQ+" has no space before it                |
| `Housing & Food Help (SNAP, WIC, school meals)`     | `housing`, `food_access` | Not split inside the parentheses                                     |
| `Fod` (typo)                                        | `other`                  | Valid, with a warning: "fod" matched no keyword                      |
| Blank or `N/A`                                      | None                     | Rejected: category is required                                       |

### 3.5. Tags

The schema also has **tags**, which are narrower filters inside a category (for example, "Emergency Shelter" or "Rental Assistance/Eviction Prevention" inside Housing). There are 49 seeded tags in 9 groups.

**The import leaves `tags` empty, and reviewers add tags during vetting.** Every imported resource lands as `pending review`, so a reviewer reads each one anyway. Service Type wording often looks like a tag match when it is not: "pantry referrals" means the organization refers people to pantries, not that it runs one, and a grocery store's "SNAP/HIP Access" means you can spend SNAP benefits there, while the seeded SNAP tag means help *enrolling* in SNAP. `create()` also deliberately ignores tags, and nothing checks that tag IDs exist. Suggesting obvious tags for reviewers to confirm is listed as future work (Section 13).

**Gap to raise with the PM:** there is no LGBTQ+ `population_focus` tag, although six organizations in the sheet focus on LGBTQ+ communities.

---

## 4. Address

This section covers how the import turns the **Address** column into the `address`, `zip_code`, and `county` columns of the `resources` table.

### 4.1. The problem in one paragraph

The spreadsheet has **one** address cell per resource, for example `12 Example St, Greenfield, MA 01301`. The database needs **three** values from it: `address` (optional), `zip_code` (required), and `county` (required, one of 14 Massachusetts counties). The ZIP code is in the cell, but the county is not. The cell contains the **city** (Greenfield), not the county (Franklin). So the import has to extract the ZIP from the text and look up the county from the ZIP. Section 4.4 covers whether to also save the city in its own column.

### 4.2. What the source data looks like

All resources are in Massachusetts. Address cells follow this pattern, with a varying number of pieces before the city:

| Pattern                        | Example                                          |
| ------------------------------ | ------------------------------------------------ |
| street, city, state ZIP        | `12 Example St, Greenfield, MA 01301`            |
| street, suite, city, state ZIP | `12 Example St, Suite 4, Greenfield, MA 01301`   |
| street, floor, city, state ZIP | `12 Example St, 3rd Floor, Greenfield, MA 01301` |
| Any of the above in all caps   | `12 EXAMPLE ST, 3RD FLOOR, GREENFIELD, MA 01301` |

The state and ZIP are always the **last** thing in the cell, so the import only needs to read the end of the text. Suites, floors, and capitalization do not affect it.

### 4.3. What the database expects

From the `resources` table, as of latest `main` (`7e346b0`). The table is created by `apps/backend/src/migrations/1790210931556-CreateResourcesTable.ts`. Despite its name, `1790285415419-CreateResourcesTable.ts` does not create the table; it adds Franklin to the county enum.

| Column     | Type                    | Required? | Rule                                                                                                                                                                                      |
| ---------- | ----------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `address`  | `varchar(255)`          | No        | At most 255 characters                                                                                                                                                                    |
| `zip_code` | `varchar(10)`           | **Yes**   | Must match `^\d{5}(-\d{4})?$`. Only `resources.service.ts` checks this. The database column is plain text, so a row saved without going through the service skips the check.              |
| `county`   | `resources_county_enum` | **Yes**   | Exactly one of: Barnstable, Berkshire, Bristol, Dukes, Essex, Franklin, Hampden, Hampshire, Middlesex, Nantucket, Norfolk, Plymouth, Suffolk, Worcester (defined in `resources/types.ts`) |

Section 4.4 compares two options for location data: **Option 1** uses these three columns as they are, and **Option 2** adds a fourth column, `city`.

#### How the backend uses `county` today

| Where                                                               | What it does                                                                                                                                                                                                |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Database                                                            | Required enum column. Postgres rejects any value outside the 14 counties.                                                                                                                                   |
| `validateResourceFields` in `resources.service.ts`                  | Checks county against the `County` enum. The match is **exact and case-sensitive**: `Suffolk` passes, while `suffolk`, `SUFFOLK`, and `Suffolk County` fail. Create, update, and search all use this check. |
| `POST /api/resources` (create)                                      | County is required. Anything else returns a 400.                                                                                                                                                            |
| `PATCH /api/resources/:id` (update)                                 | County is optional, but if sent it must be valid. `null` is rejected.                                                                                                                                       |
| `POST /api/resources/find` (search)                                 | The only county filter. Matches exactly one county. No list or partial match.                                                                                                                               |
| Tests (`resources.service.spec.ts`, `resources.controller.spec.ts`) | `resources.service.spec.ts` covers county validation and searching by county. `resources.controller.spec.ts` uses a fake service, so it only checks that requests are passed through.                       |
| Frontend (`apps/frontend/src/types.ts`)                             | Has a copy of the `County` enum, but no page reads, shows, or filters by county yet. A comment in that file mentions a county filter on the client, which does not exist.                                   |

**Watch for the enum key vs. value.** In code, `County.SUFFOLK` is the enum *key*, and its stored *value* is `'Suffolk'`. Only the value is valid in the database. A frontend test (`apps/frontend/src/api/apiClient.spec.ts`) already uses `'SUFFOLK'` by mistake, and makes the same mistake with the category (`'FOOD_ACCESS'` instead of `food_access`). It passes only because the API is mocked, which shows how easy the two are to mix up.

**Every imported row needs a valid county.** There is no way to save a resource without one.

### 4.4. Two options for location data

The schema needs a county, but the spreadsheet has a city. There are two ways to handle that:

|                           | Option 1: county only (recommended)                            | Option 2: county and city                                                                                                          |
| ------------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| **County**                | Looked up from the ZIP code                                    | Looked up from the ZIP code                                                                                                        |
| **City**                  | No separate column. The city stays in the full `address` text. | Also saved in a new `city` column                                                                                                  |
| **Schema change**         | None                                                           | One migration adding an optional `city` column. Nothing existing breaks, but it needs the small follow-up changes in Section 10.2. |
| **Extra import work**     | None                                                           | Read the city from the address (the piece just before the state and ZIP) and standardize its capitalization                        |
| **What it enables later** | Filtering by county (already supported by the search route)    | Filtering by city, widening to county when a city has few results. Adding `city` to the search route is future search work.        |

**Why county comes from the ZIP, not the city.** ZIP codes are consistent. City names are not. Addresses often use a Boston neighborhood (`Dorchester, MA 02124`) or a village (`Turners Falls`) instead of the official town name, and spelling and capitalization vary. Some town names also match county names: the town of Franklin is in Norfolk County, not Franklin County. A ZIP lookup gives the right county regardless.

**Why having both is useful.** They answer different questions:

- **City answers "what is near me?"** It matches how patients describe where they live ("I live in Greenfield," not "I live in Franklin County"), and it matters for in-person services a patient has to travel to.
- **County answers "what is in my area if nothing is nearby?"** A patient in a small town may get no results for their own town. Widening to the county shows resources one town over. County also catches neighborhood names, since a resource listed under "Dorchester" is still in Suffolk County, and it lets Fenway see which counties have thin coverage.

The search interface could try the city first and widen to the county automatically, so patients never need to know their county. That is a design decision for the search feature, outside this import.

**Why not replace county with city?** County is used by create, update, search, and their tests (see Section 4.3). Replacing it would break all of them. Adding city alongside it does not break existing behavior, because no code reads a `city` column yet. Section 10.2 lists the small follow-up changes it needs.

**Recommendation: Option 1.** The schema only needs `address`, `zip_code`, and `county`, so Option 1 needs no migration and no extra import work. Nothing is lost by waiting: the full address, including the city, is stored in `address`, so a `city` column can be added later and filled from the saved addresses if the team decides it wants a city filter (Section 13).

### 4.5. Step-by-step process

#### Part A: One-time setup (do this before the first import)

1. **Download the ZIP-to-county data.** Get the latest "ZIP to County" file from the HUD-USPS ZIP Code Crosswalk Files (link in Section 9). Check whether the download requires a free HUD User account. This file lists which county or counties each ZIP code belongs to.
2. **Keep only Massachusetts.** HUD identifies counties by 5-digit FIPS code, and every Massachusetts county code starts with `25`. Drop every row whose county code does not start with `25`.
3. **Convert county codes to county names.** Our schema stores names, not codes. Use this table:

   | FIPS  | County     | FIPS  | County    |
   | ----- | ---------- | ----- | --------- |
   | 25001 | Barnstable | 25015 | Hampshire |
   | 25003 | Berkshire  | 25017 | Middlesex |
   | 25005 | Bristol    | 25019 | Nantucket |
   | 25007 | Dukes      | 25021 | Norfolk   |
   | 25009 | Essex      | 25023 | Plymouth  |
   | 25011 | Franklin   | 25025 | Suffolk   |
   | 25013 | Hampden    | 25027 | Worcester |

4. **Save the result as a JSON lookup file** in the repo, for example `apps/backend/src/import/data/ma-zip-to-county.json`. Each ZIP maps to a list of counties, because a few ZIPs cross county lines:

   ```json
   {
     "01301": ["Franklin"],
     "02115": ["Suffolk"]
   }
   ```

   **Keep ZIP codes as text (in quotes), never numbers.** Every Massachusetts ZIP starts with `0`, and treating it as a number turns `01301` into `1301`.

   **Where the file goes.** A new `import/` folder fits the backend's layout, which uses one folder per feature (like `resources/` and `tags/`). The backend has no `data/` folders yet, but one is fine as long as the import code loads the file with an import statement, which bundles it into the build. If code instead reads the file from disk at runtime, it will be missing from the build output unless it lives in `apps/backend/src/assets`, the only folder the build copies.

   **Turn on JSON imports first.** The backend's TypeScript settings do not allow importing JSON files yet: `resolveJsonModule` is not set in any tsconfig, so the type check and the build would fail. Turn it on in `apps/backend/tsconfig.json`. To be safe, also add `json` to `moduleFileExtensions` in `apps/backend/jest.config.ts`.

   **Use the exact county values from the code.** When generating the file, take county names from the `County` enum in `resources/types.ts` (its values, like `Suffolk`), not hand-typed strings. Because the backend's county check is exact and case-sensitive, this is what guarantees every imported county passes validation. Backend code and tests can import the enum directly from that file.
5. **Record where the data came from, and add a safety test.** Add a short note next to the file with the HUD file name and quarter, so the next person knows how to refresh it. Add a Jest test that fails if any value in the file is not a valid `County` enum value. If someone regenerates the file with the wrong capitalization, the test catches it before an import does.

#### Part B: Each time the import runs

6. **Export the spreadsheet as CSV.** Do not open and re-save the CSV in Excel, which can strip leading zeros from numbers.
7. **Parse the CSV** with `csv-parse`. Address cells contain commas, so the CSV wraps them in quotes, and `csv-parse` keeps each quoted cell as a single value. Splitting lines on commas by hand would break every address apart.
8. **Read and clean the Address cell.** Trim surrounding spaces. Treat placeholder text (`N/A`, `none`, `-`, `TBD`, or blank) as missing.
9. **Store the full cell in `address`**, exactly as written (including city, state, and ZIP). Nothing is lost, and the original capitalization is kept. Reject the row if the text is over 255 characters. The import never fills in or guesses part of an address: some resources, such as domestic violence shelters, list only a town and ZIP to keep their street address confidential, and that still imports because the ZIP is at the end.
10. **Find the state and ZIP: they are the last two words of the address.** Split the text on spaces and take the last two words (`MA` and `01301`), ignoring a comma, period, or semicolon stuck to either one. This works whether or not there is a comma before the state (`Greenfield MA 01301`), and no matter how many pieces come before the city. **Reject the row first if the address has fewer than two words** (for example, just `Greenfield`), because there is no state and ZIP to read.

    ```ts
    const words = address.split(/\s+/);
    if (words.length < 2) return reject('Address is too short to include a state and ZIP');

    const zip = words[words.length - 1].replace(/[.,;]$/, '');    // '01301'
    const state = words[words.length - 2].replace(/[.,;]$/, '');  // 'MA'
    ```

11. **Check the ZIP, then the state.** The ZIP must pass the same format rule the resource service uses (that rule is not exported yet; see `validateResourceFields` in Section 9). If the last word contains any digits but fails the format (like `1301` or `0211O` with a letter O), the reason is "invalid ZIP". If it has no digits at all (like `MA` or `entrance)`), the reason is "no ZIP at the end of the address". Then the state must be `MA` (compared case-insensitively).
12. **Look up the county** in the JSON file using the first 5 digits of the ZIP.
13. **Option 2 only: read the city.** Remove the state and ZIP from the end, then drop the comma left at the end, and take the last comma-separated piece of what remains (`Greenfield` in `12 Example St, Greenfield, MA 01301`). **Standardize its capitalization** (`CAMBRIDGE` → `Cambridge`), because city is meant to be filtered on, and a filter could treat `CAMBRIDGE` and `Cambridge` as different cities. Keep a short exceptions list for names like `Manchester-by-the-Sea`. The full `address` still keeps its original capitalization. If no comma is left in what remains, the city cannot be reliably separated from the street (for example, `100 Main St Boston, MA 02115`), so leave `city` unset and show a warning rather than guess. This also applies to a town-only address like `Greenfield, MA 01301`; a reviewer can fill in the city. The row still imports, because `city` is optional.
14. **Assign each row one of three outcomes** (see the table below) and include them in the import preview (Section 1).
15. **Hand valid rows to the rest of the import**, which processes the other columns, checks for duplicates, and saves.

#### Outcomes

| Outcome              | When                                                                                                                                      | What the admin sees                                             |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| **Valid**            | ZIP found, state is MA, ZIP maps to exactly one county                                                                                    | Nothing. The row continues through the import.                  |
| **Rejected**         | Address missing, too long, too short to include a state and ZIP, no ZIP at the end, invalid ZIP, wrong state, or ZIP not in Massachusetts | The row and the reason. The admin fixes the CSV and re-uploads. |
| **Needs a decision** | ZIP maps to more than one county                                                                                                          | The candidate counties. The admin picks one before finalizing.  |

Under Option 2, a row whose city cannot be separated from the street is still **valid**, with a warning that `city` was left unset.

#### Worked examples

| Address cell                                                      | `zip_code` | `county`  | `city` (Option 2) | Outcome                                                                |
| ----------------------------------------------------------------- | ---------- | --------- | ----------------- | ---------------------------------------------------------------------- |
| `12 Example St, Greenfield, MA 01301`                             | `01301`    | Franklin  | Greenfield        | Valid                                                                  |
| `100 Main St, Suite 4, Boston, MA 02115`                          | `02115`    | Suffolk   | Boston            | Valid                                                                  |
| `100 MAIN ST, 3RD FLOOR, CAMBRIDGE, MA 02139`                     | `02139`    | Middlesex | Cambridge         | Valid (city capitalization standardized; `address` keeps the original) |
| `100 Main St, Boston MA 02115` (no comma before state)            | `02115`    | Suffolk   | Boston            | Valid                                                                  |
| `100 Main St, Boston, MA 02115,` (comma after the ZIP)            | `02115`    | Suffolk   | Boston            | Valid (the comma is ignored)                                           |
| `100 Main St Boston MA 02115` (no commas at all)                  | `02115`    | Suffolk   | Unset             | Valid, with a warning (Option 2)                                       |
| `100 Main St Boston, MA 02115` (no comma between street and city) | `02115`    | Suffolk   | Unset             | Valid, with a warning (Option 2)                                       |
| `Greenfield, MA 01301` (town and ZIP only)                        | `01301`    | Franklin  | Unset             | Valid; under Option 2, with a warning                                  |
| `100 Main St, Boston, MA`                                         | None       | None      | None              | Rejected: no ZIP at the end of the address                             |
| `100 Main St, Boston, MA 2115` (leading zero lost)                | None       | None      | None              | Rejected: invalid ZIP                                                  |
| `100 Main St, Boston, MA 02115 (side entrance)`                   | None       | None      | None              | Rejected: no ZIP at the end of the address                             |
| `Greenfield`                                                      | None       | None      | None              | Rejected: address is too short to include a state and ZIP              |
| `N/A`                                                             | None       | None      | None              | Rejected: address missing                                              |

---

## 5. Phone Number

The **Phone** column holds each organization's contact number. Staff read it to tell patients how to reach a resource, and the duplicate check uses it to spot the same organization listed twice (Section 2.5).

### 5.1. What the database expects

| Column  | Type                                                  | Required? | Rule                                                                                                                                                              |
| ------- | ----------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `phone` | `varchar(20)`, nullable (`resources.entity.ts:90-91`) | No        | At most 20 characters, checked by `validateResourceFields` (`resources.service.ts:99-101`). Anything longer returns a 400: "Phone must be at most 20 characters." |

What the validator does **not** check:

- **Format.** Digits, punctuation, and letters all pass, so `abc` and `555` would be saved as-is.
- **Trimming.** The value is not trimmed, so spaces and punctuation count toward the 20. `(617) 555-0100 ext. 1234` is 24 characters and would be rejected if saved as written.
- **Type.** A number (instead of text) has no length, so it slips past the check.

A missing phone, an empty string, and `null` all skip the check, because `phone` is optional. A resource with no phone number can still be imported.

Elsewhere in the backend, update (PATCH) accepts `null` to clear a phone (`resources.service.ts:227`), and search matches phone **exactly** (`resources.service.ts:351-356`). Exact matching is one more reason to save every imported number in one format.

### 5.2. What the source data looks like

- **Formats vary from row to row**, for example `(617) 555-0100`, `617-555-0100`, and `617.555.0100`.
- **The cleaner also handles patterns common in staff-compiled lists:** blank or placeholder cells, extensions, two numbers in one cell, numbers that are not 10 digits (such as `211` or letters like `1-800-GET-HELP`), and values over 20 characters as written.

### 5.3. How the import parses it

1. **Read the Phone value**, trim surrounding spaces, and treat placeholder text (`N/A`, `none`, `-`, `TBD`) as empty.
2. **If the cell is empty, leave `phone` unset.** This is not an error, because the column is optional.
3. **If the cell has two numbers, keep the first** and add a warning that shows the second, so the admin can add it elsewhere if needed.
4. **Separate any extension** (`ext`, `ext.`, `x`, `extension` followed by digits) from the main number.
5. **Keep only the digits of the main number**, and drop a leading country code `1` (`1-617-555-0100` becomes `6175550100`).
6. **If there are exactly 10 digits, save the number in one standard format:** `(617) 555-0100`, with any extension added as ` x2`. One format reads better in the app, makes exact-match search consistent, and keeps numbers with extensions of up to 4 digits under the 20-character limit. If a longer extension would push the number over 20 characters, save the main number only and add a warning that shows the full original. The saved value is always text, never a number.
7. **If there are not exactly 10 digits, leave `phone` unset and add a warning** that shows the original text, so the admin can decide what to do with numbers like `211`.
8. **Build the phone key** for duplicate detection: the 10 digits only, without the extension. `(617) 555-0100` and `617.555.0100 ext 2` both become `6175550100`, so they match.

**"Unset" means `phone` is left empty, never saved as an empty string `''`.** The validator skips its check for empty strings, so the import has to handle blanks itself.

**Phone problems are warnings, never rejections.** Because `phone` is optional, a bad phone number never blocks a whole resource from importing. The admin sees every warning in the preview.

**Only the phone key is needed for duplicate detection.** The duplicate check compares digits, so it works the same whether or not the saved number is reformatted.

### 5.4. Worked examples

These use made-up `555` numbers.

| Phone cell                        | Saved `phone`       | Phone key    | Outcome                                                       |
| --------------------------------- | ------------------- | ------------ | ------------------------------------------------------------- |
| `617-555-0100`                    | `(617) 555-0100`    | `6175550100` | Valid                                                         |
| `(617) 555-0100`                  | `(617) 555-0100`    | `6175550100` | Valid (already in the standard format)                        |
| `617.555.0100 ext 2`              | `(617) 555-0100 x2` | `6175550100` | Valid                                                         |
| `1-617-555-0100`                  | `(617) 555-0100`    | `6175550100` | Valid                                                         |
| `(617) 555-0100 / (617) 555-0199` | `(617) 555-0100`    | `6175550100` | Valid, with a warning: second number `(617) 555-0199` dropped |
| `211`                             | Unset               | None         | Valid, with a warning: not a 10-digit number                  |
| `555-0100`                        | Unset               | None         | Valid, with a warning: not a 10-digit number                  |
| Blank or `N/A`                    | Unset               | None         | Valid                                                         |

---

## 6. Email Address

The **Email** column holds each organization's contact email. Staff read it to tell patients how to reach a resource.

### 6.1. What the database expects

| Column  | Type                                                                           | Required? | Rule                                                                                                                                                                              |
| ------- | ------------------------------------------------------------------------------ | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `email` | `varchar(255)`, nullable (`resources.entity.ts:99-100`; the migration matches) | No        | Must pass `isEmail` from class-validator, checked by `validateResourceFields` (`resources.service.ts:103-105`). Any failure returns a 400: "Email must be a valid email address." |

`isEmail` is called with **no options**, so its defaults apply (class-validator 0.15.1 and validator 13.15.35, the versions locked in `yarn.lock`):

| Rule                                                | Effect                                                                                                                                                   |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **No display names**                                | `Food Bank <info@example.org>` is rejected                                                                                                               |
| **A top-level domain is required**                  | `info@localhost` and `info@example` are rejected                                                                                                         |
| **No IP address domains**                           | `info@[192.168.0.1]` is rejected                                                                                                                         |
| **No underscores in the domain**                    | `info@food_bank.org` is rejected                                                                                                                         |
| **Non-English characters are allowed before the @** |                                                                                                                                                          |
| **Length limits**                                   | At most 254 characters in total, 64 before the @, and 254 after it. The service's own 255 check never changes the result, because `isEmail` is stricter. |

What else the validator does and does not do:

- **It does not trim.** A leading or trailing space makes the address invalid, so ` info@example.org` is rejected.
- **It does not change capitalization.** The address is accepted in any case and stored exactly as sent.
- **It rejects anything that is not text**, such as a number or a list. This is stricter than the phone check.
- **It skips empty values.** A missing email, `null`, and an empty string `''` all skip the check. On create, an empty string would be saved as-is, so the import must leave blank emails unset instead of saving `''`.
- **It checks format, not whether the address works.** `isEmail` does not confirm that the domain or inbox exists. Confirming that is part of vetting.

Elsewhere in the backend, update (PATCH) accepts `null` to clear an email, and search rejects `null` (`resources.service.ts:351-356`).

#### What this means for the import

The existing check in `validateResourceFields` only **checks** emails. It never **fixes** them: a stray space or two addresses in one cell simply fail. It also stops the whole request with a 400 error on the first bad value, and it is private, so the import cannot call it yet. It needs a small refactor into a shared function, the same one planned for the other columns.

So the work is split:

- **The import** cleans each email (Section 6.2), checks it with the same `isEmail` function and defaults during the preview, and turns any failure into a warning for that row.
- **The existing check** stays as the final safety net when the row is saved, so imported and app-entered emails meet exactly the same rule.

### 6.2. How the import parses it

1. **Read the Email value** and trim surrounding spaces.
2. **If the cell is empty or placeholder text** (`N/A`, `none`, `-`, `TBD`), **leave `email` unset.** Never save an empty string, because the validator would let `''` through. This is not an error, because the column is optional.
3. **If the cell has a name with the address**, like `Food Bank <info@example.org>`, keep only the address inside the angle brackets. The validator rejects display names.
4. **If the cell has two addresses** (separated by a comma, semicolon, slash, space, or the word "or"), **keep the first** and add a warning that shows the second.
5. **Check the result with the same `isEmail` function and defaults the service uses**, during the preview (see "What this means for the import" in Section 6.1).
6. **If it passes, save it exactly as written**, including its capitalization. There is nothing to standardize.
7. **If it fails, leave `email` unset and add a warning** that shows the original text.

**Email problems are warnings, never rejections.** Because `email` is optional, a bad email never blocks a whole resource from importing.

### 6.3. Worked examples

These use made-up addresses.

| Email cell                     | Saved `email`      | Outcome                                                             |
| ------------------------------ | ------------------ | ------------------------------------------------------------------- |
| `info@example.org`             | `info@example.org` | Valid                                                               |
| ` info@example.org `           | `info@example.org` | Valid (spaces trimmed)                                              |
| `Food Bank <info@example.org>` | `info@example.org` | Valid (name removed)                                                |
| `Info@Example.org`             | `Info@Example.org` | Valid (capitalization kept)                                         |
| `a@example.org, b@example.org` | `a@example.org`    | Valid, with a warning: second address `b@example.org` dropped       |
| `info@example`                 | Unset              | Valid, with a warning: not a valid email (no top-level domain)      |
| `info@food_bank.org`           | Unset              | Valid, with a warning: not a valid email (underscore in the domain) |
| Blank or `N/A`                 | Unset              | Valid                                                               |

---

## 7. Eligibility

The **Eligibility** column describes who qualifies for each service, for example an income limit, an age group, or a residency requirement. Staff read it to decide whether a resource fits a patient before recommending it.

### 7.1. What the database expects

| Column        | Type                                                                    | Required? | Rule                                                                                                  |
| ------------- | ----------------------------------------------------------------------- | --------- | ----------------------------------------------------------------------------------------------------- |
| `eligibility` | `text`, nullable (`resources.entity.ts:117-118`; the migration matches) | No        | **None.** `validateResourceFields` (`resources.service.ts:57-110`) does not check eligibility at all. |

Because `eligibility` is optional, a resource with no eligibility information can still be imported.

What the backend does with eligibility today:

- **No length limit.** Neither the service nor the column sets one.
- **No type check.** Nothing confirms the value is text. A number or list would be passed to the database as-is, and the save could fail with a 500 error.
- **No trimming.** The value is stored exactly as sent, so an empty string `''` or a value that is only spaces would be saved as-is.
- **Create copies it straight into the new record** (`resources.service.ts:194, 207`). Update accepts `null` to clear it.
- **Search matches the whole text exactly** (`resources.service.ts:351-356`), so searching "Boston" would not find "Income-restricted; Boston residents".
- **No test targets eligibility.** It only appears in shared sample data (`resources.service.spec.ts:85`) and in the editable-fields list (`resources.service.spec.ts:94`).

#### What this means for the import

Because the backend never checks eligibility, **the import's cleaner is the only check it gets.** The cleaner must trim the value, leave blanks and placeholder text unset, and make sure every saved value is text. `csv-parse` already returns every cell as text, as long as its `cast` option stays off.

### 7.2. What the source data looks like

- **Eligibility is free text written by staff**, so wording varies from row to row.
- **Some cells say that eligibility varies and to contact the organization** instead of listing rules.
- **Some cells may describe a service area** (for example, "residents of Franklin County") rather than who qualifies.

### 7.3. How the import parses it

1. **Read the Eligibility value** and trim surrounding spaces.
2. **If the cell is empty or placeholder text** (`N/A`, `none`, `-`, `TBD`), **leave `eligibility` unset.** Never save an empty string `''`. This is not an error, because the column is optional.
3. **Otherwise, save it exactly as written**, including capitalization and line breaks. There is nothing to standardize, and rewording it could change its meaning.

**Text like "Varies; call for details" is kept, not treated as a placeholder.** Unlike `N/A`, it tells staff what to do next (contact the organization), so it is real guidance. Reviewers can replace it with the actual eligibility rules if they find them during vetting.

**Eligibility is never rejected and never produces warnings.** Any text is valid, because the column has no format, no length limit, and no backend check.

**The import does not turn eligibility into tags or filters.** The schema has tags that describe eligibility, such as `open-to-all`, `income-restricted`, `id-required`, and `proof-of-residency-required`, but the wording varies too much to assign them safely. Reviewers add them during vetting, reading the eligibility text the import saved.

### 7.4. Worked examples

These are made up.

| Eligibility cell                      | Saved `eligibility` | Outcome                                                 |
| ------------------------------------- | ------------------- | ------------------------------------------------------- |
| `Income-restricted; Boston residents` | Unchanged           | Valid                                                   |
| ` Open to all `                       | `Open to all`       | Valid (spaces trimmed)                                  |
| `Varies; call for details`            | Unchanged           | Valid (kept as guidance, not treated as a placeholder)  |
| `Residents of Franklin County`        | Unchanged           | Valid (service area, not who qualifies; see Section 13) |
| Only spaces                           | Unset               | Valid (the backend would otherwise save the spaces)     |
| Blank or `N/A`                        | Unset               | Valid                                                   |

---

## 8. Fields not in the spreadsheet

The `resources` table has columns the spreadsheet does not provide. Most of them track a resource's place in the app's process (vetting, scoring, verification) rather than facts about the resource. The rest are facts the sheet simply does not include.

| Column               | Value the import sets                                     | Notes                                                                                                                                                                            |
| -------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `resource_id`        | Generated by the database                                 |                                                                                                                                                                                  |
| `description`        | Unset                                                     | Optional, and not checked by the backend. Whether to copy the Service Type text here is an open question (Section 12); if it is copied, the import trims it like any other text. |
| `website`            | Unset                                                     | Optional. The sheet has no website column. Reviewers can add one during vetting.                                                                                                 |
| `vetting_status`     | `'pending review'`                                        | Required, free text. It is the only status the code uses today, and the vetting process is not finalized. The TL should confirm it is right for imports.                         |
| `score_id`           | `0`                                                       | Required integer. `create()` sets `0` too. The scores table does not exist yet.                                                                                                  |
| `tags`               | Left out, so the database default (an empty list) applies | See Section 3.5                                                                                                                                                                  |
| `reviewer_notes`     | Unset                                                     | Optional                                                                                                                                                                         |
| `last_verified_date` | **Decision needed**                                       | Required. `create()` sets today's date, which would make never-verified imports look freshly verified. See Section 10.1.                                                         |
| `city`               | Option 2 only                                             | See Section 4.4                                                                                                                                                                  |

If the import saves rows through the repository instead of calling `create()`, it must set `vetting_status`, `score_id`, and `last_verified_date` itself, because those defaults live in `create()`.

---

## 9. Tools and packages

Every tool used anywhere in the bulk import, listed once. The **Used in** column names the shared sections (1 the import process, 2.5 duplicates, 10 schema changes), the column sections (2 Organization, 3 Service Type, 4 Address, 5 Phone, 6 Email, 7 Eligibility), and testing.

### Packages and libraries

| Tool                                                        | What it does here                                                                                                                                                  | Why it's a good fit                                                                                                                                                                                                                                                                                                                                                              | Status                                                                                                                      | Used in                   | Documentation                                                                                                                       |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **csv-parse**                                               | Reads the exported CSV into one object per row, keyed by column name                                                                                               | Keeps quoted cells together, including cells with commas (addresses, Service Types) and line breaks (eligibility). Returns every cell as text, which the phone and email checks rely on.                                                                                                                                                                                         | **Not installed.** Add it to the root `package.json` from the repo root and commit `yarn.lock`. Keep its `cast` option off. | All columns               | https://csv.js.org/parse/                                                                                                           |
| **class-validator** (`isEmail`)                             | Checks each cleaned email during the preview                                                                                                                       | The exact function and defaults the service already uses, so the import and the service always agree on what is valid                                                                                                                                                                                                                                                            | Installed (0.15.1)                                                                                                          | 6                         | https://github.com/typestack/class-validator                                                                                        |
| **NestJS file upload** (`FileInterceptor`, built on multer) | Receives the CSV file on the preview and finalize routes (in-app upload only)                                                                                      | Already available through `@nestjs/platform-express`. Uploading a file avoids the 100 KB request body limit. Supports an explicit file size limit, which should be set because multer has none by default.                                                                                                                                                                       | Available. **Add `@types/multer`** as a dev dependency for its types.                                                       | 1                         | https://docs.nestjs.com/techniques/file-upload                                                                                      |
| **TypeORM** (transactions and insert)                       | Saves all final rows in one transaction                                                                                                                            | Already the project's ORM. A transaction makes the import all-or-nothing, and an insert with a list of rows writes them in one statement. The `category` enum array needs no special handling: the existing `create()` already saves it through the same insert path. Use the `DataSource` that Nest injects, not the exported `AppDataSource`, which the app never initializes. | Installed                                                                                                                   | 1                         | https://typeorm.io/docs/working-with-entity-manager/entity-manager-api · https://typeorm.io/docs/query-builder/insert-query-builder |
| **TypeORM migrations**                                      | Makes any schema changes the team approves (a `city` column, an optional `last_verified_date`, optional `zip_code` and `county`)                                   | Already how the repo changes its schema, so changes are versioned and reversible. `migration:generate` needs the migration's name in the `name` environment variable, and all scripts run from the repo root.                                                                                                                                                                    | Installed                                                                                                                   | 4, 10                     | https://typeorm.io/docs/migrations/executing                                                                                        |
| **Jest**                                                    | Unit tests for every column cleaner, Service Type keyword matching, the ZIP lookup file, and duplicate grouping; plus an integration test against a local database | Already configured, and CI runs it on every PR. The cleaners and duplicate grouping have no database access, so the worked examples in each section can become tests directly.                                                                                                                                                                                                   | Configured                                                                                                                  | All columns, 2.5, testing | https://jestjs.io/docs/getting-started                                                                                              |

### Built into the language or platform (nothing to install)

| Tool                               | What it does here                                                                                                                                                       | Why it's a good fit                                                                                                                 | Used in    | Documentation                                                                        |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| **JavaScript regular expressions** | Splitting Service Type into services and matching keywords, checking the ZIP format, separating phone extensions and digits, and pulling addresses out of display names | Each task is a simple text pattern, and word-boundary patterns handle the variations in the sheet                                   | 3, 4, 5, 6 | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions    |
| **JavaScript `Map`**               | Holds the duplicate-detection buckets (name, phone, and address keys to rows)                                                                                           | A fast key-to-list lookup. A small union-find (disjoint set) on top merges overlapping buckets into groups, with no package needed. | 2.5        | https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map |
| **Node.js crypto** (`createHash`)  | Creates the file fingerprint that confirms the finalize upload is the same file as the preview (in-app upload only)                                                     | Built into Node                                                                                                                     | 1          | https://nodejs.org/api/crypto.html                                                   |

### Already in the repo

| Tool                         | What it does here                                                                                           | Why it's a good fit                                                                                                                                                                                                                                                 | Used in       | Location                                                 |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------- |
| **`validateResourceFields`** | Final check when each row is saved: name length, category list, county, ZIP format, phone length, and email | Holds imported resources to the same rules as resources created in the app. It is private and its ZIP pattern is not exported, so it **needs a small refactor into a shared function** before the import can call it. It does not check eligibility or description. | 2, 3, 4, 5, 6 | `apps/backend/src/resources/resources.service.ts:57-110` |
| **`Category` enum**          | Supplies the exact category values (`food_access`, `housing`, `other`)                                      | Guarantees every assigned category passes validation, and avoids the key vs. value mix-up. Not to be confused with the tag category enum, which has the same name.                                                                                                  | 3             | `apps/backend/src/resources/types.ts:1-9`                |
| **`County` enum**            | Supplies the exact county names for the ZIP-to-county lookup file                                           | The backend's county check is exact and case-sensitive, so using the enum's values guarantees every imported county passes                                                                                                                                          | 4             | `apps/backend/src/resources/types.ts`                    |

### External data and environments

| Tool                                                          | What it does here                                                                                                      | Why it's a good fit                                                                                                                                                                                                                   | Used in | Documentation                                                      |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------ |
| **HUD-USPS ZIP Code Crosswalk Files**                         | Source data for the Massachusetts ZIP-to-county lookup file                                                            | Published by the U.S. Department of Housing and Urban Development and updated quarterly. Lists every county a ZIP falls in, which is how ZIPs that cross county lines are detected. The download may require a free HUD User account. | 4       | https://www.huduser.gov/portal/datasets/usps_crosswalk.html        |
| **PostgreSQL**                                                | Stores the imported resources                                                                                          | Already the project's database. Its transactions roll back a failed batch completely, and its constraints (required columns, the category and county enums) are a final safety net behind the import's own checks.                    | 1       | https://www.postgresql.org/docs/current/tutorial-transactions.html |
| **Local PostgreSQL** (for example, the official Docker image) | A throwaway database for running the full import, including running it twice to confirm existing resources are skipped | Easy to wipe and recreate between test runs, without touching any shared database                                                                                                                                                     | Testing | https://hub.docker.com/_/postgres                                  |

### Setup changes these tools need

1. **Add `csv-parse`**, plus `@types/multer` if the import is an in-app upload, to the root `package.json` (the backend has no `package.json` of its own), running the command from the repo root, and commit `yarn.lock`.
2. **Turn on JSON imports** for the ZIP lookup file: set `resolveJsonModule` in `apps/backend/tsconfig.json`, and add `json` to `moduleFileExtensions` in `apps/backend/jest.config.ts`.
3. **Refactor `validateResourceFields`** into a shared function the import can call, and export the ZIP pattern.
4. **Keep `csv-parse`'s `cast` option off**, so digit-only phone numbers stay text.
5. **For an in-app upload, set an explicit file size limit** on the preview and finalize routes.

### Considered but not used

| Tool                                                                                       | Why not                                                                                                                                                           |
| ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **libphonenumber-js** (https://www.npmjs.com/package/libphonenumber-js)                    | A full phone-number library is unnecessary, because every resource is in Massachusetts and every number is a US number                                            |
| **Google Sheets API** (https://developers.google.com/workspace/sheets/api/guides/concepts) | Reading the live sheet would need Google Cloud credentials, and the sheet's link is currently editable by anyone. A downloaded CSV snapshot is simpler and safer. |
| **Fuzzy name matching** (edit distance)                                                    | Would catch typos like "Sunrise Housng", but phone and address keys already catch these duplicates in a sheet this size. Listed as future work.                   |

---

## 10. Schema compatibility

**Short answer: mostly yes.** Every column in the sheet fits the current schema without a migration. One thing blocks a *correct* import, and a few things depend on team decisions.

**What a schema change involves.** Changing the database's structure, such as adding a column or making one optional, needs a **migration**: a script that applies the change. Migrations live in `apps/backend/src/migrations/`, run in order so every database (local, shared, and production) ends up with the same structure, and can be undone. The repo's commands are `yarn migration:generate` (writes a migration from changes to the entity files), `yarn migration:run`, and `yarn migration:revert`. For example, Fix A in Section 10.1 would run `ALTER TABLE resources ALTER COLUMN last_verified_date DROP NOT NULL;`. Anything handled in the import's own code, like duplicate detection or the ZIP lookup, needs no migration.

### 10.1. The blocker: `last_verified_date`

|                                      |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **What it is**                       | The date someone last confirmed a resource's information is still accurate. The spec's re-verification feature flags resources whose date is too old and reminds admins to re-check them, so patients are not sent to services that have changed or closed.                                                                                                                                                                                                                                                                                                                                                                                                                        |
| **Problem**                          | `last_verified_date` is required (`NOT NULL`), and `create()` fills it with today's date. Every imported resource would look freshly verified, even though nobody has checked it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| **Why it matters**                   | Stale-resource flagging depends on this date, so never-verified imports would not be flagged for review.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| **Fix A**                            | Make the column optional and treat an empty date as "never verified". That means: the entity (`resources.entity.ts:126-127`) and a migration; `create()`, which always sets today's date (`resources.service.ts:210`); the update DTO (`update-resource.dto.ts:10`) and its check (`resources.service.ts:139-147`), which rejects `null` today, with a test confirming it (`resources.service.spec.ts:547-548`); search, which rejects `null` (`resources.service.ts:351-356`), so finding never-verified resources would need a search change; and the frontend types (`apps/frontend/src/types.ts:58`). `CreateResourceDto` does not change, because the date is server-managed. |
| **Fix B**                            | No schema change: set the date to when Fenway compiled the sheet. Fenway would need to provide that date.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| **It may matter less than it looks** | Imported resources land as `pending review`, and a reviewer vets each one before it is published. If approving a resource sets `last_verified_date` to the approval date, the import's placeholder is replaced with a real date, and `create()`'s default becomes acceptable. The vetting flow is not built yet, so this needs confirming (Section 12).                                                                                                                                                                                                                                                                                                                            |
| **Who decides**                      | The TL                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

### 10.2. Decisions that may need a schema change

| Decision                                                                        | If yes, what changes                                                            | If no (the default)                                                   |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Import resources with no physical address?** (hotlines, online-only services) | `zip_code` and `county` become optional. See the change list below.             | Rows with no ZIP are rejected                                         |
| **Add a `city` column?** (Option 2 in Section 4.4)                              | One migration adding an optional `city` column, plus the small follow-ups below | The city stays inside the full `address` text (Option 1, recommended) |
| **Let a resource have more than one county?**                                   | `county` becomes a list, which affects filters and the API                      | The admin picks one county for the few ZIPs that cross county lines   |

**If resources with no address are allowed,** these all need to change: the entity (`resources.entity.ts`) and a migration generated from it; `CreateResourceDto`; `validateResourceFields`, so create allows a missing ZIP and county and update allows `null`; how `POST /api/resources/find` treats resources with no county; the frontend types (`apps/frontend/src/types.ts`); and the tests that reject a `null` county or ZIP on update (`resources.service.spec.ts:501, 503`) and the search test that uses `county: null` (`resources.service.spec.ts:290`). No create test checks a missing ZIP or county today.

**If a `city` column is added,** the follow-ups are: review the generated migration, because the `users` and `scores` entities are registered but have no migrations, so `migration:generate` will likely add those tables too (remove them, or write the migration by hand with `migration:create`); add `city` to `CreateResourceDto` and `create()`, or save through the repository, because `create()` only saves the fields it lists; add the field to the frontend types; and, so reviewers can edit city, add it to `EDITABLE_FIELDS` (`resources.service.ts:20-36`), which also changes the message a test checks (`resources.service.spec.ts:94`). Making it searchable later is separate search work.

### 10.3. Already compatible (no change needed)

| What                                          | Why it works today                                                                                                                                                                                           |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Organization → `name`**                     | Required text, up to 255 characters. Every name in the sheet fits.                                                                                                                                           |
| **Service Type → `category`**                 | A list, so one resource can be both housing and food. The import always uses the exact enum values.                                                                                                          |
| **Address → `address`, `zip_code`, `county`** | The full text fits in `address`. The ZIP is read from the end, and the county is looked up from it using the exact `County` enum values, so the case-sensitive county check always passes.                   |
| **Phone → `phone`**                           | Up to 20 characters. The standard format fits, including extensions of up to 4 digits.                                                                                                                       |
| **Email → `email`**                           | Up to 255 characters, and `isEmail` already limits addresses to 254                                                                                                                                          |
| **Eligibility → `eligibility`**               | Free text with no length limit                                                                                                                                                                               |
| **`vetting_status`, `score_id`, `tags`**      | The import sets `vetting_status` and `score_id` to the same values `create()` does (`'pending review'` and `0`). `tags` is left out, so the database default, an empty list, applies (Section 8).            |
| **Duplicates**                                | The database has no unique constraint, so duplicates are caught in the import code instead (Section 2.5). A unique constraint on `name` would be wrong, because one organization can have several resources. |
| **Blank optional values**                     | The backend skips its checks for empty strings, so the import leaves blank phones, emails, and eligibility unset instead of saving `''`                                                                      |

---

## 11. Action items checklist (ordered by dependency)

- [ ] **1.** Pull the latest `main`. PRs #37, #38, #53, and #56 are merged, and there are no open PRs touching resources.
- [ ] **2.** Clean and audit the source sheet with the PM: fix the typo in an organization's name, confirm the organization listed under two spellings is one organization, check whether the acronym and full-name rows are the same organization, confirm how many tabs the sheet has, and note any addresses with no ZIP or no address at all *(can run in parallel with items 3 to 7)*
- [ ] **3.** Get decisions from the TL and PM on: whether the import is an in-app admin upload or a one-off backend script (Section 1); `last_verified_date` for imports, including whether approving a resource will set it (Section 10.1); whether `county` and `zip_code` stay required and resources with no address can be imported; Option 1 or Option 2 for city; the `vetting_status` value for imports; whether to copy Service Type into `description`; whether "basic needs" counts as food; and the standard phone format
- [ ] **4.** Make any schema changes those decisions require, in reviewed migrations, removing any unrelated `users` or `scores` tables that `migration:generate` adds (those entities have no migrations yet). With the default choices in Section 10.2, there are none. *(depends on 3)*
- [ ] **5.** Refactor `validateResourceFields` into a shared function the import can call, and export the ZIP pattern *(depends on 1)*
- [ ] **6.** Add `csv-parse` to the root `package.json`, plus `@types/multer` if the import is an in-app upload, and commit `yarn.lock` *(depends on 1)*
- [ ] **7.** Complete the one-time address setup: download the HUD file, build `ma-zip-to-county.json` with the `County` enum values, turn on `resolveJsonModule`, and add the test that every county in the file is valid (Section 4.5 Part A) *(depends on 1)*
- [ ] **8.** Implement the cleaners for every column (Sections 2 to 7) and the import defaults (Section 8), with Jest tests built from each section's worked examples *(depends on 5, 6, and 7, and on 4 if the decisions change any field)*
- [ ] **9.** Implement duplicate grouping as a function with no database calls, with Jest tests (using made-up rows) for a group spelled two ways, an acronym-vs-full-name pair, and rows with blank phones *(depends on 8)*
- [ ] **10.** Build the import itself, depending on item 3: for an in-app upload, the preview and finalize routes, the file size limit, and the fingerprint check (Section 1); for a one-off script, a script with a dry-run mode that writes the same preview as a report *(depends on 8 and 9)*
- [ ] **11.** Implement the transactional save *(depends on 4 and 10)*
- [ ] **12.** Test locally against a local database: preview (or dry-run) the real CSV and check its rejects and warnings against the audit from item 2, run the real import, then run it once more to confirm the database duplicate check skips every row, which is the safety net for retries *(depends on 2 and 11)*
- [ ] **13.** For an in-app upload, restrict both routes to admins once authentication is in place *(depends on 10 and the auth work)*
- [ ] **14.** The TL backs up the shared database and runs the import there *(depends on 12, and on 13 for an in-app upload)*

---

## 12. Open questions

Questions still waiting on an answer from the TL, the PM, or Fenway. Ideas for later are collected in Section 13.

### Whole import

- What should `last_verified_date` be for imported rows: empty (with a migration) or the date Fenway compiled the sheet?
- When a reviewer approves a resource, will that set `last_verified_date` to the approval date? If so, the default date from `create()` is acceptable for imports (Section 10.1).
- Is `'pending review'` the right status for imported resources?
- Since this is a one-time import, does it still need to be an in-app admin upload (the spec's flow, described in Section 1), or is a one-off backend script with a dry-run report enough?
- The sheet is almost entirely housing, but the spec says the initial focus is food security. Is there a separate source for food resources?

### Organization

- Is converting curly apostrophes to straight ones acceptable? Search should also treat `’` and `'` as the same later, since phones and Macs insert curly apostrophes automatically.
- Are the two rows that list an organization by its acronym and by its full name the same organization?

### Service Type and tags

- Should the original Service Type text be copied into `description`, so the detail is not lost and reviewers can use it to add tags?
- Should "basic needs" count as food? Seven Service Types use it. Today it adds `other` when it is listed as its own service, but not when it is joined with `&`.
- Should housing-related services like outreach, family stabilization, and family self-sufficiency programs count as housing instead of `other`?
- Should there be an LGBTQ+ `population_focus` tag?

### Address

- Should resources without a physical address be importable?
- Is picking one county for a multi-county ZIP acceptable, or should `county` hold several?
- Option 1 (recommended) or Option 2 (add a `city` column)?
- Should address be required for in-person services? It is optional today, which allows hotlines and confidential locations such as domestic violence shelters.
- Should P.O. boxes count as a valid address for a resource patients visit in person?

### Phone

- Is the standard format `(617) 555-0100 x2` acceptable?
- When a cell has two numbers, is keeping the first and warning about the second enough?
- How should short or special numbers like `211`, text-only lines, or letter numbers (`1-800-GET-HELP`) be stored?

### Email

- When a cell has two addresses, is keeping the first and warning about the second enough?
- Should emails be saved as written (current plan) or lowercased?

### Eligibility

- Some cells say eligibility varies and to contact the organization. Should reviewers be asked to find the actual eligibility rules for these during vetting?
- Are the existing eligibility tags (`open-to-all`, `income-restricted`, `id-required`, `proof-of-residency-required`, and the population tags) enough for Fenway's eligibility rules?

---

## 13. Future improvements (out of scope)

Ideas that go beyond a one-time import of this sheet. None of them are needed for this ticket.

| Idea                                                                                                                               | Why it might be worth doing later                                                                                                                                                                                                                                                 | Related section |
| ---------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Fuzzy name matching (edit distance) for duplicates                                                                                 | Would catch typos like "Sunrise Housng" that the phone and address keys miss                                                                                                                                                                                                      | 2.5             |
| Email as a fourth duplicate signal                                                                                                 | Another way to match rows when name, phone, and address differ                                                                                                                                                                                                                    | 2.5             |
| Keyword lists in their own file                                                                                                    | Easier to find and extend                                                                                                                                                                                                                                                         | 3.3             |
| Suggesting unambiguous tags for reviewers to confirm                                                                               | Saves reviewers time on obvious tags like Section 8 or emergency shelter                                                                                                                                                                                                          | 3.5             |
| Marking referral-only services differently                                                                                         | Staff could tell organizations that refer people apart from ones that provide the service                                                                                                                                                                                         | 3.2             |
| More categories (for example, legal aid or domestic violence support)                                                              | `other` groups unrelated services. Each new category needs an enum migration, a keyword list, and possibly its own vetting criteria from Fenway.                                                                                                                                  | 3.3             |
| A `city` column and city filter (Option 2)                                                                                         | Finer location filtering. The city can be filled in later from the saved addresses.                                                                                                                                                                                               | 4.4             |
| Grouping neighborhoods (Dorchester, Jamaica Plain) under Boston, and checking city names against the 351 official cities and towns | Cleaner city filtering                                                                                                                                                                                                                                                            | 4.4             |
| Capturing service area separately                                                                                                  | City and county describe where a resource's office is, not who it serves                                                                                                                                                                                                          | 4.4, 7.2        |
| Separate organization and program name fields                                                                                      | Staff would not see several entries with the same name in search, since one organization can have several resources                                                                                                                                                               | 2               |
| Standardizing phones entered through the app                                                                                       | Search matches phone exactly, so mixed formats make searching by phone unreliable                                                                                                                                                                                                 | 5               |
| Treating `''` as no value in the service                                                                                           | The service saves empty strings as-is for resources created in the app                                                                                                                                                                                                            | 6.1             |
| Structured eligibility fields (income limit, age range, residency)                                                                 | Needed for the patient needs assessment to filter by eligibility                                                                                                                                                                                                                  | 7               |
| Filling the gaps in the service's own tests                                                                                        | None of these are tested today: a phone of exactly 20 characters; an email over the length limit, with spaces, or with a display name; values that are not text; clearing a phone or email with `null`; searching by phone, email, or eligibility; anything targeting eligibility | 5, 6, 7         |

**Explicitly out of scope** (confirmed with the TL): importing other sheets, re-importing updated versions of this sheet, and handling changes to the sheet's columns.