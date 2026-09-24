resource "azuread_application" "this" {
  display_name     = var.app_display_name
  sign_in_audience = "AzureADMyOrg"
  identifier_uris  = ["api://${var.tenant_id}/proj-fh"]

  single_page_application {
    redirect_uris = var.redirect_uris
  }

  api {
    requested_access_token_version = 2

    oauth2_permission_scope {
      # This UUID must never be changed. Changing it destroys and recreates the permission,
      # which breaks every already-issued token and any existing consent.
      id                       = "a7e19d3e-5b7c-4b2a-8e1f-9c8d7e6f5a4b"
      value                    = "access_as_user"
      type                     = "Admin"
      enabled                  = true
      admin_consent_display_name = "Access proj-fh API as user"
      admin_consent_description  = "Allows the application to access the proj-fh backend API on behalf of the signed-in user."
    }
  }
}
