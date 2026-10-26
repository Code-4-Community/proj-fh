/**
 * The type of a user account, which determines what that user can access.
 * Based on the Product Specification, "Stakeholders & Roles: Primary Users".
 */
export enum Status {
  /**
   * This user has elevated permissions and is able to keep the resource database accurate.
   * They review, score, and approve/reject submitted resources. They also flag stale entries and
   * manage users.
   * See Product Specification, "Stakeholders & Roles: Primary Users" (Reviewer/Admin).
   */
  ADMIN = 'ADMIN',

  /**
   * Fenway Health staff (community health or community engagement workers) who use the database to
   * support patients. They search existing resources and submit new resources for review.
   * See Product Specification, "Stakeholders & Roles: Primary Users" (Community Staff).
   */
  COMMUNITY_STAFF = 'COMMUNITY_STAFF',

  /**
   * A patient seeking social services relevant to them. They complete a needs assessment. They 
   * search and filter resources, as well as view resource details and save resources relevant 
   * to them, sometimes with help from staff.
   * See Product Specification, "Stakeholders & Roles: Primary Users" (Patient).
   */
  PATIENT = 'PATIENT'
}
