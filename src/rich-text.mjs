import { enforceStringLength, isValidURL, isValidUUID, validateStringLength, validateDate } from "./utils.mjs";

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
 * buildRichTextObj({ type: "link_preview", link_preview: { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" } }, { type: "mention" })
 */
export function buildRichTextObj(input, options = {}) {
    // Handle backwards compatibility
    if (arguments.length > 1 && !options.url && !options.type && !options.annotations) {
        // If second argument is not an options object, treat it as annotations
        options = {
            annotations: arguments[1],
            url: arguments[2],
            type: arguments[3] || "text"
        };
    }

    const { annotations = {}, url, type = "text" } = options;

    // Validate URL if provided
    if (url) {
        const isValid = isValidURL(url);
        if (!isValid) {
            console.warn(`Invalid URL provided. URL: ${url}. Input string: ${input}. Options: ${JSON.stringify(options)}.`);
        }
    }

    if (typeof input === "string") {
        switch (type) {
            case "text":
                validateStringLength({ string: input, type: "text" });
                return [
                    {
                        type: "text",
                        text: {
                            content: input,
                            link: url ? { url: url } : null,
                        },
                        annotations: {
                            ...annotations,
                        },
                        ...(url ? { href: url } : {}),
                    },
                ];
            case "equation":
                validateStringLength({ string: input, type: "equation" });
                return [
                    {
                        type: "equation",
                        equation: {
                            expression: input,
                        },
                        annotations: {
                            ...annotations,
                        },
                        ...(url ? { href: url } : {}),
                    },
                ];
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
        } else {
            switch (type) {
                case "equation":
                    validateStringLength({ string: input.expression, type: "equation" });
                    return [
                        {
                            type: "equation",
                            equation: input,
                            annotations: {
                                ...annotations,
                            },
                            ...(url ? { href: url } : {}),
                        },
                    ];
                case "mention":
                    return [
                        {
                            type: "mention",
                            mention: input,
                            annotations: {
                                ...annotations,
                            },
                            ...(url ? { href: url } : {}),
                        },
                    ];
                default:
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
    if (!isValidUUID(userId)) {
        console.warn(`Invalid user ID. User ID: ${userId}.`);
    }

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
    if (!isValidUUID(databaseId)) {
        console.warn(`Invalid database ID. Database ID: ${databaseId}.`);
    }

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
    if (!isValidUUID(pageId)) {
        console.warn(`Invalid page ID. Page ID: ${pageId}.`);
    }

    return buildRichTextObj(
        { type: "page", page: { id: pageId } },
        { type: "mention", ...options }
    );
}

/**
 * Creates a link preview mention with shorthand syntax.
 * @param {string} url - The URL to create a link preview for
 * @param {Object} [options] - Additional options for the mention
 * @param {Object} [options.annotations] - Text annotations (bold, italic, etc.)
 * @param {string} [options.url] - URL for the mention
 * @returns {Array<Object>} - Array with a single Rich Text Object containing the link preview mention
 * 
 * @example
 * // Simple link preview mention
 * mentionLinkPreview("https://www.youtube.com/watch?v=dQw4w9WgXcQ")
 * 
 * // Link preview mention with annotations
 * mentionLinkPreview("https://example.com", { annotations: { bold: true } })
 */
export function mentionLinkPreview(url, options = {}) {
    validateStringLength({ string: url, type: "url" });
    return buildRichTextObj(
        { type: "link_preview", link_preview: { url } },
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
    const mentionTypes = new Set(["database", "date", "link_preview", "page", "template_mention", "user"]);
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
