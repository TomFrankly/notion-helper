import { buildRichTextObj } from "./rich-text.mjs";
import {
    makeParagraphBlocks,
    block,
} from "./blocks.mjs"
import { setIcon } from "./emoji-and-files.mjs";
import { page_meta, page_props, parentDb, parentPage, pageId, blockId, propertyId, cover, icon, title, richText, checkbox, date, email, files, multiSelect, number, people, phoneNumber, relation, select, status, url } from "./page-meta.mjs";
import { quickPages, createNotion } from "./pages.mjs";

const NotionHelper = {
    buildRichTextObj,
    makeParagraphBlocks,
    block,
    setIcon,
    page_meta,
    page_props,
    quickPages,
    createNotion
}

export default NotionHelper