output "cognito_user_pool_id" {
  description = "Cognito user pool ID."
  value       = aws_cognito_user_pool.app.id
}

output "cognito_app_client_id" {
  description = "Public frontend app client ID."
  value       = aws_cognito_user_pool_client.frontend.id
}

output "cognito_region" {
  description = "AWS region containing the user pool."
  value       = var.aws_region
}

output "backend_cognito_admin_policy_arn" {
  description = "IAM policy allowing the backend to manage users in the pool."
  value       = aws_iam_policy.backend_cognito_admin.arn
}

output "backend_developers_group_name" {
  description = "IAM group that grants the backend Cognito admin permissions."
  value       = aws_iam_group.backend_developers.name
}

output "cognito_issuer" {
  description = "JWT issuer URL for this Cognito user pool."
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.app.id}"
}

output "cognito_jwks_uri" {
  description = "JWKS URL used to verify Cognito-issued JWT signatures."
  value       = "https://cognito-idp.${var.aws_region}.amazonaws.com/${aws_cognito_user_pool.app.id}/.well-known/jwks.json"
}

output "cognito_id_token_audience" {
  description = "Expected audience (app client ID) for Cognito ID tokens."
  value       = aws_cognito_user_pool_client.frontend.id
}