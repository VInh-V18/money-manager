/**
 * Escape MySQL LIKE wildcard characters to prevent pattern injection.
 * Also trims whitespace and enforces a max length.
 *
 * MySQL LIKE special chars: % _ \
 * Sequelize still parameterizes the value (prevents actual SQL injection),
 * but without escaping the wildcards a user can craft patterns like
 * "%" to match everything, or "_____" to match any 5-char string —
 * causing full-table scans and unexpected result sets.
 */
export const escapeLike = (str, maxLen = 200) =>
  String(str || "")
    .trim()
    .slice(0, maxLen)
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");

/**
 * Sanitize a plain search string: trim + enforce max length.
 * Does NOT escape LIKE wildcards — use escapeLike for Op.like values.
 */
export const sanitizeString = (str, maxLen = 200) =>
  String(str || "").trim().slice(0, maxLen);
