import type { TReadOnlyProperty } from "scenerystack/axon";
import { type Bounds2, roundSymmetric, Vector2 } from "scenerystack/dot";
import { Circle, DragListener, KeyboardDragListener, Node, Text } from "scenerystack/scenery";
import { PhetFont } from "scenerystack/scenery-phet";
import Colors from "../../RootFindingColors.js";
import type { GraphBounds } from "./GraphViewport.js";

const RADIUS = 8;
const KEYBOARD_STEP = 5;
const FINE_KEYBOARD_STEP = 1;

type StartHandleOptions = {
  symbol: string;
  accessibleName: TReadOnlyProperty<string>;
  // Keep the dragged value inside [low, high] (used to stop a bracket from crossing).
  limits: () => [number, number];
  move: (x: number) => void;
  format: (x: number) => string;
  hold: (held: boolean) => void;
};

/** Smallest drag increment at the current zoom level. */
function dragUnit(span: number): number {
  return 10 ** (Math.floor(Math.log10(span)) - 2);
}

/** Round to about three significant figures of the visible span, so dragged values read cleanly. */
function snap(x: number, span: number): number {
  const unit = dragUnit(span);
  return Number((roundSymmetric(x / unit) * unit).toPrecision(12));
}

/**
 * A pointer- and keyboard-draggable starting value on the graph’s x-axis.
 */
export class StartHandle extends Node {
  private readonly readout: Text;
  private readonly symbol: string;
  private readonly plot: Bounds2;
  private readonly dragging: DragListener;
  private readonly keyboardDragging: KeyboardDragListener;
  private readonly format: (x: number) => string;
  private graphBounds: GraphBounds | null = null;
  private startValue = 0;

  public constructor(plot: Bounds2, options: StartHandleOptions) {
    super({
      cursor: "ew-resize",
      excludeInvisibleChildrenFromBounds: true,
      tagName: "div",
      ariaRole: "application",
      focusable: true,
      accessibleName: options.accessibleName,
      accessibleNameBehavior: (_node, nodeOptions, name) => ({ ...nodeOptions, ariaLabel: name }),
    });
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
    const moveByKeyboard = (steps: number) => {
      if (!this.graphBounds) {
        return;
      }
      const span = this.graphBounds.maxX - this.graphBounds.minX;
      const [low, high] = options.limits();
      const current = this.startValue;
      const candidate = snap(current + steps * dragUnit(span), span);
      const next = Math.max(Math.min(low, current), Math.min(Math.max(high, current), candidate));
      if (next !== current) {
        options.move(next);
      }
    };
    this.keyboardDragging = new KeyboardDragListener({
      keyboardDragDirection: "leftRight",
      dragDelta: KEYBOARD_STEP,
      shiftDragDelta: FINE_KEYBOARD_STEP,
      positionProperty: {
        get value() {
          return Vector2.ZERO;
        },
        set value(delta: Vector2) {
          moveByKeyboard(delta.x);
        },
      },
    });
    this.addInputListener(this.dragging);
    this.addInputListener(this.keyboardDragging);
    this.dragging.isHighlightedProperty.link((show) => {
      halo.opacity = show ? 0.45 : 0.25;
      this.readout.visible = show;
    });
  }

  /** Place the handle at x on the axis, clamped to the plot. */
  public place(x: number, bounds: GraphBounds): void {
    this.graphBounds = bounds;
    this.startValue = x;
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
    this.removeInputListener(this.keyboardDragging);
    this.removeInputListener(this.dragging);
    this.keyboardDragging.dispose();
    this.dragging.dispose();
    super.dispose();
  }
}
