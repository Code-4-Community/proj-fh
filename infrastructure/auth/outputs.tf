output "client_id" {
  description = "The application (client) ID for the app registration. Used by the frontend's MSAL config."
  value       = azuread_application.this.client_id
}

output "tenant_id" {
  description = "The Entra ID tenant ID the app is registered in."
  value       = var.tenant_id
}

output "authority" {
  description = "The Entra ID authority (issuer) URL for this tenant. Used by the frontend's MSAL config and the backend's JWT validation."
  value       = "https://login.microsoftonline.com/${var.tenant_id}/v2.0"
}

output "api_audience" {
  description = "The audience (aud) claim value for access tokens issued for the API. Used to validate tokens in the backend."
  value       = "api://${var.tenant_id}/proj-fh"
}

output "api_scope" {
  description = "The scope URI for the API's access_as_user permission. Used by the frontend to request access tokens."
  value       = "api://${var.tenant_id}/proj-fh/access_as_user"
}
