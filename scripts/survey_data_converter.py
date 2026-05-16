#!/usr/bin/env python3
"""Convert construction survey CSV/Excel data into frontend-ready JSON."""

from __future__ import annotations

import argparse
import csv
import json
import math
import sys
from pathlib import Path
from typing import Any, Iterable


DEFAULT_ORIGIN_LON = 121.2302
DEFAULT_ORIGIN_LAT = 31.0252

FIELD_ALIASES = {
    "id": ["id", "point_id", "point", "code", "编号", "点号", "点位编号"],
    "name": ["name", "title", "名称", "点名", "点位名称"],
    "lon": ["lon", "lng", "longitude", "经度", "东经", "wgs84_lon"],
    "lat": ["lat", "latitude", "纬度", "北纬", "wgs84_lat"],
    "x": ["x", "local_x", "easting", "east", "东坐标", "施工x", "施工X"],
    "y": ["y", "local_y", "northing", "north", "北坐标", "施工y", "施工Y"],
    "elevation": ["elevation", "height", "h", "z", "高程", "标高"],
    "status": ["status", "state", "progress", "状态", "施工状态"],
    "note": ["note", "remark", "remarks", "备注", "说明"],
}

STATUS_MAP = {
    "done": "done",
    "complete": "done",
    "completed": "done",
    "finish": "done",
    "finished": "done",
    "已完成": "done",
    "完成": "done",
    "checking": "checking",
    "review": "checking",
    "recheck": "checking",
    "复核中": "checking",
    "复测": "checking",
    "检查": "checking",
    "risk": "risk",
    "danger": "risk",
    "warning": "risk",
    "隐患": "risk",
    "风险": "risk",
    "风险点": "risk",
    "pending": "pending",
    "todo": "pending",
    "待放样": "pending",
    "待施工": "pending",
    "未完成": "pending",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert GNSS/RTK/total-station CSV or Excel data into JSON for the OpenLayers demo."
    )
    parser.add_argument("--input", "-i", required=True, help="Input CSV/XLSX/XLS file path.")
    parser.add_argument("--output", "-o", required=True, help="Output JSON file path.")
    parser.add_argument("--sheet", default=None, help="Excel sheet name or zero-based index. Defaults to first sheet.")
    parser.add_argument("--origin-lon", type=float, default=DEFAULT_ORIGIN_LON, help="Project origin longitude.")
    parser.add_argument("--origin-lat", type=float, default=DEFAULT_ORIGIN_LAT, help="Project origin latitude.")
    parser.add_argument("--src-crs", default=None, help="Optional source CRS, for example EPSG:4547.")
    parser.add_argument("--dst-crs", default="EPSG:4326", help="Destination CRS. Defaults to EPSG:4326.")
    parser.add_argument(
        "--geojson",
        action="store_true",
        help="Write GeoJSON FeatureCollection instead of plain point array.",
    )
    return parser.parse_args()


def load_rows(path: Path, sheet: str | None) -> list[dict[str, Any]]:
    suffix = path.suffix.lower()
    if suffix == ".csv":
        return load_csv(path)

    if suffix in {".xlsx", ".xls"}:
        return load_excel(path, sheet)

    raise ValueError(f"Unsupported input format: {suffix}")


def load_csv(path: Path) -> list[dict[str, Any]]:
    try:
        import pandas as pd  # type: ignore
    except ImportError:
        with path.open("r", encoding="utf-8-sig", newline="") as handle:
            return [dict(row) for row in csv.DictReader(handle)]

    frame = pd.read_csv(path, encoding="utf-8-sig")
    return dataframe_to_rows(frame)


def load_excel(path: Path, sheet: str | None) -> list[dict[str, Any]]:
    try:
        import pandas as pd  # type: ignore
    except ImportError as exc:
        raise RuntimeError("Excel input requires pandas and openpyxl. Run: pip install -r requirements.txt") from exc

    sheet_name: int | str = 0
    if sheet is not None:
        sheet_name = int(sheet) if sheet.isdigit() else sheet

    frame = pd.read_excel(path, sheet_name=sheet_name)
    return dataframe_to_rows(frame)


def dataframe_to_rows(frame: Any) -> list[dict[str, Any]]:
    frame = frame.where(frame.notna(), "")
    return frame.to_dict(orient="records")


def normalize_key(value: str) -> str:
    return str(value).strip().lower()


def read_value(row: dict[str, Any], field: str) -> Any:
    normalized = {normalize_key(key): value for key, value in row.items()}
    for alias in FIELD_ALIASES[field]:
        if alias in row:
            return row[alias]
        key = normalize_key(alias)
        if key in normalized:
            return normalized[key]
    return ""


def parse_number(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        number = float(text.replace(",", ""))
    except ValueError:
        return None
    return number if math.isfinite(number) else None


def normalize_status(value: Any) -> str:
    text = str(value or "").strip().lower()
    return STATUS_MAP.get(text, "pending")


def local_to_lonlat(x: float, y: float, origin_lon: float, origin_lat: float) -> tuple[float, float]:
    lat = origin_lat + y / 110540
    lon = origin_lon + x / (111320 * math.cos(math.radians(origin_lat)))
    return lon, lat


def build_transformer(src_crs: str | None, dst_crs: str):
    if not src_crs:
        return None
    try:
        from pyproj import Transformer  # type: ignore
    except ImportError as exc:
        raise RuntimeError("CRS conversion requires pyproj. Run: pip install -r requirements.txt") from exc
    return Transformer.from_crs(src_crs, dst_crs, always_xy=True)


def convert_rows(rows: Iterable[dict[str, Any]], args: argparse.Namespace) -> tuple[list[dict[str, Any]], list[str]]:
    transformer = build_transformer(args.src_crs, args.dst_crs)
    points: list[dict[str, Any]] = []
    warnings: list[str] = []

    for index, row in enumerate(rows, start=1):
        point_id = clean_text(read_value(row, "id")) or f"P-{index:03d}"
        name = clean_text(read_value(row, "name")) or point_id
        lon = parse_number(read_value(row, "lon"))
        lat = parse_number(read_value(row, "lat"))
        x = parse_number(read_value(row, "x"))
        y = parse_number(read_value(row, "y"))
        elevation = parse_number(read_value(row, "elevation"))

        if (lon is None or lat is None) and x is not None and y is not None:
            if transformer:
                lon, lat = transformer.transform(x, y)
            else:
                lon, lat = local_to_lonlat(x, y, args.origin_lon, args.origin_lat)

        if lon is None or lat is None:
            warnings.append(f"Row {index}: skipped because coordinate fields are missing.")
            continue

        points.append(
            {
                "id": point_id,
                "name": name,
                "lon": round(float(lon), 7),
                "lat": round(float(lat), 7),
                "x": round(float(x), 3) if x is not None else None,
                "y": round(float(y), 3) if y is not None else None,
                "elevation": round(float(elevation), 3) if elevation is not None else None,
                "status": normalize_status(read_value(row, "status")),
                "note": clean_text(read_value(row, "note")),
                "source_row": index,
            }
        )

    return points, warnings


def clean_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def as_geojson(points: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [point["lon"], point["lat"]],
                },
                "properties": {
                    key: value
                    for key, value in point.items()
                    if key not in {"lon", "lat"}
                },
            }
            for point in points
        ],
    }


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    args = parse_args()
    input_path = Path(args.input)
    output_path = Path(args.output)

    if not input_path.exists():
        print(f"Input file does not exist: {input_path}", file=sys.stderr)
        return 2

    try:
        rows = load_rows(input_path, args.sheet)
        points, warnings = convert_rows(rows, args)
        payload = as_geojson(points) if args.geojson else points
        write_json(output_path, payload)
    except Exception as exc:
        print(f"Conversion failed: {exc}", file=sys.stderr)
        return 1

    for warning in warnings:
        print(f"Warning: {warning}", file=sys.stderr)
    print(f"Converted {len(points)} point(s) -> {output_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

