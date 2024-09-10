# notion-helper

This is a little library of functions I use to work more easily with the Notion API.

It's mainly built to help you create pages and blocks without writing so many nested objects and arrays by hand.

All functions and methods have [JSDoc](https://jsdoc.app/) markup to support IntelliSense.

## Installation

This package is [ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

Install via [npm](https://docs.npmjs.com/cli/v10/commands/npm-install):

```
npm install notion-helper
```

## Usage

Import the package:

```js
import NotionHelper from "notion-helper";
```

From here, you can destructure the functions to use them directly, or just call NotionHelper.

```js
const { makeParagraphBlocks } = NotionHelper;

const quotes = [
  "Dear frozen yogurt, you are the celery of desserts. Be ice cream, or be nothing.",
  "Give me all the bacon and eggs you have.",
  "There is no quiet anymore. There is only Doc McStuffins.",
];

const paragraphBlocks = makeParagraphBlocks(quotes);

// or...

const paragraphBlocks = NotionHelper.makeParagraphBlocks(quotes);
```

Notion Helper currently contains three direct functions you can use:

- makeParagraphBlocks() - takes an array of strings and returns an array of [Paragraph blocks](https://developers.notion.com/reference/block#paragraph) without any special formatting or links. Provides a very quick way to prep a lot of text for sending to Notion.
- buildRichTextObj() - takes a string, options array, and URL and creates a [Rich Text Object](https://developers.notion.com/reference/rich-text) array (use [flatMap()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) if you're inserting its output into another array). Splits strings over the [character limit](https://developers.notion.com/reference/request-limits#limits-for-property-values) for you as well. _Currently only works for text objects; mentions and equations aren't supported yet._.
- setIcon() - takes a string, which should be a single emoji (🌵) or an image URL and returns the correct object (emoji or external) value for an `icon` property.

It also provides objects with methods for quickly creating pages and blocks:

### `block`

The `block` object lets you create most supported block types while writing less code. It supports these block types:

- Bookmark
- Bulleted List Item
- Callout
- Code
- Divider
- Embed
- File
- Heading 1
- Heading 2
- Heading 3
- Image
- Numbered List Item
- Paragraph
- PDF
- Quote
- Table
- Table Row
- Table of Contents
- To-Do
- Toggle
- Video

_Some block types will return a `null` if they are provided with invalid input. You should filter `null` entries out of your `children` array before adding it to an API call._

Each block type has a createBlock() method you can call, which takes an object containing properties specific to that block type. Most take an `rtArray`, which is an array of Rich Text objects you can easily create with `builtRichTextObj()`.

Examples:

```js
const headerText = "How to Play Guitar with Your Teeth";

const heading1 = NotionHelper.block.heading_1.createBlock({
  rtArray: buildRichTextObj(headerText),
});
```

### `page_meta`

The `page_meta` object lets you quickly set the parent, icon, and cover for a page. Pages can be standalone or within a database.

The `parent` property's `createMeta()` method takes an object containing the parent page ID and type, while the `icon` and `cover` properties require only a string representing an externally-hosted image file (or single emoji 🤠 in the case of `icon`).

```js
const page = {
  parent: NotionHelper.page_meta.parent.createMeta({
    id: parentID,
    type: "database",
  }),
  icon: NotionHelper.page_meta.icon.createMeta("🎃"),
  cover: NotionHelper.page_meta.cover.createMeta(
    "https://i.imgur.com/5vSShIw.jpeg"
  ),
};
```

### `page_props`

The `page_props` object lets you quickly set the property values of a Notion page. Pages can be standalone or in a database, though standalone pages can only have a `title` property.

Each property represents a database property type. All **writeable** properties are supported:

- Title
- Rich Text
- Checkbox
- Date
- Email
- Files
- Multi-Select
- Number
- People
- Phone Number
- Relation
- Select
- Status
- URL

Each property's `createProp()` takes an argument as specified by the [Page Properties](https://developers.notion.com/reference/page-property-values) specification of the Notion API. (E.g. Checkbox props take a `boolean`, Rich Text props take an array of Rich Text objects, Date props take an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) date-time string, etc.)

```js

const page = {
    /* parent, icon, cover */
    properties: {
        Name: NotionHelper.page_props.title.createProp(buildRichTextObj("Flylighter - Notion Web Clipper")),
        Capture Date: NotionHelper.page_props.date.createProp(new Date().toISOString())
        URL: NotionHelper.page_props.url.createProp("https://flylighter.com/")
    }
}

```

## Learn More

If you'd like to learn the Notion API from scratch, start with my free [Notion API crash course](https://thomasjfrank.com/notion-api-crash-course/).

Once you get used to writing objects for API requests, you might find yourself back here 😛

Questions? [Ask me on Twitter!](https://twitter.com/TomFrankly)
