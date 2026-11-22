# Implementation notes — Root Finding

Each screen instantiates its own RootFindingModel with a method identifier.
The shared model observes preset changes and owns editing, applied expressions,
playback, and solver snapshots. A draft is compiled when applied. Syntax or
number errors leave the applied problem and history in place.

The expression evaluator supports decimal and scientific numbers, x, pi, e,
parentheses, +, −, *, /, ^, abs, sqrt, cbrt, exp, log, sin, cos, and tan.
It builds arithmetic closures from tokens. Input length is bounded to 160
characters. Calculations and graph sampling both use the compiled closures.

The screen view subscribes to run snapshots. Auto zoom frames the retained
bracket or the latest open-method construction. In manual mode, the two axis
ranges stay fixed as the solver advances. The plot refreshes its function
samples when the problem or viewport changes. Values outside the graph's
supported range remain available in the iteration history.

The app uses the template’s bootstrap, color profiles, translations, and PWA
build. Model tests cover the six numerical methods; Chromium tests exercise the
normal screen and keyboard entry points.
