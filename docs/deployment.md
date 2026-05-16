# 部署说明

## 1. 直接本地打开

适合课堂演示、作品集展示和无后端 Demo。

```powershell
start .\frontend\index.html
```

说明：

- 地图瓦片和 OpenLayers CDN 需要网络。
- Demo 默认使用高德标准底图，国内网络下通常比 OSM 更容易访问。
- CSV/JSON 导入通过浏览器本地文件读取完成，不需要服务器。
- 内置示例数据在 `frontend/src/app.js` 中，避免 `file://` 读取跨域问题。

## 2. Python 静态服务

适合局域网演示或移动设备访问同一电脑上的 Demo。

```powershell
python -m http.server 8000 -d frontend
```

访问：

```text
http://localhost:8000
```

同一局域网设备可访问：

```text
http://<电脑局域网IP>:8000
```

## 3. Nginx 部署

将 `frontend/` 目录上传到服务器，例如 `/var/www/gis-survey-point-visualizer`。

```nginx
server {
    listen 80;
    server_name example.com;

    root /var/www/gis-survey-point-visualizer;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 4. 数据转换环境

安装依赖：

```powershell
pip install -r requirements.txt
```

CSV 转 JSON：

```powershell
python .\scripts\survey_data_converter.py `
  --input .\frontend\data\sample_points.csv `
  --output .\frontend\data\converted_points.json `
  --origin-lon 121.2302 `
  --origin-lat 31.0252
```

Excel 转 JSON：

```powershell
python .\scripts\survey_data_converter.py `
  --input .\data\field_points.xlsx `
  --output .\frontend\data\field_points.json `
  --origin-lon 121.2302 `
  --origin-lat 31.0252
```

## 5. 正射影像接入建议

正式项目中，无人机正射影像建议处理为瓦片服务：

- 使用 QGIS 或 GDAL 将 GeoTIFF 切片为 XYZ 瓦片。
- 将瓦片目录部署到静态服务器。
- 在 OpenLayers 中增加 `ol.source.XYZ` 图层。
- 保证影像坐标系与项目点位坐标系一致。

示例图层入口：

```javascript
new ol.layer.Tile({
  source: new ol.source.XYZ({
    url: "./orthophoto_tiles/{z}/{x}/{y}.png"
  })
})
```

## 6. 国内底图源

当前前端已内置：

- 高德标准图：`webrd01-04.is.autonavi.com`
- 高德影像图：`webst01-04.is.autonavi.com`
- OpenStreetMap
- Esri World Imagery
- OpenTopoMap

生产环境建议优先使用已授权的天地图、高德、腾讯或自建瓦片服务。天地图正式调用需要申请 `tk`，可参考 `docs/map-sources.md` 中的 WMTS 模板。
