# Cognito infrastructure

This Terraform configuration creates the app's Cognito user pool and public frontend client, matching the Cognito settings used by `proj-bhchp/infrastructure/03-cognito.yml`.

## What it creates

- Email usernames, case-insensitive sign-in, and automatic email verification.
- Self-service sign-up, verified-email account recovery, and the reference password policy.
- A public client without a client secret, supporting refresh-token, password, and SRP authentication.
- Client read access to `email` and `email_verified`, so Cognito ID tokens include the email claims when those attributes are present.

Cognito ID tokens contain the user's email claim. Cognito access tokens do not include email by default; send the ID token to an API that needs to read the email claim, or add a pre-token-generation trigger if an access token must carry email.

## Apply

Use AWS credentials configured through the AWS CLI, an AWS profile, or standard AWS environment variables. Terraform state contains infrastructure metadata; keep the state file private and out of source control.

```sh
cd infrastructure
terraform init
terraform fmt -check
terraform validate
terraform plan
terraform apply
```

Copy `terraform.tfvars.example` to `terraform.tfvars` and edit the values as needed. The local `.tfvars` file is ignored by Git.

```hcl
cp terraform.tfvars.example terraform.tfvars
```

After apply, `terraform output` provides the pool ID, app client ID, region, JWT issuer, JWKS URI, and ID-token audience. The `cognito_issuer`, `cognito_jwks_uri`, and `cognito_id_token_audience` outputs are the values an API JWT verifier needs. The backend's current JWT strategy is still an Entra stub and must be configured for Cognito before it can accept these tokens.

To remove the resources managed by this configuration, run `terraform destroy` from this directory.