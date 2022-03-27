using Futurum.Microsoft.Extensions.DependencyInjection;

namespace Futurum.DataExplorer.Application;

public class ApplicationModule : IModule
{
    public void Load(IServiceCollection services)
    {
        services.AddScoped<IStorageBroker, StorageBroker>();
    }
}