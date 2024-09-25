import { enforceStringLength, isValidURL } from "./utils.mjs";

/**
 * Builds a Rich Text Object. See: https://developers.notion.com/reference/rich-text
 * @param {(string|Object)} input - The text content or input object. If string, the input can be normal text or an equation. If object, it can be a text, equation, or mention object.
 * @param {Object} annotations - Options for the Annotation object.
 * @param {boolean} annotations.bold - Bold text
 * @param {boolean} annotations.italic - Italic text
 * @param {boolean} annotations.strikethrough - Strikethrough text
 * @param {boolean} annotations.underline - Underlined text
 * @param {boolean} annotations.code - Code-style text
 * @param {string} annotations.color - String specifying the text's color or background color. Opts: "blue", "brown", "default", "gray", "green", "orange", "pink", "purple", "red", "yellow". All except "default" can also be used as a background color with "[color]_background" - example: "blue_background". See: https://developers.notion.com/reference/rich-text#the-annotation-object
 * @param {string} url - The URL for this object, if any. Creates a clickable link.
 * @param {string} [type=text] - An optional type for the Rich Text Object. Supports text, equation, and mention.
 * @returns {Array<Object>} - Array with a single Rich Text Object
 */
export function buildRichTextObj(input, annotations = {}, url, type = "text") {
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
            const isItalic = /^[\*_]{1}[\s\S]*?[\*_]{1}$/.test(string);
            const isBoldItalic = /^\*{3}[\s\S]*?\*{3}$/.test(string);

            let plainString = string;
            if (isBold || isItalic || isBoldItalic) {
                plainString = string.replace(/^(\*|_)+|(\*|_)+$/g, "");
            }

            return buildRichTextObj(
                plainString,
                {
                    bold: isBold || isBoldItalic,
                    italic: isItalic || isBoldItalic,
                },
                isURL ? plainString : null
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

    if (obj.type && obj.text && typeof obj.text.content === "string") {
        return obj;
    }

    console.warn(`Invalid rich text object. Returning empty rich text object.`);
    return buildRichTextObj("")[0];
}
