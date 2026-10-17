# Navarachna Designer Studio

Production architecture and monorepo structure for Navarachna Designer Studio.

## Tech Stack Overview

- **Web (Admin Dashboard):** Next.js 16 (`output: 'standalone'`) + React 19.2 (TypeScript), Tailwind CSS 4, shadcn/ui, ReUI, TanStack Table & Query, React Hook Form + Zod, Lucide.
- **Backend API:** ASP.NET Core Web API on .NET 10 LTS, C# 14, EF Core 10 + Npgsql 10.x (PostgreSQL), built-in Cookie Authentication, `IExceptionHandler` (`ProblemDetails`).
- **Mobile (Companion App):** Expo SDK 57 + React Native 0.86, Expo Router, NativeWind 4.
- **Cloud & Infrastructure:** Azure Container Apps (Consumption Plan, scale-to-zero), Azure Database for PostgreSQL 18 (Flexible Server, Burstable B1ms).

## Project Structure

```text
Navarachna Designer Studio/
├── apps/
│   ├── web/               # Next.js 16 Admin Dashboard
│   ├── api/               # ASP.NET Core .NET 10 Web API
│   └── mobile/            # Expo SDK 57 Companion App
├── docker/                # Container configurations & docker-compose
├── infra/                 # Azure cloud deployment & database templates
├── .dockerignore
├── .gitignore
└── README.md
```