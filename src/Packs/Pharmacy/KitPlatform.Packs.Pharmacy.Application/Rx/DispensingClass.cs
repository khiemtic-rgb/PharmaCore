namespace KitPlatform.Packs.Pharmacy.Rx;

public static class DispensingClass
{
    public const string Otc = "otc";
    public const string Prescription = "prescription";
    public const string Controlled = "controlled";

    public static string FromDrugType(short drugType) => drugType switch
    {
        2 => Prescription,
        3 => Controlled,
        _ => Otc,
    };

    public static bool RequiresPrescription(string? dispensingClass) =>
        dispensingClass is Prescription or Controlled;
}

public static class RxEnforcementMode
{
    public const string Off = "off";
    public const string Strict = "strict";
    public const string Warn = "warn";

    public static string Parse(string? value) => value?.Trim().ToLowerInvariant() switch
    {
        Strict => Strict,
        Warn => Warn,
        _ => Off,
    };
}
