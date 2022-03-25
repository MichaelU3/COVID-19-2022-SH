using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;

namespace statistic
{
    internal class Analyser
    {
        internal static string root = @"data";
        internal static string[] xzq = { "徐汇区", "闵行区", "浦东新区", "黄浦区","静安区", "长宁区", "虹口区", "杨浦区", "普陀区", "宝山区", "嘉定区","金山区","松江区","青浦区","奉贤区","崇明区" };
        internal static string xhq = @"徐汇区";
        internal static string mhq = @"闵行区";
        internal static string pdxq = @"浦东新区"; 
        internal static string hpq = @"黄浦区";
        internal static string jaq = @"静安区";
        internal static string cnq = @"长宁区";
        internal static string hkq = @"虹口区";
        internal static string ypq = @"杨浦区";
        internal static string ptq = @"普陀区";
        internal static string bsq = @"宝山区";
        internal static string jdq = @"嘉定区";
        internal static string jsq = @"金山区";
        internal static string sjq = @"松江区";
        internal static string qpq = @"青浦区";
        internal static string fxq = @"奉贤区";
        internal static string cmq = @"崇明区";

        internal static string TtPartten = @"\u65b0\u589e\u672c\u571f\u65b0\u51a0\u80ba\u708e\u786e\u8bca\u75c5\u4f8b(\d*)\u4f8b\u548c\u65e0\u75c7\u72b6\u611f\u67d3\u8005(\d*)\u4f8b";
        internal static string TtPartten2 = @"\u65b0\u589e(\d*)\u4f8b\u65b0\u51a0\u80ba\u708e\u672c\u571f\u786e\u8bca\u75c5\u4f8b\u548c(\d*)\u4f8b\u672c\u571f\u65e0\u75c7\u72b6\u611f\u67d3\u8005";

        public void Analyse()
        {
            var root = Path.GetFullPath(@"../../../../data");
            DirectoryInfo directoryInfo = new DirectoryInfo(root);
            List<Data> dataList = new List<Data>();
            List<AmountOfDay> dailyAmount = new List<AmountOfDay>();
            foreach (FileInfo file in directoryInfo.GetFiles())
            {
                FormatContent1(file.FullName);
            }
            foreach(FileInfo file in directoryInfo.GetFiles())
            {
                Data data = new Data() { Day = file.Name.Replace(file.Extension, "").Replace('-','.')};

                string contents = File.ReadAllText(file.FullName);
                var total = GetTotal(contents);
                dailyAmount.Add(new AmountOfDay() { Day = data.Day, Amount = total });
                data.Address = GetAddress(contents);
                dataList.Add(data);
            }

            dataList.Sort((a, b) =>  Convert.ToDouble(a.Day.Replace(".","")) > Convert.ToDouble(b.Day.Replace(".", "")) ? 1 : -1);

            Dictionary<string, List<AmountOfDay>> increasment = new Dictionary<string, List<AmountOfDay>> ();

            Result result = new Result() { Details = dataList, Amounts = dailyAmount };
            var resultStr = JsonConvert.SerializeObject(result);
            var resultRoot = Directory.GetParent(root).FullName;
            File.WriteAllText(Path.Combine(resultRoot, "data.json"), resultStr);

        }

        public int GetTotal(string contents)
        {
            Match m = Regex.Match(contents, TtPartten);
            if (m.Success)
            {
                return Convert.ToInt32(m.Groups[1].Value) + Convert.ToInt32(m.Groups[2].Value);
            }
            m = Regex.Match(contents, TtPartten2);
            if (m.Success)
            {
                return Convert.ToInt32(m.Groups[1].Value) + Convert.ToInt32(m.Groups[2].Value);
            }

            return 0;
        }

        private List<Address> GetAddress(string contents)
        {
            List<Address> result = new List<Address>();
            foreach(string q in xzq)
            {
                Address address = new Address() { Region = q};
                address.Addresses = GetAddressIn(contents, q);
                result.Add(address);
            }
            return result;
        }

        private List<string> GetAddressIn(string contents, string q)
        {
            List<string> result = new List<string>();
            string uniCode = q.String2Unicode();
            var partten = $"{uniCode}[\\u4e00-\\u9fa5\\d]+";
            Match m = Regex.Match(contents, partten);
            var loopdog = 0;
            while (m.Success && loopdog++ < 10000)
            {
                result.Add(m.Value);
                m = m.NextMatch();
            }
            return result;
        }

        public void FormatContent1(string path)
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
                if (xzq.Contains(clearLine))
                {
                    prefix = clearLine;
                    continue;
                }
                if (clearLine.Contains("落实终末消毒")) prefix = "";
                newContents += prefix + line + "\n";
            }

            File.WriteAllText(path.Replace(format, ""), newContents);
            File.Delete(path);
        }

        public void FormatContent2(string path)
        {
            var format = "format-2";
            if (!path.Contains(format)) return;

            string newContents = "";

            var lines = File.ReadAllLines(path);
            var prefix = "";
            foreach (var line in lines)
            {
                var clearLine = line.Trim();
                if (string.Empty == clearLine) continue;
                if (xzq.Contains(clearLine))
                {
                    prefix = clearLine;
                    continue;
                }
                if (clearLine.Contains("落实终末消毒")) prefix = "";
                newContents += prefix + line + "\n";
            }

            File.WriteAllText(path.Replace(format, ""), newContents);
            File.Delete(path);
        }
    }

    internal class Data
    {
        public string Day { get; set; }
        public List<Address> Address { get; set; }
    }

    internal class Address
    {
        public string Region { get; set; }
        public List<string> Addresses { get; set; }
    }

    internal class AmountOfDay
    {
        public string Day { get; set; }
        public int Amount { get; set; }
    }

    internal class Result
    {
        public List<Data> Details {get;set;}
        public List<AmountOfDay> Amounts {get;set;}

    }

    internal static class StringExtension
    {
        /// <summary>
        /// <summary>
        /// 字符串转Unicode
        /// </summary>
        /// <param name="source">源字符串</param>
        /// <returns>Unicode编码后的字符串</returns>
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
        /// Unicode转字符串
        /// </summary>
        /// <param name="source">经过Unicode编码的字符串</param>
        /// <returns>正常字符串</returns>
        public static string Unicode2String(this string source)
        {
            return new Regex(@"\\u([0-9A-F]{4})", RegexOptions.IgnoreCase | RegexOptions.Compiled).Replace(
                         source, x => string.Empty + Convert.ToChar(Convert.ToUInt16(x.Result("$1"), 16)));
        }
    }
}
