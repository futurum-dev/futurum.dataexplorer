using Futurum.Core.Result;
using Futurum.WebApiEndpoint;

namespace Futurum.DataExplorer.Application;

public static class BlogGet
{
    public class ApiEndpoint : QueryWebApiEndpoint.NoRequest.ResponseAsyncEnumerable<BlogWithIdDto, DomainWithId<Blog>>.Mapper<BlogMapper>
    {
        private readonly IStorageBroker _storageBroker;

        public ApiEndpoint(IStorageBroker storageBroker)
        {
            _storageBroker = storageBroker;
        }

        public override Task<Result<ResponseAsyncEnumerable<DomainWithId<Blog>>>> ExecuteAsync(RequestEmpty request, CancellationToken cancellationToken) =>
            AsyncEnumerable.Range(0, 10)
                           .Select(i => new DomainWithId<Blog>(((long)i).ToId(), new Blog()))
                           .ToResultOk()
                           .ToResponseAsyncEnumerable()
                           .ToResultAsync();
    }
}