# Why does this exist
This is the initial document for setting up infrastructure within the cloud.

## What is Terraform?
Terraform is a tool for automating the creation and modification of cloud resources.
It is also very useful for committing Configuration As Code

## Configuration As Code
Comitting Cloud infrastructure configuration as readable code so you do not have to create things through the console.

A method of creating infrastructure exactly the same every single time.

So that the client does not receive different infrastructure and things break because the configuration is different.

## Auth (Entra ID)

The `auth/` module registers this application in the organization's **existing** Entra ID (Azure AD) tenant, for staff sign-in. It does not create a new tenant, and it does not manage roles or groups - admin vs. viewer access is decided entirely in the application layer (see the `Status` field on the User entity), not in Entra.

The backend never handles passwords or credentials. Sign-in happens entirely between the frontend and Entra ID (authorization code + PKCE); the backend only validates the JWT access token it's handed, using Entra's public signing keys.

### One-time setup

1. You'll need an account with **Application Administrator** or **Cloud Application Administrator** permissions in the org's Entra ID tenant to run this module.
2. Find the tenant ID in the [Entra admin center](https://entra.microsoft.com) under Identity > Overview.
3. From `infrastructure/auth`:
   ```
   cp terraform.tfvars.example terraform.tfvars
   ```
   Then set `tenant_id` in `terraform.tfvars` (see the commented example in that file).

### Running it

```
cd infrastructure/auth
terraform init
terraform plan
terraform apply
```

State is kept **locally** for now (no remote backend configured yet) - `terraform.tfstate` and `terraform.tfvars` are both gitignored since they can contain sensitive values.

### Using the output

`terraform output` will print `client_id`, `tenant_id`, and `authority`. These are the values the frontend's MSAL configuration and the backend's JWT validation will need - wiring that up is a follow-up application-code task, not part of this Terraform module.
