import type { Difficulty } from '../../difficulty';
import { sampleGuide, type Cookie, type Point } from './cookie';

export interface Stroke {
  color: number;
  points: Point[];
}

/** Icing this close to the guide (in cookie units, 1 = the whole picture) counts as on it: about 6 px on a phone. */
const TOLERANCE = 0.018;
/** About 4 px: the only thing Expert changes. */
const EXPERT_TOLERANCE = 0.012;

export function toleranceFor(difficulty: Difficulty): number {
  return difficulty === 4 ? EXPERT_TOLERANCE : TOLERANCE;
}
const SAMPLE_SPACING = 0.008;
/** Covering the guides and staying on them weigh almost the same: icing everywhere does not pay. */
const COVERAGE_WEIGHT = 0.55;

export interface IcingScore {
  /** Share of the guides covered by icing of their colour. */
  coverage: number;
  /** Share of the icing that lies on a guide of its colour. */
  accuracy: number;
  total: number;
}

export function scoreIcing(cookie: Cookie, strokes: readonly Stroke[], tolerance = TOLERANCE): IcingScore {
  const near = ([x0, y0]: Point, [x1, y1]: Point) => (x1 - x0) ** 2 + (y1 - y0) ** 2 <= tolerance * tolerance;
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

export const STAR_THRESHOLDS = [0.6, 0.78, 0.9];

export function starsFor(total: number): number {
  return STAR_THRESHOLDS.filter((threshold) => total >= threshold).length;
}

/** Evenly spaced points along a stroke: a slow finger must not weigh more than a fast one. */
function resample(points: Point[], spacing: number): Point[] {
  if (points.length < 2) return points.slice();
  return sampleGuide({ color: 0, points, closed: false }, spacing);
}
