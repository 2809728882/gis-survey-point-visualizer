# 基于 GIS 的工程测绘点位可视化系统

这是一个围绕施工测量场景做的 GIS 点位可视化 Demo。项目主要解决一个比较常见的问题：外业测到的控制点、放样点和监测点通常散在表格里，不方便现场快速查看位置和状态，所以我用 OpenLayers 做了一个浏览器端的小工具，把测点、施工范围、底图和进度状态集中展示出来。

## 为什么做这个项目

施工现场测量数据经常需要在 CAD、Excel、RTK 手簿和现场人员之间来回传递。这个项目想做一个轻量一点的入口：把 CSV/Excel 里的测点转成前端能加载的数据，然后在地图上按状态显示出来，方便看点位、查坐标、圈范围和模拟进度核查。

当前版本更偏演示和作品集展示，重点放在完整流程：数据整理、地图展示、坐标处理、国内底图适配和本地部署。

## 核心功能

- 二维工程地图：显示施工场地边界、测点、范围圈和影像底图。
- 测点标注：支持地图点击新增测点、CSV/JSON 导入测点。
- 坐标定位：点击点位查看编号、经纬度、施工坐标、高程和状态。
- 地名与当前位置定位：支持地名搜索跳转、经纬度输入跳转和浏览器当前位置定位。
- 范围圈定：支持圆形和多边形施工区域绘制。
- 影像叠加：支持高德国内底图、OpenStreetMap、Esri 卫星影像、地形图切换。
- 施工进度：按状态区分待放样、复核中、已完成、风险点。
- 数据处理：Python 脚本批量读取 CSV/Excel，完成字段清洗和坐标转换。
- 轻量部署：支持本地静态运行，也支持 Python HTTP 服务或 Nginx 部署。

## 快速开始

直接打开前端页面：

```powershell
start .\frontend\index.html
```

或启动本地静态服务：

```powershell
python -m http.server 8000 -d frontend
```

浏览器访问：

```text
http://localhost:8000
```

转换外业数据：

```powershell
python .\scripts\survey_data_converter.py `
  --input .\frontend\data\sample_points.csv `
  --output .\frontend\data\converted_points.json `
  --origin-lon 121.2302 `
  --origin-lat 31.0252
```

## 目录结构

```text
.
├── README.md
├── LICENSE
├── docs
│   ├── deployment.md
│   └── project-plan.md
├── frontend
│   ├── index.html
│   ├── data
│   │   ├── sample_points.csv
│   │   └── sample_points.json
│   └── src
│       ├── app.js
│       └── styles.css
├── scripts
│   └── survey_data_converter.py
└── requirements.txt
```

## 数据字段

前端导入 CSV/JSON 时优先识别以下字段：

| 字段 | 说明 | 示例 |
| --- | --- | --- |
| id / 编号 / 点号 | 测点编号 | CP-001 |
| name / 名称 | 测点名称 | 北侧控制点 |
| lon / lng / 经度 | WGS84 经度 | 121.23065 |
| lat / 纬度 | WGS84 纬度 | 31.02551 |
| x / local_x / 东坐标 | 施工局部 X 坐标，单位米 | 45.2 |
| y / local_y / 北坐标 | 施工局部 Y 坐标，单位米 | 18.6 |
| elevation / h / 高程 | 高程，单位米 | 8.35 |
| status / 状态 | pending / checking / done / risk | pending |
| note / 备注 | 现场备注 | 待放样 |

如果只有局部施工坐标 `x/y`，前端和 Python 脚本会以工程原点进行近似转换；正式项目应接入 EPSG 坐标系、七参数或项目独立坐标转换参数。

国内互联网环境下，Demo 默认使用高德标准底图，并已在前端对高德底图执行 WGS84 ⇄ GCJ-02 显示纠偏。高德、腾讯等国内互联网地图通常存在 GCJ-02 坐标偏移，测绘成果若为 CGCS2000 或地方施工坐标，正式叠加前仍需根据项目参数做坐标转换。详见 `docs/map-sources.md`。

## 后续路线

- 接入 GeoJSON、DXF、KML、SHP 等工程数据格式。
- 增加 EPSG 坐标系选择和七参数转换。
- 将地名搜索服务替换为高德、天地图或企业内网地理编码服务。
- 增加无人机正射影像本地瓦片加载。
- 增加点位版本、复测记录和误差统计。
- 增加现场移动端定位与离线缓存。
- 增加用户权限、项目分区和施工日志。
