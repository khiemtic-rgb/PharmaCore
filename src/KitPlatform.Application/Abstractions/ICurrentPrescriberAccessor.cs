namespace KitPlatform.Application.Abstractions;

public interface ICurrentPrescriberAccessor
{
    bool IsPrescriber { get; }

    Guid PrescriberId { get; }
}
