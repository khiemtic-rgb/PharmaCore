namespace KitPlatform.Packs.Pharmacy.Knowledge;

/// <summary>Knowledge Domain: drug guidance for AI (BR-AI-002). Pilot: static profiles; future: tenant KB.</summary>
public interface IDrugKnowledgeQuery
{
    bool TryAnswer(
        string question,
        string? productName,
        string? genericName,
        out string answer,
        out string confidence);
}
