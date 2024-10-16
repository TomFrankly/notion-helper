import { buildRichTextObj } from "./rich-text.mjs";
import {
    block,
    makeParagraphBlocks,
    bookmark,
    bulletedListItem,
    bullet,
    callout,
    code,
    columnList,
    column,
    divider,
    embed,
    file,
    heading1,
    heading2,
    heading3,
    image,
    numberedListItem,
    num,
    paragraph,
    pdf,
    quote,
    table,
    tableRow,
    tableOfContents,
    toDo,
    toggle,
    video,
} from "./blocks.mjs"
import { setIcon } from "./emoji-and-files.mjs";
import { page_meta, page_props, parentDb, parentPage, pageId, blockId, propertyId, cover, icon, title, richText, checkbox, date, email, files, multiSelect, number, people, phoneNumber, relation, select, status, url } from "./page-meta.mjs";
import { quickPages, createNotion } from "./pages.mjs";
import { request, createPage, appendBlocks } from "./requests.mjs";
import { getDepth, getLongestArray, getTotalCount } from "./utils.mjs";

export {
    buildRichTextObj,
    makeParagraphBlocks,
    block,
    request,
    createPage,
    appendBlocks,
    setIcon,
    page_meta,
    page_props,
    quickPages,
    createNotion,
    parentDb,
    parentPage,
    pageId,
    blockId,
    propertyId,
    cover,
    icon,
    title,
    richText,
    checkbox,
    date,
    email,
    files,
    multiSelect,
    number,
    people,
    phoneNumber,
    relation,
    select,
    status,
    url,
    bookmark,
    bulletedListItem,
    bullet,
    callout,
    code,
    columnList,
    column,
    divider,
    embed,
    file,
    heading1,
    heading2,
    heading3,
    image,
    numberedListItem,
    num,
    paragraph,
    pdf,
    quote,
    table,
    tableRow,
    tableOfContents,
    toDo,
    toggle,
    video,
    getDepth,
    getLongestArray,
    getTotalCount,
}

const NotionHelper = {
    buildRichTextObj,
    makeParagraphBlocks,
    block,
    request,
    setIcon,
    createPage,
    appendBlocks,
    page_meta,
    page_props,
    quickPages,
    createNotion,
    parentDb,
    parentPage,
    pageId,
    blockId,
    propertyId,
    cover,
    icon,
    title,
    richText,
    checkbox,
    date,
    email,
    files,
    multiSelect,
    number,
    people,
    phoneNumber,
    relation,
    select,
    status,
    url,
    bookmark,
    bulletedListItem,
    bullet,
    callout,
    code,
    divider,
    embed,
    file,
    heading1,
    heading2,
    heading3,
    image,
    numberedListItem,
    num,
    paragraph,
    pdf,
    quote,
    table,
    tableRow,
    tableOfContents,
    toDo,
    toggle,
    video
}

export default NotionHelper