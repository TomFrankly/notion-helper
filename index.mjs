import { buildRichTextObj } from "./rich-text.mjs";
import {
    makeParagraphBlocks,
    block,
} from "./blocks.mjs"
import { setIcon } from "./emoji-and-files.mjs";
import { page_meta, page_props } from "./page-meta.mjs";
import { quickPages } from "./pages.mjs";

const NotionHelper = {
    buildRichTextObj,
    makeParagraphBlocks,
    block,
    setIcon,
    page_meta,
    page_props,
    quickPages
}

export default NotionHelper