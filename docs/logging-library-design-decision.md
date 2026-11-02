# Logging Library: Evaluation and Decision

**Ticket:** #[47] · **Branch:** `structured-logging` · **Status:** Draft for review

## Summary

The backend logs only with Nest's built-in `Logger`, as free-form text. This document evaluates automated logging libraries that integrate with NestJS, selects one, and describes how it is added alongside the existing logging.

**Decision:** use `nestjs-pino` (Pino and `pino-http` under a NestJS module). It produces structured JSON, request IDs, and per-request logs (method, path, status code) out of the box, and has a built-in redaction option. The two things no library provides, the exception layer label and body/URL redaction, are small custom pieces described in Section 5.

**Scope:** the existing `Logger` calls are not replaced or refactored. Both kinds of logs exist together.

## 1. What the ticket requires

-# Requirement                                                                

| 1.   Structured output                                                          
| 2.   A request ID on every request log                                         
| 3.   Method, path, and status code logged for every request, including failures 
| 4.   Exceptions logged with the layer where they occurred                       
| 5.   Redaction of sensitive headers, body fields, and URL query parameters      
| 6.   Existing response codes and bodies unchanged                               
| 7.   Coexists with the existing logging                                         

## 2. Current state

- NestJS 11 on Express. `main.ts` creates the app with `NestFactory.create(AppModule)`.
- Existing logging is Nest's `Logger` (`main.ts`, `auth/jwt.strategy.ts`, `resources/resources.service.ts`). Unit tests mock `Logger.prototype.error`, so those calls must keep working.
- No global exception filter, so Nest's default error responses apply.
- No separate repository layer. Services use TypeORM repositories directly (`@InjectRepository`).
- Authentication: Cognito ID tokens arrive in the `Authorization: Bearer` header and are validated by `JwtStrategy`.

## 3. Candidates

| Requirement                | `nestjs-pino`                                    | `nest-winston`                     | Hand-rolled (extend Nest `Logger`)  |
| -------------------------- | ------------------------------------------------ | ---------------------------------- | ----------------------------------- |
| Structured JSON            | Default                                          | With JSON format config            | Write the formatter                 |
| Request ID                 | Built in (via `pino-http`)                       | Write middleware                   | Write middleware                    |
| Method, path, status       | Built in (via `pino-http`)                       | Write middleware or add `morgan`   | Write middleware                    |
| Header redaction           | Built in (`redact` option)                       | Custom format function             | Write it                            |
| Body and URL redaction     | Small custom serializer                          | Custom code                        | Custom code                         |
| Exception layer label      | Custom (exception filter)                        | Custom (exception filter)          | Custom (exception filter)           |
| Coexists with Nest `Logger` | Yes                                             | Yes                                | Not applicable                      |
| Added dependencies         | `nestjs-pino`, `pino`, `pino-http`, `pino-pretty` (dev) | `nest-winston`, `winston`  | None                                |

**`nest-winston`** is mature and flexible, but request logging, request IDs, and redaction would all be written by hand. More custom code in a logger that handles credentials means more places for a leak.

**Hand-rolled** adds no dependencies but means writing and maintaining all of the above, and it does not satisfy the ticket's goal of evaluating and adopting a library.

## 4. Decision

`nestjs-pino`. It covers requirements 1 to 3 and the header part of 5 with configuration instead of code, which leaves less custom logic to review and less to get wrong.

Compatibility with NestJS 11 must be confirmed when installing (check for peer dependency warnings from `yarn add`).

## 5. How it is introduced alongside the existing logging

**Option A (chosen): leave Nest's `Logger` untouched.** `LoggerModule` is registered in `AppModule`, which adds the request-logging middleware. We do not call `app.useLogger(...)`, so existing `Logger.log(...)` calls keep their current format and the existing unit tests are unaffected. New request and exception logs are written by Pino as JSON.

**Option B (possible follow-up): route Nest's `Logger` through Pino** with `app.useLogger(...)`. Existing logs would also become JSON with no call-site changes, but this changes existing log output, which the ticket says not to do here.

The consequence of Option A is that the log stream has two formats until a later ticket chooses Option B.

### Design of the custom pieces

- **Request ID:** `pino-http` generates one per request and attaches it to every log line for that request. An incoming `x-request-id` header is reused if present.
- **Request logs:** one line per finished request with method, path, and status code.
- **Exception logging:** a global exception filter that extends Nest's `BaseExceptionFilter`. It logs, then delegates to the default behavior, so status codes and response bodies stay identical to today.
- **Layer label:** derived in the filter, because no library provides it.
  - `pipe`: `ValidationPipe` or other pipe errors (the `BadRequestException` stack passes through a pipe)
  - `auth`: guard or `JwtStrategy` errors
  - `controller`: thrown from a `*.controller.ts` file
  - `service`: thrown from a `*.service.ts` file
  - `repo`: TypeORM errors such as `QueryFailedError`, which come from database calls inside a service
  - `unknown`: anything else
- **Redaction:**
  - Headers: Pino `redact` on `req.headers.authorization` and `req.headers.cookie` (and `set-cookie` on responses).
  - Body fields: Pino does not log bodies by default. The request serializer includes the body only after the fields `password`, `token`, `accessToken`, `idToken`, `refreshToken`, `access_token`, `id_token`, and `refresh_token` are replaced with `[Redacted]`.
  - URLs: the serializer rewrites query parameters whose names are in the token list, so `?access_token=abc` is logged as `?access_token=[Redacted]`.
    - `code` is treated as sensitive (OAuth authorization codes), so a body field or query parameter with that exact name is also redacted.

## 6. Limitations and open questions

- The layer label is derived from the error and its stack, so it is a best-effort label, not a guarantee. If it proves unreliable, errors can instead be tagged explicitly where they are thrown.
- Redaction uses an explicit list of field names. A new token field with a different name will not be redacted until it is added to the list.
- Pino's `redact` supports wildcards only for whole path segments, so patterns like "any key containing `token`" are not possible.
- Some exception messages include an email address (e.g. `No user record exists for ${email}`). Email is not a credential, so it is not redacted, but the team should confirm that is acceptable.
- Open question for the TL: is Option A the intended coexistence approach, or should existing logs also move to JSON?
- Database errors that ResourcesService wraps in InternalServerErrorException are labeled service; the original error is logged by the existing logger.
- Database errors that `ResourcesService` wraps in `InternalServerErrorException` are labeled `service`; the original error is logged by the existing logger.