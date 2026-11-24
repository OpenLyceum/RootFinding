import type { Bounds2 } from "scenerystack/dot";
import { Circle, DragListener, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import Colors from "../../RootFindingColors.js";
import type { GraphBounds } from "./GraphViewport.js";

const RADIUS = 8;

type StartHandleOptions = {
  symbol: string;
  // Keep the dragged value inside [low, high] (used to stop a bracket from crossing).
  limits: () => [number, number];
  move: (x: number) => void;
  format: (x: number) => string;
  hold: (held: boolean) => void;
};

/** Round to about three significant figures of the visible span, so dragged values read cleanly. */
function snap(x: number, span: number): number {
  const unit = 10 ** (Math.floor(Math.log10(span)) - 2);
  return Number((Math.round(x / unit) * unit).toPrecision(12));
}

/**
 * Pointer handle for one starting value of a root-finding run. It sits on the
 * x-axis at the starting value and drags horizontally. The text fields in the
 * setup panel remain the keyboard path for the same value.
 */
export class StartHandle extends Node {
  private readonly readout: Text;
  private readonly symbol: string;
  private readonly plot: Bounds2;
  private readonly dragging: DragListener;
  private readonly format: (x: number) => string;
  private graphBounds: GraphBounds | null = null;

  public constructor(plot: Bounds2, options: StartHandleOptions) {
    super({ cursor: "ew-resize", excludeInvisibleChildrenFromBounds: true });
    this.plot = plot;
    this.symbol = options.symbol;
    this.format = options.format;
    const halo = new Circle(RADIUS + 7, { fill: Colors.accentColorProperty, opacity: 0.25, pickable: false });
    const dot = new Circle(RADIUS, {
      fill: Colors.accentColorProperty,
      stroke: Colors.graphBackgroundColorProperty,
      lineWidth: 2,
    });
    const symbol = new Text(options.symbol, {
      font: new PhetFont({ size: 13, weight: "bold" }),
      fill: Colors.textColorProperty,
      centerX: 0,
      top: RADIUS + 4,
      pickable: false,
    });
    this.readout = new Text("", {
      font: new PhetFont(13),
      fill: Colors.textColorProperty,
      pickable: false,
    });
    this.children = [halo, dot, symbol, this.readout];
    this.mouseArea = dot.bounds.dilated(6);
    this.touchArea = dot.bounds.dilated(16);

    let offset = 0;
    let grabBounds: GraphBounds | null = null;
    this.dragging = new DragListener({
      start: (event) => {
        // Holding may move the camera, which re-places this handle first.
        options.hold(true);
        grabBounds = this.graphBounds;
        offset = this.globalToParentPoint(event.pointer.point).x - this.x;
      },
      drag: (event) => {
        if (!grabBounds) {
          return;
        }
        const { minX, maxX } = grabBounds;
        const pixel = Math.max(
          plot.left,
          Math.min(plot.right, this.globalToParentPoint(event.pointer.point).x - offset),
        );
        const x = minX + ((pixel - plot.left) / plot.width) * (maxX - minX);
        const [low, high] = options.limits();
        options.move(Math.max(low, Math.min(high, snap(x, maxX - minX))));
      },
      end: () => {
        grabBounds = null;
        options.hold(false);
      },
    });
    this.addInputListener(this.dragging);
    this.dragging.isHighlightedProperty.link((show) => {
      halo.opacity = show ? 0.45 : 0.25;
      this.readout.visible = show;
    });
  }

  /** Place the handle at x on the axis, clamped to the plot. */
  public place(x: number, bounds: GraphBounds): void {
    this.graphBounds = bounds;
    const { minX, maxX, minY, maxY } = bounds;
    const fraction = (x - minX) / (maxX - minX);
    // A starting value the camera has zoomed away from stays grabbable, pinned
    // faintly to the nearer edge of the plot.
    this.opacity = fraction >= 0 && fraction <= 1 ? 1 : 0.55;
    const axis = this.plot.bottom - ((0 - minY) / (maxY - minY)) * this.plot.height;
    this.x = this.plot.left + Math.max(0, Math.min(1, fraction)) * this.plot.width;
    this.y = Math.max(this.plot.top + RADIUS, Math.min(this.plot.bottom - RADIUS, axis));
    this.readout.string = `${this.symbol} = ${this.format(x)}`;
    this.readout.centerBottom = this.readout.centerBottom.setXY(0, -RADIUS - 6);
    // Keep the readout inside the plot near the edges.
    const left = this.x + this.readout.left;
    if (left < this.plot.left) {
      this.readout.left -= left - this.plot.left;
    }
    const right = this.x + this.readout.right;
    if (right > this.plot.right) {
      this.readout.right -= right - this.plot.right;
    }
  }

  public override dispose(): void {
    this.dragging.dispose();
    super.dispose();
  }
}
