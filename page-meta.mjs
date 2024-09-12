import { block } from "./blocks.mjs";
import { setIcon } from "./emoji-and-files.mjs";
import {
    buildRichTextObj,
    enforceRichText,
    enforceRichTextObject,
} from "./rich-text.mjs";
import { isValidURL, validateDate } from "./utils.mjs";

/*
 * Object with methods for constructing Notion page metadata, including parent, cover, and icon.
 */
export const page_meta = {
    /**
     * Metadata definition for a parent entity.
     * @method createMeta
     * @param {Object} params - Parameters for creating parent metadata.
     * @param {string} params.id - The ID of the parent.
     * @param {string} params.type - The type of the parent ("database_id" or "page_id").
     * @returns {Object} A parent metadata object.
     */
    parent: {
        type: "string",
        createMeta: ({ id, type }) => ({
            type: type,
            [type]: id,
        }),
    },

    /**
     * Metadata definition for a page ID property.
     * @method createMeta
     * @param {string} page_id - The ID of the page.
     * @returns {string} A string-validated page ID.
     */
    page: {
        type: "string",
        createMeta: (page_id) => ({
            page_id: validateValue(page_id),
        }),
    },

    /**
     * Metadata definition for a block ID property.
     * @method createMeta
     * @param {string} block_id - The ID of the block.
     * @returns {string} A string-validated block ID.
     */
    block: {
        type: "string",
        createMeta: (block_id) => ({
            block_id: validateValue(block_id)
        })
    },

    /**
     * Metadata definition for a property ID property.
     * @method createMeta
     * @param {string} property_id - The ID of the property.
     * @returns {string} A string-validated property ID.
     */
    property: {
        type: "string",
        createMeta: (property_id) => ({
            propety_id: validateValue(property_id)
        })
    },

    /**
     * Metadata definition for an icon.
     * @method createMeta
     * @param {string} value - The icon value (URL for "external" or emoji character).
     * @returns {Object} An icon metadata object.
     */
    icon: {
        type: "string",
        createMeta: (value) => ({
            icon: setIcon(value),
        }),
    },

    /**
     * Metadata definition for a page cover.
     * @method createMeta
     * @param {string} value - The URL of the cover image.
     * @returns {Object} A cover metadata object.
     */
    cover: {
        type: "string",
        createMeta: (value) => ({
            cover: setIcon(value),
        }),
    },
};

/*
 * Quality-of-life functions for page meta:
 */

/**
 * Creates a parent database object.
 * @param {string} database_id - The ID of the parent database.
 * @returns {Object} A parent database object.
 */
export function parentDb(database_id) {
    return page_meta.parent.createMeta({
        id: database_id,
        type: "database_id",
    });
}

/**
 * Creates a parent page object.
 * @param {string} page_id - The ID of the parent page.
 * @returns {Object} A parent page object.
 */
export function parentPage(page_id) {
    return page_meta.parent.createMeta({ id: page_id, type: "page_id" });
}

/**
 * Creates a page_id object. Used for retrieving pages and page properties, updating page properties, and trashing pages.
 * @param {string} page_id - The ID of the page to be read/updated/archived.
 * @returns {Object} A page_id object.
 */
export function pageId(page_id) {
    return page_meta.page.createMeta(page_id);
}

/**
 * Creates a block_id object. Used for all block endpoints.
 * @param {string} block_id 
 * @returns {Object} A block_id object.
 */
export function blockId(block_id) {
    return page_meta.block.createMeta(block_id)
}

/**
 * Creates a property_id object. Used for retrieving a page property item.
 * @param {string} property_id 
 * @returns {Object} A property_id object.
 */
export function propertyId(property_id) {
    return page_meta.property.createMeta(property_id)
}

/**
 * Creates a cover object.
 * @param {string} url - The URL of the cover image.
 * @returns {Object} A cover object.
 */
export function cover(url) {
    return page_meta.cover.createMeta(url);
}

/**
 * Creates an icon object.
 * @param {string} url - The URL of the icon image or an emoji character.
 * @returns {Object} An icon object.
 */
export function icon(url) {
    return page_meta.icon.createMeta(url);
}

/*
 * Object with methods for constructing each of the possible property types within a Notion database page.
 */

export const page_props = {
    /**
     * Title property method.
     * @method createProp
     * @param {Object[]} value - The array of Rich Text Objects for the title content.
     * @returns {Object} A title property object.
     *
     * Notion API will throw an error if title doesn't contain an array of Rich Text object(s) (RTOs).
     * createProp() will convert a string, or array of strings, to an array of Rich Text object(s).
     * On other invalid input, it will throw an error.
     */
    title: {
        type: "string[]",
        returns: "rich_text",
        createProp: (value) => ({
            title: validateValue(value, "rich_text"),
        }),
    },

    /**
     * Rich text property method.
     * @method createProp
     * @param {Object[]} value - The array of Rich Text Objects for the rich text content.
     * @returns {Object} A rich text property object.
     */
    rich_text: {
        type: "string[]",
        returns: "rich_text",
        createProp: (value) => ({
            rich_text: validateValue(value, "rich_text"),
        }),
    },

    /**
     * Checkbox property method.
     * @method createProp
     * @param {boolean} value - The boolean value for the checkbox state.
     * @returns {Object} A checkbox property object.
     */
    checkbox: {
        type: "boolean",
        returns: "boolean",
        createProp: (value) => ({
            checkbox: validateValue(value, "boolean"),
        }),
    },

    /**
     * Date property method.
     * @method createProp
     * @param {string} start - The start date.
     * @param {string} [end=null] - The optional end date.
     * @returns {Object} A date property object.
     */
    date: {
        type: "string",
        returns: "date",
        createProp: (start, end = null) => {
            const date = {
                date: {
                    start: validateValue(start, "date"),
                    end: end ? validateValue(end, "date") : null,
                },
            };

            if (!date || !date.date || date.date.start == null) {
                return {
                    date: null,
                };
            }

            return date;
        },
    },

    /**
     * Email property method.
     * @method createProp
     * @param {string} value - The email address.
     * @returns {Object} An email property object.
     */
    email: {
        type: "string",
        returns: "email",
        createProp: (value) => ({
            email: validateValue(value, "string"),
        }),
    },

    /**
     * Files property method.
     * @method createProp
     * @param {Array<{name: string, url: string}>} fileArray - The array of file objects.
     * @returns {Object} A files property object.
     */
    files: {
        type: "string[]",
        returns: "array", // Type not currently used for validation
        createProp: (fileArray) => {
            const files = fileArray.map((file) => {
                if (!validateValue(file.url, "url")) {
                    return null;
                } else {
                    return {
                        name: validateValue(file.name, "string"),
                        external: {
                            url: validateValue(file.url, "url"),
                        },
                    };
                }
            });

            if (files.every((file) => file === null)) {
                return {
                    files: null,
                };
            } else {
                return {
                    files: files,
                };
            }
        },
    },

    /**
     * Multi-select property method.
     * @method createProp
     * @param {string[]} valuesArray - The array of selected values.
     * @returns {Object} A multi-select property object.
     */
    multi_select: {
        type: "string[]",
        returns: "array", // Not currently used for validation
        createProp: (valuesArray) => ({
            multi_select: valuesArray.map((value) => ({
                name: validateValue(value, "string"),
            })),
        }),
    },

    /**
     * Number property method.
     * @method createProp
     * @param {(number|string)} value - The numeric value. A string may also be passed, and createProp() will attempt to convert it to a number.
     * @returns {Object} A number property object.
     */
    number: {
        type: "number",
        returns: "number",
        createProp: (value) => ({
            number: validateValue(value, "number"),
        }),
    },

    /**
     * People property method.
     * @method createProp
     * @param {string[]} personArray - The array of person IDs.
     * @returns {Object} A people property object.
     */
    people: {
        type: "string[]",
        returns: "array", // Not currently used for validation
        createProp: (personArray) => {
            const people = personArray.map((person) => {
                if (!validateValue(person, "string")) {
                    return null;
                } else {
                    return {
                        object: "user",
                        id: validateValue(person, "string"),
                    };
                }
            });

            if (people.every((person) => person === null)) {
                return null;
            } else {
                return {
                    people: people,
                };
            }
        },
    },

    /**
     * Phone number property method.
     * @method createProp
     * @param {string} value - The phone number.
     * @returns {Object} A phone number property object.
     */
    phone_number: {
        type: "string",
        returns: "string",
        createProp: (value) => ({
            phone_number: validateValue(value, "string"),
        }),
    },

    /**
     * Relation property method.
     * @method createProp
     * @param {string[]} pageArray - The array of related page IDs.
     * @returns {Object} A relation property object.
     */
    relation: {
        type: "string[]",
        createProp: (pageArray) => {
            const pages = pageArray.map((page) => {
                if (!validateValue(page, "string")) {
                    return null;
                } else {
                    return {
                        id: validateValue(page, "string"),
                    };
                }
            });

            if (pages.every((page) => page === null)) {
                return null;
            } else {
                return {
                    relation: pages,
                };
            }
        },
    },

    /**
     * Select property method.
     * @method createProp
     * @param {string} value - The selected value.
     * @returns {Object} A select property object.
     */
    select: {
        type: "string",
        returns: "string",
        createProp: (value) => ({
            select: {
                name: validateValue(value, "string"),
            },
        }),
    },

    /**
     * Status property method.
     * @method createProp
     * @param {string} value - The status value.
     * @returns {Object} A status property object.
     */
    status: {
        type: "string",
        returns: "string",
        createProp: (value) => ({
            status: {
                name: validateValue(value, "string"),
            },
        }),
    },

    /**
     * URL property method.
     * @method createProp
     * @param {string} value - The URL.
     * @returns {Object} A URL property object.
     */
    url: {
        type: "string",
        returns: "string",
        createProp: (value) => ({
            url: validateValue(value, "string"),
        }),
    },
};

/*
 * Quality-of-life functions for page props:
 */

/**
 * Creates a title property object.
 * @param {string|string[]} value - The title content, either a string or an array of strings.
 * @returns {Object} A title property object.
 */
export function title(value) {
    return page_props.title.createProp(value);
}

/**
 * Creates a rich text property object.
 * @param {string|string[]} value - The rich text content, either a string or an array of strings.
 * @returns {Object} A rich text property object.
 */
export function richText(value) {
    return page_props.rich_text.createProp(value);
}

/**
 * Creates a checkbox property object.
 * @param {boolean} value - The boolean value for the checkbox state.
 * @returns {Object} A checkbox property object.
 */
export function checkbox(value) {
    return page_props.checkbox.createProp(value);
}

/**
 * Creates a date property object.
 * @param {string} start - The start date in ISO 8601 format.
 * @param {string} [end] - The optional end date in ISO 8601 format.
 * @returns {Object} A date property object.
 */
export function date(start, end) {
    return page_props.date.createProp(start, end);
}

/**
 * Creates an email property object.
 * @param {string} value - The email address.
 * @returns {Object} An email property object.
 */
export function email(value) {
    return page_props.email.createProp(value);
}

/**
 * Creates a files property object.
 * @param {Array<{name: string, url: string}>} fileArray - The array of file objects.
 * @returns {Object} A files property object.
 */
export function files(fileArray) {
    return page_props.files.createProp(fileArray);
}

/**
 * Creates a multi-select property object.
 * @param {string[]} valuesArray - The array of selected values.
 * @returns {Object} A multi-select property object.
 */
export function multiSelect(valuesArray) {
    return page_props.multi_select.createProp(valuesArray);
}

/**
 * Creates a number property object.
 * @param {number|string} value - The numeric value. A string may also be passed, and it will be converted to a number if possible.
 * @returns {Object} A number property object.
 */
export function number(value) {
    return page_props.number.createProp(value);
}

/**
 * Creates a people property object.
 * @param {string[]} personArray - The array of person IDs.
 * @returns {Object} A people property object.
 */
export function people(personArray) {
    return page_props.people.createProp(personArray);
}

/**
 * Creates a phone number property object.
 * @param {string} value - The phone number.
 * @returns {Object} A phone number property object.
 */
export function phoneNumber(value) {
    return page_props.phone_number.createProp(value);
}

/**
 * Creates a relation property object.
 * @param {string[]} pageArray - The array of related page IDs.
 * @returns {Object} A relation property object.
 */
export function relation(pageArray) {
    return page_props.relation.createProp(pageArray);
}

/**
 * Creates a select property object.
 * @param {string} value - The selected value.
 * @returns {Object} A select property object.
 */
export function select(value) {
    return page_props.select.createProp(value);
}

/**
 * Creates a status property object.
 * @param {string} value - The status value.
 * @returns {Object} A status property object.
 */
export function status(value) {
    return page_props.status.createProp(value);
}

/**
 * Creates a URL property object.
 * @param {string} value - The URL.
 * @returns {Object} A URL property object.
 */
export function url(value) {
    return page_props.url.createProp(value);
}

/**
 * Validates values passed to the createProp() methods above. Performs some transformation in certain cases.
 *
 * @param {*} value - the value being passed to createProp(), which invokes this function
 * @param {string} type - the type of value expected by this Notion API property
 * @returns
 */
function validateValue(value, type) {
    if (
        value === undefined ||
        value === null ||
        !type ||
        typeof type !== "string"
    ) {
        console.error(
            `Invalid value or type variable provided to validateValue().`
        );
        throw new Error(
            `Invalid value or type variable provided to validateValue().`
        );
    }

    if (type === "rich_text") {
        return enforceRichText(value);
    }

    if (type === "number") {
        if (typeof value === "string") {
            console.warn(
                `String data passed to a number property. Attempting to convert to a number.`
            );
            const num = Number(value);

            if (!isNaN(num)) {
                return num;
            } else {
                return null;
            }
        }

        if (typeof value !== "number") {
            console.warn(
                `Invalid data type passed to a number property. Returning null.`
            );
            return null;
        }

        return value;
    }

    if (type === "boolean") {
        if (typeof value !== "boolean") {
            console.warn(
                `Invalid data type passed to a boolean property. Returning null.`
            );
            return null;
        }

        return value;
    }

    if (type === "date") {
        return validateDate(value);
    }

    if (type === "string") {
        if (typeof value !== "string") {
            console.warn(
                `Invalid data type passed to a string property. Returning null.`
            );
            return null;
        }

        return value;
    }

    if (type === "url") {
        if (typeof value !== "string") {
            console.warn(
                `Invalid data type passed to a url property. Returning null.`
            );
            return null;
        }

        if (isValidURL(value)) {
            return value;
        } else {
            console.warn(`Invalid URL. Returning null.`);
            return null;
        }
    }

    console.warn(
        `Type specified to validateValue is not a valid type. Returning the input...`
    );
    return value;
}
