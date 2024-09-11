import { setIcon } from "./emoji-and-files.mjs";

/*
 * Object with methods for constructing Notion page metadata, including parent, cover, and icon.
 */
export const page_meta = {
    /**
     * Metadata definition for a parent entity.
     * @property {MetaType} parent - Parent metadata.
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
     * Metadata definition for an icon.
     * @property {IconMetaType} icon - Icon metadata.
     * @method createMeta
     * @param {string} value - The icon value (URL for "external" or emoji character).
     * @returns {Object} An icon metadata object.
     */
    icon: {
        type: "string",
        createMeta: (value) => {
            return {
                icon: setIcon(value),
            };
        },
    },

    /**
     * Metadata definition for a page cover.
     * @property {CoverMetaType} cover - Cover metadata.
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
 * Object with methods for constructing each of the possible property types within a Notion database page.
 */

export const page_props = {
    /**
     * Title property method.
     * @property {PropType} title - Title property type.
     * @method createProp
     * @param {Object[]} value - The array of Rich Text Objects for the title content.
     * @returns {Object} A title property object.
     */
    title: {
        type: "string[]",
        createProp: (value) => ({
            title: value,
        }),
    },

    /**
     * Rich text property method.
     * @property {PropType} rich_text - Rich text property type.
     * @method createProp
     * @param {Object[]} value - The array of Rich Text Objects for the rich text content.
     * @returns {Object} A rich text property object.
     */
    rich_text: {
        type: "string[]",
        createProp: (value) => ({
            rich_text: value,
        }),
    },

    /**
     * Checkbox property method.
     * @property {BooleanPropType} checkbox - Checkbox property type.
     * @method createProp
     * @param {boolean} value - The boolean value for the checkbox state.
     * @returns {Object} A checkbox property object.
     */
    checkbox: {
        type: "boolean",
        createProp: (value) => ({
            checkbox: value,
        }),
    },

    /**
     * Date property method.
     * @property {DatePropType} date - Date property type.
     * @method createProp
     * @param {string} start - The start date.
     * @param {string} [end=null] - The optional end date.
     * @returns {Object} A date property object.
     */
    date: {
        type: "string",
        createProp: (start, end = null) => ({
            date: {
                start: start,
                end: end,
            },
        }),
    },

    /**
     * Email property method.
     * @property {PropType} email - Email property type.
     * @method createProp
     * @param {string} value - The email address.
     * @returns {Object} An email property object.
     */
    email: {
        type: "string",
        createProp: (value) => ({
            email: value,
        }),
    },

    /**
     * Files property method.
     * @property {FilesPropType} files - Files property type.
     * @method createProp
     * @param {Array<{name: string, url: string}>} fileArray - The array of file objects.
     * @returns {Object} A files property object.
     */
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

    /**
     * Multi-select property method.
     * @property {MultiSelectPropType} multi_select - Multi-select property type.
     * @method createProp
     * @param {string[]} valuesArray - The array of selected values.
     * @returns {Object} A multi-select property object.
     */
    multi_select: {
        type: "string[]",
        createProp: (valuesArray) => ({
            multi_select: valuesArray.map((value) => ({
                name: value,
            })),
        }),
    },

    /**
     * Number property method.
     * @property {PropType} number - Number property type.
     * @method createProp
     * @param {number} value - The numeric value.
     * @returns {Object} A number property object.
     */
    number: {
        type: "number",
        createProp: (value) => ({
            number: typeof value === 'number' ? value : null,
        }),
    },

    /**
     * People property method.
     * @property {PeoplePropType} people - People property type.
     * @method createProp
     * @param {string[]} personArray - The array of person IDs.
     * @returns {Object} A people property object.
     */
    people: {
        type: "string[]",
        createProp: (personArray) => ({
            people: personArray.map((person) => ({
                object: "user",
                id: person,
            })),
        }),
    },

    /**
     * Phone number property method.
     * @property {PropType} phone_number - Phone number property type.
     * @method createProp
     * @param {string} value - The phone number.
     * @returns {Object} A phone number property object.
     */
    phone_number: {
        type: "string",
        createProp: (value) => ({
            phone_number: value,
        }),
    },

    /**
     * Relation property method.
     * @property {RelationPropType} relation - Relation property type.
     * @method createProp
     * @param {string[]} pageArray - The array of related page IDs.
     * @returns {Object} A relation property object.
     */
    relation: {
        type: "string[]",
        createProp: (pageArray) => ({
            relation: pageArray.map((page) => ({
                id: page,
            })),
        }),
    },

    /**
     * Select property method.
     * @property {PropType} select - Select property type.
     * @method createProp
     * @param {string} value - The selected value.
     * @returns {Object} A select property object.
     */
    select: {
        type: "string",
        createProp: (value) => ({
            select: {
                name: value,
            },
        }),
    },

    /**
     * Status property method.
     * @property {PropType} status - Status property type.
     * @method createProp
     * @param {string} value - The status value.
     * @returns {Object} A status property object.
     */
    status: {
        type: "string",
        createProp: (value) => ({
            status: {
                name: value,
            },
        }),
    },

    /**
     * URL property method.
     * @property {PropType} url - URL property type.
     * @method createProp
     * @param {string} value - The URL.
     * @returns {Object} A URL property object.
     */
    url: {
        type: "string",
        createProp: (value) => ({
            url: value,
        }),
    },
};