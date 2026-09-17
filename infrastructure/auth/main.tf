resource "azuread_application" "this" {
  display_name     = var.app_display_name
  sign_in_audience = "AzureADMyOrg"

  single_page_application {
    redirect_uris = var.redirect_uris
  }
}
