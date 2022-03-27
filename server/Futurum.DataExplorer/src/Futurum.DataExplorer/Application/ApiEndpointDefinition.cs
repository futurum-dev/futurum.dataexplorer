using Futurum.ApiEndpoint;
using Futurum.WebApiEndpoint;

namespace Futurum.DataExplorer.Application;

public class ApiEndpointDefinition : IApiEndpointDefinition
{
    public void Configure(ApiEndpointDefinitionBuilder definitionBuilder)
    {
        definitionBuilder.Web()
                         .Query<BlogGet.ApiEndpoint>(builder => builder.Route("blog").Version(WebApiEndpointVersions.V1_0))
                         .Query<DataSourceGetById.ApiEndpoint>(builder => builder.RouteWithParameters("datasource/{Id}").Version(WebApiEndpointVersions.V1_0));
    }
}