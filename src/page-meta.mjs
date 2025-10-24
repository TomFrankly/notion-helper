import { setIcon } from "./emoji-and-files.mjs";
import { enforceRichText } from "./rich-text.mjs";
import { isValidURL, isValidUUID, validateDate, validateStringLength, validateArrayLength } from "./utils.mjs";

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
         * Creates a parent object with a data_source_id, page_id, or database_id.
         * @function
         * @param {Object} params - Parameters for creating parent metadata.
         * @param {string} params.id - The ID of the parent.
         * @param {string} params.type - The type of the parent ("data_source_id", "page_id", or "database_id" (database_id is deprecated)).
         * @returns {Object} A parent metadata object.
         */
        createMeta: ({ id, type }) => {
            if (type === "database_id") {
                console.warn("Creating a page with a parent database_id is deprecated, and will not work in databases with more than one data source. Use parentDataSource() with a data_source_id instead.");
            }

            // Handle common mistakes in the 'type' parameter
            if (typeof type === "string") {
                const normalized = type.toLowerCase().replace(/[-_]/g, "");
                if (["page", "pageid"].includes(normalized)) {
                    type = "page_id";
                } else if (["database", "databaseid"].includes(normalized)) {
                    type = "database_id";
                } else if (["datasource", "datasourceid", "datasource_id", "data_source", "data_sourceid", "data_source_id"].includes(normalized)) {
                    type = "data_source_id";
                }
            }

            return {
                type: type,
                [type]: id,
            };
        },
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
        createMeta: (page_id) => validateValue(page_id, "UUID"),
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
        createMeta: (block_id) => validateValue(block_id, "UUID"),
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
        createMeta: (property_id) => validateValue(property_id, "string"),
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
        createMeta: (value) => setIcon(value),
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
        createMeta: (value) => setIcon(value),
    },

    /**
     * Metadata definition for a data source template.
     * 
     * @namespace
     * @property {string} type - The data type the property accepts.
     */
    template: {
        type: "string",
        /**
         * Creates a data source template object.
         * @function
         * @param {(Object|string)} templateChoice - The template to use for the page. Can be:
         *   - A fully-formed template object, e.g.:
         *     {
         *       type: "template_id",
         *       template_id: "your-template-id"
         *     }
         *   - A string value:
         *     - "none": Do not use a template.
         *     - "default": Use the default template, if available.
         *     - A valid template page ID (a valid UUID string).
         * @returns {Object} A data source template metadata object.
         */
        createMeta: (templateChoice) => {
            if (templateChoice === undefined || templateChoice === null || typeof templateChoice !== "string" && typeof templateChoice !== "object") {
                console.warn("template() method called in builder without a valid template choice. Ignoring this method call.");
                return null;
            }
            
            if (typeof templateChoice === "string") {
                if (templateChoice === "none") {
                    return null;
                } else if (templateChoice === "default") {
                    return { type: "default" };
                } else if (isValidUUID(templateChoice)) {
                    return { type: "template_id", template_id: templateChoice };
                } else {
                    console.warn(`Invalid template choice: ${templateChoice} – returning null.`)
                    return null;
                }
            } else if (typeof templateChoice === "object") {
                // Check that the object has a type property
                if (!templateChoice.hasOwnProperty("type")) {
                    console.warn(`Template object does not have a "type" property. Returning null.`);
                    return null;
                }
                
                if (templateChoice.type === "template_id" && templateChoice.hasOwnProperty("template_id") && isValidUUID(templateChoice.template_id)) {
                    return templateChoice;
                } else if (templateChoice.type === "default" || templateChoice.type === "none") {
                    return templateChoice;
                } else {
                    console.warn(`Invalid template choice: ${templateChoice} – returning null.`)
                    return null;
                }
            }
        }
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
 * Creates a parent database object. Deprecated in September 2025. Will not work in databases with more than one data source.
 * @memberof PageShorthand
 * @param {string} database_id - The ID of the parent database.
 * @returns {Object} A parent database object.
 */
export function parentDatabase(database_id) {
    return page_meta.parent.createMeta({
        id: database_id,
        type: "database_id",
    });
}

/**
 * Alias for parentDatabase(). Creates a parent database object. Deprecated in September 2025. Will not work in databases with more than one data source.
 * @memberof PageShorthand
 * @param {string} database_id - The ID of the parent database.
 * @returns {Object} A parent database object.
 */
export function parentDb(database_id) {
    return parentDatabase(database_id);
}

/**
 * Creates a parent data source object.
 * @memberof PageShorthand
 * @param {string} data_source_id - The ID of the parent data source.
 * @returns {Object} A parent data source object.
 */
export function parentDataSource(data_source_id) {
    return page_meta.parent.createMeta({ 
        id: data_source_id, 
        type: "data_source_id" 
    });
}

/**
 * Alias for parentDataSource(). Creates a parent data source object.
 * @memberof PageShorthand
 * @param {string} data_source_id - The ID of the parent data source.
 * @returns {Object} A parent data source object.
 */
export function parentDs(data_source_id) {
    return parentDataSource(data_source_id);
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
            email: validateValue(value, "email"),
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
         * @param {(string|Array<string|Array<string>|Object>|Object)} files - A url/file ID string, an array of url/file ID strings, an array of [url/file ID, name] arrays, an array of file objects, or a single file object. File objects can be simple - ({ name, url }) or ({ name, id }) - or fully constructed ({ name, external: { url }}) or ({ name, file_upload: { id }})
         * @param {string} [fileName] - a name for a singular file. Used if a string value is passed for the files parameter. If not provided, the file's URL/ID will be used for the name.
         * @returns {Object} A files property object.
         */
        setProp: (files, fileName) => {
            const processFile = (file) => {
                if (typeof file === "string") {
                    const isFileUpload = validateValue(file, "UUID");
                    const isExternal = validateValue(file, "url");
                    const isValidFile = isFileUpload || isExternal;
                    const needsName = isExternal || (isFileUpload && fileName);
                    
                    if (!isValidFile) {
                        return null;
                    } else {
                        return {
                            ...(needsName && { name: fileName && fileName !== ""
                                ? validateValue(fileName, "string")
                                : validateValue(file, "string") }),
                            [isExternal ? "external" : "file_upload"]: {
                                [isExternal ? "url" : "id"]: file,
                            },
                        };
                    }
                } else if (Array.isArray(file) && file.length === 2) {
                    const [urlOrId, name] = file;
                    const isFileUpload = validateValue(urlOrId, "UUID");
                    const isExternal = validateValue(urlOrId, "url");
                    const isValidFile = isFileUpload || isExternal;
                    const needsName = isExternal || (isFileUpload && name);

                    if (!isValidFile) {
                        return null;
                    } else {
                        return {
                            ...(needsName && { name: validateValue(name, "string")
                                ? validateValue(name, "string")
                                : validateValue(urlOrId, "string") }),
                            [isExternal ? "external" : "file_upload"]: {
                                [isExternal ? "url" : "id"]: urlOrId,
                            },
                        };
                    }
                } else if (typeof file === "object") {
                    if (file.external && file.external.url) {
                        if (!validateValue(file.external.url, "url")) {
                            return null;
                        } else {
                            return {
                                name: validateValue(file.name, "string")
                                    ? validateValue(file.name, "string")
                                    : validateValue(
                                          file.external.url,
                                          "string"
                                      ),
                                external: {
                                    url: validateValue(
                                        file.external.url,
                                        "url"
                                    ),
                                },
                            };
                        }
                    } else if (file.file_upload && file.file_upload.id) {
                        if (!validateValue(file.file_upload.id, "UUID")) {
                            return null;
                        } else {
                            return {
                                ...(file.name && validateValue(file.name, "string") !== "" && { name: validateValue(file.name, "string") }),
                                file_upload: { id: file.file_upload.id },
                            };
                        }
                    } else if (file.url) {
                        if (!validateValue(file.url, "url")) {
                            return null;
                        } else {
                            return {
                                name: validateValue(file.name, "string")
                                    ? validateValue(file.name, "string")
                                    : validateValue(file.url, "string"),
                                external: {
                                    url: validateValue(file.url, "url"),
                                },
                            };
                        }
                    } else if (file.id) {
                        if (!validateValue(file.id, "UUID")) {
                            return null;
                        } else {
                            return {
                                ...(file.name && validateValue(file.name, "string") !== "" && { name: validateValue(file.name, "string") }),
                                file_upload: { id: validateValue(file.id, "UUID") },
                            };
                        }
                    }
                }

                return null;
            };

            let fileObjects;

            if (typeof files === "string") {
                fileObjects = [processFile(files)];
            } else if (Array.isArray(files)) {
                fileObjects = files.map(processFile).filter(Boolean);
            } else if (typeof files === "object") {
                fileObjects = [processFile(files)];
            } else {
                return {
                    files: null,
                };
            }

            return fileObjects.length > 0
                ? {
                      files: fileObjects,
                  }
                : {
                      files: null,
                  };
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
                validateArrayLength({ array: values, type: "multi_select" });
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
         * @param {(string|Array<string|Object>)} values - A single person ID, an array of person IDs, an array of user objects, or a single user object.
         * @returns {Object} A people property object.
         */
        setProp: (values) => {
            const processUser = (value) => {
                if (typeof value === "string") {
                    const person = validateValue(value, "string");
                    return person ? { object: "user", id: person } : null;
                } else if (typeof value === "object" && value !== null) {
                    if (value.id && value.id !== "") {
                        return {
                            object: "user",
                            id: value,
                        };
                    }
                }

                return null;
            };

            let people;

            if (typeof values === "string") {
                people = [processUser(values)];
            } else if (Array.isArray(values)) {
                validateArrayLength({ array: values, type: "people" });
                people = values.map(processUser).filter(Boolean);
            } else if (typeof values === "object" && values !== null) {
                people = [processUser(values)];
            } else {
                return {
                    people: null,
                };
            }

            return {
                people: people.length > 0 ? people : null,
            };
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
            phone_number: validateValue(value, "phone_number"),
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
         * @param {(string|Array<string|Object>)} values - A single page ID, an array of page IDs, an array of page objects, or a single page object.
         * @returns {Object} A relation property object.
         */
        setProp: (values) => {
            const processRelation = (value) => {
                if (typeof value === "string") {
                    const page = validateValue(value, "string");
                    return page ? { id: page } : null;
                } else if (typeof value === "object") {
                    if (value.id) {
                        return { id: validateValue(value.id, "string") };
                    }
                }
                return null;
            };

            let relations;

            if (typeof values === "string") {
                // Single string case
                relations = [processRelation(values)];
            } else if (Array.isArray(values)) {
                // Array case
                validateArrayLength({ array: values, type: "relation" });
                relations = values.map(processRelation).filter(Boolean);
            } else if (typeof values === "object") {
                // Single object case
                relations = [processRelation(values)];
            } else {
                // Invalid input
                return { relation: null };
            }

            return {
                relation: relations.length > 0 ? relations : null,
            };
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
            url: validateValue(value, "url"),
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

    if (type === "email") {
        if (typeof value !== "string") {
            console.warn(
                `Invalid data type passed to a email property. Returning null.`
            );
            return null;
        }

        validateStringLength({ string: value, type: "email" });
        return value;
    }

    if (type === "phone_number") {
        if (typeof value !== "string") {
            console.warn(
                `Invalid data type passed to a phone number property. Returning null.`
            );
            return null;
        }
                
        validateStringLength({ string: value, type: "phone_number" });
        return value;
    }

    if (type === "UUID") {
        if (isValidUUID(value)) {
            return value;
        } else {
            console.warn(`Invalid UUID. Returning null.`);
            return null;
        }
    }

    console.warn(
        `Type specified to validateValue is not a valid type. Returning the input...`
    );
    return value;
}
