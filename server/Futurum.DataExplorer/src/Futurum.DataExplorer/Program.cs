using Futurum.DataExplorer;
using Futurum.DataExplorer.Application;
using Futurum.DataExplorer.Persistence;
using Futurum.Microsoft.Extensions.DependencyInjection;
using Futurum.WebApiEndpoint;
using Futurum.WebApiEndpoint.OpenApi;

using Serilog;

const string CORS_POLICY = "cors-policy";


Log.Logger = new LoggerConfiguration()
             .Enrich.FromLogContext()
             .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss.fff} {Level:u3}] {Message:lj}{NewLine}{Exception}")
             .CreateBootstrapLogger();

try
{
    Log.Information("Application starting up");

    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((hostBuilderContext, loggerConfiguration) =>
                                loggerConfiguration.WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss.fff} {Level:u3}] {Message:lj}{NewLine}{Exception}")
                                                   .ReadFrom.Configuration(hostBuilderContext.Configuration));

    builder.Host.ConfigureServices(serviceCollection =>
    {
        serviceCollection.RegisterModule(new WebApiEndpointModule(typeof(AssemblyHook).Assembly));
        serviceCollection.RegisterModule<WebApiEndpointSerilogLoggerModule>();

        serviceCollection.RegisterModule<ApplicationModule>();

        serviceCollection.ConfigureEntityFramework(new PostgresConnection("localhost", "dataexplorer", "postgres", "root"));
    });

    builder.Services.EnableOpenApiForWebApiEndpoint();

    builder.Services.AddOpenApiVersion("Futurum DataExplorer", WebApiEndpointVersions.V1_0);

    builder.Services.AddWebApiEndpointAuthorization(typeof(AssemblyHook).Assembly);
    
    builder.Services.AddCors(options =>
    {
        options.AddPolicy(name: CORS_POLICY,
                          builder =>
                          {
                              builder.WithOrigins("*");
                          });
    });

    var application = builder.Build();

    if (application.Environment.IsDevelopment())
    {
        using (var scope = application.Services.CreateScope())
        {
            var services = scope.ServiceProvider;

            using (var context = services.GetRequiredService<ApplicationDbContext>())
            {
                context.Database.EnsureDeleted();
                context.Database.EnsureCreated();
            }
        }

        application.UseOpenApiUIForWebApiEndpoint();
    }
    else
    {
        application.UseHttpsRedirection();
    }

    application.UseCors(CORS_POLICY);

    application.UseWebApiEndpoints();

    application.Run();
}
catch (Exception exception)
{
    Log.Fatal(exception, "Application start-up failed");
}
finally
{
    Log.Information("Application shut down complete");
    Log.CloseAndFlush();
}