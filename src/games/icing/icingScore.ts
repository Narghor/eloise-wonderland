import { sampleGuide, type Cookie, type Point } from './cookie';

export interface Stroke {
  color: number;
  points: Point[];
}

/** Icing this close to the guide (in cookie units, 1 = the whole picture) counts as on it. */
const TOLERANCE = 0.03;
const SAMPLE_SPACING = 0.008;
/** Covering the guides matters more than never leaving them. */
const COVERAGE_WEIGHT = 0.7;

export interface IcingScore {
  /** Share of the guides covered by icing of their colour. */
  coverage: number;
  /** Share of the icing that lies on a guide of its colour. */
  accuracy: number;
  total: number;
}

export function scoreIcing(cookie: Cookie, strokes: readonly Stroke[]): IcingScore {
  const guideSamples = cookie.guides.map((guide) => ({ color: guide.color, points: sampleGuide(guide, SAMPLE_SPACING) }));
  const icing = strokes.flatMap((stroke) => resample(stroke.points, SAMPLE_SPACING).map((point) => ({ color: stroke.color, point })));
  if (icing.length === 0) return { coverage: 0, accuracy: 0, total: 0 };

  let guidePoints = 0;
  let covered = 0;
  for (const guide of guideSamples) {
    const sameColor = icing.filter((piece) => piece.color === guide.color).map((piece) => piece.point);
    for (const point of guide.points) {
      guidePoints++;
      if (sameColor.some((other) => near(point, other))) covered++;
    }
  }

  let onGuide = 0;
  for (const piece of icing) {
    const guides = guideSamples.filter((guide) => guide.color === piece.color);
    if (guides.some((guide) => guide.points.some((point) => near(point, piece.point)))) onGuide++;
  }

  const coverage = covered / guidePoints;
  const accuracy = onGuide / icing.length;
  return { coverage, accuracy, total: COVERAGE_WEIGHT * coverage + (1 - COVERAGE_WEIGHT) * accuracy };
}

export const STAR_THRESHOLDS = [0.55, 0.72, 0.86];

export function starsFor(total: number): number {
  return STAR_THRESHOLDS.filter((threshold) => total >= threshold).length;
}

function near([x0, y0]: Point, [x1, y1]: Point): boolean {
  const dx = x1 - x0;
  const dy = y1 - y0;
  return dx * dx + dy * dy <= TOLERANCE * TOLERANCE;
}

/** Evenly spaced points along a stroke: a slow finger must not weigh more than a fast one. */
function resample(points: Point[], spacing: number): Point[] {
  if (points.length < 2) return points.slice();
  return sampleGuide({ color: 0, points, closed: false }, spacing);
}
