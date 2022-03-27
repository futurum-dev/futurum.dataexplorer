namespace Futurum.DataExplorer.Persistence;

public record PostgresConnection(string Host, string Database, string Username, string Password);