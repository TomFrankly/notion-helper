import { buildRichTextObj } from "./rich-text.mjs";
import { setIcon } from "./emoji-and-files.mjs";

/**
 * Object with methods for constructing Notion page metadata, including parent, cover, and icon.
 * 
 * @typedef {Object} PageMeta
 * 
 * @property {MetaType} parent - Parent metadata.
 * @property {IconMetaType} icon - Icon metadata.
 * @property {CoverMetaType} cover - Cover metadata.
 */

/**
 * Metadata definition for a parent entity.
 * 
 * @typedef {Object} MetaType
 * @property {string} type - The parent's type ("database_id" or "page_id").
 * @property {function(Object): Object} createMeta - Function to create the parent metadata.
 *   @param {Object} params - Parameters for creating parent metadata.
 *   @param {string} params.id - The ID of the parent.
 *   @param {string} params.type - The type of the parent ("database_id" or "page_id").
 */

/**
 * Metadata definition for an icon.
 * 
 * @typedef {Object} IconMetaType
 * @property {string} type - The type of the icon (can be "external" or "emoji").
 * @property {function(string): Object} createMeta - Function to create the icon metadata.
 *   @param {string} value - The icon value (URL for "external" or emoji character).
 */

/**
 * Metadata definition for a page cover.
 * 
 * @typedef {Object} CoverMetaType
 * @property {string} type - The type of the page cover (can currently only be "external").
 * @property {function(string): Object} createMeta - Function to create the cover metadata.
 *   @param {string} value - The URL of the cover image.
 */

/** @type {PageMeta} */
export const page_meta = {
    parent: {
        type: "string",
        createMeta: ({id, type}) => ({
            type: type,
            [type]: id,
        })
    },
    icon: {
        type: "string",
        createMeta: (value) => {
            return {
                icon: setIcon(value)
            }
        }
    },
    cover: {
        type: "string",
        createMeta: (value) => ({
            cover: setIcon(value)
        })
    }
}

/**
 * Object with methods for constructing each of the possible property types within a Notion database page.
 * 
 * @typedef {Object} PageProps
 * @property {PropType} title - Title property
 * @property {PropType} rich_text - Rich text property
 * @property {BooleanPropType} checkbox - Checkbox property
 * @property {DatePropType} date - Date property
 * @property {PropType} email - Email property
 * @property {FilesPropType} files - Files property
 * @property {MultiSelectPropType} multi_select - Multi-select property
 * @property {PropType} number - Number property
 * @property {PeoplePropType} people - People property
 * @property {PropType} phone_number - Phone number property
 * @property {RelationPropType} relation - Relation property
 * @property {PropType} select - Select property
 * @property {PropType} status - Status property
 * @property {PropType} url - URL property
 */

/**
 * @typedef {Object} PropType
 * @property {string} type - Type of the property
 * @property {function(string): Object} createProp - Function to create the property
 */

/**
 * @typedef {Object} BooleanPropType
 * @property {string} type - Type of the property
 * @property {function(boolean=): Object} createProp - Function to create the property
 */

/**
 * @typedef {Object} DatePropType
 * @property {string} type - Type of the property
 * @property {function(string, string=): Object} createProp - Function to create the property
 */

/**
 * @typedef {Object} FilesPropType
 * @property {string} type - Type of the property
 * @property {function(Array<{name: string, url: string}>): Object} createProp - Function to create the property
 */

/**
 * @typedef {Object} MultiSelectPropType
 * @property {string} type - Type of the property
 * @property {function(string[]): Object} createProp - Function to create the property
 */

/**
 * @typedef {Object} PeoplePropType
 * @property {string} type - Type of the property
 * @property {function(string[]): Object} createProp - Function to create the property
 */

/**
 * @typedef {Object} RelationPropType
 * @property {string} type - Type of the property
 * @property {function(string[]): Object} createProp - Function to create the property
 */

/** @type {PageProps} */

export const page_props = {
    title: {
        type: "string",
        createProp: (value) => ({
            title: buildRichTextObj(value),
        }),
    },
    rich_text: {
        type: "string",
        createProp: (value) => ({
            rich_text: buildRichTextObj(value),
        }),
    },
    checkbox: {
        type: "boolean",
        createProp: (value = false) => ({
            checkbox: value,
        }),
    },
    date: {
        type: "string",
        createProp: (start, end = null) => ({
            date: {
                start: start,
                end: end,
            },
        }),
    },
    email: {
        type: "string",
        createProp: (value) => ({
            email: value,
        }),
    },
    files: {
        type: "string[]",
        createProp: (fileArray) => ({
            files: fileArray.map((file) => ({
                name: file.name,
                external: {
                    url: file.url,
                },
            })),
        }),
    },
    multi_select: {
        type: "string[]",
        createProp: (valuesArray) => ({
            multi_select: valuesArray.map((value) => ({
                name: value,
            })),
        }),
    },
    number: {
        type: "number",
        createProp: (value) => ({
            number: value,
        }),
    },
    people: {
        type: "string[]",
        createProp: (personArray) => ({
            people: personArray.map((person) => ({
                object: "user",
                id: person,
            })),
        }),
    },
    phone_number: {
        type: "string",
        createProp: (value) => ({
            phone_number: value,
        }),
    },
    relation: {
        type: "string[]",
        createProp: (pageArray) => ({
            relation: pageArray.map((page) => ({
                id: page,
            })),
        }),
    },
    select: {
        type: "string",
        createProp: (value) => ({
            select: {
                name: value,
            },
        }),
    },
    status: {
        type: "string",
        createProp: (value) => ({
            status: {
                name: value,
            },
        }),
    },
    url: {
        type: "string",
        createProp: (value) => ({
            url: value,
        }),
    },
};