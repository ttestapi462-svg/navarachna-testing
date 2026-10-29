# Navarachna + Employee Management integration

## What was combined
- Kept Navarachna's existing `AuthController`, JWT configuration, session checks, SignalR hub, entities, and original PostgreSQL connection string.
- Added employee CRUD and employee-document controllers/services/models to the same ASP.NET Core project.
- Combined employee entities into Navarachna's `AppDbContext` and added an additive `AddEmployeeManagement` migration after the original auth migration.
- Removed the EmployeeApi demo-login controller so it cannot shadow or confuse the real `/api/auth/login` flow.
- Employee and document controllers now use `[Authorize]` only; any authenticated Navarachna user can call them, as requested.
- Preserved employee soft delete, optimistic concurrency using PostgreSQL `xmin` as a system column (not a separately-created column), file validation, and local file storage.

## Important before running
1. This environment did not have the .NET SDK installed, so compilation and migration execution could not be verified here.
2. Back up the original PostgreSQL database before applying migrations. Never run `database update` against production until the migration SQL is reviewed.
3. The project keeps the exact database connection and JWT values supplied in the Navarachna ZIP because you explicitly identified that as the organization's source of truth. Since secrets were included in uploaded archives, rotate them if these are real, active credentials and move them into user-secrets/environment variables/secret manager.
4. Employee document files are stored locally at the configured `Storage:Root`. Ensure the path exists and the app process has read/write access. Local file storage is not shared between multiple API instances.
5. The existing Navarachna JWT validation and 30-second in-memory session cache remain unchanged. That cache means session revocation can take up to the configured cache TTL to be observed.
6. CORS implementation in the original Navarachna project accepts all origins despite the configured allowlist; this was left unchanged to avoid unrelated authentication edits, but should be corrected before production.

## Database migration
The migration sequence is:
- `20261018120846_InitialAuthAndSingleSessionWithAudit`
- `20261019130000_AddEmployeeManagement`

Run from `api/src/Navarachna.Api` after installing the .NET 10 SDK and reviewing the migration:

```bash
dotnet restore
dotnet build
dotnet ef database update
```

If the organization's database already has the auth migration applied, EF should apply only the employee migration. If the existing database was created outside EF migrations, inspect `__EFMigrationsHistory` first; do not blindly reapply the initial auth migration.

## Main routes
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/v1/employees`
- `GET /api/v1/employees/{id}`
- `POST /api/v1/employees`
- `PUT /api/v1/employees/{id}`
- `DELETE /api/v1/employees/{id}` (now available to any authenticated user, per Option B)
- `POST /api/v1/employees/{employeeId}/documents`
- `GET /api/v1/employees/{employeeId}/documents`
- `GET /api/v1/employees/{employeeId}/documents/{docId}/download`
- `DELETE /api/v1/employees/{employeeId}/documents/{docId}`
- `GET /health`
