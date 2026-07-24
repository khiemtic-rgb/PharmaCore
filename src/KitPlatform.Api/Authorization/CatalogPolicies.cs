namespace KitPlatform.Api.Authorization;

public static class CatalogPolicies
{
    public const string Read = "CatalogRead";
    public const string Write = "CatalogWrite";
    /// <summary>Merge duplicate products / restore hidden after merge (not granted with catalog.write).</summary>
    public const string Merge = "CatalogMerge";
}
