using Newtonsoft.Json;
using System.Text;
using System.Text.RegularExpressions;

var builder = WebApplication.CreateBuilder(args);

//// Add services to the container.
//// Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
//builder.Services.AddEndpointsApiExplorer();
//builder.Services.AddSwaggerGen();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/data", () =>
{
    var generator = new Generator();
    //WebContentFormattor.Format1("testformat-1.txt");
    return generator.Analyse();
});

app.MapGet("/edata", () =>
{
    var data = File.ReadAllText("./data.json");
    return JsonConvert.SerializeObject(data, Formatting.Indented);
});

app.MapPost("/data", (List<AddressGeo> data) =>
{
    //var data = JsonConvert.DeserializeObject<List<Geo>>(strData);
    DataJSONContentHandler.UpdateGeo(data);
});

app.Run();


internal class Generator
{
    internal static string root = @"data";
    internal static string[] xzq = { "�����", "������", "�ֶ�����", "������", "������", "������", "�����", "������", "������", "��ɽ��", "�ζ���", "��ɽ��", "�ɽ���", "������", "������", "������" };
    internal static string xhq = @"�����";
    internal static string mhq = @"������";
    internal static string pdxq = @"�ֶ�����";
    internal static string hpq = @"������";
    internal static string jaq = @"������";
    internal static string cnq = @"������";
    internal static string hkq = @"�����";
    internal static string ypq = @"������";
    internal static string ptq = @"������";
    internal static string bsq = @"��ɽ��";
    internal static string jdq = @"�ζ���";
    internal static string jsq = @"��ɽ��";
    internal static string sjq = @"�ɽ���";
    internal static string qpq = @"������";
    internal static string fxq = @"������";
    internal static string cmq = @"������";

    internal static string TtPartten = @"����(����)?((\d*)��)?�¹ڷ���(����)?ȷ�ﲡ��((\d*)��)?��((\d*)������)?��֢״��Ⱦ��((\d*)��)?";
    internal static string TtPart1Partten = @"(��?)���������¹ڷ���ȷ�ﲡ��((\d*)��)?";
    internal static string TtPart2Partten = @"����������֢״��Ⱦ��((\d*)��)?";
    // internal static string regionPartten = @"��((\w*)��)((��?)����|����(\d*)��)����(�¹ڷ���)?ȷ�ﲡ��(��|��)(����)?(\d*)��(����)?��֢״��Ⱦ��";
    internal static string regionPartten = @"��{0}((��?)����|����(\d*)��)����(�¹ڷ���)?ȷ�ﲡ��(��|��)(����)?(\d*)��(����)?��֢״��Ⱦ��";

    public Result Analyse()
    {
        var root = SourceDataHandler.GetDataFolder(new DirectoryInfo(Directory.GetCurrentDirectory()));
        SourceDataHandler.FormatContent(root);

        if (string.IsNullOrEmpty(root)) return new Result();
        DirectoryInfo directoryInfo = new DirectoryInfo(root);
        var result = DataJSONContentHandler.ReadDataJson();

        foreach (FileInfo file in directoryInfo.GetFiles())
        {
            Data data = new Data() { Day = file.Name.Replace(file.Extension, "").Replace('-', '.') };
            if (result.Amounts.Any(a => a.Day.Equals(data.Day))) continue;

            string contents = File.ReadAllText(file.FullName);
            var total = GetTotal(contents);
            result.Amounts.Add(new AmountOfDay() { Day = data.Day, Amount = total });
            data.Region = GetAddress(contents);
            result.Details.Add(data);
        }

        result.Details.Sort((a, b) => Convert.ToDouble(a.Day.Replace(".", "")) > Convert.ToDouble(b.Day.Replace(".", "")) ? 1 : -1);

        Dictionary<string, List<AmountOfDay>> increasment = new Dictionary<string, List<AmountOfDay>>();

        DataJSONContentHandler.CreateDataJson(result);

        return result;
    }



    public int GetTotal(string contents)
    {
        string qzM = "0", wzM = "0";
        Match m = Regex.Match(contents, TtPartten);
        if (m.Success)
        {
            qzM = !string.IsNullOrEmpty(m.Groups[3].Value) ? m.Groups[3].Value : m.Groups[6].Value;
            wzM = !string.IsNullOrEmpty(m.Groups[8].Value) ? m.Groups[8].Value : m.Groups[10].Value;
            return Convert.ToInt32(qzM) + Convert.ToInt32(wzM);
        }
        m = Regex.Match(contents, TtPart1Partten);
        if (m.Success)
        {
            qzM = !string.IsNullOrEmpty(m.Groups[3].Value) ? m.Groups[3].Value : "0";
        }
        m = Regex.Match(contents, TtPart2Partten);
        if (m.Success)
        {
            wzM = !string.IsNullOrEmpty(m.Groups[2].Value) ? m.Groups[2].Value : "0"; 
        }
        return Convert.ToInt32(qzM) + Convert.ToInt32(wzM);
    }

    private List<Region> GetAddress(string contents)
    {
        List<Region> result = new List<Region>();
        foreach (string q in xzq)
        {
            Region address = new Region() { Name = q };
            address.Addresses = GetAddressIn(contents, q);
            var amt = GetRegionAmount(contents, q);
            address.Amount = amt == 0 ? address.Addresses.Count : amt;
            result.Add(address);
        }
        return result;
    }

    private int GetRegionAmount(string contents, string q)
    {
        string partten = string.Format(regionPartten, q);
        Match m = Regex.Match(contents, partten);
        if (m.Success)
        {
            var qzM = !string.IsNullOrEmpty(m.Groups[3].Value) ? m.Groups[3].Value : "0";
            var wzM = !string.IsNullOrEmpty(m.Groups[7].Value) ? m.Groups[7].Value : "0";
            return Convert.ToInt32(qzM) + Convert.ToInt32(wzM);
        }
        return 0;
    }

    public List<AddressGeo> GetAddressIn(string contents, string q)
    {
        List<AddressGeo> result = new List<AddressGeo>();
        var partten = $"\\n({q}(\\w*))(��|��|��)";
        Match m = Regex.Match(contents, partten);
        var loopdog = 0;
        while (m.Success && loopdog++ < 10000)
        {
            var adds = m.Groups[1].Value;
            if (!result.Any(r => r.Address.Equals(adds))) result.Add(new AddressGeo() { Address = adds });
            m = m.NextMatch();
        }
        return result;
    }

    public AddressGeo CreateAddress(string adds)
    {
        return new AddressGeo()
        {
            Address = adds,
            Geo = new Geo(),
        };
    }

    public static void testRegx()
    {
    }
}

internal static class SourceDataHandler
{
    public static string GetDataFolder(DirectoryInfo? currentDir)
    {
        if (currentDir == null) return string.Empty;
        var subDirs = currentDir.GetDirectories();
        if (subDirs.ToList().Any(d => d.Name.ToLower() == "data")) return Path.Combine(currentDir.FullName, "data");
        return GetDataFolder(currentDir.Parent);
    }

    public static void FormatContent(string? path)
    {
        if (string.IsNullOrEmpty(path)) return;
        var directory = new DirectoryInfo(path);
        foreach (FileInfo file in directory.GetFiles())
        {
            WebContentFormattor.Format0(file.FullName);
            WebContentFormattor.Format1(file.FullName);
            WebContentFormattor.Format2(file.FullName);
        }
    }
}

internal static class DataJSONContentHandler
{
    private static readonly string dataJson = "data.json";
    public static void UpdateGeo(List<AddressGeo>? adds)
    {
        if (adds == null || adds.Count == 0) return;
        string errors = "";
        var source = ReadDataJson();
        var len = source.Details.Count;
        adds.ForEach(x =>
        {
            for (int i = 0; i < len; i++)
            {
                var updated = false;
                var region = source.Details[i].Region;
                for (int j = 0; j < region.Count; j++)
                {
                    if (!x.Address.Contains(region[j].Name)) continue;
                    var klen = region[j].Addresses.Count;
                    for (int k = 0; k < klen; k++)
                    {
                        var sAdd = region[j].Addresses[k];
                        if (sAdd.Address != x.Address) continue;
                        if (!sAdd.Equals(x)) errors += $"difference: org: {sAdd}, new: {x} \r\n";
                        region[j].Addresses.RemoveAt(k);
                        region[j].Addresses.Add(new AddressGeo(x.Address, x.Geo));
                        updated = true;
                        // break;
                    }
                    break;
                }
                //if (updated) break;
            }
        });

        CreateDataJson(source);

        File.Delete("errors.txt");
        File.WriteAllText("errors.txt", errors);
    }

    public static Result ReadDataJson()
    {
        var content = File.ReadAllText(dataJson);
        if (string.IsNullOrEmpty(content)) return new Result();
        else return JsonConvert.DeserializeObject<Result>(content);
    }

    public static void CreateDataJson(Result result)
    {
        if(File.Exists(dataJson)) File.Delete(dataJson);
        var content = JsonConvert.SerializeObject(result);
        File.WriteAllText(dataJson, content);
    }
}

internal static class WebContentFormattor
{
    public static void Format1(string path)
    {
        var format = "format-1";
        if (!path.Contains(format)) return;

        string newContents = "";

        var lines = File.ReadAllLines(path);
        var prefix = "";
        foreach (var line in lines)
        {
            var clearLine = line.Trim();
            if (string.Empty == clearLine) continue;
            if (Generator.xzq.Contains(clearLine))
            {
                prefix = clearLine;
                continue;
            }
            if (line.StartsWith("2022"))
            {
                newContents += line + "\n";
                continue;
            }
            if (clearLine.Contains("��ʵ��ĩ����"))
            {
                prefix = "";
                continue;
            }
            var newLine = prefix + clearLine;
            if (newLine.Contains("��"))
            {
                var adds = newLine.Split("��") ;
                newLine = adds[0] + "��\n";
                for (int i = 1; i < adds.Length; i++)
                {
                    if (!string.IsNullOrEmpty(adds[i].Trim())) newLine += $"{prefix}" + adds[i]+"��\n";
                }
            }
            newLine = newLine.Replace("��סլ��", "");
            newContents += newLine + "��\n";
        }

        File.WriteAllText(path.Replace(format, ""), newContents);
        File.Delete(path);
    }

    public static void Format0(string path)
    {
        var format = "format-0";
        if (!path.Contains(format)) return;

        string newContents = "";

        var lines = File.ReadAllLines(path);
        foreach (var line in lines)
        {
            var clearLine = line.Trim();
            if (string.Empty == clearLine) continue;
            var newLine = clearLine.Replace("��ס��", "\n");
            newLine = newLine.Replace("��ס��Ϊ", "\n");
            // newContents += newLine.Replace("��֢״", "\n��֢״");
            newContents += newLine;
        }

        File.WriteAllText(path.Replace(format, ""), newContents);
        File.Delete(path);
    }

    public static void Format2(string path)
    {
        var format = "format-2";
        if (!path.Contains(format)) return;

        string newContents = "";

        var lines = File.ReadAllLines(path);
        foreach (var line in lines)
        {
            var clearLine = line.Trim();
            if (string.Empty == clearLine) continue;
            var newLine = clearLine.Replace("��ס��", "\n");
            newLine = newLine.Replace("��ס��Ϊ", "\n");
            // newContents += newLine.Replace("��֢״", "\n��֢״");
            newContents += newLine;
        }

        File.WriteAllText(path.Replace(format, ""), newContents);
        File.Delete(path);
    }
}

internal class Data
{
    public string Day { get; set; }
    public List<Region> Region { get; set; }
}

internal class Region
{
    public string Name { get; set; }
    public List<AddressGeo> Addresses { get; set; }
    public int Amount { get; set; }
}

internal record struct AddressGeo(string Address, Geo? Geo );

internal record struct Geo (double Lng, double Lat);

internal class AmountOfDay
{
    public string Day { get; set; }
    public int Amount { get; set; }
}

internal class Result
{
    public List<Data> Details { get; set; }
    public List<AmountOfDay> Amounts { get; set; }

}

internal static class StringExtension
{
    /// <summary>
    /// <summary>
    /// �ַ���תUnicode
    /// </summary>
    /// <param name="source">Դ�ַ���</param>
    /// <returns>Unicode�������ַ���</returns>
    public static string String2Unicode(this string source)
    {
        byte[] bytes = Encoding.Unicode.GetBytes(source);
        StringBuilder stringBuilder = new StringBuilder();
        for (int i = 0; i < bytes.Length; i += 2)
        {
            stringBuilder.AppendFormat("\\u{0}{1}", bytes[i + 1].ToString("x").PadLeft(2, '0'), bytes[i].ToString("x").PadLeft(2, '0'));
        }
        return stringBuilder.ToString();
    }

    /// <summary>
    /// Unicodeת�ַ���
    /// </summary>
    /// <param name="source">����Unicode������ַ���</param>
    /// <returns>�����ַ���</returns>
    public static string Unicode2String(this string source)
    {
        return new Regex(@"\\u([0-9A-F]{4})", RegexOptions.IgnoreCase | RegexOptions.Compiled).Replace(
                     source, x => string.Empty + Convert.ToChar(Convert.ToUInt16(x.Result("$1"), 16)));
    }
}