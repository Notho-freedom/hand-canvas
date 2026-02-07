export class KalmanFilter {
  private R: number; // Process noise
  private Q: number; // Measurement noise
  private A: number; // State transition
  private B: number; // Control input
  private C: number; // Measurement
  private cov: number;
  private x: number;

  constructor(R = 1, Q = 1, A = 1, B = 0, C = 1) {
    this.R = R; // Process noise covariance
    this.Q = Q; // Measurement noise covariance
    this.A = A; // State transition matrix
    this.B = B; // Control matrix
    this.C = C; // Measurement matrix
    this.cov = NaN;
    this.x = NaN; // Estimated signal
  }

  filter(z: number, u = 0): number {
    if (isNaN(this.x)) {
      this.x = (1 / this.C) * z;
      this.cov = (1 / this.C) * this.Q * (1 / this.C);
    } else {
      // Predict
      const predX = this.A * this.x + this.B * u;
      const predCov = this.A * this.cov * this.A + this.R;

      // Kalman gain
      const K = predCov * this.C * (1 / (this.C * predCov * this.C + this.Q));

      // Update
      this.x = predX + K * (z - this.C * predX);
      this.cov = predCov - K * this.C * predCov;
    }
    return this.x;
  }
}

export class OneEuroFilter {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private x: KalmanFilter;
  private dx: KalmanFilter;
  private lastTime: number;

  constructor(minCutoff = 1.0, beta = 0.007, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
    this.x = new KalmanFilter();
    this.dx = new KalmanFilter();
    this.lastTime = -1;
  }

  filter(value: number, timestamp?: number): number {
    const now = timestamp || performance.now() / 1000;
    
    if (this.lastTime === -1) {
      this.lastTime = now;
      return value;
    }

    const dt = now - this.lastTime;
    this.lastTime = now;

    // Estimate derivative
    const dvalue = (value - (isNaN(this.x.filter(value)) ? value : this.x.filter(value))) / dt;
    const edvalue = this.dx.filter(dvalue);

    // Compute adaptive cutoff
    const cutoff = this.minCutoff + this.beta * Math.abs(edvalue);

    // Filter
    const alpha = 1 / (1 + cutoff * dt);
    const filteredValue = alpha * value + (1 - alpha) * (isNaN(this.x.filter(value)) ? value : this.x.filter(value));
    
    return filteredValue;
  }
}

export class DoubleExponentialSmoother {
  private alpha: number;
  private beta: number;
  private s: number;
  private b: number;
  private initialized: boolean;

  constructor(alpha = 0.4, beta = 0.1) {
    this.alpha = alpha; // Smoothing factor for level
    this.beta = beta;   // Smoothing factor for trend
    this.s = 0;
    this.b = 0;
    this.initialized = false;
  }

  smooth(value: number): number {
    if (!this.initialized) {
      this.s = value;
      this.b = 0;
      this.initialized = true;
      return value;
    }

    const sPrev = this.s;
    this.s = this.alpha * value + (1 - this.alpha) * (this.s + this.b);
    this.b = this.beta * (this.s - sPrev) + (1 - this.beta) * this.b;

    return this.s;
  }

  reset() {
    this.initialized = false;
  }
}

// Filtre spécifique pour les points 2D
export class Point2DFilter {
  private xFilter: OneEuroFilter;
  private yFilter: OneEuroFilter;

  constructor(
    minCutoff = 0.8,  // Réduit pour plus de douceur
    beta = 0.05,      // Augmenté pour suivre mieux les mouvements
    dCutoff = 0.8
  ) {
    this.xFilter = new OneEuroFilter(minCutoff, beta, dCutoff);
    this.yFilter = new OneEuroFilter(minCutoff, beta, dCutoff);
  }

  filter(x: number, y: number, timestamp?: number): { x: number; y: number } {
    return {
      x: this.xFilter.filter(x, timestamp),
      y: this.yFilter.filter(y, timestamp),
    };
  }
}