# CoC7 空白卡函数逻辑（模板解析）

- 模板文件：`COC七版空白卡G3.5.11.5 (修订版).xlsx`
- 工作表：`人物卡`（sheet1）
- 生成方式：`npm run extract:template-logic`

## 1) 属性区输入/计算位

| 属性 | 输入格 | 半数格 | 五分之一格 | 函数源格(右侧) | 右侧半数格 |
|---|---|---|---|---|---|
| STR | W3 | X3 | X4 | AS3 | AT3 |
| DEX | Z3 | AA3 | AA4 | AV3 | AW3 |
| INT | AC3 | AD3 | AD4 | AV7 | AW7 |
| CON | W5 | X5 | X6 | AS5 | AT5 |
| APP | Z5 | AA5 | AA6 | AV5 | AW5 |
| POW | AC5 | AD5 | AD6 | AY3 | AZ3 |
| SIZ | W7 | X7 | X8 | AS7 | AT7 |
| EDU | Z7 | AA7 | AA8 | AY5 | AZ5 |
| Luck | V10 | - | - | - | - |

说明：属性应优先写入左侧输入格（如 `W3`、`Z3`、`AC3`），右侧 `AS/AV/AY` 链路由模板公式自动取值。

## 2) 关键公式（节选）

| 单元格 | 公式 | 备注 |
|---|---|---|
| X2 | `W3+W7+W5+Z3+Z5+AC3+AC5+Z7` |  |
| AC2 | `AS3+AS5+AS7+AV3+AV5+AV7+AY3+AY5+V10` |  |
| R7 | `IF(T4="否",R4-X2,R4-AC2)` | 0 |
| AC7 | `8-AD8` | 8 |
| AY7 | `AZ8+8` | 8 |
| M10 | `IF(N10<M11,N10,N10-O11)` | 0 |
| N10 | `IF(H7="未启用",INT((AS5+AS7)/10),INT((AS5+AS7)/5))` | /0  |
| R10 | `IF(AY3-T11>99-T27,S10,AY3-T11)` | 0 |
| S10 | `99-T27` | /99  |
| V10 | `T7-X11` | 0 |
| Z10 | `AA10` | 0 |
| AA10 | `INT(AY3/5)` | /0 |
| T26 | `SUM(P26:S26)` | 0  |
| T29 | `SUM(P29:S29)` | 0  |
| AF52 | `附表!Q10` | 0 |
| AF55 | `附表!Q8` | 0 |

## 3) 技能表公式模式（样例行）

### 行 16
- `L16` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!M16,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!M16,D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!M16,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `T16` = `SUM(P16:S16)`
- `U16` = `INT(T16/2)`
- `V16` = `INT(T16/5)`
- `X16` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!Y16,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!Y16,人物卡!D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!Y16,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `AE16` = `SUM(AA16:AD16)`
- `AF16` = `INT(AE16/2)`
- `AG16` = `INT(AE16/5)`

### 行 20
- `L20` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!M20,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!M20,人物卡!E48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!M20,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `P20` = `IF(ISBLANK(B57),5,IF(N20=B57,D57,5))`
- `T20` = `P20+Q20+R20+S20`
- `U20` = `INT(T20/2)`
- `V20` = `INT(T20/5)`
- `X20` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!Y20,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!Y20,人物卡!D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!Y20,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `AE20` = `SUM(AA20:AD20)`
- `AF20` = `INT(AE20/2)`
- `AG20` = `INT(AE20/5)`

### 行 31
- `L31` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!M31,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!M31,D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!M31,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `T31` = `SUM(P31:S31)`
- `U31` = `INT(T31/2)`
- `V31` = `INT(T31/5)`
- `X31` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!Y31,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!Y31,人物卡!D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!Y31,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `AA31` = `IF(ISBLANK(E57),1,IF(Z31=E57,F57,1))`
- `AE31` = `AA31+AB31+AD31+AC31`
- `AF31` = `INT(AE31/2)`
- `AG31` = `INT(AE31/5)`

### 行 35
- `L35` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!M35,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!M35,D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!M35,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `P35` = `附表!C11`
- `T35` = `P35+Q35+R35+S35`
- `U35` = `INT(T35/2)`
- `V35` = `INT(T35/5)`
- `X35` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!Y35,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!Y35,人物卡!D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!Y35,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `AE35` = `SUM(AA35:AD35)`
- `AF35` = `INT(AE35/2)`
- `AG35` = `INT(AE35/5)`

### 行 49
- `L49` = `IF(ISTEXT(IFERROR(VLOOKUP(人物卡!M49,人物卡!G48:I52,1,FALSE),IFERROR(VLOOKUP(人物卡!M49,D48:F52,1,FALSE),0))),"★",INDEX(本职技能!$A$2:$HX$75,MATCH(人物卡!M49,本职技能!$A$2:$A$74,0),MATCH(人物卡!$P$5,本职技能!$A$1:$HX$1,0)))`
- `P49` = `AY5`
- `T49` = `P49+Q49+R49+S49`
- `U49` = `INT(T49/2)`
- `V49` = `INT(T49/5)`
- `AE49` = `SUM(AA49:AD49)`
- `AF49` = `INT(AE49/2)`
- `AG49` = `INT(AE49/5)`

## 4) 武器区公式模式（行 53-56）

### 行 53
- `P53` = `T34`
- `Q53` = `INT(P53/2)`
- `R53` = `INT(P53/5)`

### 行 54
- `N54` = `IF($M54=0,"←请选择类型",VLOOKUP($M54,武器列表!$B$2:$I$105,2,FALSE))`
- `P54` = `附表!AP15`
- `Q54` = `IF(P54="","",INT(P54/2))`
- `R54` = `IF(P54="","",INT(P54/5))`
- `S54` = `IF($M54=0,"",VLOOKUP($M54,武器列表!$B$2:$I$105,3,FALSE))`
- `U54` = `IF($M54=0,"",VLOOKUP($M54,武器列表!$B$2:$I$105,4,FALSE))`
- `W54` = `IF($M54=0,"",VLOOKUP($M54,武器列表!$B$2:$I$105,5,FALSE))`
- `X54` = `IF($M54=0,"",VLOOKUP($M54,武器列表!$B$2:$I$105,6,FALSE))`
- `Z54` = `IF($M54=0,"",VLOOKUP($M54,武器列表!$B$2:$I$105,7,FALSE))`
- `AB54` = `IF($M54=0,"",VLOOKUP($M54,武器列表!$B$2:$I$105,8,FALSE))`

### 行 55
- `N55` = `IF(N54="←请选择类型","",IF($M55=0,"←请选择类型",VLOOKUP($M55,武器列表!$B$2:$I$105,2,FALSE)))`
- `P55` = `附表!AP16`
- `Q55` = `IF(P55="","",INT(P55/2))`
- `R55` = `IF(P55="","",INT(P55/5))`
- `S55` = `IF($M55=0,"",VLOOKUP($M55,武器列表!$B$2:$I$105,3,FALSE))`
- `U55` = `IF($M55=0,"",VLOOKUP($M55,武器列表!$B$2:$I$105,4,FALSE))`
- `W55` = `IF($M55=0,"",VLOOKUP($M55,武器列表!$B$2:$I$105,5,FALSE))`
- `X55` = `IF($M55=0,"",VLOOKUP($M55,武器列表!$B$2:$I$105,6,FALSE))`
- `Z55` = `IF($M55=0,"",VLOOKUP($M55,武器列表!$B$2:$I$105,7,FALSE))`
- `AB55` = `IF($M55=0,"",VLOOKUP($M55,武器列表!$B$2:$I$105,8,FALSE))`

### 行 56
- `N56` = `IF(OR(N55="←请选择类型",N55=""),"",IF($M56=0,"←请选择类型",VLOOKUP($M56,武器列表!$B$2:$I$105,2,FALSE)))`
- `P56` = `附表!AP17`
- `Q56` = `IF(P56="","",INT(P56/2))`
- `R56` = `IF(P56="","",INT(P56/5))`
- `S56` = `IF($M56=0,"",VLOOKUP($M56,武器列表!$B$2:$I$105,3,FALSE))`
- `U56` = `IF($M56=0,"",VLOOKUP($M56,武器列表!$B$2:$I$105,4,FALSE))`
- `W56` = `IF($M56=0,"",VLOOKUP($M56,武器列表!$B$2:$I$105,5,FALSE))`
- `X56` = `IF($M56=0,"",VLOOKUP($M56,武器列表!$B$2:$I$105,6,FALSE))`
- `Z56` = `IF($M56=0,"",VLOOKUP($M56,武器列表!$B$2:$I$105,7,FALSE))`
- `AB56` = `IF($M56=0,"",VLOOKUP($M56,武器列表!$B$2:$I$105,8,FALSE))`

## 5) 导出实现建议（后续开发基线）

- 不覆盖有公式的单元格（例如 `AS3`、`M10`、`T26`、`AF52` 等）。
- 属性仅写输入位：`W/Z/AC` 列与 `V10` 幸运。
- 技能仅写分配点（`R/S/AC/AD`）与必要子类输入（如 `N34`、`N38`、`Z31`）。
- 武器优先写可选输入位（如 `M54:M56`），其余字段由模板公式从武器库表拉取。

