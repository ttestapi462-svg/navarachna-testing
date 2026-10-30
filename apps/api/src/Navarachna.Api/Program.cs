using System.Security.Claims;

using System.Text;

using Azure.Storage.Blobs;

using Microsoft.AspNetCore.Authentication.JwtBearer;

using Microsoft.AspNetCore.Http.Features;

using Microsoft.EntityFrameworkCore;

using Microsoft.Extensions.Caching.Memory;

using Microsoft.IdentityModel.Tokens;

using Navarachna.Api.Common.Errors;

using Navarachna.Api.Data;

using Navarachna.Api.Features.Auth;

using Navarachna.Api.Features.Expenses;

using Navarachna.Api.Hubs;

using EmployeeApi.Services;



var builder = WebApplication.CreateBuilder(args);



// 1. Exception Handling & ProblemDetails

builder.Services.AddExceptionHandler<GlobalExceptionHandler>();

builder.Services.AddProblemDetails();



// 2. Add MemoryCache & App Services

builder.Services.AddMemoryCache();

builder.Services.AddSignalR();

builder.Services.AddScoped<ITokenService, TokenService>();

builder.Services.AddScoped<IPasswordService, PasswordService>();
builder.Services.AddScoped<EmployeeService>();
builder.Services.AddScoped<DocumentService>();

if (string.Equals(builder.Configuration["Storage:Provider"], "Blob", StringComparison.OrdinalIgnoreCase))
    builder.Services.AddSingleton<IFileStorage, BlobFileStorage>();
else
    builder.Services.AddSingleton<IFileStorage, LocalFileStorage>();



// 3. Add Controllers

builder.Services.AddControllers();



// 3b. Expense management (bill photos/copies are stored in Azure Blob Storage)

var storageConn = builder.Configuration["Azure:Storage:ConnectionString"];

// Storage is only touched when an expense bill is uploaded/read, so a storage problem

// must never stop the app or affect other APIs (auth, health, ...). It is only checked

// and logged after the app is built (see below).

builder.Services.AddSingleton(_ =>

{

    // Fail in a few seconds instead of ~40s of SDK retries when storage is unreachable.

    var options = new BlobClientOptions();

    options.Retry.MaxRetries = 2;

    options.Retry.Delay = TimeSpan.FromMilliseconds(500);

    options.Retry.NetworkTimeout = TimeSpan.FromSeconds(10);

    return new BlobServiceClient(storageConn, options);

});

builder.Services.AddSingleton<IBillStorage, AzureBillStorage>();

builder.Services.AddScoped<ExpenseService>();

builder.Services.Configure<FormOptions>(o => o.MultipartBodyLengthLimit = 6 * 1024 * 1024);



// 4. Database Context with Npgsql Resilience

var connectionString = builder.Configuration.GetConnectionString("DefaultConnection") 

    ?? "Host=localhost;Port=5432;Database=navarachna_studio;Username=postgres;Password=postgres";



builder.Services.AddDbContext<AppDbContext>(options =>

{

    options.UseNpgsql(connectionString, npgsqlOptions =>

    {

        npgsqlOptions.EnableRetryOnFailure(

            maxRetryCount: 5,

            maxRetryDelay: TimeSpan.FromSeconds(10),

            errorCodesToAdd: null);

    });

});



// 5. JWT Authentication with Single Session Verification

var jwtKey = builder.Configuration["Jwt:Key"] 

    ?? "Navarachna_Studio_Luxury_Atelier_Super_Secret_Key_2026_Minimum_32_Chars!";

var jwtIssuer = builder.Configuration["Jwt:Issuer"] ?? "NavarachnaApi";

var jwtAudience = builder.Configuration["Jwt:Audience"] ?? "NavarachnaClients";



builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)

    .AddJwtBearer(options =>

    {

        options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();

        options.SaveToken = true;

        options.TokenValidationParameters = new TokenValidationParameters

        {

            ValidateIssuer = true,

            ValidateAudience = true,

            ValidateLifetime = true,

            ValidateIssuerSigningKey = true,

            ValidIssuer = jwtIssuer,

            ValidAudience = jwtAudience,

            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),

            ClockSkew = TimeSpan.Zero

        };



        options.Events = new JwtBearerEvents

        {

            OnMessageReceived = context =>

            {

                var accessToken = context.Request.Query["access_token"];

                var path = context.HttpContext.Request.Path;

                if (!string.IsNullOrEmpty(accessToken) && path.StartsWithSegments("/hubs"))

                {

                    context.Token = accessToken;

                }

                return Task.CompletedTask;

            },

            OnTokenValidated = async context =>

            {

                var userIdStr = context.Principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;

                var tokenSessionId = context.Principal?.FindFirst("session_id")?.Value;



                if (string.IsNullOrEmpty(userIdStr) || string.IsNullOrEmpty(tokenSessionId))

                {

                    context.Fail("INVALID_TOKEN_CLAIMS");

                    return;

                }



                if (!long.TryParse(userIdStr, out var userId))

                {

                    context.Fail("INVALID_USER_ID");

                    return;

                }



                var cache = context.HttpContext.RequestServices.GetRequiredService<IMemoryCache>();

                var dbContext = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();



                // Fast in-memory check (30s sliding TTL to avoid multi-instance replica drift)

                if (!cache.TryGetValue($"active_session_{userId}", out string? activeSessionId))

                {

                    var user = await dbContext.Users.AsNoTracking()

                        .Where(u => u.Id == userId)

                        .Select(u => new { u.ActiveSessionId, u.IsActive, u.IsLocked, u.LockoutUntil })

                        .FirstOrDefaultAsync();



                    if (user == null || !user.IsActive)

                    {

                        context.Fail("ACCOUNT_DISABLED");

                        return;

                    }



                    if (user.IsLocked || (user.LockoutUntil.HasValue && user.LockoutUntil.Value > DateTime.UtcNow))

                    {

                        context.Fail("ACCOUNT_LOCKED");

                        return;

                    }



                    activeSessionId = user.ActiveSessionId?.ToString();

                    if (string.IsNullOrEmpty(activeSessionId))

                    {

                        activeSessionId = "REVOKED";

                    }

                    cache.Set($"active_session_{userId}", activeSessionId, TimeSpan.FromSeconds(30));

                }



                // If session was terminated / logged out:

                if (activeSessionId == "REVOKED")

                {

                    context.Fail("SESSION_TERMINATED");

                    return;

                }



                // If active session ID changed on another device, terminate this session immediately

                if (activeSessionId != tokenSessionId)

                {

                    context.Fail("SESSION_SUPERSEDED");

                    return;

                }

            },

            OnChallenge = async context =>

            {

                var failureMsg = context.AuthenticateFailure?.Message;

                if (failureMsg == "SESSION_SUPERSEDED" || failureMsg == "SESSION_TERMINATED")

                {

                    context.HandleResponse();

                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;

                    context.Response.ContentType = "application/json";

                    var isSuperseded = failureMsg == "SESSION_SUPERSEDED";

                    await context.Response.WriteAsJsonAsync(new

                    {

                        status = 401,

                        code = isSuperseded ? "SESSION_SUPERSEDED" : "SESSION_TERMINATED",

                        message = isSuperseded 

                            ? "Your session was terminated because a new login occurred on another device."

                            : "Your session has ended. Please sign in again."

                    });

                }

            }

        };

    });



builder.Services.AddAuthorization();



// 6. CORS setup

var allowedOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()

    ?? new[] { "http://localhost:3000", "http://localhost:8081", "http://localhost:19006" };



builder.Services.AddCors(options =>

{

    options.AddPolicy("DefaultPolicy", policy =>

    {

        policy.SetIsOriginAllowed(_ => true)

            .AllowAnyHeader()

            .AllowAnyMethod()

            .AllowCredentials();

    });

});



var app = builder.Build();


// Warn (do not crash) when expense bill storage is misconfigured. Other APIs keep working.

if (string.IsNullOrWhiteSpace(storageConn) ||

    (!app.Environment.IsDevelopment() &&

     storageConn.Contains("UseDevelopmentStorage", StringComparison.OrdinalIgnoreCase)))

{

    app.Logger.LogError(

        "Azure:Storage:ConnectionString is missing or points to the Azurite emulator. " +

        "Expense bill uploads will fail until it is set to a real Azure Storage connection string. " +

        "Other APIs are not affected.");

}



// Configure the HTTP request pipeline

app.UseExceptionHandler();



if (!app.Environment.IsDevelopment())

{

    app.UseHsts();

}



app.UseCors("DefaultPolicy");



app.UseAuthentication();

app.UseAuthorization();



app.MapControllers();

app.MapHub<AuthHub>("/hubs/auth");



// Auto-apply schema patch for created_by, updated_by, updated_at, triggers, and seed

using (var scope = app.Services.CreateScope())

{

    var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

    var logger = scope.ServiceProvider.GetRequiredService<ILogger<Program>>();

    try

    {

        var dir = new DirectoryInfo(app.Environment.ContentRootPath);

        string? sqlPath = null;

        while (dir != null)

        {

            var candidate = Path.Combine(dir.FullName, "docker", "patch_audit_and_single_session.sql");

            if (File.Exists(candidate))

            {

                sqlPath = candidate;

                break;

            }

            dir = dir.Parent;

        }



        if (sqlPath == null)

        {

            var binCandidate = Path.Combine(AppContext.BaseDirectory, "patch_audit_and_single_session.sql");

            if (File.Exists(binCandidate)) sqlPath = binCandidate;

        }

        if (sqlPath != null)

        {

            var sql = await File.ReadAllTextAsync(sqlPath);

            await dbContext.Database.ExecuteSqlRawAsync(sql);

            logger.LogInformation("Database audit columns (created_by, updated_by, updated_at), indexes, triggers, and admin seed applied successfully.");

        }

    }

    catch (Exception ex)

    {

        logger.LogWarning(ex, "Could not apply SQL patch script on startup. Continuing.");

    }

}


app.MapGet("/routes", (EndpointDataSource eds) =>
    string.Join("\n", eds.Endpoints.OfType<RouteEndpoint>().Select(e => e.RoutePattern.RawText)));
app.Run();

