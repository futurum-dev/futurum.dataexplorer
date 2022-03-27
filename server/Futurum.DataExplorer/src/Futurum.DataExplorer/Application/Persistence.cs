using Futurum.DataExplorer.Persistence;

namespace Futurum.DataExplorer.Application;

public interface IStorageBroker
{
}

public class StorageBroker : IStorageBroker
{
    private readonly ApplicationDbContext _dbContext;

    public StorageBroker(ApplicationDbContext dbContext)
    {
        _dbContext = dbContext;
    }
}