import { setIcon } from "./emoji-and-files.mjs";
import { enforceRichText } from "./rich-text.mjs";
import { isValidURL, validateDate } from "./utils.mjs";

/**
 * Object with methods for constructing Notion page metadata, including parent, page, block, property, cover, and icon.
 *
 * Parent creates a parent object. Page, block, and property create ID objects. Cover creates an external image object, while icon can create an external image object or an emoji object.
 *
 * @namespace
 */
export const page_meta = {
    /**
     * Metadata definition for a parent entity.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    parent: {
        type: "string",
        /**
         * Creates a parent object with a database_id or page_id.
         * @function
         * @param {Object} params - Parameters for creating parent metadata.
         * @param {string} params.id - The ID of the parent.
         * @param {string} params.type - The type of the parent ("database_id" or "page_id").
         * @returns {Object} A parent metadata object.
         */
        createMeta: ({ id, type }) => ({
            type: type,
            [type]: id,
        }),
    },

    /**
     * Metadata definition for a page ID property.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    page: {
        type: "string",
        /**
         * Creates a page_id object.
         * @function
         * @param {string} page_id - The ID of the page.
         * @returns {string} A string-validated page ID.
         */
        createMeta: (page_id) => ({
            page_id: validateValue(page_id),
        }),
    },

    /**
     * Metadata definition for a block ID property.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    block: {
        type: "string",
        /**
         * Creates a block_id object.
         * @function
         * @param {string} block_id - The ID of the block.
         * @returns {string} A string-validated block ID.
         */
        createMeta: (block_id) => ({
            block_id: validateValue(block_id),
        }),
    },

    /**
     * Metadata definition for a property ID property.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    property: {
        type: "string",
        /**
         * Creates a property_id object.
         * @function
         * @param {string} property_id - The ID of the property.
         * @returns {string} A string-validated property ID.
         */
        createMeta: (property_id) => ({
            propety_id: validateValue(property_id),
        }),
    },

    /**
     * Metadata definition for an icon.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    icon: {
        type: "string",
        /**
         * Creates an icon object.
         * @function
         * @param {string} value - The icon value (URL for "external" or emoji character).
         * @returns {Object} An icon metadata object.
         */
        createMeta: (value) => ({
            icon: setIcon(value),
        }),
    },

    /**
     * Metadata definition for a page cover.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    cover: {
        type: "string",
        /**
         * Creates a page cover object.
         * @function
         * @param {string} value - The URL of the cover image.
         * @returns {Object} A cover metadata object.
         */
        createMeta: (value) => ({
            cover: setIcon(value),
        }),
    },
};

/*
 * Quality-of-life functions for page meta:
 */

/**
 * Page shorthand methods - these allow you to call the createMeta() method for the properties of the page_meta object more quickly. Import them directly into a file, or call them on NotionHelper.
 * @namespace PageShorthand
 */

/**
 * Creates a parent database object.
 * @memberof PageShorthand
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
 * @memberof PageShorthand
 * @param {string} page_id - The ID of the parent page.
 * @returns {Object} A parent page object.
 */
export function parentPage(page_id) {
    return page_meta.parent.createMeta({ id: page_id, type: "page_id" });
}

/**
 * Creates a page_id object. Used for retrieving pages and page properties, updating page properties, and trashing pages.
 * @memberof PageShorthand
 * @param {string} page_id - The ID of the page to be read/updated/archived.
 * @returns {Object} A page_id object.
 */
export function pageId(page_id) {
    return page_meta.page.createMeta(page_id);
}

/**
 * Creates a block_id object. Used for all block endpoints.
 * @memberof PageShorthand
 * @param {string} block_id
 * @returns {Object} A block_id object.
 */
export function blockId(block_id) {
    return page_meta.block.createMeta(block_id);
}

/**
 * Creates a property_id object. Used for retrieving a page property item.
 * @memberof PageShorthand
 * @param {string} property_id
 * @returns {Object} A property_id object.
 */
export function propertyId(property_id) {
    return page_meta.property.createMeta(property_id);
}

/**
 * Creates a cover object.
 * @memberof PageShorthand
 * @param {string} url - The URL of the cover image.
 * @returns {Object} A cover object.
 */
export function cover(url) {
    return page_meta.cover.createMeta(url);
}

/**
 * Creates an icon object.
 * @memberof PageShorthand
 * @param {string} url - The URL of the icon image or an emoji character.
 * @returns {Object} An icon object.
 */
export function icon(url) {
    return page_meta.icon.createMeta(url);
}

/**
 * Object with methods for constructing each of the possible property types within a Notion database page.
 *
 * Property types include title, rich_text, checkbox, date, email, files, multi_select, number, people, phone_number, relation, select, status, and url.
 *
 * @namespace
 */
export const page_props = {
    /**
     * Methods for title properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    title: {
        type: "string[]",
        /**
         * Sets a title property's value.
         * @function
         * @param {Object[]} value - The array of Rich Text Objects for the title content.
         * @returns {Object} A title property object.
         *
         * Notion API will throw an error if title doesn't contain an array of Rich Text object(s) (RTOs).
         * setProp() will convert a string, or array of strings, to an array of Rich Text object(s).
         * On other invalid input, it will throw an error.
         */
        setProp: (value) => ({
            title: validateValue(value, "rich_text"),
        }),
    },

    /**
     * Methods for rich text properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    rich_text: {
        type: "string[]",
        returns: "rich_text",
        /**
         * Sets a rich text property's value.
         * @function
         * @param {Object[]} value - The array of Rich Text Objects for the rich text content.
         * @returns {Object} A rich text property object.
         */
        setProp: (value) => ({
            rich_text: validateValue(value, "rich_text"),
        }),
    },

    /**
     * Methods for checkbox properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    checkbox: {
        type: "boolean",
        returns: "boolean",
        /**
         * Sets a checkbox property's value.
         * @function
         * @param {boolean} value - The boolean value for the checkbox state.
         * @returns {Object} A checkbox property object.
         */
        setProp: (value) => ({
            checkbox: validateValue(value, "boolean"),
        }),
    },

    /**
     * Methods for date properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    date: {
        type: "string",
        returns: "date",
        /**
         * Sets a date property's value.
         * @function
         * @param {string} start - The start date.
         * @param {string} [end=null] - The optional end date.
         * @returns {Object} A date property object.
         */
        setProp: (start, end = null) => {
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
     * Methods for email properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    email: {
        type: "string",
        returns: "email",
        /**
         * Sets an email property's value.
         * @function
         * @param {string} value - The email address.
         * @returns {Object} An email property object.
         */
        setProp: (value) => ({
            email: validateValue(value, "string"),
        }),
    },

    /**
     * Methods for files properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    files: {
        type: "string[]",
        returns: "array",
        /**
         * Sets a files property's value.
         * @function
         * @param {(string|Array<string>|Array<{name: string, url: string})>} fileArray - A url string, or an array of url strings, or an array of file objects.
         * @returns {Object} A files property object.
         */
        setProp: (files) => {
            if (typeof files === "string") {
                // string case
                if (!validateValue(files, "url")) {
                    return {
                        files: null,
                    };
                } else {
                    return {
                        files: [
                            {
                                external: {
                                    url: validateValue(files, "url"),
                                },
                            },
                        ],
                    };
                }
            } else if (Array.isArray(files)) {
                if (files.every((file) => typeof file === "object")) {
                    // array of file objects
                    const fileObjects = files
                        .map((file) => {
                            if (!file.url || !validateValue(file.url, "url")) {
                                return null;
                            } else {
                                return {
                                    ...(file.name &&
                                        file.name !== "" && {
                                            name: validateValue(
                                                file.name,
                                                "string"
                                            ),
                                        }),
                                    external: {
                                        url: validateValue(file.url, "url"),
                                    },
                                };
                            }
                        })
                        .filter(Boolean);

                    if (fileObjects.length < 1) {
                        return {
                            files: null,
                        };
                    } else {
                        return {
                            files: fileObjects,
                        };
                    }
                } else {
                    // array of url strings
                    const fileObjects = files
                        .map((file) => {
                            if (!validateValue(file, "url")) {
                                return null;
                            } else {
                                return {
                                    external: {
                                        url: validateValue(file, "url"),
                                    },
                                };
                            }
                        })
                        .filter(Boolean);

                    if (fileObjects.length < 1) {
                        return {
                            files: null,
                        };
                    } else {
                        return {
                            files: fileObjects,
                        };
                    }
                }
            } else {
                return {
                    files: null,
                };
            }
        },
    },

    /**
     * Methods for multi_select properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    multi_select: {
        type: "string[]",
        returns: "array",
        /**
         * Sets a multi_select property's value.
         * @function
         * @param {(string|string[])} values - A single string value or an array of string values.
         * @returns {Object} A multi-select property object.
         */
        setProp: (values) => {
            if (typeof values === "string") {
                // single string case
                const validatedValue = validateValue(values, "string");
                return {
                    multi_select: validatedValue
                        ? [{ name: validatedValue }]
                        : null,
                };
            } else if (Array.isArray(values)) {
                // array case
                const validValues = values
                    .map((value) => {
                        const validatedValue = validateValue(value, "string");
                        return validatedValue ? { name: validatedValue } : null;
                    })
                    .filter(Boolean);

                return {
                    multi_select: validValues.length > 0 ? validValues : null,
                };
            } else {
                // invalid input
                return {
                    multi_select: null,
                };
            }
        },
    },

    /**
     * Methods for number properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    number: {
        type: "number",
        returns: "number",
        /**
         * Sets a number property's value.
         * @function
         * @param {(number|string)} value - The numeric value. A string may also be passed, and setProp() will attempt to convert it to a number.
         * @returns {Object} A number property object.
         */
        setProp: (value) => ({
            number: validateValue(value, "number"),
        }),
    },

    /**
     * Methods for people properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    people: {
        type: "string[]",
        returns: "array",
        /**
         * Sets a people property's value.
         * @function
         * @param {(string|string[])} values - A single person ID or an array of person IDs.
         * @returns {Object} A people property object.
         */
        setProp: (values) => {
            if (typeof values === "string") {
                // single string case
                const person = validateValue(values, "string");
                return {
                    people: person ? [{ object: "user", id: person }] : null,
                };
            } else if (Array.isArray(values)) {
                // array case
                const people = values
                    .map((value) => {
                        const person = validateValue(value, "string");
                        return person ? { object: "user", id: person } : null;
                    })
                    .filter(Boolean);

                return {
                    people: people.length > 0 ? people : null,
                };
            } else {
                // invalid input
                return {
                    people: null,
                };
            }
        },
    },

    /**
     * Methods for phone_number properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    phone_number: {
        type: "string",
        returns: "string",
        /**
         * Sets a phone number property's value.
         * @function
         * @param {string} value - The phone number.
         * @returns {Object} A phone number property object.
         */
        setProp: (value) => ({
            phone_number: validateValue(value, "string"),
        }),
    },

    /**
     * Methods for relation properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    relation: {
        type: "string[]",
        returns: "array",
        /**
         * Sets a relation property's value.
         * @function
         * @param {(string|string[])} values - A single page ID or an array of page IDs.
         * @returns {Object} A relation property object.
         */
        setProp: (values) => {
            if (typeof values === "string") { // single string case
                const page = validateValue(values, "string");
                return {
                    relation: page ? [{ id: page }] : null,
                };
            } else if (Array.isArray(values)) { // array case
                const pages = values
                    .map((value) => {
                        const page = validateValue(value, "string");
                        return page ? { id: page } : null;
                    })
                    .filter(Boolean);

                return {
                    relation: pages.length > 0 ? pages : null,
                };
            } else { // invalid input
                return {
                    relation: null,
                };
            }
        },
    },

    /**
     * Methods for select properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    select: {
        type: "string",
        returns: "string",
        /**
         * Sets a select property's value.
         * @function
         * @param {string} value - The selected value.
         * @returns {Object} A select property object.
         */
        setProp: (value) => ({
            select: {
                name: validateValue(value, "string"),
            },
        }),
    },

    /**
     * Methods for status properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    status: {
        type: "string",
        returns: "string",
        /**
         * Sets a status property's value.
         * @function
         * @param {string} value - The status value.
         * @returns {Object} A status property object.
         */
        setProp: (value) => ({
            status: {
                name: validateValue(value, "string"),
            },
        }),
    },

    /**
     * Methods for URL properties.
     *
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    url: {
        type: "string",
        returns: "string",
        /**
         * Sets a URL property's value.
         * @function
         * @param {string} value - The URL.
         * @returns {Object} A URL property object.
         */
        setProp: (value) => ({
            url: validateValue(value, "string"),
        }),
    },
};

/*
 * Quality-of-life functions for page props:
 */

/**
 * Property shorthand methods - these allow you to call the setProp() method for the properties of the page_props object more quickly. Import them directly into a file, or call them on NotionHelper.
 * @namespace PropertyShorthand
 */

/**
 * Creates a title property object.
 * @memberof PropertyShorthand
 * @param {string|string[]} value - The title content, either a string or an array of strings.
 * @returns {Object} A title property object.
 */
export function title(value) {
    return page_props.title.setProp(value);
}

/**
 * Creates a rich text property object.
 * @memberof PropertyShorthand
 * @param {string|string[]} value - The rich text content, either a string or an array of strings.
 * @returns {Object} A rich text property object.
 */
export function richText(value) {
    return page_props.rich_text.setProp(value);
}

/**
 * Creates a checkbox property object.
 * @memberof PropertyShorthand
 * @param {boolean} value - The boolean value for the checkbox state.
 * @returns {Object} A checkbox property object.
 */
export function checkbox(value) {
    return page_props.checkbox.setProp(value);
}

/**
 * Creates a date property object.
 * @memberof PropertyShorthand
 * @param {string} start - The start date in ISO 8601 format.
 * @param {string} [end] - The optional end date in ISO 8601 format.
 * @returns {Object} A date property object.
 */
export function date(start, end) {
    return page_props.date.setProp(start, end);
}

/**
 * Creates an email property object.
 * @memberof PropertyShorthand
 * @param {string} value - The email address.
 * @returns {Object} An email property object.
 */
export function email(value) {
    return page_props.email.setProp(value);
}

/**
 * Creates a files property object.
 * @memberof PropertyShorthand
 * @param {(string|Array<string>|Array<{name: string, url: string})>} files - A url string, or an array of url strings, or an array of file objects.
 * @returns {Object} A files property object.
 */
export function files(files) {
    return page_props.files.setProp(files);
}

/**
 * Creates a multi-select property object.
 * @memberof PropertyShorthand
 * @param {(string|string[])} values - A single string value or an array of string values.
 * @returns {Object} A multi-select property object.
 */
export function multiSelect(values) {
    return page_props.multi_select.setProp(values);
}

/**
 * Creates a number property object.
 * @memberof PropertyShorthand
 * @param {number|string} value - The numeric value. A string may also be passed, and it will be converted to a number if possible.
 * @returns {Object} A number property object.
 */
export function number(value) {
    return page_props.number.setProp(value);
}

/**
 * Creates a people property object.
 * @memberof PropertyShorthand
 * @param {(string|string[])} people - A single person ID or an array of person IDs.
 * @returns {Object} A people property object.
 */
export function people(people) {
    return page_props.people.setProp(people);
}

/**
 * Creates a phone number property object.
 * @memberof PropertyShorthand
 * @param {string} value - The phone number.
 * @returns {Object} A phone number property object.
 */
export function phoneNumber(value) {
    return page_props.phone_number.setProp(value);
}

/**
 * Creates a relation property object.
 * @memberof PropertyShorthand
 * @param {(string|string[])} values - A single page ID or an array of page IDs.
 * @returns {Object} A relation property object.
 */
export function relation(values) {
    return page_props.relation.setProp(values);
}

/**
 * Creates a select property object.
 * @memberof PropertyShorthand
 * @param {string} value - The selected value.
 * @returns {Object} A select property object.
 */
export function select(value) {
    return page_props.select.setProp(value);
}

/**
 * Creates a status property object.
 * @memberof PropertyShorthand
 * @param {string} value - The status value.
 * @returns {Object} A status property object.
 */
export function status(value) {
    return page_props.status.setProp(value);
}

/**
 * Creates a URL property object.
 * @memberof PropertyShorthand
 * @param {string} value - The URL.
 * @returns {Object} A URL property object.
 */
export function url(value) {
    return page_props.url.setProp(value);
}

/**
 * Validates values passed to the setProp() methods above. Performs some transformation in certain cases.
 *
 * @param {*} value - the value being passed to setProp(), which invokes this function
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
