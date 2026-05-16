# 国内底图源说明

## 已接入源

前端 Demo 已接入以下底图：

| 名称 | 用途 | 说明 |
| --- | --- | --- |
| 高德标准（国内） | 默认底图 | 国内网络访问通常更稳定 |
| 高德影像（国内） | 影像参考 | 可用于施工现场环境观察 |
| OpenStreetMap | 开源地图 | 国际网络环境下适合演示 |
| Esri 卫星影像 | 影像参考 | 适合展示影像叠加能力 |
| OpenTopoMap | 地形参考 | 适合地形背景演示 |

## 高德瓦片配置

代码位置：`frontend/src/app.js`

```javascript
amap: new ol.layer.Tile({
  visible: true,
  source: new ol.source.XYZ({
    urls: tileUrls(
      "https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}",
      ["1", "2", "3", "4"]
    ),
    attributions: "© 高德地图",
    crossOrigin: "anonymous",
  }),
})
```

高德影像：

```javascript
amapImagery: new ol.layer.Tile({
  visible: false,
  source: new ol.source.XYZ({
    urls: tileUrls(
      "https://webst0{s}.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}",
      ["1", "2", "3", "4"]
    ),
    attributions: "© 高德地图",
    crossOrigin: "anonymous",
  }),
})
```

## 天地图 WMTS 模板

天地图正式使用需要申请 `tk`。拿到 token 后可按下面方式接入：

```javascript
const tiandituToken = "你的天地图tk";

const tiandituVec = new ol.layer.Tile({
  visible: false,
  source: new ol.source.XYZ({
    url: `https://t0.tianditu.gov.cn/vec_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=vec&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituToken}`,
    attributions: "© 天地图",
  }),
});

const tiandituCva = new ol.layer.Tile({
  visible: false,
  source: new ol.source.XYZ({
    url: `https://t0.tianditu.gov.cn/cva_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=cva&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${tiandituToken}`,
    attributions: "© 天地图",
  }),
});
```

## 坐标注意事项

施工测绘成果常见坐标来源：

- WGS84：GNSS 常见输出。
- CGCS2000：国内测绘常用坐标基准。
- 地方独立坐标系：施工项目常用。
- Web Mercator：网页地图瓦片显示投影。
- GCJ-02：高德、腾讯等国内互联网地图常用偏移坐标。

如果直接把 WGS84 或 CGCS2000 点位叠加到高德底图上，可能出现可见偏移。正式工程项目建议：

- 明确外业数据坐标基准。
- 使用项目给定转换参数或 EPSG 坐标系转换。
- 如需叠加高德/腾讯底图，增加 WGS84/CGCS2000 与 GCJ-02 的转换步骤。
- 对施工放样成果不要只依赖互联网底图，应以控制网和施工坐标成果为准。

## Demo 中的纠偏策略

当前 Demo 已在前端做了高德底图纠偏：

- 数据导入、导出和清单中仍保存 WGS84 经纬度。
- 当前底图为高德标准或高德影像时，点位和施工边界显示前执行 WGS84 → GCJ-02。
- 在高德底图上点击新增点位时，点击位置会先执行 GCJ-02 → WGS84，再写入点位数据。
- 切换高德与非高德底图时，地图中心、点位、施工边界和已绘制范围会同步转换。

这样可以避免为了适配高德底图而污染原始测绘成果。

## 地名搜索服务

当前 Demo 的地名搜索使用 OpenStreetMap Nominatim 公共接口，坐标输入跳转不依赖外部服务。

生产环境建议替换为以下之一：

- 高德地理编码服务。
- 天地图地名搜索服务。
- 企业内网 GIS 地名库。
- 项目自建地址/桩号/工点索引服务。

如果替换为高德或腾讯地理编码，返回坐标通常需要按服务文档确认是否为 GCJ-02；当前 Demo 的搜索入口以 WGS84 写入地图定位，再根据底图显示纠偏。
