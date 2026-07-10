import { Fragment, type CSSProperties } from "react";
import Image from "next/image";

import { ANATOMY_REGION_IDS, anatomyRegionView } from "@/lib/anatomy-regions";
import type { BodyHighlight, BodyHighlightIntensity, BodyRegionId } from "@/lib/insights/types";

export type AnatomyFigureProps = {
  highlights?: BodyHighlight[];
  weeklyHighlights?: BodyHighlight[];
  latestHighlights?: BodyHighlight[];
  className?: string;
  mode?: "svg" | "instrument";
  assetStyle?: "clinical" | "biomech";
  motionMode?: "static" | "charged";
  preload?: boolean;
  view?: "front" | "back" | "both";
};

export type AnatomyFigureImageLayer = {
  svg: string;
  opacity?: number;
  filter?: string;
};

type PlateStyle = CSSProperties & Record<`--${string}`, string | number>;

type RegionTreatment = {
  chargeX: number;
  chargeY: number;
  fill: number;
  glow: number;
};

const CANVAS_WIDTH = 1240;
const CANVAS_HEIGHT = 1040;
const BIOMECH_ASSET_FRONT = "/images/anatomy-biomech-front.png";
const BIOMECH_ASSET_BACK = "/images/anatomy-biomech-back.png";

const INTENSITY_WEIGHT: Record<BodyHighlightIntensity, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

const INTENSITY_COLOR: Record<BodyHighlightIntensity, string> = {
  low: "#8a5cff",
  medium: "#ffb02e",
  high: "#f04cff",
};

const REGION_ASSEMBLY_ORDER: BodyRegionId[] = [...ANATOMY_REGION_IDS];

const REGION_TREATMENT: Record<BodyRegionId, RegionTreatment> = {
  chest: { chargeX: 0, chargeY: -7, fill: 0.3, glow: 1.08 },
  frontDelts: { chargeX: 7, chargeY: -3, fill: 0.24, glow: 0.9 },
  sideDelts: { chargeX: 9, chargeY: 0, fill: 0.2, glow: 0.82 },
  rearDelts: { chargeX: 8, chargeY: -3, fill: 0.22, glow: 0.88 },
  biceps: { chargeX: 5, chargeY: -2, fill: 0.18, glow: 0.72 },
  triceps: { chargeX: 5, chargeY: -2, fill: 0.18, glow: 0.72 },
  forearms: { chargeX: 4, chargeY: 5, fill: 0.14, glow: 0.62 },
  lats: { chargeX: 8, chargeY: 2, fill: 0.22, glow: 0.94 },
  upperBack: { chargeX: 0, chargeY: -6, fill: 0.2, glow: 0.92 },
  traps: { chargeX: 0, chargeY: -8, fill: 0.18, glow: 0.84 },
  abs: { chargeX: 0, chargeY: -6, fill: 0.16, glow: 0.7 },
  obliques: { chargeX: 6, chargeY: 1, fill: 0.15, glow: 0.68 },
  glutes: { chargeX: 4, chargeY: -3, fill: 0.24, glow: 1 },
  quads: { chargeX: 0, chargeY: -9, fill: 0.22, glow: 0.9 },
  adductors: { chargeX: 0, chargeY: -8, fill: 0.14, glow: 0.65 },
  hamstrings: { chargeX: 0, chargeY: -9, fill: 0.2, glow: 0.86 },
  calves: { chargeX: 0, chargeY: -8, fill: 0.16, glow: 0.72 },
};

const REGION_PLATES: Record<BodyRegionId, string[]> = {
  chest: [
    "M206 210 L260 179 L303 197 L292 274 L235 276 L203 244 Z",
    "M414 210 L360 179 L317 197 L328 274 L385 276 L417 244 Z",
    "M245 286 L302 287 L292 319 L253 326 L226 305 Z",
    "M375 286 L318 287 L328 319 L367 326 L394 305 Z",
  ],
  frontDelts: [
    "M158 178 L207 165 L237 196 L221 244 L175 254 L148 223 Z",
    "M462 178 L413 165 L383 196 L399 244 L445 254 L472 223 Z",
  ],
  sideDelts: [
    "M136 209 C144 194 156 185 170 184 L180 211 L171 249 L148 272 L135 249 Z",
    "M484 209 C476 194 464 185 450 184 L440 211 L449 249 L472 272 L485 249 Z",
  ],
  rearDelts: [
    "M756 184 C777 170 803 164 828 167 L838 203 L822 236 L790 257 L758 232 Z",
    "M1104 184 C1083 170 1057 164 1032 167 L1022 203 L1038 236 L1070 257 L1102 232 Z",
  ],
  biceps: [
    "M136 286 L170 280 L181 326 L169 355 L142 363 L129 334 Z",
    "M141 369 L169 360 L184 383 L158 423 L133 405 L126 383 Z",
    "M484 286 L450 280 L439 326 L451 355 L478 363 L491 334 Z",
    "M479 369 L451 360 L436 383 L462 423 L487 405 L494 383 Z",
  ],
  triceps: [
    "M754 282 L788 272 L800 329 L787 359 L760 365 L747 332 Z",
    "M758 369 L787 363 L803 386 L778 425 L752 405 L746 383 Z",
    "M1106 282 L1072 272 L1060 329 L1073 359 L1100 365 L1113 332 Z",
    "M1102 369 L1073 363 L1057 386 L1082 425 L1108 405 L1114 383 Z",
  ],
  forearms: [
    "M121 426 L145 425 L154 493 L139 552 L118 531 L111 479 Z",
    "M149 431 L161 448 L168 535 L143 590 L136 554 L155 493 Z",
    "M499 426 L475 425 L466 493 L481 552 L502 531 L509 479 Z",
    "M471 431 L459 448 L452 535 L477 590 L484 554 L465 493 Z",
    "M737 419 L762 418 L771 493 L757 550 L736 529 L730 474 Z",
    "M766 424 L779 444 L790 536 L764 591 L756 550 L772 493 Z",
    "M1123 419 L1098 418 L1089 493 L1103 550 L1124 529 L1130 474 Z",
    "M1094 424 L1081 444 L1070 536 L1096 591 L1104 550 L1088 493 Z",
  ],
  lats: [
    "M798 254 C818 234 838 221 862 214 L884 252 L875 345 L840 397 L808 365 Z",
    "M810 377 L842 407 L858 461 L841 505 L809 466 L795 405 Z",
    "M1062 254 C1042 234 1022 221 998 214 L976 252 L985 345 L1020 397 L1052 365 Z",
    "M1050 377 L1018 407 L1002 461 L1019 505 L1051 466 L1065 405 Z",
  ],
  upperBack: [
    "M840 197 L918 184 L914 392 L858 405 L832 280 Z",
    "M1020 197 L942 184 L946 392 L1002 405 L1028 280 Z",
    "M902 246 L930 232 L958 246 L947 410 L913 410 Z",
  ],
  traps: [
    "M842 139 L914 148 L929 190 L834 184 Z",
    "M1018 139 L946 148 L931 190 L1026 184 Z",
    "M906 134 L954 134 L943 240 L917 240 Z",
  ],
  abs: [
    "M267 292 L303 286 L302 344 L276 359 L258 337 Z",
    "M353 292 L317 286 L318 344 L344 359 L362 337 Z",
    "M274 365 L303 351 L302 410 L279 426 L263 401 Z",
    "M346 365 L317 351 L318 410 L341 426 L357 401 Z",
    "M280 432 L303 417 L302 480 L282 510 L267 477 Z",
    "M340 432 L317 417 L318 480 L338 510 L353 477 Z",
  ],
  obliques: [
    "M222 301 L258 291 L262 368 L237 389 L211 368 L204 329 Z",
    "M237 397 L262 379 L263 468 L228 496 L210 443 Z",
    "M398 301 L362 291 L358 368 L383 389 L409 368 L416 329 Z",
    "M383 397 L358 379 L357 468 L392 496 L410 443 Z",
  ],
  glutes: [
    "M808 500 C832 476 884 471 917 496 C921 520 907 548 879 560 L850 554 C822 544 808 524 808 500 Z",
    "M814 533 C836 552 868 559 904 548 C920 566 904 596 864 607 C829 602 808 572 814 533 Z",
    "M1052 500 C1028 476 976 471 943 496 C939 520 953 548 981 560 L1010 554 C1038 544 1052 524 1052 500 Z",
    "M1046 533 C1024 552 992 559 956 548 C940 566 956 596 996 607 C1031 602 1052 572 1046 533 Z",
  ],
  quads: [
    "M217 541 C236 530 262 530 282 540 L277 620 L260 688 L237 730 L211 681 L204 610 Z",
    "M283 541 L305 551 L302 690 L278 755 L265 700 L277 620 Z",
    "M403 541 C384 530 358 530 338 540 L343 620 L360 688 L383 730 L409 681 L416 610 Z",
    "M337 541 L315 551 L318 690 L342 755 L355 700 L343 620 Z",
  ],
  adductors: [
    "M286 543 L308 549 L304 754 L278 762 Z",
    "M334 543 L312 549 L316 754 L342 762 Z",
  ],
  hamstrings: [
    "M805 610 C826 600 850 598 871 606 L861 690 L838 758 L812 779 L794 703 Z",
    "M875 610 L901 622 L891 704 L865 779 L849 752 L862 688 Z",
    "M1055 610 C1034 600 1010 598 989 606 L999 690 L1022 758 L1048 779 L1066 703 Z",
    "M985 610 L959 622 L969 704 L995 779 L1011 752 L998 688 Z",
  ],
  calves: [
    "M216 778 L251 776 L248 865 L229 939 L207 914 L200 850 Z",
    "M255 781 L275 798 L265 950 L231 986 L228 942 L250 864 Z",
    "M404 778 L369 776 L372 865 L391 939 L413 914 L420 850 Z",
    "M365 781 L345 798 L355 950 L389 986 L392 942 L370 864 Z",
    "M840 778 L870 776 L869 861 L852 934 L830 912 L822 850 Z",
    "M875 781 L894 800 L885 949 L852 985 L850 936 L871 860 Z",
    "M1020 778 L990 776 L991 861 L1008 934 L1030 912 L1038 850 Z",
    "M985 781 L966 800 L975 949 L1008 985 L1010 936 L989 860 Z",
  ],
};

function resolveRegionHighlights(highlights: BodyHighlight[] = []) {
  const regions = new Map<BodyRegionId, BodyHighlightIntensity>();

  for (const highlight of highlights) {
    const existing = regions.get(highlight.regionId);
    if (
      existing === undefined ||
      INTENSITY_WEIGHT[highlight.intensity] > INTENSITY_WEIGHT[existing]
    ) {
      regions.set(highlight.regionId, highlight.intensity);
    }
  }

  return [...regions.entries()].sort(
    ([a], [b]) => REGION_ASSEMBLY_ORDER.indexOf(a) - REGION_ASSEMBLY_ORDER.indexOf(b),
  );
}

function resolveLatestRegions(highlights: BodyHighlight[] = []) {
  return resolveRegionHighlights(highlights).map(([regionId]) => regionId);
}

function buildSvgBase() {
  return [
    `<image href="${BIOMECH_ASSET_FRONT}" x="0" y="0" width="620" height="1040" preserveAspectRatio="xMidYMid meet"/>`,
    `<image href="${BIOMECH_ASSET_BACK}" x="620" y="0" width="620" height="1040" preserveAspectRatio="xMidYMid meet"/>`,
  ].join("");
}

type ExportPlateLayer = "weekly-halo" | "weekly-core" | "latest-halo" | "latest-core";

function buildSvgPlates(
  regions: Array<[BodyRegionId, BodyHighlightIntensity]> | BodyRegionId[],
  layer: ExportPlateLayer,
) {
  const latest = layer.startsWith("latest");
  const halo = layer.endsWith("halo");

  return regions
    .map((entry, index) => {
      const regionId = Array.isArray(entry) ? entry[0] : entry;
      const intensity = Array.isArray(entry) ? entry[1] : "low";
      const color = latest ? "#39f8ff" : INTENSITY_COLOR[intensity];
      const treatment = REGION_TREATMENT[regionId];
      const fill = latest || halo ? "none" : `url(#precisionExport-${intensity})`;
      const fillOpacity = latest || halo ? 0 : treatment.fill;
      const strokeWidth = halo ? (latest ? 6 : 5) : latest ? 1.7 : 1.25;
      const strokeOpacity = halo ? (latest ? 0.22 : 0.28) : latest ? 0.8 : 0.68;

      return REGION_PLATES[regionId]
        .map(
          (path, plateIndex) =>
            `<path d="${path}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${color}" stroke-width="${strokeWidth}" stroke-opacity="${strokeOpacity}" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke" data-anatomy-region="${regionId}" data-anatomy-layer="${layer}" data-index="${index}-${plateIndex}"/>`,
        )
        .join("");
    })
    .join("");
}

function buildExportDefs() {
  return [
    "<defs>",
    '<filter id="precisionExportBody" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="5" flood-color="#39f8ff" flood-opacity="0.34"/><feDropShadow dx="0" dy="0" stdDeviation="13" flood-color="#7c5cff" flood-opacity="0.16"/></filter>',
    '<filter id="precisionExportWeeklyHalo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="5"/></filter>',
    '<filter id="precisionExportLatestHalo" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="4"/></filter>',
    '<filter id="precisionExportLatestEdge" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="0" stdDeviation="2.5" flood-color="#39f8ff" flood-opacity="0.72"/></filter>',
    '<linearGradient id="precisionExport-low" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#b69cff" stop-opacity="0.82"/><stop offset="44%" stop-color="#8a5cff" stop-opacity="0.2"/><stop offset="100%" stop-color="#6b39ff" stop-opacity="0.64"/></linearGradient>',
    '<linearGradient id="precisionExport-medium" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffe19a" stop-opacity="0.82"/><stop offset="44%" stop-color="#ffb02e" stop-opacity="0.2"/><stop offset="100%" stop-color="#ff7b22" stop-opacity="0.66"/></linearGradient>',
    '<linearGradient id="precisionExport-high" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stop-color="#ffb2ff" stop-opacity="0.78"/><stop offset="44%" stop-color="#f04cff" stop-opacity="0.18"/><stop offset="100%" stop-color="#b624ff" stop-opacity="0.68"/></linearGradient>',
    "</defs>",
  ].join("");
}

export function buildAnatomyFigureSvg({
  className,
  weeklyRegions,
  latestRegions,
}: {
  className: string;
  weeklyRegions: Array<[BodyRegionId, BodyHighlightIntensity]>;
  latestRegions: BodyRegionId[];
}) {
  return [
    `<svg class="${className}" viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}" xmlns="http://www.w3.org/2000/svg">`,
    buildExportDefs(),
    `<g filter="url(#precisionExportBody)" data-anatomy-layer="base">${buildSvgBase()}</g>`,
    `<g filter="url(#precisionExportWeeklyHalo)" style="mix-blend-mode:screen">${buildSvgPlates(weeklyRegions, "weekly-halo")}</g>`,
    `<g style="mix-blend-mode:screen">${buildSvgPlates(weeklyRegions, "weekly-core")}</g>`,
    `<g filter="url(#precisionExportLatestHalo)" style="mix-blend-mode:screen">${buildSvgPlates(latestRegions, "latest-halo")}</g>`,
    `<g filter="url(#precisionExportLatestEdge)" style="mix-blend-mode:screen">${buildSvgPlates(latestRegions, "latest-core")}</g>`,
    `</svg>`,
  ].join("");
}

export async function renderAnatomyFigureImageLayers({
  highlights = [],
  weeklyHighlights,
  latestHighlights = [],
  className,
}: AnatomyFigureProps): Promise<AnatomyFigureImageLayer[]> {
  const resolvedClassName = className ?? "h-full w-full";
  const effectiveWeeklyHighlights = weeklyHighlights ?? highlights;
  const weeklyRegions = resolveRegionHighlights(effectiveWeeklyHighlights);
  const latestRegions = resolveLatestRegions(latestHighlights);

  return [
    {
      svg: buildAnatomyFigureSvg({
        className: `${resolvedClassName} block`,
        weeklyRegions,
        latestRegions,
      }),
      opacity: 1,
      filter:
        "drop-shadow(0 0 8px rgba(57,248,255,0.34)) drop-shadow(0 0 22px rgba(124,92,255,0.18))",
    },
  ];
}

export function AnatomyFigure({
  highlights = [],
  weeklyHighlights,
  latestHighlights = [],
  className,
  mode = "svg",
  assetStyle = "biomech",
  motionMode = "charged",
  preload = false,
  view = "both",
}: AnatomyFigureProps) {
  const effectiveWeeklyHighlights = weeklyHighlights ?? highlights;
  const resolvedWeeklyRegions = resolveRegionHighlights(effectiveWeeklyHighlights);
  const resolvedLatestRegions = resolveLatestRegions(latestHighlights);
  const weeklyRegions = view === "both"
    ? resolvedWeeklyRegions
    : resolvedWeeklyRegions.filter(([regionId]) => anatomyRegionView(regionId) === view);
  const latestRegions = view === "both"
    ? resolvedLatestRegions
    : resolvedLatestRegions.filter((regionId) => anatomyRegionView(regionId) === view);
  const isInstrumentMode = mode === "instrument";
  const isCharged = motionMode === "charged";
  const hasActiveRegions = weeklyRegions.length > 0 || latestRegions.length > 0;

  return (
    <div
      aria-hidden="true"
      className={`cinematic-anatomy precision-anatomy precision-anatomy-view-${view} relative ${
        isInstrumentMode ? "instrument-muscle-map" : ""
      } ${assetStyle === "clinical" ? "clinical-anatomy" : "biomech-anatomy"} ${
        isCharged ? "precision-anatomy-charged" : "precision-anatomy-static"
      } ${hasActiveRegions ? "precision-anatomy-active" : "precision-anatomy-dormant"} ${
        className ?? ""
      }`}
    >
      <div className="precision-anatomy-contact" />
      <div className="precision-anatomy-base-pair">
        <div className="precision-anatomy-body precision-anatomy-body-front">
          {view !== "back" ? (
            <Image
              alt=""
              className="precision-anatomy-raster"
              height={1040}
              loading={preload ? "eager" : "lazy"}
              sizes="(max-width: 820px) 78vw, 38vw"
              src={BIOMECH_ASSET_FRONT}
              width={620}
            />
          ) : null}
        </div>
        <div className="precision-anatomy-body precision-anatomy-body-back">
          {view !== "front" ? (
            <Image
              alt=""
              className="precision-anatomy-raster"
              height={1040}
              loading={preload ? "eager" : "lazy"}
              sizes="(max-width: 820px) 78vw, 38vw"
              src={BIOMECH_ASSET_BACK}
              width={620}
            />
          ) : null}
        </div>
      </div>

      <svg
        className="precision-anatomy-plates"
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="precisionPlateBloom" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 .42 0"
            />
            <feMerge>
              <feMergeNode />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="precisionPlateLow" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#b69cff" stopOpacity="0.82" />
            <stop offset="44%" stopColor="#8a5cff" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#6b39ff" stopOpacity="0.64" />
          </linearGradient>
          <linearGradient id="precisionPlateMedium" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffe19a" stopOpacity="0.82" />
            <stop offset="44%" stopColor="#ffb02e" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#ff7b22" stopOpacity="0.66" />
          </linearGradient>
          <linearGradient id="precisionPlateHigh" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffb2ff" stopOpacity="0.78" />
            <stop offset="44%" stopColor="#f04cff" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#b624ff" stopOpacity="0.68" />
          </linearGradient>
          <linearGradient id="precisionPlateLatest" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#eaffff" stopOpacity="0.82" />
            <stop offset="42%" stopColor="#39f8ff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#17bfff" stopOpacity="0.58" />
          </linearGradient>
        </defs>

        <g className="precision-dormant-plates">
          {REGION_ASSEMBLY_ORDER.flatMap((regionId) =>
            REGION_PLATES[regionId].map((path, plateIndex) => (
              <path
                key={`${regionId}-${plateIndex}-dormant`}
                className="precision-dormant-plate"
                d={path}
                data-region-id={regionId}
              />
            )),
          )}
        </g>

        <g className="precision-weekly-plates" filter="url(#precisionPlateBloom)">
          {weeklyRegions.flatMap(([regionId, intensity], index) =>
            REGION_PLATES[regionId].map((path, plateIndex) => {
              const treatment = REGION_TREATMENT[regionId];
              const style: PlateStyle = {
                "--plate-index": index + plateIndex,
                "--plate-delay": `${120 + (index + plateIndex) * 42}ms`,
                "--plate-charge-x": `${plateIndex % 2 === 0 ? treatment.chargeX : -treatment.chargeX}px`,
                "--plate-charge-y": `${treatment.chargeY}px`,
                "--plate-fill-opacity": treatment.fill,
                "--plate-glow-scale": treatment.glow,
              };

              return (
                <Fragment key={`${regionId}-${plateIndex}-${intensity}`}>
                  <path
                    className={`precision-plate-halo precision-plate-${intensity}`}
                    d={path}
                    data-region-id={regionId}
                    style={style}
                  />
                  <path
                    className={`precision-plate precision-plate-${intensity}`}
                    d={path}
                    data-region-id={regionId}
                    data-intensity={intensity}
                    style={style}
                  />
                  <path
                    className={`precision-plate-trace precision-plate-${intensity}`}
                    d={path}
                    pathLength="1"
                    data-region-id={regionId}
                    style={style}
                  />
                </Fragment>
              );
            }),
          )}
        </g>

        <g className="precision-latest-plates">
          {latestRegions.flatMap((regionId, index) =>
            REGION_PLATES[regionId].map((path, plateIndex) => {
              const treatment = REGION_TREATMENT[regionId];
              const style: PlateStyle = {
                "--plate-index": index + plateIndex,
                "--plate-delay": `${80 + (index + plateIndex) * 36}ms`,
                "--plate-charge-x": `${plateIndex % 2 === 0 ? treatment.chargeX : -treatment.chargeX}px`,
                "--plate-charge-y": `${treatment.chargeY}px`,
                "--plate-fill-opacity": treatment.fill,
                "--plate-glow-scale": treatment.glow,
              };

              return (
                <Fragment key={`${regionId}-${plateIndex}-latest`}>
                  <path
                    className="precision-latest-halo"
                    d={path}
                    data-region-id={regionId}
                    style={style}
                  />
                  <path
                    className="precision-plate precision-plate-latest"
                    d={path}
                    data-region-id={regionId}
                    style={style}
                  />
                  <path
                    className="precision-latest-trace"
                    d={path}
                    pathLength="1"
                    data-region-id={regionId}
                    style={style}
                  />
                </Fragment>
              );
            }),
          )}
        </g>
      </svg>
      <div className="precision-anatomy-scan" aria-hidden="true" />
    </div>
  );
}
