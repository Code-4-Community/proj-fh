variable "aws_region" {
  description = "AWS region for the Cognito user pool."
  type        = string
  default     = "us-east-2"
}

variable "user_pool_name" {
  description = "Name of the Cognito user pool."
  type        = string
  default     = "proj-fh-user-pool"
}

variable "frontend_client_name" {
  description = "Name of the public Cognito app client used by the frontend."
  type        = string
  default     = "proj-fh-frontend-no-secret"
}

variable "backend_developers_group_name" {
  description = "IAM group whose members may run the backend against the Cognito user pool."
  type        = string
  default     = "proj-fh-backend-developers"
}

variable "backend_developer_iam_usernames" {
  description = "Existing IAM usernames to add to the backend developers group."
  type        = list(string)
  default     = []
}

variable "frontend_refresh_token_validity_days" {
  description = "Frontend refresh-token lifetime in days."
  type        = number
  default     = 30

  validation {
    condition     = var.frontend_refresh_token_validity_days >= 1 && var.frontend_refresh_token_validity_days <= 3650
    error_message = "The refresh-token lifetime must be between 1 and 3650 days."
  }
}