FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY ["Futurum.DataExplorer/Futurum.DataExplorer.csproj", "Futurum.DataExplorer/"]
RUN dotnet restore "Futurum.DataExplorer/Futurum.DataExplorer.csproj"
COPY . .
WORKDIR "/src/Futurum.DataExplorer"
RUN dotnet build "Futurum.DataExplorer.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Futurum.DataExplorer.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Futurum.DataExplorer.dll"]
