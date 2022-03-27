using Microsoft.EntityFrameworkCore;

namespace Futurum.DataExplorer.Persistence;

public static class EntityFrameworkStartupExtensions
{
    public static void ConfigureEntityFramework(this IServiceCollection services, PostgresConnection connection)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseNpgsql($"Host={connection.Host}:5432;Database={connection.Database};Username={connection.Username};Password={connection.Password}");

            options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
        });
    }
}