namespace Futurum.DataExplorer.Application;

public record Id(long Value);

public static class IdExtensions
{
    public static Id ToId(this long id) =>
        new(id);
}

public record DomainWithId<T>(Id Id, T Domain);

public record Blog();

public record DrillDownTree(DrillDownTreeNode RootNode);

public record DrillDownTreeNode(Query Query, IEnumerable<DrillDownTreeNode> Children);

public record Query();

public record DataSource(ICollection<string> Dimensions, ICollection<string> Measures);
