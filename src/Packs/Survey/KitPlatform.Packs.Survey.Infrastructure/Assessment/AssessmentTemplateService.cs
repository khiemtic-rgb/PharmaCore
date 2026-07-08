using KitPlatform.Packs.Survey;

namespace KitPlatform.Packs.Survey.Infrastructure;

internal sealed class AssessmentTemplateService : IAssessmentTemplateService
{
    private readonly AssessmentRepository _repo;

    public AssessmentTemplateService(AssessmentRepository repo) => _repo = repo;

    public async Task<AssessmentTemplateDto?> GetByCodeAsync(
        string code,
        string? version,
        CancellationToken cancellationToken = default)
    {
        var header = await _repo.GetTemplateHeaderAsync(code, version, cancellationToken);
        if (header is null)
            return null;

        var tree = await _repo.GetTemplateTreeAsync(header.Id, cancellationToken);
        if (tree.Count == 0)
            return null;

        var categories = tree
            .GroupBy(r => r.CategoryCode)
            .OrderBy(g => g.First().CategorySort)
            .Select(catGroup =>
            {
                var catFirst = catGroup.First();
                var dimensions = catGroup
                    .GroupBy(r => r.DimensionCode)
                    .OrderBy(g => g.First().DimensionSort)
                    .Select(dimGroup =>
                    {
                        var dimFirst = dimGroup.First();
                        var questions = dimGroup
                            .GroupBy(r => r.QuestionId)
                            .OrderBy(g => g.First().QuestionSort)
                            .Select(qGroup =>
                            {
                                var qFirst = qGroup.First();
                                var options = qGroup
                                    .Where(r => r.OptionId.HasValue)
                                    .OrderBy(r => r.OptionSort)
                                    .Select(r => new AssessmentOptionDto(
                                        r.OptionId!.Value,
                                        r.OptionCode!,
                                        r.OptionLabel!,
                                        qFirst.Scorable ? r.OptionScore : null,
                                        r.OptionSort ?? 0))
                                    .ToList();

                                return new AssessmentQuestionDto(
                                    qFirst.QuestionId,
                                    qFirst.QuestionCode,
                                    qFirst.QuestionTitle,
                                    qFirst.QuestionHelpText,
                                    qFirst.QuestionType,
                                    qFirst.Scorable,
                                    qFirst.Required,
                                    qFirst.QuestionSort,
                                    options);
                            })
                            .ToList();

                        return new AssessmentDimensionDto(
                            dimFirst.DimensionCode,
                            dimFirst.DimensionName,
                            questions);
                    })
                    .ToList();

                return new AssessmentCategoryDto(
                    catFirst.CategoryCode,
                    catFirst.CategoryName,
                    catFirst.CategorySort,
                    dimensions);
            })
            .ToList();

        return new AssessmentTemplateDto(
            header.Id,
            header.Code,
            header.Name,
            header.Version,
            categories);
    }
}
