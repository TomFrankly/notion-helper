import { enforceStringLength, isValidURL } from "./utils.mjs";

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

    if (typeof input === "string") {
        switch (type) {
            case "text":
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
                    },
                ];
            case "equation":
                return [
                    {
                        type: "equation",
                        equation: {
                            expression: input,
                        },
                        annotations: {
                            ...annotations,
                        },
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
                    const error = `Unsupported rich text type: ${input.type}`;
                    console.error(error);
                    throw new Error(error);
            }
        }
    }

    const error = `Invalid input send to buildRichTextObj()`;
    console.error(error);
    throw new Error(error);
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
        return obj;
    }
    if (obj?.type === "equation" && typeof obj?.equation?.expression === "string") {
        return obj;
    }
    if (obj?.type === "mention" && obj?.mention && typeof obj.mention === "object") {
        return obj;
    }

    // Shorthand: equation provided as { type: "equation", expression: "..." }
    if (obj?.type === "equation" && typeof obj?.expression === "string") {
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
