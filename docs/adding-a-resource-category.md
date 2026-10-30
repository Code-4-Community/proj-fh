# Adding a new resource category

A resource has exactly one category (`resources.category`). Categories can be added over time, but nothing generic drives them: adding one is a set of explicit changes. Do them in this order.

1. **Add the enum value** to `Category` in `apps/backend/src/resources/types.ts`.
2. **Write a migration** that adds the value to the Postgres `category` enum. `ALTER TYPE ... ADD VALUE` needs care inside a transaction, so check how TypeORM runs it before relying on it.
3. **Extend the tag enum.** The same migration must add the value to the `tag_category` enum and to `TagCategory` in `apps/backend/src/tags/types.ts`.
4. **Seed the category's tags**, using the new category, or `common` when a tag is shared. Reuse the shared groups. Add new tag groups and tags only for what is specific to the category.
5. **Reuse the shared `Resource` columns.** The vetting-form fields are shared, so most new categories need no new columns. If a category needs one or two extra fields, add a new nullable column to `resources`.
6. **Update DTO validation** if the new category has category-specific rules.
7. **Update the frontend form.** The form is hardcoded, so it must show the new category's tag groups. Adding or changing any option also needs a seed migration plus a frontend change, and a bump of `tagsVersion` so cached tags are refetched.
8. **Add tests** for the category in the service spec and in the Postman collections.

If several future categories need their own structured fields, consider per-category detail tables at that point. That decision isn't made yet.
