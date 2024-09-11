import { buildRichTextObj } from "./rich-text.mjs";
import { makeParagraphBlocks } from "./blocks.mjs";
import { page_meta, page_props } from "./page-meta.mjs";
import { block } from "./blocks.mjs";

// TODO - allow passing in a Notion db response in order to validate against the db itself
// TODO - probably split out schema validation as its own function

/**
 *
 * @param {Object} options
 * @param {string} parent - The ID of the parent page or database.
 * @param {string} parent_type - "page_id" or "database_id".
 * @param {(Array<Object>|Object)} pages - an array of simple objects, each of which will be turned into a valid page object. Each can have property types that match to valid Notion page properties, as well as a "cover", "icon", and "children" property. The "children" prop's value should be either a string or an array. You can also pass a single object, but the function will still return an array.
 * @param {Object} schema - an object that maps the schema of the pages objects to property names and types in the parent. Saves you from needing to specify the property name and type from the target Notion database for every entry in your pages object. For each property in your pages object that should map to a Notion database property, specify the key as the property name in the pages object and set the value as an array with the Notion property name as the first element and the property type as the second. Non-valid property types will be filtered out. Optionall, you can specify custom keys for the icon (["Icon", "icon"]), cover (["Cover", "cover"]), and children array (["Children", "children"]).
 * @param {function} childrenFn - a callback you can specify that will run on any array elements present in a "children" property of any object in the pages array. If that "children" property contains a single string, it'll run on that as well. If omitted, any "children" values will be converted to Paragraph blocks by default.
 *
 * @example
 * const database = "abcdefghijklmnopqrstuvwxyz"
 *
 * const tasks = [ {
 *   icon: "😛",
 *   task: "Build Standing Desk",
 *   due: "2024-09-10",
 *   status: "Not started"
 * } ]
 *
 * const schema = {
 *   task: [ "Name", "title" ],
 *   due: [ "Due Date", "date"],
 *   status: [ "Status", "status" ]
 * }
 *
 * const pageObjects = quickPages({
 *      parent: database,
 *      parent_type: "database_id",
 *      pages: tasks,
 *      schema: schema,
 *      childrenFn: (value) => NotionHelper.makeParagraphs(value)
 * })
 * @returns {Array<Object>} - An array of page objects, each of which can be directly passed as the children for a POST request to https://api.notion.com/v1/pages (or as the single argument to notion.pages.create() when using the SDK).
 */
export function quickPages({ parent, parent_type, pages, schema, childrenFn }) {
    let pageArray;

    if (Array.isArray(pages)) {
        pageArray = pages;
    } else {
        pageArray[pages];
    }

    return pages.map((page) => {
        const iconSchema = Object.fromEntries(
            Object.entries(schema).filter(([propName, propDef]) => 
                propDef[1] === 'icon'
            )
        )

        const coverSchema = Object.fromEntries(
            Object.entries(schema).filter(([propName, propDef]) => 
                propDef[1] === 'cover'
            )
        )

        let icon
        if (Object.entries(iconSchema).length === 1) {
            let entry = page[Object.keys(iconSchema)[0]]
            if (entry && typeof entry === "string" && entry !== "") {
                icon = entry
            }
        } else if (page.icon && typeof page.icon === "string" && page.icon !== "") {
            icon = page.icon
        }
        
        let cover
        if (Object.entries(coverSchema).length === 1) {
            let entry = page[Object.keys(coverSchema)[0]]
            if (entry && typeof entry === "string" && entry !== "") {
                cover = entry
            }
        } else if (page.cover && typeof page.cover === "string" && page.cover !== "") {
            cover = page.cover
        } 

        const finalPage = {
            parent: page_meta.parent.createMeta({
                id: parent,
                type: parent_type,
            }),
            ...(icon && page_meta.icon.createMeta(icon)),
            ...(cover &&
                page_meta.cover.createMeta(cover)),
        };

        const validatedSchema = Object.fromEntries(
            Object.entries(schema).filter(([propName, propDef]) =>
                Object.keys(page_props).includes(propDef[1])
            )
        );

        finalPage.properties = Object.entries(page)
            .filter(([key]) => key in validatedSchema)
            .reduce((acc, [key, val]) => {
                const [propName, propType] = validatedSchema[key];
                let value;

                if (
                    ["title", "rich_text"].includes(propType) &&
                    typeof val === "string"
                ) {
                    value = buildRichTextObj(val);
                } else {
                    value = val;
                }

                const propResult =
                    page_props[propType].createProp(value);

                const propKey = Object.keys(propResult)[0]
                if (propResult[propKey] !== null) {
                    acc[propName] = propResult
                }

                return acc;
            }, {});

        let pageChildren;

        const childrenSchema = Object.fromEntries(
            Object.entries(schema).filter(([propName, propDef]) => 
                propDef[1] === 'children'
            )
        )

        let childrenProp
        if (Object.entries(childrenSchema).length === 1) {
            childrenProp = page[Object.keys(childrenSchema)[0]]
        } else if (page.children) {
            childrenProp = page.children
        }

        if (childrenProp) {
            if (typeof childrenProp === "string" && childrenProp.trim()) {
                pageChildren = [childrenProp];
            } else if (Array.isArray(childrenProp) && childrenProp.length > 0) {
                pageChildren = childrenProp;
            } else {
                console.warn(
                    `Invalid page children data type submitted for the page object below. Children data will be omitted.`
                );
                console.dir(page);
                pageChildren = [];
            }

            console.log(typeof childrenFn)
            if (typeof childrenFn === "function") {
                finalPage.children = childrenFn(pageChildren);
            } else if (typeof pageChildren[0] === "string") {
                finalPage.children = makeParagraphBlocks(pageChildren);
            }
        }

        return finalPage;
    });
}