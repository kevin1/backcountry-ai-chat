const replacementLookup = new Map([
  [0x00bb, '"'], // » right-pointing double angle quotation mark
  [0x201c, '"'], // " left double quotation mark
  [0x201d, '"'], // " right double quotation mark
  [0x02ba, '"'], // ʺ modifier letter double prime
  [0x02ee, '"'], // ˮ modifier letter double apostrophe
  [0x201f, '"'], // ‟ double high-reversed-9 quotation mark
  [0x275d, '"'], // ❝ heavy double turned comma quotation mark ornament
  [0x275e, '"'], // ❞ heavy double comma quotation mark ornament
  [0x301d, '"'], // 〝 reversed double prime quotation mark
  [0x301e, '"'], // 〞 double prime quotation mark
  [0xff02, '"'], // ＂ fullwidth quotation mark
  [0x2018, ""], // nan left single quotation mark
  [0x2019, ""], // nan right single quotation mark
  [0x02bb, ""], // ʻ modifier letter turned comma
  [0x02c8, ""], // ˈ modifier letter vertical line
  [0x02bc, ""], // ʼ modifier letter apostrophe
  [0x02bd, ""], // ʽ modifier letter reversed comma
  [0x02b9, ""], // ʹ modifier letter prime
  [0x201b, ""], // ‛ single high-reversed-9 quotation mark
  [0xff07, ""], // nan fullwidth apostrophe
  [0x00b4, ""], // ´ acute accent
  [0x02ca, ""], // ˊ modifier letter acute accent
  [0x0060, ""], // ` grave accent
  [0x02cb, ""], // ˋ modifier letter grave accent
  [0x275b, ""], // ❛ heavy single turned comma quotation mark ornament
  [0x275c, ""], // ❜ heavy single comma quotation mark ornament
  [0x0313, ""], // ̓ combining comma above
  [0x0314, ""], // ̔ combining reversed comma above
  [0xfe10, ""], // ︐ presentation form for vertical comma
  [0xfe11, ""], // ︑ presentation form for vertical ideographic comma
  [0x00f7, "/"], // ÷ division sign
  [0x00bc, "1/4"], // ¼ vulgar fraction one quarter
  [0x00bd, "1/2"], // ½ vulgar fraction one half
  [0x00be, "3/4"], // ¾ vulgar fraction three quarters
  [0x29f8, "/"], // ⧸ big solidus
  [0x0337, "/"], // ̷ combining short solidus overlay
  [0x0338, "/"], // ̸ combining long solidus overlay
  [0x2044, "/"], // ⁄ fraction slash
  [0x2215, "/"], // ∕ division slash
  [0xff0f, "/"], // ／ fullwidth solidus
  [0x29f9, "\\"], // ⧹ big reverse solidus
  [0x29f5, "\\"], // ⧵ reverse solidus operator
  [0x20e5, "\\"], // nan combining reverse solidus overlay
  [0xfe68, "\\"], // ﹨ small reverse solidus
  [0xff3c, "\\"], // ＼ fullwidth reverse solidus
  [0x0332, "_"], // ̲ combining low line
  [0xff3f, "_"], // ＿ fullwidth low line
  [0x20d2, "|"], // ⃒ combining long vertical line overlay
  [0x20d3, "|"], // ⃓ combining short vertical line overlay
  [0x2223, "|"], // ∣ divides
  [0xff5c, "|"], // ｜ fullwidth vertical line
  [0x23b8, "|"], // ⎸ left vertical box line
  [0x23b9, "|"], // ⎹ right vertical box line
  [0x23d0, "|"], // ⏐ vertical line extension
  [0x239c, "|"], // ⎜ left parenthesis extension
  [0x239f, "|"], // ⎟ right parenthesis extension
  [0x23bc, "-"], // ⎼ horizontal scan line-7
  [0x23bd, "-"], // ⎽ horizontal scan line-9
  [0x2015, "-"], // ― horizontal bar
  [0xfe63, "-"], // ﹣ small hyphen-minus
  [0xff0d, "-"], // － fullwidth hyphen-minus
  [0x2010, "-"], // ‐ hyphen
  [0x2022, "-"], // • bullet
  [0x2043, "-"], // ⁃ hyphen bullet
  [0xfe6b, "@"], // ﹫ small commercial at sign
  [0xff20, "@"], // ＠ fullwidth commercial at sign
  [0xfe69, "$"], // ﹩ small dollar sign
  [0xff04, "$"], // ＄ fullwidth dollar sign
  [0x01c3, "!"], // ǃ Latin letter retroflex click
  [0xfe15, "!"], // ︕ presentation form for vertical exclamation mark
  [0xfe57, "!"], // ﹗ small exclamation mark
  [0xff01, "!"], // ！ fullwidth exclamation mark
  [0xfe5f, "#"], // ﹟ small number sign
  [0xff03, "#"], // ＃ fullwidth number sign
  [0xfe6a, "%"], // ﹪ small percent sign
  [0xff05, "%"], // ％ fullwidth percent sign
  [0xfe60, "&"], // ﹠ small ampersand
  [0xff06, "&"], // ＆ fullwidth ampersand
  [0x201a, ","], // nan single low-9 quotation mark
  [0x0326, ","], // ̦ combining comma below
  [0xfe50, ","], // ﹐ small comma
  [0x3001, ","], // 、 ideographic comma
  [0xfe51, ","], // ﹑ small ideographic comma
  [0xff0c, ","], // ， fullwidth comma
  [0xff64, ","], // ､ halfwidth ideographic comma
  [0x2768, "("], // ❨ medium left parenthesis ornament
  [0x276a, "("], // ❪ medium flattened left parenthesis ornament
  [0xfe59, "("], // ﹙ small left parenthesis
  [0xff08, "("], // （ fullwidth left parenthesis
  [0x27ee, "("], // ⟮ mathematical left flattened parenthesis
  [0x2985, "("], // ⦅ left white parenthesis
  [0x2769, ")"], // ❩ medium right parenthesis ornament
  [0x276b, ")"], // ❫ medium flattened right parenthesis ornament
  [0xfe5a, ")"], // ﹚ small right parenthesis
  [0xff09, ")"], // ） fullwidth right parenthesis
  [0x27ef, ")"], // ⟯ mathematical right flattened parenthesis
  [0x2986, ")"], // ⦆ right white parenthesis
  [0x204e, "*"], // ⁎ low asterisk
  [0x2217, "*"], // ∗ asterisk operator
  [0x229b, "*"], // ⊛ circled asterisk operator
  [0x2722, "*"], // ✢ four teardrop-spoked asterisk
  [0x2723, "*"], // ✣ four balloon-spoked asterisk
  [0x2724, "*"], // ✤ heavy four balloon-spoked asterisk
  [0x2725, "*"], // ✥ four club-spoked asterisk
  [0x2731, "*"], // ✱ heavy asterisk
  [0x2732, "*"], // ✲ open center asterisk
  [0x2733, "*"], // ✳ eight spoked asterisk
  [0x273a, "*"], // ✺ sixteen pointed asterisk
  [0x273b, "*"], // ✻ teardrop-spoked asterisk
  [0x273c, "*"], // ✼ open center teardrop-spoked asterisk
  [0x273d, "*"], // ✽ heavy teardrop-spoked asterisk
  [0x2743, "*"], // ❃ heavy teardrop-spoked pinwheel asterisk
  [0x2749, "*"], // ❉ balloon-spoked asterisk
  [0x274a, "*"], // ❊ eight teardrop-spoked propeller asterisk
  [0x274b, "*"], // ❋ heavy eight teardrop-spoked propeller asterisk
  [0x29c6, "*"], // ⧆ squared asterisk
  [0xfe61, "*"], // ﹡ small asterisk
  [0xff0a, "*"], // ＊ fullwidth asterisk
  [0x02d6, "+"], // ˖ modifier letter plus sign
  [0xfe62, "+"], // ﹢ small plus sign
  [0xff0b, "+"], // ＋ fullwidth plus sign
  [0x3002, "."], // 。 ideographic full stop
  [0xfe52, "."], // ﹒ small full stop
  [0xff0e, "."], // ． fullwidth full stop
  [0xff61, "."], // ｡ halfwidth ideographic full stop
  [0xff10, "0"], // 0 fullwidth digit zero
  [0xff11, "1"], // 1 fullwidth digit one
  [0xff12, "2"], // 2 fullwidth digit two
  [0xff13, "3"], // 3 fullwidth digit three
  [0xff14, "4"], // 4 fullwidth digit four
  [0xff15, "5"], // 5 fullwidth digit five
  [0xff16, "6"], // 6 fullwidth digit six
  [0xff17, "7"], // 7 fullwidth digit seven
  [0xff18, "8"], // 8 fullwidth digit eight
  [0xff19, "9"], // 9 fullwidth digit nine
  [0x02d0, ":"], // ː modifier letter triangular colon
  [0x02f8, ":"], // ˸ modifier letter raised colon
  [0x2982, ":"], // ⦂ z notation type colon
  [0xa789, ":"], // ꞉ modifier letter colon
  [0xfe13, ":"], // ︓ presentation form for vertical colon
  [0xff1a, ":"], // ： fullwidth colon
  [0x204f, ";"], // ⁏ reversed semicolon
  [0xfe14, ";"], // ︔ presentation form for vertical semicolon
  [0xfe54, ";"], // ﹔ small semicolon
  [0xff1b, ";"], // ； fullwidth semicolon
  [0xfe64, "<"], // ﹤ small less-than sign
  [0xff1c, "<"], // ＜ fullwidth less-than sign
  [0x0347, "="], // ͇ combining equals sign below
  [0xa78a, "="], // ꞊ modifier letter short equals sign
  [0xfe66, "="], // ﹦ small equals sign
  [0xff1d, "="], // ＝ fullwidth equals sign
  [0xfe65, ">"], // ﹥ small greater-than sign
  [0xff1e, ">"], // ＞ fullwidth greater-than sign
  [0xfe16, "?"], // ︖ presentation form for vertical question mark
  [0xfe56, "?"], // ﹖ small question mark
  [0xff1f, "?"], // ？ fullwidth question mark
  [0xff21, "A"], // Ａ fullwidth Latin capital letter a
  [0x1d00, "A"], // ᴀ Latin letter small capital a
  [0xff22, "B"], // Ｂ fullwidth Latin capital letter b
  [0x0299, "B"], // ʙ Latin letter small capital b
  [0xff23, "C"], // Ｃ fullwidth Latin capital letter c
  [0x1d04, "C"], // ᴄ Latin letter small capital c
  [0xff24, "D"], // Ｄ fullwidth Latin capital letter d
  [0x1d05, "D"], // ᴅ Latin letter small capital d
  [0xff25, "E"], // Ｅ fullwidth Latin capital letter e
  [0x1d07, "E"], // ᴇ Latin letter small capital e
  [0xff26, "F"], // Ｆ fullwidth Latin capital letter f
  [0xa730, "F"], // ꜰ Latin letter small capital f
  [0xff27, "G"], // Ｇ fullwidth Latin capital letter g
  [0x0262, "G"], // ɢ Latin letter small capital g
  [0xff28, "H"], // Ｈ fullwidth Latin capital letter h
  [0x029c, "H"], // ʜ Latin letter small capital h
  [0xff29, "I"], // Ｉ fullwidth Latin capital letter i
  [0x026a, "I"], // ɪ Latin letter small capital i
  [0xff2a, "J"], // Ｊ fullwidth Latin capital letter j
  [0x1d0a, "J"], // ᴊ Latin letter small capital j
  [0xff2b, "K"], // Ｋ fullwidth Latin capital letter k
  [0x1d0b, "K"], // ᴋ Latin letter small capital k
  [0xff2c, "L"], // Ｌ fullwidth Latin capital letter l
  [0x029f, "L"], // ʟ Latin letter small capital l
  [0xff2d, "M"], // Ｍ fullwidth Latin capital letter m
  [0x1d0d, "M"], // ᴍ Latin letter small capital m
  [0xff2e, "N"], // Ｎ fullwidth Latin capital letter n
  [0x0274, "N"], // ɴ Latin letter small capital n
  [0xff2f, "O"], // Ｏ fullwidth Latin capital letter o
  [0x1d0f, "O"], // ᴏ Latin letter small capital o
  [0xff30, "P"], // Ｐ fullwidth Latin capital letter p
  [0x1d18, "P"], // ᴘ Latin letter small capital p
  [0xff31, "Q"], // Ｑ fullwidth Latin capital letter q
  [0xff32, "R"], // Ｒ fullwidth Latin capital letter r
  [0x0280, "R"], // ʀ Latin letter small capital r
  [0xff33, "S"], // Ｓ fullwidth Latin capital letter s
  [0xa731, "S"], // ꜱ Latin letter small capital s
  [0xff34, "T"], // Ｔ fullwidth Latin capital letter t
  [0x1d1b, "T"], // ᴛ Latin letter small capital t
  [0xff35, "U"], // Ｕ fullwidth Latin capital letter u
  [0x1d1c, "U"], // ᴜ Latin letter small capital u
  [0xff36, "V"], // Ｖ fullwidth Latin capital letter v
  [0x1d20, "V"], // ᴠ Latin letter small capital v
  [0xff37, "W"], // Ｗ fullwidth Latin capital letter w
  [0x1d21, "W"], // ᴡ Latin letter small capital w
  [0xff38, "X"], // Ｘ fullwidth Latin capital letter x
  [0xff39, "Y"], // Ｙ fullwidth Latin capital letter y
  [0x028f, "Y"], // ʏ Latin letter small capital y
  [0xff3a, "Z"], // Ｚ fullwidth Latin capital letter z
  [0x1d22, "Z"], // ᴢ Latin letter small capital z
  [0x02c6, "^"], // ˆ modifier letter circumflex accent
  [0x0302, "^"], // ̂ combining circumflex accent
  [0xff3e, "^"], // ＾ fullwidth circumflex accent
  [0x1dcd, "^"], // ᷍ combining double circumflex above
  [0x2774, "{"], // ❴ medium left curly bracket ornament
  [0xfe5b, "{"], // ﹛ small left curly bracket
  [0xff5b, "{"], // ｛ fullwidth left curly bracket
  [0x2775, "}"], // ❵ medium right curly bracket ornament
  [0xfe5c, "}"], // ﹜ small right curly bracket
  [0xff5d, "}"], // ｝ fullwidth right curly bracket
  [0xff3b, "["], // ［ fullwidth left square bracket
  [0xff3d, "]"], // ］ fullwidth right square bracket
  [0x02dc, "~"], // ˜ small tilde
  [0x02f7, "~"], // ˷ modifier letter low tilde
  [0x0303, "~"], // ̃ combining tilde
  [0x0330, "~"], // ̰ combining tilde below
  [0x0334, "~"], // ̴ combining tilde overlay
  [0x223c, "~"], // ∼ tilde operator
  [0xff5e, "~"], // ～ fullwidth tilde
  [0x00a0, ""], // nan no-break space
  [0x2000, ""], // nan whitespace: en quad
  [0x2001, ""], // nan whitespace: medium mathematical space
  [0x2002, ""], // nan whitespace: en space
  [0x2003, ""], // nan whitespace: em space
  [0x2004, ""], // nan whitespace: three-per-em space
  [0x2005, ""], // nan whitespace: four-per-em space
  [0x2006, ""], // nan whitespace: six-per-em space
  [0x2007, ""], // nan whitespace: figure space
  [0x2008, ""], // nan whitespace: punctuation space
  [0x2009, ""], // nan whitespace: thin space
  [0x200a, ""], // nan whitespace: hair space
  [0x200b, ""], // nan zero width space
  [0x202f, ""], // nan narrow no-break space
  [0x205f, ""], // nan medium mathematical space
  [0x3000, ""], // nan ideographic space
  [0xfeff, ""], // nan zero width no-break space
  [0x008d, ""], // nan reverse line feed
  [0x009f, ""], // nan <control>
  [0x0080, ""], // nan c1 control codes
  [0x0090, ""], // nan device control string
  [0x009b, ""], // nan control sequence introducer
  [0x0010, ""], // nan escape
  [0x0009, ""], // nan tab (7 spaces based on print statement in python interpreter)
  [0x0000, ""], // nan nan
  [0x0003, ""], // nan end of text
  [0x0004, ""], // nan end of transmission
  [0x0017, ""], // nan end of transmission block
  [0x0019, ""], // nan end of medium
  [0x0011, ""], // nan device control one
  [0x0012, ""], // nan device control two
  [0x0013, ""], // nan device control three
  [0x0014, ""], // nan device control four
  [0x2017, "_"], // ‗ double low line
  [0x2014, "-"], // — em dash
  [0x2013, "-"], // – en dash
  [0x2039, ">"], // ‹ single left-pointing angle quotation mark
  [0x203a, "<"], // › single right-pointing angle quotation mark
  [0x203c, "!!"], // ‼ double exclamation mark
  [0x201e, '"'], // „ double low quotation mark
  [0x2026, "..."], // … horizontal ellipsis
  [0x2028, ""], // nan whitespace: line separator
  [0x2029, ""], // nan whitespace: paragraph separator
  [0x2060, ""], // ⁠ word joiner
]);

/**
 * Replace Unicode characters with look-alikes.
 * https://www.twilio.com/docs/messaging/services/smart-encoding-char-list
 */
export function smsCharacterReplacement(input: string): string {
  let output = "";
  for (const c of input) {
    output += replacementLookup.get(c.charCodeAt(0)) ?? c;
  }
  return output;
}
