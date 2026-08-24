/** The requested range is not fully represented by authoritative availability. */
export class AvailabilityCoverageError extends Error {
  override readonly name = "AvailabilityCoverageError";

  constructor() {
    super("Requested time range is not fully covered by availability data");
  }
}
