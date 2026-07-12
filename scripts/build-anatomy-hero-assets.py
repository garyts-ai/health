from __future__ import annotations

from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image, ImageChops, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
SOURCE_DIR = ROOT / "src" / "assets" / "anatomy-hero-v2" / "source"
OUTPUT_DIR = ROOT / "public" / "images" / "anatomy-hero-v2" / "front"
MASTER_PATH = SOURCE_DIR / "front-master-alpha.png"
MASKS_PATH = SOURCE_DIR / "front-masks.svg"
HIT_PATHS_PATH = ROOT / "src" / "lib" / "anatomy-hero-hit-paths.ts"

SVG_NS = {"svg": "http://www.w3.org/2000/svg"}
LAYER_PRIORITY = [
    "side-delts-left", "side-delts-right",
    "front-delts-left", "front-delts-right",
    "chest-left", "chest-right",
    "biceps-left", "biceps-right",
    "forearms-left", "forearms-right",
    "triceps-left", "triceps-right",
    "lats-left", "lats-right",
    "abs", "adductors", "quads", "calves", "obliques",
]


def points(value: str) -> list[tuple[float, float]]:
    return [tuple(map(float, pair.split(","))) for pair in value.split()]


def load_masks(size: tuple[int, int]) -> dict[str, Image.Image]:
    root = ET.parse(MASKS_PATH).getroot()
    masks: dict[str, Image.Image] = {}
    for group in root.findall("svg:g", SVG_NS):
        layer_id = group.attrib["id"]
        mask = Image.new("L", size, 0)
        draw = ImageDraw.Draw(mask)
        for polygon in group.findall("svg:polygon", SVG_NS):
            draw.polygon(points(polygon.attrib["points"]), fill=255)
        masks[layer_id] = mask
    return masks


def partition_masks(masks: dict[str, Image.Image], size: tuple[int, int]) -> dict[str, Image.Image]:
    claimed = Image.new("L", size, 0)
    owned: dict[str, Image.Image] = {}
    for layer_id in LAYER_PRIORITY:
        candidate = masks[layer_id]
        owned[layer_id] = ImageChops.subtract(candidate, claimed)
        claimed = ImageChops.lighter(claimed, candidate)
    return owned


def overlap_pixels(left: Image.Image, right: Image.Image) -> int:
    overlap = ImageChops.multiply(left, right)
    return sum(overlap.histogram()[1:]) // 255


def nonzero_pixels(image: Image.Image) -> int:
    return sum(image.histogram()[1:])


def mask_boundary_path(mask: Image.Image) -> tuple[str, int]:
    """Trace the exact outside edges of a binary pixel mask into SVG subpaths."""
    bounds = mask.getbbox()
    if bounds is None:
        raise RuntimeError("Cannot trace an empty hit mask")
    x0, y0, x1, y1 = bounds
    pixels = mask.load()
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()

    def filled(x: int, y: int) -> bool:
        return 0 <= x < mask.width and 0 <= y < mask.height and pixels[x, y] > 0

    for y in range(y0, y1):
        for x in range(x0, x1):
            if not filled(x, y):
                continue
            if not filled(x, y - 1):
                edges.add(((x, y), (x + 1, y)))
            if not filled(x + 1, y):
                edges.add(((x + 1, y), (x + 1, y + 1)))
            if not filled(x, y + 1):
                edges.add(((x + 1, y + 1), (x, y + 1)))
            if not filled(x - 1, y):
                edges.add(((x, y + 1), (x, y)))

    outgoing: dict[tuple[int, int], set[tuple[int, int]]] = {}
    for start, end in edges:
        outgoing.setdefault(start, set()).add(end)

    direction_index = {(1, 0): 0, (0, 1): 1, (-1, 0): 2, (0, -1): 3}
    loops: list[list[tuple[int, int]]] = []
    remaining = set(edges)
    while remaining:
        start_edge = min(remaining)
        start, current = start_edge
        previous = start
        points = [start, current]
        remaining.remove(start_edge)
        while current != start:
            candidates = [end for end in outgoing.get(current, ()) if (current, end) in remaining]
            if not candidates:
                raise RuntimeError(f"Open contour at {current}")
            dx, dy = current[0] - previous[0], current[1] - previous[1]
            direction = direction_index[(dx, dy)]
            preference = [(direction + 1) % 4, direction, (direction - 1) % 4, (direction + 2) % 4]
            candidates.sort(key=lambda end: preference.index(direction_index[(end[0] - current[0], end[1] - current[1])]))
            next_point = candidates[0]
            remaining.remove((current, next_point))
            previous, current = current, next_point
            points.append(current)

        simplified: list[tuple[int, int]] = []
        for point in points[:-1]:
            if len(simplified) < 2:
                simplified.append(point)
                continue
            a, b = simplified[-2], simplified[-1]
            first = (b[0] - a[0], b[1] - a[1])
            second = (point[0] - b[0], point[1] - b[1])
            collinear = first[0] * second[1] == first[1] * second[0]
            same_direction = first[0] * second[0] + first[1] * second[1] > 0
            if collinear and same_direction:
                simplified[-1] = point
            else:
                simplified.append(point)
        loops.append(simplified)

    commands: list[str] = []
    signed_twice_area = 0
    for loop in loops:
        for index, point in enumerate(loop):
            next_point = loop[(index + 1) % len(loop)]
            signed_twice_area += point[0] * next_point[1] - next_point[0] * point[1]
        commands.append(f"M{loop[0][0]} {loop[0][1]}")
        previous = loop[0]
        for x, y in loop[1:]:
            if y == previous[1]:
                commands.append(f"H{x}")
            elif x == previous[0]:
                commands.append(f"V{y}")
            else:
                commands.append(f"L{x} {y}")
            previous = (x, y)
        commands.append("Z")
    traced_area = abs(signed_twice_area) // 2
    source_area = mask.histogram()[255]
    return "".join(commands), abs(traced_area - source_area)


def write_hit_paths(masks: dict[str, Image.Image], size: tuple[int, int]) -> int:
    width, height = size
    lines = [
        "// Generated by scripts/build-anatomy-hero-assets.py. Do not edit by hand.",
        f"export const ANATOMY_HERO_HIT_VIEWBOX = {{ width: {width}, height: {height} }} as const;",
        "",
        "export const ANATOMY_HERO_HIT_PATHS = {",
    ]
    area_error = 0
    for layer_id in LAYER_PRIORITY:
        hit_path, layer_area_error = mask_boundary_path(masks[layer_id])
        area_error += layer_area_error
        lines.append(f'  "{layer_id}": "{hit_path}",')
    lines.extend([
        "} as const;",
        "",
        "export type AnatomyHeroHitLayerId = keyof typeof ANATOMY_HERO_HIT_PATHS;",
        "",
    ])
    HIT_PATHS_PATH.write_text("\n".join(lines), encoding="utf-8")
    return area_error


def crop_and_save(layer: Image.Image, name: str, padding: int = 6) -> tuple[int, int, int, int]:
    alpha = layer.getchannel("A")
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"Layer {name} is empty")
    x0, y0, x1, y1 = bounds
    bounds = (
        max(0, x0 - padding),
        max(0, y0 - padding),
        min(layer.width, x1 + padding),
        min(layer.height, y1 + padding),
    )
    cropped = layer.crop(bounds)
    cropped.save(OUTPUT_DIR / f"{name}-v3.webp", "WEBP", quality=88, method=6, exact=True)
    return bounds


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for stale_asset in OUTPUT_DIR.glob("*-v3.webp"):
        stale_asset.unlink()
    master = Image.open(MASTER_PATH).convert("RGBA")
    source_alpha = master.getchannel("A").point(lambda value: 0 if value < 16 else value)
    master.putalpha(source_alpha)
    source_masks = load_masks(master.size)
    source_claimed = Image.new("L", master.size, 0)
    source_candidate_overlap = 0
    for layer_id in LAYER_PRIORITY:
        source_candidate_overlap += overlap_pixels(source_claimed, source_masks[layer_id])
        source_claimed = ImageChops.lighter(source_claimed, source_masks[layer_id])
    masks = partition_masks(source_masks, master.size)
    claimed_for_audit = Image.new("L", master.size, 0)
    interactive_pair_overlap = 0
    for layer_id in LAYER_PRIORITY:
        layer_overlap = overlap_pixels(claimed_for_audit, masks[layer_id])
        interactive_pair_overlap += layer_overlap
        if layer_overlap:
            raise RuntimeError(f"Interactive layer overlap remains in {layer_id}")
        claimed_for_audit = ImageChops.lighter(claimed_for_audit, masks[layer_id])

    combined = Image.new("L", master.size, 0)
    for mask in masks.values():
        combined = ImageChops.lighter(combined, mask)

    base_alpha = ImageChops.subtract(source_alpha, combined)
    base = master.copy()
    base.putalpha(base_alpha)

    base_interactive_overlap = overlap_pixels(base_alpha, combined)
    reconstructed = ImageChops.lighter(base_alpha, ImageChops.multiply(source_alpha, combined))
    reconstruction_error = nonzero_pixels(ImageChops.difference(source_alpha, reconstructed))
    if base_interactive_overlap or reconstruction_error:
        raise RuntimeError("Layer partition does not reconstruct the source alpha exactly")

    manifest_lines: list[str] = []
    output_bounds: dict[str, tuple[int, int, int, int]] = {}
    output_bounds["base_body"] = crop_and_save(base, "base_body")
    manifest_lines.append(f"base_body={output_bounds['base_body']}")

    for layer_id, mask in masks.items():
        layer = master.copy()
        layer.putalpha(ImageChops.multiply(source_alpha, mask))
        output_bounds[layer_id] = crop_and_save(layer, layer_id)
        manifest_lines.append(f"{layer_id}={output_bounds[layer_id]}")

    (SOURCE_DIR / "front-layer-bounds.txt").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")
    hit_path_area_error = write_hit_paths(masks, master.size)
    if hit_path_area_error:
        raise RuntimeError("Generated hit paths do not match the partition masks")

    asset_files = sorted(OUTPUT_DIR.glob("*-v3.webp"))
    encoded_alphas: dict[str, Image.Image] = {}
    for layer_id, bounds in output_bounds.items():
        encoded = Image.open(OUTPUT_DIR / f"{layer_id}-v3.webp").convert("RGBA").getchannel("A")
        full_alpha = Image.new("L", master.size, 0)
        full_alpha.paste(encoded, (bounds[0], bounds[1]))
        encoded_alphas[layer_id] = full_alpha

    encoded_combined = Image.new("L", master.size, 0)
    encoded_interactive_overlap = 0
    for layer_id in LAYER_PRIORITY:
        encoded_interactive_overlap += overlap_pixels(encoded_combined, encoded_alphas[layer_id])
        encoded_combined = ImageChops.lighter(encoded_combined, encoded_alphas[layer_id])
    encoded_base_overlap = overlap_pixels(encoded_alphas["base_body"], encoded_combined)
    encoded_reconstruction = ImageChops.lighter(encoded_alphas["base_body"], encoded_combined)
    encoded_reconstruction_error = nonzero_pixels(ImageChops.difference(source_alpha, encoded_reconstruction))
    if encoded_interactive_overlap or encoded_base_overlap or encoded_reconstruction_error:
        raise RuntimeError("Encoded WebP alpha does not preserve the authored partition")

    report = [
        f"interactive_layers={len(LAYER_PRIORITY)}",
        f"mounted_visual_layers={1 + len(LAYER_PRIORITY)}",
        f"source_candidate_overlap_pixels={source_candidate_overlap}",
        f"interactive_overlap_pixels={interactive_pair_overlap}",
        f"base_interactive_overlap_pixels={base_interactive_overlap}",
        f"reconstruction_error_pixels={reconstruction_error}",
        f"hit_path_area_error_pixels={hit_path_area_error}",
        f"encoded_interactive_overlap_pixels={encoded_interactive_overlap}",
        f"encoded_base_interactive_overlap_pixels={encoded_base_overlap}",
        f"encoded_reconstruction_error_pixels={encoded_reconstruction_error}",
        f"output_asset_count={len(asset_files)}",
        f"output_asset_bytes={sum(path.stat().st_size for path in asset_files)}",
    ]
    (SOURCE_DIR / "front-overlap-report.txt").write_text(
        f"interactive_overlap_pixels={interactive_pair_overlap}\n",
        encoding="utf-8",
    )
    (SOURCE_DIR / "front-alpha-audit.txt").write_text("\n".join(report) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
