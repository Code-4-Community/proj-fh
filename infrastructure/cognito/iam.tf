data "aws_iam_policy_document" "backend_cognito_admin" {
  statement {
    sid = "ManageStaffInUserPool"
    actions = [
      "cognito-idp:AdminCreateUser",
      "cognito-idp:AdminGetUser",
      "cognito-idp:AdminDeleteUser",
    ]
    resources = [aws_cognito_user_pool.app.arn]
  }
}

resource "aws_iam_policy" "backend_cognito_admin" {
  name        = "${var.user_pool_name}-backend-cognito-admin"
  description = "Lets the locally running backend create, read and delete users in the app Cognito user pool."
  policy      = data.aws_iam_policy_document.backend_cognito_admin.json
}

resource "aws_iam_group" "backend_developers" {
  name = var.backend_developers_group_name
}

resource "aws_iam_group_policy_attachment" "backend_developers_cognito_admin" {
  group      = aws_iam_group.backend_developers.name
  policy_arn = aws_iam_policy.backend_cognito_admin.arn
}

resource "aws_iam_user_group_membership" "backend_developers" {
  for_each = toset(var.backend_developer_iam_usernames)

  user   = each.value
  groups = [aws_iam_group.backend_developers.name]
}
