# Worklog

## 2026-05-17

当前项目已经从空目录初始化为“基于 GIS 的工程测绘点位可视化系统”开源 Demo。

已完成：

- `README.md`：开源项目说明、快速启动、数据字段、GitHub 发布建议。
- `README.md`：已把项目描述改成更自然的作品集说明，弱化模板化语气。
- `docs/project-plan.md`：完整项目任务书。
- `docs/demo-flow.md`：施工/测量岗适配的演示流程。
- `docs/deployment.md`：本地、局域网、Nginx 和数据转换部署说明。
- `docs/map-sources.md`：国内底图源、天地图模板和坐标偏移说明。
- `frontend/index.html`：OpenLayers 单页 Demo。
- `frontend/src/styles.css`：施工测绘工作台样式。
- `frontend/src/app.js`：地图、测点、导入、导出、范围绘制、状态筛选等交互逻辑。
- `frontend/src/app.js`：已新增高德底图 WGS84 ⇄ GCJ-02 显示纠偏，避免国内底图点位偏移。
- `frontend/src/app.js`：已新增地名搜索跳转、经纬度跳转和浏览器当前位置定位。
- `frontend/data/sample_points.csv` 与 `frontend/data/sample_points.json`：示例测点数据。
- `scripts/survey_data_converter.py`：CSV/Excel 到 JSON/GeoJSON 的数据转换脚本。
- `requirements.txt`、`.gitignore`、`LICENSE`、`assets/README.md`。

后续恢复规则：

- 重连后先读取本文件、`git status --short` 和现有文件列表。
- 继续增量修改现有文件，不删除、不清空、不重新生成整个项目。
- 不使用 `git reset --hard`、`git checkout --` 或任何会丢弃进度的命令，除非用户明确要求。
- 如果发现用户或上一次会话已有改动，先保留并顺着现状继续。
