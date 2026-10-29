import { MigrationInterface, QueryRunner } from 'typeorm';

export class seedTags1789479716331 implements MigrationInterface {
  name = 'seedTags1789479716331';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
            INSERT INTO "tags" ("tag_id", "category", "label", "slug") VALUES
            (1, 'food_service_type', 'Food Pantry/Grocery Distribution', 'food-pantry-grocery-distribution'),
            (2, 'food_service_type', 'Hot Meals/Soup Kitchen', 'hot-meals-soup-kitchen'),
            (3, 'food_service_type', 'Mobile Food Distribution', 'mobile-food-distribution'),
            (4, 'food_service_type', 'Home Delivery/Meals on Wheels', 'home-delivery-meals-on-wheels'),
            (5, 'food_service_type', 'Community Fridge/Free Store', 'community-fridge-free-store'),
            (6, 'food_service_type', 'Community Garden/Urban Farm', 'community-garden-urban-farm'),
            (7, 'food_service_type', 'Farmers Market', 'farmers-market'),
            (8, 'food_type', 'Produce', 'produce'),
            (9, 'food_type', 'Packaged Food', 'packaged-food'),
            (10, 'food_type', 'Bread', 'bread'),
            (11, 'food_type', 'Prepared meal', 'prepared-meal'),
            (12, 'food_type', 'Household supplies', 'household-supplies'),
            (13, 'food_type', 'Frozen food', 'frozen-food'),
            (14, 'food_type', 'Meat', 'meat'),
            (15, 'food_type', 'Milk', 'milk'),
            (16, 'food_type', 'Eggs', 'eggs'),
            (17, 'nutrition_program', 'SNAP/WIC enrollment assistance', 'snap-wic-enrollment-assistance'),
            (18, 'nutrition_program', 'Nutrition Education/Cooking Classes', 'nutrition-education-cooking-classes'),
            (19, 'nutrition_program', 'Cultural/Religious Dietary Options', 'cultural-religious-dietary-options'),
            (20, 'nutrition_program', 'Child Nutrition Programs', 'child-nutrition-programs'),
            (21, 'access_requirement', 'First come first serve', 'first-come-first-serve'),
            (22, 'access_requirement', 'Online only', 'online-only'),
            (23, 'access_requirement', 'Registration required', 'registration-required'),
            (24, 'access_requirement', 'ID required', 'id-required'),
            (25, 'access_requirement', 'No ID', 'no-id'),
            (26, 'access_requirement', 'Proof of residency required', 'proof-of-residency-required'),
            (27, 'housing_service_type', 'Emergency Shelter', 'emergency-shelter'),
            (28, 'housing_service_type', 'Transitional Housing', 'transitional-housing'),
            (29, 'housing_service_type', 'Permanent Supportive Housing', 'permanent-supportive-housing'),
            (30, 'housing_service_type', 'Affordable Housing Assistance', 'affordable-housing-assistance'),
            (31, 'housing_service_type', 'Rental Assistance/Eviction Prevention', 'rental-assistance-eviction-prevention'),
            (32, 'housing_service_type', 'Utility Assistance', 'utility-assistance'),
            (33, 'housing_service_type', 'Domestic Violence Shelter/Safe Housing', 'domestic-violence-shelter-safe-housing'),
            (34, 'population_focus', 'Women only', 'women-only'),
            (35, 'population_focus', 'Women and children', 'women-and-children'),
            (36, 'population_focus', 'Children', 'children'),
            (37, 'population_focus', 'Families with children', 'families-with-children'),
            (38, 'population_focus', 'Unaccompanied youth', 'unaccompanied-youth'),
            (39, 'population_focus', 'Seniors', 'seniors'),
            (40, 'population_focus', 'Individuals with disabilities', 'individuals-with-disabilities'),
            (41, 'population_focus', 'Survivors of DV/trafficking', 'survivors-of-dv-trafficking'),
            (42, 'population_focus', 'Veterans', 'veterans'),
            (43, 'population_focus', 'Immigrants', 'immigrants'),
            (44, 'price', 'Free', 'free'),
            (45, 'price', 'Reduced Price', 'reduced-price'),
            (46, 'eligibility_scope', 'Open to all', 'open-to-all'),
            (47, 'eligibility_scope', 'Income-restricted', 'income-restricted'),
            (48, 'accepts_ebt', 'EBT accepted', 'ebt-accepted'),
            (49, 'accepts_ebt', 'EBT not Accepted', 'ebt-not-accepted')
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "tags" WHERE "tag_id" BETWEEN 1 AND 49`,
    );
  }
}
