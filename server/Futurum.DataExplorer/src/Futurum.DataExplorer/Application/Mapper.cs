using Futurum.Core.Result;
using Futurum.WebApiEndpoint;
using Futurum.WebApiEndpoint.Metadata;

namespace Futurum.DataExplorer.Application;

public class BlogMapper : IWebApiEndpointResponseDtoMapper<DomainWithId<Blog>, BlogWithIdDto>,
                          IWebApiEndpointResponseDataMapper<DomainWithId<Blog>, BlogWithIdDto>
{
    public BlogWithIdDto Map(DomainWithId<Blog> domain) =>
        new(domain.Id.Value);
}

public class DataSourceMapper : IWebApiEndpointRequestMapper<DataSourceGetById.RequestDto, DataSourceGetById.Request>,
                                IWebApiEndpointResponseDtoMapper<DomainWithId<DataSource>, DataSourceWithIdDto>
{
    public Task<Result<DataSourceGetById.Request>> MapAsync(HttpContext httpContext, MetadataDefinition metadataDefinition, DataSourceGetById.RequestDto dto, CancellationToken cancellationToken) =>
        new DataSourceGetById.Request(dto.Id).ToResultOkAsync();

    public DataSourceWithIdDto Map(DomainWithId<DataSource> domain) =>
        new(domain.Id.Value, domain.Domain.Dimensions, domain.Domain.Measures);
}