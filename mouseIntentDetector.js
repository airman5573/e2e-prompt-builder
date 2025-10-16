/**
 * @module MouseIntentDetector
 * Detects whether the user intends to dismiss a modal based on mouse movement.
 */

const DEFAULT_OPTIONS = Object.freeze({
  distanceThreshold: 280,
  speedThreshold: 50,
  directionThreshold: 0.1,
  hoverReason: 'hovering modal',
  distanceReason: 'within threshold',
  towardReason: 'moving toward modal',
  inactiveReason: 'inactive tracking',
});

/**
 * Normalize a mouse-like input to an {x, y} coordinate pair.
 * @param {MouseEvent|{clientX:number,clientY:number}|{x:number,y:number}} input
 * @returns {{x:number,y:number}}
 * @throws {TypeError} When the input does not provide valid coordinates.
 */
function normalizePoint(input) {
  if (!input) {
    throw new TypeError('A mouse event or coordinate object is required.');
  }

  if (typeof input.clientX === 'number' && typeof input.clientY === 'number') {
    return { x: input.clientX, y: input.clientY };
  }

  if (typeof input.x === 'number' && typeof input.y === 'number') {
    return { x: input.x, y: input.y };
  }

  throw new TypeError(
    'Unsupported point format. Expected MouseEvent, {clientX, clientY}, or {x, y}.',
  );
}

/**
 * @typedef {Object} MouseIntentOptions
 * @property {number} [distanceThreshold=280] Minimum straight-line distance (px) before closing.
 * @property {number} [speedThreshold=50] Minimum per-frame speed (px) considered fast.
 * @property {number} [directionThreshold=0.1] Cosine threshold to classify toward/away movement.
 * The remaining properties allow overriding default reason strings.
 */

/**
 * Represents the result of evaluating a mouse movement.
 * @typedef {Object} MouseIntentResult
 * @property {boolean} shouldClose Whether the modal should close.
 * @property {string} reason Diagnostic label indicating the matched condition.
 * @property {number} totalDistance Straight-line distance from start to current point.
 * @property {number} speed Magnitude of the latest movement vector.
 * @property {'toward'|'away'|'neutral'} direction Classification of the latest movement direction.
 */

/**
 * Detects mouse intent to dismiss a modal.
 *
 * Usage example:
 * ```js
 * import MouseIntentDetector from './mouseIntentDetector.js';
 *
 * const detector = new MouseIntentDetector({ distanceThreshold: 260 });
 * const modalEl = document.querySelector('#modal');
 *
 * function onModalOpen(initialEvent) {
 *   detector.startTracking(modalEl, initialEvent);
 *   window.addEventListener('mousemove', handleMove);
 * }
 *
 * function handleMove(event) {
 *   const result = detector.evaluate(event);
 *   if (result.shouldClose) {
 *     window.removeEventListener('mousemove', handleMove);
 *     closeModal();
 *   }
 * }
 *
 * function onModalClose() {
 *   detector.stopTracking();
 *   window.removeEventListener('mousemove', handleMove);
 * }
 * ```
 */
export default class MouseIntentDetector {
  /**
   * Creates a new detector with optional configuration overrides.
   * @param {MouseIntentOptions} [options] Initial configuration.
   */
  constructor(options = {}) {
    /** @type {MouseIntentOptions} */
    this.options = { ...DEFAULT_OPTIONS };
    this.configure(options);

    /** @private */
    this.modalElement = null;
    /** @private */
    this.modalCenter = null;
    /** @private */
    this.initialPosition = null;
    /** @private */
    this.lastPosition = null;
    /** @private */
    this.isTracking = false;
  }

  /**
   * Updates detector configuration.
   * @param {MouseIntentOptions} [overrides] Partial overrides for thresholds and reasons.
   * @returns {void}
   */
  configure(overrides = {}) {
    if (overrides == null) {
      return;
    }

    if (typeof overrides !== 'object') {
      throw new TypeError('Configuration overrides must be an object.');
    }

    const { distanceThreshold, speedThreshold, directionThreshold, ...reasons } = overrides;

    if (distanceThreshold !== undefined) {
      if (!Number.isFinite(distanceThreshold) || distanceThreshold < 0) {
        throw new TypeError('distanceThreshold must be a non-negative finite number.');
      }
      this.options.distanceThreshold = distanceThreshold;
    }

    if (speedThreshold !== undefined) {
      if (!Number.isFinite(speedThreshold) || speedThreshold < 0) {
        throw new TypeError('speedThreshold must be a non-negative finite number.');
      }
      this.options.speedThreshold = speedThreshold;
    }

    if (directionThreshold !== undefined) {
      if (!Number.isFinite(directionThreshold) || directionThreshold < 0 || directionThreshold > 1) {
        throw new TypeError('directionThreshold must be between 0 and 1.');
      }
      this.options.directionThreshold = directionThreshold;
    }

    this.options = { ...this.options, ...reasons };
  }

  /**
   * Starts tracking mouse movement for the provided modal element.
   * @param {Element} modalElement The modal element to guard.
   * @param {MouseEvent|{clientX:number,clientY:number}|{x:number,y:number}} initialPoint Initial mouse reference.
   * @returns {void}
   */
  startTracking(modalElement, initialPoint) {
    if (!(modalElement instanceof Element)) {
      throw new TypeError('modalElement must be a valid DOM Element.');
    }

    const point = normalizePoint(initialPoint);

    this.modalElement = modalElement;
    this.modalCenter = this.#computeModalCenter();
    this.initialPosition = { ...point };
    this.lastPosition = { ...point };
    this.isTracking = true;
  }

  /**
   * Evaluates a mouse movement and determines the user's intent.
   * @param {MouseEvent|{clientX:number,clientY:number}|{x:number,y:number}} event Mouse move event or coordinates.
   * @returns {MouseIntentResult}
   */
  evaluate(event) {
    if (!this.isTracking || !this.modalElement) {
      return {
        shouldClose: false,
        reason: this.options.inactiveReason,
        totalDistance: 0,
        speed: 0,
        direction: 'neutral',
      };
    }

    const point = normalizePoint(event);
    const currentPosition = { ...point };
    this.modalCenter = this.#computeModalCenter();
    const totalDistance = this.#distanceBetween(this.initialPosition, currentPosition);

    if (this.#isHovering(event)) {
      this.lastPosition = currentPosition;
      return {
        shouldClose: false,
        reason: this.options.hoverReason,
        totalDistance,
        speed: 0,
        direction: 'neutral',
      };
    }

    if (totalDistance < this.options.distanceThreshold) {
      this.lastPosition = currentPosition;
      return {
        shouldClose: false,
        reason: this.options.distanceReason,
        totalDistance,
        speed: 0,
        direction: 'neutral',
      };
    }

    const movementVector = this.#vectorBetween(this.lastPosition, currentPosition);
    const speed = this.#magnitude(movementVector);

    const toCenterFromLast = this.#vectorBetween(this.lastPosition, this.modalCenter);
    const direction = this.#classifyDirection(movementVector, toCenterFromLast);
    const isFastMove = speed > this.options.speedThreshold;
    const isMovingAway = direction === 'away';

    this.lastPosition = currentPosition;

    if (isFastMove && totalDistance > this.options.distanceThreshold) {
      return {
        shouldClose: true,
        reason: 'fast move',
        totalDistance,
        speed,
        direction,
      };
    }

    if (isMovingAway && totalDistance > this.options.distanceThreshold) {
      return {
        shouldClose: true,
        reason: 'opposite direction',
        totalDistance,
        speed,
        direction,
      };
    }

    if (direction === 'toward') {
      return {
        shouldClose: false,
        reason: this.options.towardReason,
        totalDistance,
        speed,
        direction,
      };
    }

    return {
      shouldClose: false,
      reason: 'no close condition met',
      totalDistance,
      speed,
      direction,
    };
  }

  /**
   * Stops tracking and clears internal state.
   * @returns {void}
   */
  stopTracking() {
    this.modalElement = null;
    this.modalCenter = null;
    this.initialPosition = null;
    this.lastPosition = null;
    this.isTracking = false;
  }

  #computeModalCenter() {
    if (!this.modalElement) {
      return null;
    }

    const rect = this.modalElement.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };
  }

  #vectorBetween(from, to) {
    if (!from || !to) {
      return { x: 0, y: 0 };
    }
    return { x: to.x - from.x, y: to.y - from.y };
  }

  #distanceBetween(a, b) {
    if (!a || !b) {
      return 0;
    }
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  #magnitude(vector) {
    return Math.hypot(vector.x, vector.y);
  }

  #classifyDirection(movementVector, toCenterVector) {
    const movementMagnitude = this.#magnitude(movementVector);
    const toCenterMagnitude = this.#magnitude(toCenterVector);

    if (movementMagnitude === 0 || toCenterMagnitude === 0) {
      return 'neutral';
    }

    const dot = movementVector.x * toCenterVector.x + movementVector.y * toCenterVector.y;
    const normalizedDot = dot / (movementMagnitude * toCenterMagnitude);

    if (normalizedDot > this.options.directionThreshold) {
      return 'toward';
    }

    if (normalizedDot < -this.options.directionThreshold) {
      return 'away';
    }

    return 'neutral';
  }

  #isHovering(event) {
    if (!event || !this.modalElement) {
      return false;
    }

    const target = event.target;
    if (!target) {
      return false;
    }

    if (target === this.modalElement) {
      return true;
    }

    if (target instanceof Element) {
      return this.modalElement.contains(target);
    }

    if (target.parentElement) {
      return this.modalElement.contains(target.parentElement);
    }

    return false;
  }
}
