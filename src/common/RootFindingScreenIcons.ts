import { Shape } from "scenerystack/kite";
import { Node, Path, Rectangle } from "scenerystack/scenery";
import { ScreenIcon } from "scenerystack/sim";
import Colors from "../RootFindingColors.js";
import type { Method } from "./model/problems.js";

const W = 120;
const H = 80;

export function createMethodIcon(method: Method): ScreenIcon {
  const fixed = method === "fixedPoint";
  const axes = new Shape().moveTo(9, 48).lineTo(111, 48).moveTo(23, 72).lineTo(23, 8);
  const curve = fixed
    ? new Shape().moveTo(20, 54).quadraticCurveTo(71, 46, 101, 17)
    : new Shape().moveTo(14, 65).cubicCurveTo(57, 73, 59, 55, 77, 39).quadraticCurveTo(87, 28, 103, 11);
  const marks = new Shape();
  switch (method) {
    case "bisection":
      marks.moveTo(44, 39).lineTo(44, 59).moveTo(96, 39).lineTo(96, 59).moveTo(44, 50).lineTo(96, 50);
      marks.circle(70, 50, 3);
      break;
    case "newton":
      marks.moveTo(55, 64).lineTo(101, 16);
      marks.circle(87, 31, 4);
      break;
    case "falsePosition":
      marks.moveTo(33, 65).lineTo(98, 17);
      marks.circle(33, 65, 4).circle(98, 17, 4);
      break;
    case "secant":
      marks.moveTo(44, 65).lineTo(104, 30);
      marks.circle(49, 62, 4).circle(89, 39, 4);
      break;
    case "fixedPoint":
      axes.moveTo(25, 67).lineTo(102, 12);
      marks.moveTo(34, 61).lineTo(34, 52).lineTo(48, 52).lineTo(48, 47).lineTo(55, 47);
      break;
    case "brent":
      marks.moveTo(34, 65).quadraticCurveTo(85, 54, 86, 20);
      marks.circle(34, 65, 3).circle(70, 49, 3).circle(86, 20, 3);
      break;
  }
  return new ScreenIcon(
    new Node({
      children: [
        new Rectangle(0, 0, W, H, { fill: Colors.graphBackgroundColorProperty }),
        new Path(axes, { lineWidth: 2, stroke: Colors.graphAxisColorProperty }),
        new Path(curve, { lineWidth: 3, stroke: Colors.functionCurveColorProperty }),
        new Path(marks, { lineWidth: 2.5, stroke: Colors.constructionColorProperty }),
      ],
    }),
    { fill: Colors.graphBackgroundColorProperty, maxIconWidthProportion: 1, maxIconHeightProportion: 1 },
  );
}
