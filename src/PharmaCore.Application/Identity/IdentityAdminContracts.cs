namespace PharmaCore.Application.Identity;

public sealed record BranchAdminListItemDto(
    Guid Id,
    string BranchCode,
    string BranchName,
    string? Address,
    string? Phone,
    bool IsHeadOffice,
    short Status,
    DateTimeOffset CreatedAt);

public sealed record BranchDetailDto(
    Guid Id,
    string BranchCode,
    string BranchName,
    string? Address,
    string? Phone,
    bool IsHeadOffice,
    short Status,
    DateTimeOffset CreatedAt);

public sealed record CreateBranchRequest(
    string BranchCode,
    string BranchName,
    string? Address,
    string? Phone,
    bool IsHeadOffice = false,
    short Status = 1);

public sealed record UpdateBranchRequest(
    string BranchCode,
    string BranchName,
    string? Address,
    string? Phone,
    bool IsHeadOffice,
    short Status);

public sealed record UserAdminListItemDto(
    Guid Id,
    string Username,
    string Email,
    short Status,
    string? EmployeeName,
    string? EmployeePhone,
    IReadOnlyList<string> RoleCodes,
    DateTimeOffset? LastLoginAt,
    DateTimeOffset CreatedAt);

public sealed record UserDetailDto(
    Guid Id,
    string Username,
    string Email,
    short Status,
    Guid? EmployeeId,
    string? EmployeeName,
    string? EmployeePhone,
    IReadOnlyList<Guid> RoleIds,
    IReadOnlyList<string> RoleCodes,
    DateTimeOffset? LastLoginAt,
    DateTimeOffset CreatedAt);

public sealed record CreateUserRequest(
    string Username,
    string Email,
    string Password,
    short Status,
    IReadOnlyList<Guid> RoleIds,
    Guid? EmployeeId = null,
    string? EmployeeFullName = null,
    string? EmployeePhone = null);

public sealed record UpdateUserRequest(
    string Username,
    string Email,
    short Status,
    IReadOnlyList<Guid> RoleIds,
    Guid? EmployeeId = null,
    string? EmployeeFullName = null,
    string? EmployeePhone = null,
    string? NewPassword = null);

public sealed record RoleAdminListItemDto(
    Guid Id,
    string RoleCode,
    string RoleName,
    string? Description,
    short Status,
    int UserCount,
    int PermissionCount);

public sealed record RoleDetailDto(
    Guid Id,
    string RoleCode,
    string RoleName,
    string? Description,
    short Status,
    IReadOnlyList<string> PermissionCodes);

public sealed record UpdateRolePermissionsRequest(IReadOnlyList<string> PermissionCodes);

public sealed record CreateRoleRequest(
    string RoleCode,
    string RoleName,
    string? Description = null,
    short Status = 1);

public sealed record UpdateRoleRequest(
    string RoleCode,
    string RoleName,
    string? Description,
    short Status);

public sealed record PermissionLookupDto(
    Guid Id,
    string PermissionCode,
    string PermissionName,
    string ModuleName);

public sealed record EmployeeLookupDto(
    Guid Id,
    string EmployeeCode,
    string FullName,
    string? Phone,
    bool HasUserAccount);

public sealed record CreateEmployeeRequest(
    string FullName,
    string? Phone = null,
    string? Email = null,
    string? EmployeeCode = null);

public sealed record NextEmployeeCodeDto(string EmployeeCode);

public sealed record PagedUsersResult(
    IReadOnlyList<UserAdminListItemDto> Items,
    int Total,
    int Page,
    int PageSize);
