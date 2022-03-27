namespace Futurum.DataExplorer.Application;

public record BlogWithIdDto(long Id);

public record DataSourceWithIdDto(long Id, ICollection<string> Dimensions, ICollection<string> Measures);