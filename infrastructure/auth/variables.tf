variable "tenant_id" {
  description = "The organization's existing Entra ID tenant ID (Entra admin center > Overview). No default - this is org-specific and must be supplied by whoever runs Terraform."
  type        = string
}

variable "app_display_name" {
  description = "Display name for the app registration shown in the Entra admin center."
  type        = string
  default     = "proj-fh"
}

variable "redirect_uris" {
  description = "Redirect URIs the SPA is allowed to send auth responses to (e.g. dev and prod frontend URLs)."
  type        = list(string)
  default     = ["http://localhost:5173"]
}
