# Model — Root Finding

A root is an x-value for which f(x) = 0. Start on the common cubic across
the six screens to compare constructions and the number of iterations.

## Bracketing methods

- Bisection takes the midpoint and keeps the half with opposite endpoint signs.
  For a continuous f, each step halves the width of an interval containing a root.
- False Position takes the x-intercept of the endpoint chord and keeps a sign
  change. One endpoint may change very slowly or stay fixed. Try the preset
  x^10 − 1 over [0, 2].
- Brent’s Method tries secant or inverse quadratic interpolation. It uses
  bisection when the proposed interpolation fails its progress criteria.
  See [Brent’s original algorithm](https://maths-people.anu.edu.au/~brent/pub/pub005.html).

## Open methods

- Newton iterates xₙ₊₁ = xₙ − f(xₙ)/f′(xₙ). Near a simple smooth root it can
  converge quadratically. A flat tangent, repeated root, or poor guess can
  produce a failure, slow convergence, or a cycle.
- Secant estimates the slope from the last two function values. Under the
  usual smoothness assumptions near a simple root, its order is about 1.618.
- Fixed-Point Iteration uses xₙ₊₁ = g(xₙ). A fixed point must also solve the
  supplied f(x) = 0. Nearby guesses tend to converge to an attracting fixed point
  when the magnitude of g′ is less than one in its neighborhood.

## Stopping

A zero is accepted immediately, with Fixed-Point also requiring g(x) = x.
Approximate convergence requires a residual at most 10⁻⁶ and a bracket width
or change in x at most 10⁻⁶. Fixed-Point also checks its map at the estimate.
Runs stop after 100 iterations or earlier if they encounter an unusable value
or stop making progress. All calculations use floating-point arithmetic.
A sign change alone gives a root guarantee only when f is continuous across it.
