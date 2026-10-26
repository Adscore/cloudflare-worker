export class AbstractAsymmetricCrypt {
  /**
   * Expands compacted data to PEM format
   * @param {string} data compacted key data
   * @param {number} lineLength line length for PEM encoding (default 64)
   * @returns {string} PEM formatted key
   */
  public static expandPem(data: string, lineLength: number = 64): string {
    throw new Error("Not supported");
  }

  /**
   * Builds PEM format from key data
   * @param {string} data key data
   * @param {string} label key label
   * @param {number} lineLength line length for PEM encoding (default 64)
   * @returns {string} PEM formatted key
   */
  protected static encodePem(
    data: string,
    label: string | null,
    lineLength: number = 64
  ): string {
    throw new Error("Not supported");
  }
}
