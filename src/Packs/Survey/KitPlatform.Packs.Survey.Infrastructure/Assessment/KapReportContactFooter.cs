using QuestPDF.Fluent;
using QuestPDF.Infrastructure;

namespace KitPlatform.Packs.Survey.Infrastructure;

/// <summary>Thông tin liên hệ cuối báo cáo KAP — đồng bộ với novixa.vn/vi/lien-he.</summary>
internal static class KapReportContactFooter
{
    public const string CompanyLegalName = "Công ty TNHH Truyền thông và Công nghệ KIT";
    public const string BrandLine = "Novixa — sản phẩm của KIT Technology";
    public const string HotlineDisplay = "0984.660.399";
    public const string Email = "khiemtic@gmail.com";
    public const string Website = "https://novixa.vn/vi/lien-he";
    public const string WebsiteDisplay = "novixa.vn/lien-he";
    public const string Address = "KĐT Hồ Xương Rồng, P. Phan Đình Phùng, Thái Nguyên";

    public static void RenderPdf(ColumnDescriptor col, string brandColor = "#0f766e")
    {
        col.Item().PaddingTop(16).Text("Thông tin liên hệ").Bold().FontSize(11).FontColor(brandColor);
        col.Item().PaddingTop(6).Text(BrandLine).FontSize(9);
        col.Item().PaddingTop(2).Text(CompanyLegalName).FontSize(8).FontColor("#64748b");
        col.Item().PaddingTop(8).Table(table =>
        {
            table.ColumnsDefinition(c =>
            {
                c.ConstantColumn(72);
                c.RelativeColumn();
            });
            AddRow(table, "Hotline", HotlineDisplay);
            AddRow(table, "Email", Email);
            AddRow(table, "Website", WebsiteDisplay);
            AddRow(table, "Địa chỉ", Address);
        });
        col.Item().PaddingTop(8).Text(
            "Đặt lịch tư vấn 30 phút — đội ngũ Novixa sẽ trao đổi lộ trình phù hợp quy mô nhà thuốc của bạn, không áp gói sẵn.")
            .FontSize(8).FontColor("#64748b").LineHeight(1.35f);
    }

    private static void AddRow(TableDescriptor table, string label, string value)
    {
        table.Cell().PaddingVertical(3).Text(label).Bold().FontSize(8);
        table.Cell().PaddingVertical(3).Text(value).FontSize(8);
    }
}
