import CONSTANTS from "./constants.mjs";
import { enforceStringLength, isValidURL, isValidUUID, validateStringLength, validateDate } from "./utils.mjs";

const LOG_PREFIX = "buildRichTextObj";
const PREVIEW_MAX_LENGTH = 200;
const DEFAULT_OVERFLOW_STRATEGY = "split";
const DEFAULT_INVALID_URL_STRATEGY = "warn";
const DEFAULT_INVALID_MENTION_STRATEGY = "warn";

const OVERFLOW_STRATEGIES = new Set(["split", "truncate", "throw"]);
const INVALID_URL_STRATEGIES = new Set(["warn", "strip", "throw"]);
const INVALID_MENTION_STRATEGIES = new Set(["warn", "strip", "throw"]);
const ALLOWED_ANNOTATION_KEYS = new Set([
    "bold",
    "italic",
    "underline",
    "strikethrough",
    "code",
    "color",
]);

/**
 * Builds a Rich Text Object. See: https://developers.notion.com/reference/rich-text
 * @param {(string|Object)} input - The text content or input object. If string, the input can be normal text or an equation. If object, it can be a text, equation, or mention object.
 * @param {Object} [options] - Options for configuring the rich text object
 * @param {Object} [options.annotations] - Options for the Annotation object
 * @param {boolean} [options.annotations.bold] - Bold text
 * @param {boolean} [options.annotations.italic] - Italic text
 * @param {boolean} [options.annotations.strikethrough] - Strikethrough text
 * @param {boolean} [options.annotations.underline] - Underlined text
 * @param {boolean} [options.annotations.code] - Code-style text
 * @param {string} [options.annotations.color] - String specifying the text's color or background color. Options: "blue", "brown", "default", "gray", "green", "orange", "pink", "purple", "red", "yellow". All except "default" can also be used as a background color with "[color]_background" - example: "blue_background". See: https://developers.notion.com/reference/rich-text#the-annotation-object
 * @param {string} [options.url] - The URL for this object, if any. Creates a clickable link.
 * @param {string} [options.type="text"] - An optional type for the Rich Text Object. Supports text, equation, and mention.
 * @returns {Array<Object>} - Array with a single Rich Text Object
 * 
 * @example
 * // Simple text
 * buildRichTextObj("Hello World")
 * 
 * // Text with URL
 * buildRichTextObj("Watch this very important video", { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
 * 
 * // Text with annotations
 * buildRichTextObj("Bold and brown", { 
 *   annotations: { bold: true, color: "brown" }
 * })
 * 
 * // Text with URL and annotations
 * buildRichTextObj("Bold blue link", {
 *   url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
 *   annotations: { bold: true, color: "blue" }
 * })
 * 
 * // Equation
 * buildRichTextObj("E = mc^2", { type: "equation" })
 * 
 * // Mention
 * buildRichTextObj({ type: "user", user: { id: "user_id" } }, { type: "mention" })
 * buildRichTextObj({ type: "date", date: { start: "2025-01-01" } }, { type: "mention" })
 * buildRichTextObj({ type: "database", database_id: "database_id" }, { type: "mention" })
 * buildRichTextObj({ type: "page", page_id: "page_id" }, { type: "mention" })
 */
export function buildRichTextObj(input, options = {}) {
    const isLegacyAnnotationsObject =
        arguments.length > 1 &&
        options &&
        typeof options === "object" &&
        !Array.isArray(options) &&
        Object.keys(options).length > 0 &&
        Object.keys(options).every((key) => ALLOWED_ANNOTATION_KEYS.has(key));

    if (isLegacyAnnotationsObject) {
        options = {
            annotations: options,
            url: arguments[2],
            type: arguments[3] || "text",
        };
    }

    const {
        annotations = {},
        url,
        type = "text",
        overflow = DEFAULT_OVERFLOW_STRATEGY,
        onInvalidUrl = DEFAULT_INVALID_URL_STRATEGY,
        onInvalidMentionId = DEFAULT_INVALID_MENTION_STRATEGY,
    } = options;

    const overflowStrategy = normalizeStrategy(overflow, OVERFLOW_STRATEGIES, DEFAULT_OVERFLOW_STRATEGY);
    const invalidUrlStrategy = normalizeStrategy(onInvalidUrl, INVALID_URL_STRATEGIES, DEFAULT_INVALID_URL_STRATEGY);
    const invalidMentionStrategy = normalizeStrategy(onInvalidMentionId, INVALID_MENTION_STRATEGIES, DEFAULT_INVALID_MENTION_STRATEGY);
    const sanitizedAnnotations = sanitizeAnnotations(annotations);

    let resolvedUrl = url ?? null;
    if (resolvedUrl) {
        resolvedUrl = sanitizeUrl(resolvedUrl, invalidUrlStrategy, input);
    }

    if (typeof input === "string") {
        const limit = getMaxLengthForType(type);
        const chunks = applyOverflowStrategy(input, {
            limit,
            strategy: overflowStrategy,
            type,
        });

        switch (type) {
            case "text":
                return chunks.map((content) => ({
                    type: "text",
                    text: {
                        content,
                        link: resolvedUrl ? { url: resolvedUrl } : null,
                    },
                    annotations: {
                        ...sanitizedAnnotations,
                    },
                    ...(resolvedUrl ? { href: resolvedUrl } : {}),
                }));
            case "equation":
                return chunks.map((expression) => ({
                    type: "equation",
                    equation: {
                        expression,
                    },
                    annotations: {
                        ...sanitizedAnnotations,
                    },
                    ...(resolvedUrl ? { href: resolvedUrl } : {}),
                }));
            default:
                break;
        }
    }

    if (typeof input === "object") {
        if (type === "text" || !type) {
            return [
                {
                    type: "text",
                    text: input,
                },
            ];
        }

        switch (type) {
            case "equation": {
                const expression = typeof input?.expression === "string" ? input.expression : null;

                if (expression) {
                    const chunks = applyOverflowStrategy(expression, {
                        limit: getMaxLengthForType("equation"),
                        strategy: overflowStrategy,
                        type: "equation",
                    });

                    return chunks.map((segment) => ({
                        type: "equation",
                        equation: {
                            ...input,
                            expression: segment,
                        },
                        annotations: {
                            ...annotations,
                        },
                        ...(resolvedUrl ? { href: resolvedUrl } : {}),
                    }));
                }

                return [
                    {
                        type: "equation",
                        equation: {
                            ...input,
                        },
                        annotations: {
                            ...sanitizedAnnotations,
                        },
                        ...(resolvedUrl ? { href: resolvedUrl } : {}),
                    },
                ];
            }
            case "mention":
                return processMentionInput(input, {
                    annotations: sanitizedAnnotations,
                    url: resolvedUrl,
                    onInvalidMentionId: invalidMentionStrategy,
                    overflow: overflowStrategy,
                    onInvalidUrl: invalidUrlStrategy,
                });
            default: {
                const error = `Unsupported rich text type: ${type}`;
                console.error(error);
                throw new Error(error);
            }
        }
    }

    const error = `Invalid input sent to buildRichTextObj()`;
    console.error(error);
    throw new Error(error);
}

/**
 * Creates a user mention with shorthand syntax.
 * @param {string} userId - The user ID to mention
 * @param {Object} [options] - Additional options for the mention
 * @param {Object} [options.annotations] - Text annotations (bold, italic, etc.)
 * @param {string} [options.url] - URL for the mention
 * @returns {Array<Object>} - Array with a single Rich Text Object containing the user mention
 * 
 * @example
 * // Simple user mention
 * mentionUser("user_123")
 * 
 * // User mention with annotations
 * mentionUser("user_123", { annotations: { bold: true, color: "blue" } })
 */
export function mentionUser(userId, options = {}) {
    return buildRichTextObj(
        { type: "user", user: { id: userId } },
        { type: "mention", ...options }
    );
}

/**
 * Creates a date mention with shorthand syntax.
 * @param {string|Object} date - The date string or date object
 * @param {Object} [options] - Additional options for the mention
 * @param {Object} [options.annotations] - Text annotations (bold, italic, etc.)
 * @param {string} [options.url] - URL for the mention
 * @returns {Array<Object>} - Array with a single Rich Text Object containing the date mention
 * 
 * @example
 * // Simple date mention
 * mentionDate("2025-01-01")
 * 
 * // Date mention with time range
 * mentionDate({ start: "2025-01-01", end: "2025-01-02" })
 * 
 * // Date mention with annotations
 * mentionDate("2025-01-01", { annotations: { bold: true } })
 */
export function mentionDate(date, options = {}) {
    const dateObj = typeof date === "string" ? { start: date } : date;

    if (!dateObj || !dateObj.start) {
        console.warn(`Invalid date. Date: ${date}.`);
    }

    if (dateObj.end && !dateObj.start) {
        console.warn(`Invalid date. Date: ${date}. End date provided without start date.`);
    }

    const validatedDateObj = {
        start: validateDate(dateObj.start),
        end: dateObj.end ? validateDate(dateObj.end) : null,
    }

    return buildRichTextObj(
        { type: "date", date: validatedDateObj },
        { type: "mention", ...options }
    );
}

/**
 * Creates a database mention with shorthand syntax.
 * @param {string} databaseId - The database ID to mention
 * @param {Object} [options] - Additional options for the mention
 * @param {Object} [options.annotations] - Text annotations (bold, italic, etc.)
 * @param {string} [options.url] - URL for the mention
 * @returns {Array<Object>} - Array with a single Rich Text Object containing the database mention
 * 
 * @example
 * // Simple database mention
 * mentionDatabase("database_123")
 * 
 * // Database mention with annotations
 * mentionDatabase("database_123", { annotations: { italic: true } })
 */
export function mentionDatabase(databaseId, options = {}) {
    return buildRichTextObj(
        { type: "database", database: { id: databaseId } },
        { type: "mention", ...options }
    );
}

/**
 * Creates a page mention with shorthand syntax.
 * @param {string} pageId - The page ID to mention
 * @param {Object} [options] - Additional options for the mention
 * @param {Object} [options.annotations] - Text annotations (bold, italic, etc.)
 * @param {string} [options.url] - URL for the mention
 * @returns {Array<Object>} - Array with a single Rich Text Object containing the page mention
 * 
 * @example
 * // Simple page mention
 * mentionPage("page_123")
 * 
 * // Page mention with annotations
 * mentionPage("page_123", { annotations: { color: "green" } })
 */
export function mentionPage(pageId, options = {}) {
    return buildRichTextObj(
        { type: "page", page: { id: pageId } },
        { type: "mention", ...options }
    );
}


// TODO: Run everything passed to enforceRichText through enforceStringLength

/**
 * Enforces Rich Text format for content.
 * @param {string|Object|Array} content - The content to be enforced as Rich Text.
 * @returns {Array} An array of Rich Text Objects.
 */
export function enforceRichText(content) {
    if (!content) {
        return [];
    }

    if (Array.isArray(content)) {
        return content.flatMap((item) =>
            typeof item === "string"
                ? enforceRichText(item)
                : enforceRichTextObject(item)
        );
    }

    if (typeof content === "string") {
        const strings = enforceStringLength(content);
        const richTextObjects = strings.flatMap((string) => {
            const isURL = isValidURL(string);
            const isBold = /^\*{2}[\s\S]*?\*{2}$/.test(string);
            const isItalic = /^[\*_]{1}[^\*_]{1}[\s\S]*?[^\*_]{1}[\*_]{1}$/.test(string);
            const isBoldItalic = /^\*{3}[\s\S]*?\*{3}$/.test(string);

            let plainString = string;
            if (isBold || isItalic || isBoldItalic) {
                plainString = string.replace(/^(\*|_)+|(\*|_)+$/g, "");
            }

            return buildRichTextObj(
                plainString,
                {
                    annotations: {
                        bold: isBold || isBoldItalic,
                        italic: isItalic || isBoldItalic,
                    },
                    url: isURL ? plainString : null,
                }
            );
        });

        return richTextObjects;
    }

    if (typeof content === "number") {
        return buildRichTextObj(content.toString());
    }

    if (typeof content === "object") {
        return [enforceRichTextObject(content)];
    }

    console.warn(`Invalid input for rich text. Returning empty array.`);
    return [];
}

/**
 * Enforces a single Rich Text Object format.
 * @param {string|Object} obj - The object to be enforced as a Rich Text Object.
 * @returns {Object} A Rich Text Object.
 */
export function enforceRichTextObject(obj) {
    if (typeof obj === "string") {
        return buildRichTextObj(obj)[0];
    }

    // Already-valid Notion rich text objects
    if (obj?.type === "text" && obj?.text && typeof obj.text.content === "string") {
        validateStringLength({ string: obj.text.content, type: "text" });
        return obj;
    }
    if (obj?.type === "equation" && typeof obj?.equation?.expression === "string") {
        validateStringLength({ string: obj.equation.expression, type: "equation" });
        return obj;
    }
    if (obj?.type === "mention" && obj?.mention && typeof obj.mention === "object") {
        validateStringLength({ string: obj.mention.type, type: "mention" });
        return obj;
    }

    // Shorthand: equation provided as { type: "equation", expression: "..." }
    if (obj?.type === "equation" && typeof obj?.expression === "string") {
        validateStringLength({ string: obj.expression, type: "equation" });
        
        return {
            type: "equation",
            equation: { expression: obj.expression },
            ...(obj.annotations ? { annotations: obj.annotations } : {}),
        };
    }

    // Shorthand: mentions provided as { type: one of mention subtypes, ...payload }
    // Note: link_preview and template_mention are read-only (cannot be created via API)
    const mentionTypes = new Set(["database", "date", "page", "user"]);
    if (mentionTypes.has(obj?.type)) {
        const { annotations, type, ...rest } = obj;
        return {
            type: "mention",
            mention: {
                type,
                [type]: rest,
            },
            ...(annotations ? { annotations } : {}),
        };
    }

    console.warn(`Invalid rich text object. Returning empty rich text object.`);
    return buildRichTextObj("")[0];
}

/**
 * Normalizes a caller-supplied strategy string to a supported value.
 * Falls back to the provided default when the value is falsy or unrecognized.
 *
 * @param {string} value - Raw option value supplied by the developer.
 * @param {Set<string>} allowedStrategies - Set of recognized strategy strings.
 * @param {string} fallback - Default strategy to use when value is invalid.
 * @returns {string} A normalized, supported strategy string.
 */
function normalizeStrategy(value, allowedStrategies, fallback) {
    if (!value || typeof value !== "string") {
        return fallback;
    }

    const normalized = value.toLowerCase();

    if (allowedStrategies.has(normalized)) {
        return normalized;
    }

    console.warn(`[${LOG_PREFIX}] Unknown strategy "${value}". Falling back to "${fallback}".`);
    return fallback;
}

/**
 * Generates a truncated preview string for logging purposes.
 *
 * @param {*} value - The value to preview (coerced to string when necessary).
 * @param {number} [maxLength=PREVIEW_MAX_LENGTH] - Maximum number of characters to retain.
 * @returns {string} A truncated preview string suitable for logs.
 */
function createPreview(value, maxLength = PREVIEW_MAX_LENGTH) {
    if (value === null || value === undefined) {
        return "";
    }

    const stringValue = typeof value === "string" ? value : String(value);
    return stringValue.length > maxLength
        ? `${stringValue.slice(0, maxLength)}...[truncated]`
        : stringValue;
}

/**
 * Filters an annotations object so only Notion-supported keys are preserved.
 *
 * @param {Object} input - Potentially user-supplied annotations.
 * @returns {Object} A shallow copy containing only safe annotation properties.
 */
function sanitizeAnnotations(input) {
    if (!input || typeof input !== "object") {
        return {};
    }

    const sanitized = {};
    for (const key of ALLOWED_ANNOTATION_KEYS) {
        if (Object.prototype.hasOwnProperty.call(input, key)) {
            sanitized[key] = input[key];
        }
    }

    return sanitized;
}

/**
 * Resolves the character limit enforced by Notion for a given rich-text type.
 *
 * @param {string} type - Rich-text subtype (e.g., "text", "equation", "mention").
 * @returns {number} Maximum allowed character count for the type.
 */
function getMaxLengthForType(type) {
    switch (type) {
        case "equation":
            return CONSTANTS.MAX_EQUATION_LENGTH;
        case "mention":
            return CONSTANTS.MAX_MENTION_LENGTH;
        case "text":
        default:
            return CONSTANTS.MAX_TEXT_LENGTH;
    }
}

/**
 * Determines whether a UTF-16 code unit is a high surrogate.
 * Used to avoid splitting surrogate pairs when chunking long strings.
 *
 * @param {number} codePoint - UTF-16 code unit to inspect.
 * @returns {boolean} True when the code represents a high surrogate.
 */
function isHighSurrogate(codePoint) {
    return codePoint >= 0xd800 && codePoint <= 0xdbff;
}

/**
 * Splits a string into segments that do not exceed the provided length limit.
 * Handles surrogate pairs so multi-byte characters are not split mid-way.
 *
 * @param {string} value - The string to segment.
 * @param {number} limit - Maximum length of each segment.
 * @returns {Array<string>} Array of string segments respecting the limit.
 */
function splitStringByLimit(value, limit) {
    if (!limit || limit <= 0) {
        limit = CONSTANTS.MAX_TEXT_LENGTH;
    }

    const segments = [];
    let index = 0;

    while (index < value.length) {
        let end = Math.min(index + limit, value.length);

        if (end < value.length) {
            const code = value.charCodeAt(end - 1);
            if (isHighSurrogate(code)) {
                end += 1;
                if (end > value.length) {
                    end = value.length;
                }
            }
        }

        if (end === index) {
            end = Math.min(index + limit, value.length);
            if (end === index) {
                end = Math.min(index + 1, value.length);
            }
        }

        segments.push(value.slice(index, end));
        index = end;
    }

    return segments;
}

/**
 * Applies the configured overflow strategy to a string value.
 * Depending on the strategy, the value is split, truncated, or causes an error.
 *
 * @param {string} value - User-supplied string content.
 * @param {Object} params - Strategy configuration.
 * @param {number} params.limit - Maximum allowed length for the string.
 * @param {string} params.strategy - Normalized overflow strategy (split|truncate|throw).
 * @param {string} params.type - Rich-text subtype, used for log context.
 * @returns {Array<string>} Array of processed string segments.
 * @throws {Error} When the strategy is "throw" and the value exceeds the limit.
 */
function applyOverflowStrategy(value, { limit, strategy, type }) {
    if (typeof value !== "string") {
        return [value];
    }

    if (value.length <= limit) {
        return [value];
    }

    const preview = createPreview(value);

    switch (strategy) {
        case "split": {
            const chunks = splitStringByLimit(value, limit);
            console.warn(`[${LOG_PREFIX}] Input for type "${type}" exceeded ${limit} characters. Strategy: split into ${chunks.length} chunk(s). Preview: ${preview}`);
            return chunks;
        }
        case "truncate":
            console.warn(`[${LOG_PREFIX}] Input for type "${type}" exceeded ${limit} characters. Strategy: truncate. Preview: ${preview}`);
            return [value.slice(0, limit)];
        case "throw":
            throw new Error(`[${LOG_PREFIX}] Input for type "${type}" exceeded maximum length (${value.length} > ${limit}). Preview: ${preview}`);
        default: {
            console.warn(`[${LOG_PREFIX}] Unknown overflow strategy "${strategy}". Falling back to split.`);
            const chunks = splitStringByLimit(value, limit);
            console.warn(`[${LOG_PREFIX}] Input for type "${type}" exceeded ${limit} characters. Strategy: split into ${chunks.length} chunk(s). Preview: ${preview}`);
            return chunks;
        }
    }
}

/**
 * Validates a URL according to the configured invalid-URL strategy.
 *
 * @param {string} url - Potential URL value supplied by the caller.
 * @param {string} strategy - Normalized invalid URL strategy (warn|strip|throw).
 * @param {*} contextPreview - Original input used for log previews.
 * @returns {string|null} Sanitized URL (null when stripped) or the original URL when valid.
 * @throws {Error} When strategy is "throw" and the URL is invalid.
 */
function sanitizeUrl(url, strategy, contextPreview) {
    if (!url) {
        return null;
    }

    validateStringLength({ string: url, type: "url" });

    if (isValidURL(url)) {
        return url;
    }

    const preview = createPreview(contextPreview);

    switch (strategy) {
        case "warn":
            console.warn(`[${LOG_PREFIX}] Invalid URL "${url}". Strategy: warn. Input preview: ${preview}`);
            return url;
        case "strip":
            console.warn(`[${LOG_PREFIX}] Invalid URL "${url}". Strategy: strip (link removed). Input preview: ${preview}`);
            return null;
        case "throw":
            throw new Error(`[${LOG_PREFIX}] Invalid URL "${url}". Strategy: throw. Input preview: ${preview}`);
        default:
            console.warn(`[${LOG_PREFIX}] Unknown invalid URL strategy "${strategy}". Defaulting to warn.`);
            console.warn(`[${LOG_PREFIX}] Invalid URL "${url}". Strategy: warn. Input preview: ${preview}`);
            return url;
    }
}

/**
 * Extracts a UUID from a mention payload when available.
 * Supports user, page, and database mention objects.
 *
 * @param {Object} mention - Mention object supplied to buildRichTextObj.
 * @returns {string|null} Extracted ID or null when not applicable.
 */
function extractMentionId(mention) {
    if (!mention || typeof mention !== "object") {
        return null;
    }

    switch (mention.type) {
        case "user":
            return mention.user?.id ?? null;
        case "page":
            return mention.page?.id ?? null;
        case "database":
            return mention.database?.id ?? null;
        default:
            return null;
    }
}

/**
 * Produces a human-readable fallback string for a mention object.
 * Stored in the generated rich-text object so the mention still conveys context
 * even when Notion strips the mention metadata (e.g., due to permissions).
 *
 * @param {Object} mention - Mention payload handled by buildRichTextObj.
 * @returns {string} Fallback plain-text label for the mention.
 */
function createMentionPlainText(mention) {
    if (!mention || typeof mention !== "object") {
        return "";
    }

    switch (mention.type) {
        case "user":
            return "@User";
        case "page":
            return "Page";
        case "database":
            return "Database";
        case "date":
            return mention.date?.start ?? "Date";
        case "template_mention":
            return "Template";
        default:
            return "Mention";
    }
}

/**
 * Builds a mention rich-text object using the configured validation strategies.
 * Handles invalid IDs (warn/strip/throw) and preserves optional URL behaviour.
 *
 * @param {Object} mention - Mention payload supplied by the caller (user/page/etc.).
 * @param {Object} config - Behaviour configuration forwarded from buildRichTextObj.
 * @param {Object} config.annotations - Annotation overrides to apply to the mention.
 * @param {string|null} config.url - Optional URL to apply to the mention wrapper.
 * @param {string} config.onInvalidMentionId - Strategy for invalid mention IDs.
 * @param {string} config.overflow - Overflow strategy used when coercing invalid mentions to text.
 * @param {string} config.onInvalidUrl - Strategy for invalid URLs supplied with mentions.
 * @returns {Array<Object>} Array containing a single mention-rich text object.
 */
function processMentionInput(mention, {
    annotations,
    url,
    onInvalidMentionId,
    overflow,
    onInvalidUrl,
}) {
    const sanitizedAnnotations = sanitizeAnnotations(annotations);

    if (!mention || typeof mention !== "object" || typeof mention.type !== "string") {
        console.warn(`[${LOG_PREFIX}] Invalid mention payload provided. Converting to empty text.`);
        return buildRichTextObj("", { annotations: sanitizedAnnotations, url, overflow, onInvalidUrl, onInvalidMentionId });
    }

    const mentionId = extractMentionId(mention);

    if (mentionId && !isValidUUID(mentionId)) {
        const preview = createPreview(mentionId);

        switch (onInvalidMentionId) {
            case "warn":
                console.warn(`[${LOG_PREFIX}] Invalid ${mention.type} ID "${mentionId}". Strategy: warn. Preview: ${preview}`);
                break;
            case "strip":
                console.warn(`[${LOG_PREFIX}] Invalid ${mention.type} ID "${mentionId}". Strategy: strip (converted to text). Preview: ${preview}`);
                return buildRichTextObj(
                    `Invalid ${mention.type} mention (${preview})`,
                    {
                        annotations: sanitizedAnnotations,
                        ...(url ? { url } : {}),
                        overflow,
                        onInvalidUrl,
                        onInvalidMentionId,
                    }
                );
            case "throw":
                throw new Error(`[${LOG_PREFIX}] Invalid ${mention.type} ID "${mentionId}". Strategy: throw. Preview: ${preview}`);
            default:
                console.warn(`[${LOG_PREFIX}] Unknown invalid mention strategy "${onInvalidMentionId}". Defaulting to warn.`);
                console.warn(`[${LOG_PREFIX}] Invalid ${mention.type} ID "${mentionId}". Strategy: warn. Preview: ${preview}`);
        }
    }

    const plainText = createMentionPlainText(mention);

    return [
        {
            type: "mention",
            mention,
            annotations: {
                ...sanitizedAnnotations,
            },
            ...(plainText ? { plain_text: plainText } : {}),
            ...(url ? { href: url } : {}),
        },
    ];
}