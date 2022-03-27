using Futurum.Core.Result;
using Futurum.WebApiEndpoint;

namespace Futurum.DataExplorer.Application;

public static class DataSourceGetById
{
    public record RequestDto
    {
        [MapFromPath("Id")] public long Id { get; set; }
    }

    public record Request(long Id);
    
    public class ApiEndpoint : QueryWebApiEndpoint.Request<RequestDto, Request>.Response<DataSourceWithIdDto, DomainWithId<DataSource>>.Mapper<DataSourceMapper>
    {
        public override Task<Result<DomainWithId<DataSource>>> ExecuteAsync(Request request, CancellationToken cancellationToken) =>
            new DomainWithId<DataSource>(new Id(request.Id), new DataSource(new List<string>{"country"}, new List<string>{"count"}))
                .ToResultOkAsync();
    }
}