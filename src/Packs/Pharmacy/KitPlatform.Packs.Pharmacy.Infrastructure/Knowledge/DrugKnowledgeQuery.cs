using KitPlatform.Packs.Pharmacy.Knowledge;

namespace KitPlatform.Packs.Pharmacy.Infrastructure.Knowledge;

internal sealed class DrugKnowledgeQuery : IDrugKnowledgeQuery
{
    public bool TryAnswer(
        string question,
        string? productName,
        string? genericName,
        out string answer,
        out string confidence)
        => DrugKnowledgeRules.TryAnswer(question, productName, genericName, out answer, out confidence);
}
