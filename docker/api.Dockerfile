# Stage 1: Build .NET 10 API
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy project file and restore dependencies
COPY apps/api/src/Navarachna.Api/Navarachna.Api.csproj apps/api/src/Navarachna.Api/
RUN dotnet restore apps/api/src/Navarachna.Api/Navarachna.Api.csproj

# Copy remaining source code and publish
COPY apps/api/src/Navarachna.Api/ apps/api/src/Navarachna.Api/
WORKDIR /src/apps/api/src/Navarachna.Api
RUN dotnet publish -c Release -o /app/publish /p:UseAppHost=false

# Stage 2: Minimal Chiseled Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0-noble-chiseled AS final
WORKDIR /app
COPY --from=build /app/publish .

ENV ASPNETCORE_URLS=http://+:5000
EXPOSE 5000

ENTRYPOINT ["dotnet", "Navarachna.Api.dll"]
