namespace KitPlatform.Application.Configuration;

public sealed record GppChecklistSettingsDto(IReadOnlyDictionary<string, bool> Checked);

public sealed record UpdateGppChecklistRequest(IReadOnlyDictionary<string, bool> Checked);
