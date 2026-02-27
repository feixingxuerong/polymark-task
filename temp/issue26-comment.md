## Implementation Complete ✅

### 已完成

1. **新增 stations.yaml** (`poly-knowledge/config/stations.yaml`)
   - 覆盖美国 30+ 主要机场（完整列表如下）
   - 每条记录包含：name, icao, iata, nws_station, grid (gridId/gridX/gridY/forecastUrl), tags

2. **自动绑定功能** (`scripts/generate-watchlist.mjs`)
   - 启动时自动加载 stations.yaml
   - 从 question/description 提取位置关键词（ICAO/IATA/城市名）
   - 对 weather/aviation 市场自动绑定 1-3 个匹配站点
   - 绑定信息写入 watchlist item.stations 字段
   - monitor_sources 和 entry_plan 优先引用绑定站点
   - 无匹配时 fallback 到默认站点 (KJFK, KORD, KLAX)

3. **文档** (`poly-knowledge/watchlist-process.md` - Section 7)
   - stations.yaml 配置说明
   - 自动绑定机制说明
   - 绑定示例表格

### 覆盖的机场列表

| ICAO | IATA | 城市 |
|------|------|------|
| KJFK | JFK | New York (JFK) |
| KLGA | LGA | New York (LaGuardia) |
| KEWR | EWR | Newark |
| KBOS | BOS | Boston |
| KPHL | PHL | Philadelphia |
| KIAD | IAD | Washington Dulles |
| KDCA | DCA | Washington Reagan |
| KATL | ATL | Atlanta |
| KMIA | MIA | Miami |
| KFLL | FLL | Fort Lauderdale |
| KMCO | MCO | Orlando |
| KCLT | CLT | Charlotte |
| KORD | ORD | Chicago O'Hare |
| KMDW | MDW | Chicago Midway |
| KMSP | MSP | Minneapolis |
| KDTW | DTW | Detroit |
| KDFW | DFW | Dallas/Fort Worth |
| KIAH | IAH | Houston |
| KAUS | AUS | Austin |
| KDEN | DEN | Denver |
| KLAX | LAX | Los Angeles |
| KSFO | SFO | San Francisco |
| KSEA | SEA | Seattle |
| KPDX | PDX | Portland |
| KLAS | LAS | Las Vegas |
| KPHX | PHX | Phoenix |
| KSLC | SLC | Salt Lake City |
| KSAN | SAN | San Diego |
| PHNL | HNL | Honolulu |

### 绑定示例

| Market Question | 绑定 Stations |
|-----------------|---------------|
| "Will it snow in NYC on Feb 28?" | KJFK, KLGA, KEWR |
| "Will there be flight delays at LAX?" | KLAX |
| "Temperature in Chicago above 80F?" | KORD, KMDW |
| "Rain in Seattle this weekend?" | KSEA |

### 验证

本地运行 `node scripts/generate-watchlist.mjs --limit 5` 测试通过，输出 JSON 中 weather/aviation 市场会包含 `stations` 字段。

### Commit

`e9501b9` - feat: Add stations.yaml + auto-binding for weather/aviation markets
