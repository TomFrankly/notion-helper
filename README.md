# notion-helper

A heaping spoonful of syntactic sugar for the Notion API.

This library is mainly built to help you create pages and blocks without writing so many nested objects and arrays by hand.

All functions and methods have [JSDoc](https://jsdoc.app/) markup to support IntelliSense.

Check out the [library's website](https://notion-helper.framer.website/) for additional examples.

[Full documentation on all functions can methods can be found here.](https://tomfrankly.github.io/notion-helper/)

## Installation

This package is [ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

Install via [npm](https://docs.npmjs.com/cli/v10/commands/npm-install):

```
npm install notion-helper
```

## TypeScript Support

The notion-helper package has TypeScript support via declarations generated from the JSDocs comments in the source files. If you're using TypeScript, you'll get full type chcking and auto-completion in your editor when using notion-helper.

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

Notion Helper currently contains five direct functions you can use:

- `quickPages()` - lets you easily create multiple valid page objects with property values and child blocks using very simple JSON objects and a simple schema object.
- `createNotion()` - a powerful factory function that can build full page objects, property objects, or child block arrays through method-chaining.
- `makeParagraphBlocks()` - takes an array of strings and returns an array of [Paragraph blocks](https://developers.notion.com/reference/block#paragraph) without any special formatting or links. Provides a very quick way to prep a lot of text for sending to Notion.
- `buildRichTextObj()` - takes a string, options array, and URL and creates a [Rich Text Object](https://developers.notion.com/reference/rich-text) array (use [flatMap()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/flatMap) if you're inserting its output into another array). Splits strings over the [character limit](https://developers.notion.com/reference/request-limits#limits-for-property-values) for you as well. _Currently only works for text objects; mentions and equations aren't supported yet._.
- `setIcon()` - takes a string, which should be a single emoji (🌵) or an image URL and returns the correct object (emoji or external) value for an `icon` property.

### Using `quickPages()`

Often you'll have an array of relatively simple data that you want to turn into multiple Notion pages:

```js
const tasks = [
    {
        icon: "🔨",
        task: "Build Standing Desk",
        due: "2024-09-10",
        status: "Not started",
    },
    {
        task: "Mount Overhead Lights",
        due: "2024-09-11",
        status: "Not started",
        children: [
            "Mount clamp to joist and tighten",
            "Attach arm to clamp",
            "Mount video light to arm",
            "Run power cable through ceiling panels"
        ],
    },
    { task: "Set Up Camera", due: "2024-09-11", status: "Not started" },
];
```

Say you want to create a page in a Tasks database for each of these, setting the relevant properties and creating a list of To-Do blocks in the page body for any that have a `children` array.

<details>
<summary>The Notion API requires a much more verbose page data object for each of these:</summary>

```js
[
  {
    parent: { type: 'database_id', database_id: 'abcdefghijklmnopqrstuvwxyz' },
    icon: { type: 'emoji', emoji: '🔨' },
    properties: {
      Name: {
        title: [
          {
            type: 'text',
            text: { content: 'Build Standing Desk' },
            annotations: {}
          }
        ]
      },
      'Due Date': { date: { start: '2024-09-10', end: null } },
      Status: { status: { name: 'Not started' } }
    }
  },
  {
    parent: { type: 'database_id', database_id: 'abcdefghijklmnopqrstuvwxyz' },
    properties: {
      Name: {
        title: [
          {
            type: 'text',
            text: { content: 'Mount Overhead Lights' },
            annotations: {}
          }
        ]
      },
      'Due Date': { date: { start: '2024-09-11', end: null } },
      Status: { status: { name: 'Not started' } }
    },
    children: [
      {
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Mount clamp to joist and tighten' },
              annotations: {}
            }
          ],
          checked: false,
          color: 'default',
          children: []
        }
      },
      {
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Attach arm to clamp' },
              annotations: {}
            }
          ],
          checked: false,
          color: 'default',
          children: []
        }
      },
      {
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Mount video light to arm' },
              annotations: {}
            }
          ],
          checked: false,
          color: 'default',
          children: []
        }
      },
      {
        type: 'to_do',
        to_do: {
          rich_text: [
            {
              type: 'text',
              text: { content: 'Run power cable through ceiling panels' },
              annotations: {}
            }
          ],
          checked: false,
          color: 'default',
          children: []
        }
      }
    ]
  },
  {
    parent: { type: 'database_id', database_id: 'abcdefghijklmnopqrstuvwxyz' },
    properties: {
      Name: {
        title: [
          {
            type: 'text',
            text: { content: 'Set Up Camera' },
            annotations: {}
          }
        ]
      },
      'Due Date': { date: { start: '2024-09-11', end: null } },
      Status: { status: { name: 'Not started' } }
    }
  }
]
```
</details>

Using `quickPages()`, you can create an array of valid page objects like the one in the toggle above.

With it, you can pass an options object with:

- `parent`: A parent page/database
- `parent_type`: The parent's type ("page_id" or "database_id")
- `pages`: Your array of objects
- `schema`: A schema describing how your object's properties map to Notion property names and types
- `childrenFn`: An optional callback that will be excuted on all array elements in any object's `children` property, creating a `children` array within the Notion page object

> [!TIP]
> You can also pass a single object, but you'll still get an array back.

The schema object should contain a property for each property in the Notion database you'd like to edit. For each, the key should map to a key present in at least one of your objects, and its value should be an array containing the matching Notion database property's name and type.

Valid property types include all those listed in the `page_props` section below.

> [!NOTE]
> If the `parent` has the type `page_id` (i.e. it's a page, not a database), the only valid value will be `["title", "title"]`, which represent's the page's title.

Here's an example of simple usage, operating on the `tasks` array shown above:

```js
const propertySchema = {
    task: ["Name", "title"],
    due: ["Due Date", "date"],
    status: ["Status", "status"],
}

const pages = quickPages({
    parent: database_id,
    parent_type: "database_id",
    pages: tasks,
    schema: propertySchema,
})

/* Create a page for each returned page object */
const responses = await Promise.all(
    pages.map((page) => notion.pages.create(page))
)
```

Optionally, your schema can also include custom properties that represent the icon, cover, and children. If you want to specify these, use the convention below to tell the function which properties correspond to the `icon`, `cover`, and `children` properties.

By default, the function will look for `icon`, `cover`, and `children` in your pages object, so you don't need to specify those keys in your schema if they're named that way.

```js
const schema = [
    favicon: ["Icon", "icon"],
    bg_image: ["Cover", "cover"],
    body: ["Children", "children"]
]
```

By default, if you have a string or an array of strings in any object's `children` property, those strings will be turned into [Paragraph](https://developers.notion.com/reference/block#paragraph) blocks.

However, you can use the `childrenFn` parameter to pass a callback function. All array elements in each object's `children` property (if present) will be run through this callback. `childrenFn` should take in an array as its argument and return an array. The returned array will be used directly as the `children` array in the final page object.

In the example below, `childrenFn` is used to create a [To-Do](https://developers.notion.com/reference/block#to-do) block for each children item:

```js
const pages = quickPages({
    parent: database_id,
    parent_type: "database_id",
    pages: tasks,
    schema: propertySchema,
    childrenFn: (value) => value.map((line) => NotionHelper.block.to_do.createBlock({rtArray: NotionHelper.buildRichTextObj(line)}))
})
```

Note how other Notion Helper functions are used in this example callback to easily construct the To-Do blocks.

If an object's `children` property already contains an array of prepared Block objects, simply make it the return value of `childrenFn`. Otherwise, `quickPages()` will treat it as invalid children content and strip it out. Without a `childrenFn`, `quickPages()` will only automatically process a string or array of strings in a `children` property.

```js
const pages = quickPages({
    parent: database_id,
    parent_type: "database_id",
    pages: tasks,
    schema: propertySchema,
    childrenFn: (value) => value
})
```

### Using `createNotion()`

[Read the full createNotion() reference here.](https://tomfrankly.github.io/notion-helper/#builder)

The `createNotion` function lets you easily build high-level Notion API data structures using simple method-chaining syntax. It can create:

- Full page objects that can be passed direct as the argument when [creating a page](https://developers.notion.com/reference/post-page)
- Property objects that can be added to preconstucted page objects
- Arrays of blocks that can be passed to the `children` property of a page object or [Append Block Children](https://developers.notion.com/reference/patch-block-children) request.

This function can also help you deal with large amounts of data that would exceed the Notion API's [request size limits](https://developers.notion.com/reference/request-limits#size-limits).

It returns an object with one or two properties:

- `content`: The constructed page object, property object, or children array
- `additionalBlocks`: If you constructed a `children` array with more than 100 blocks, this property will contain an array of arrays, each with up to 100 blocks (not including the first 100, which can be send in the initial request as part of `content`.)

This function has methods for all supported Notion property types, block types, and page meta types, and provides shorthand names for all of them.

When creating blocks, it will perform length-checks on strings passed to the block methods. `paragraph()` will split strings over the 2,000-character limit into multiple paragraph blocks. All other rich-text blocks (headings, lists, quotes, callouts, etc) will split strings over 2,000 characters into multiple rich_text objects, but will keep them in the same block.

It also provides generic methods:

- `property()`
- `addBlock()`

Additionally, it supports nesting as much as is allowed by the API. You can set a block as a parent block by using the `startParent()` method, defining the block's details just as you would with `addBlock()`.

All block methods you chain to `startParent()` will be children of that block until you add `endParent()` to the chain.

Example usage:

```js
// Goal: Create a page in an Albums database with Name, Artist, and Release Date properties.
// Page content should include Tracklist and Album Art sections.
const album = {
    name: "Mandatory Fun",
    artist: `"Weird Al" Yankovic`,
    release_date: "07/15/2014",
    cover: "https://m.media-amazon.com/images/I/81cPt0wKVIL._UF1000,1000_QL80_.jpg",
    tracks: [
        "Handy (Parody of Fancy by Iggy Azalea)",
        "Lame Claim to Fame (Style Parody of Southern Culture on the Skids)",
        "Foil (Parody of Royals by Lorde)",
        "Sports Song (Style Parody of College Football Fight Songs)",
        "Word Crimes (Parody of Blurred Lines by Robin Thicke)",
        "My Own Eyes (Style Parody of Foo Fighters)",
        "NOW That’s What I Call Polka!",
        "Mission Statement (Style Parody of Crosby, Stills & Nash)",
        "Inactive (Parody of Radioactive by Imagine Dragons)",
        "First World Problems (Style Parody of Pixies)",
        "Tacky (Parody of Happy by Pharrell Williams)",
        "Jackson Park Express (Style Parody of Cat Stevens)"
    ]
}

// The target database
const database_id = "41eb98ef0a1ec4a6c91tq2thrb2930a";

// Create a builder instance and chain methods to add the page details
const builder = createNotion()
  .parentDb(database_id)
  .title("Name", album.name)
  .richText("Artist", album.artist)
  .date("Released", album.release_date)
  .heading1("Tracklist")
  .loop("numbered_list_item", album.tracks) // The loop() method can create blocks from an array
  .heading1("Album Art")
  .image(album.cover)
  .build() // Call build() at the end of the chain

// We called parentDb(), so builder.content is a page object we can use
// to create a new page in our target database
const response = await notion.pages.create(builder.content)
```

The result:

![Notion page created by the factory function](https://i.imgur.com/W6Zdzgv.png)

<details>
<summary>You can also create more complex page structures with tables and child-block nesting:</summary>

```js
// A more complex album object.
// Goal: Turn the track list into a Notion Table within the album's page
const album = {
    name: "Mandatory Fun",
    artist: `"Weird Al" Yankovic`,
    release_date: "07/15/2014",
    cover: "https://m.media-amazon.com/images/I/81cPt0wKVIL._UF1000,1000_QL80_.jpg",
    tracks: [
        {
            "No.": 1,
            Title: "Handy",
            "Writer(s)":
                "Amethyst Kelly\nCharlotte Aitchison\nGeorge Astasio\nJason Pebworth\nJonathan Shave\nKurtis McKenzie\nJon Turner\nAl Yankovic",
            "Parody of": 'Fancy" by Iggy Azalea featuring Charli XCX',
            Length: "2:56",
        },
        {
            "No.": 2,
            Title: "Lame Claim to Fame",
            "Writer(s)": "Yankovic",
            "Parody of": "Style parody of Southern Culture on the Skids[79]",
            Length: "3:45",
        },
        {
            "No.": 3,
            Title: "Foil",
            "Writer(s)": "Joel Little\nElla Yelich-O'Connor\nYankovic",
            "Parody of": 'Royals" by Lorde',
            Length: "2:22",
        },
        {
            "No.": 4,
            Title: "Sports Song",
            "Writer(s)": "Yankovic",
            "Parody of": "Style parody of college football fight songs[25]",
            Length: "2:14",
        },
        {
            "No.": 5,
            Title: "Word Crimes",
            "Writer(s)":
                "Robin Thicke\nPharrell Williams\nClifford Harris Jr.\nMarvin Gaye1\nYankovic",
            "Parody of":
                'Blurred Lines" by Robin Thicke featuring T.I. and Pharrell Williams',
            Length: "3:43",
        },
        {
            "No.": 6,
            Title: "My Own Eyes",
            "Writer(s)": "Yankovic",
            "Parody of": "Style parody of Foo Fighters[79]",
            Length: "3:40",
        },
        {
            "No.": 7,
            Title: "Now That's What I Call Polka!",
            "Writer(s)": "showVarious writers:",
            "Parody of": "showA polka medley including:",
            Length: "4:05",
        },
        {
            "No.": 8,
            Title: "Mission Statement",
            "Writer(s)": "Yankovic",
            "Parody of": "Style parody of Crosby, Stills & Nash[79]",
            Length: "4:28",
        },
        {
            "No.": 9,
            Title: "Inactive",
            "Writer(s)":
                "Alexander Grant\nDaniel Reynolds\nDaniel Sermon\nBenjamin McKee\nJoshua Mosser\nYankovic",
            "Parody of": 'Radioactive" by Imagine Dragons',
            Length: "2:56",
        },
        {
            "No.": 10,
            Title: "First World Problems",
            "Writer(s)": "Yankovic",
            "Parody of": "Style parody of Pixies[79]",
            Length: "3:13",
        },
        {
            "No.": 11,
            Title: "Tacky",
            "Writer(s)": "Williams\nYankovic",
            "Parody of": 'Happy" by Pharrell Williams',
            Length: "2:53",
        },
        {
            "No.": 12,
            Title: "Jackson Park Express",
            "Writer(s)": "Yankovic",
            "Parody of": "Style parody of Cat Stevens[79]",
            Length: "9:05",
        },
    ],
};

// The target database
const database_id = "41eb98ef0a1ec4a6c91tq2thrb2930a";

const builder = createNotion()
    .parentDb(database_id)
    .title("Name", album.name)
    .richText("Artist", album.artist)
    .date("Released", album.release_date)
    .heading1("Tracklist")
    .startParent("table", { // startParent() creates a block and chains further blocks as its children
        has_column_header: true,
        rows: [["No", "Title", "Writer(s)", "Parody of", "Length"]],
    })
    .loop((builder, track) => { // loop() can accept a callback for custom handling instead of a block type
        builder.tableRow([
            track["No."], track.Title, track["Writer(s)"], track["Parody of"], track.Length
        ])
    }, album.tracks)
    .endParent() // endParent() to break out of the table block's children array
    .heading1("Album Art")
    .image(album.cover)
    .build();

const response = notion.pages.create(builder.content);
```

</details>

By default, `createNotion()` will try to smoothly handle null/undefined values passed to its methods, returning `this` and effectively ignoring the method call. This can be helpful when you're looping over an array of objects with inconsistent keys, or handling user input where even specific properties may or may not be defined by the user.

However, you can call `createNotion({ strict: true })` if you'd like to enable strict mode. When enabled, null/undefined block types, property names, property types, and property/block values passed will cause the function to throw an error.

---

Notion-Helper also provides objects with methods for quickly creating pages and blocks:

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

Each block type has a createBlock() method you can call, which takes an object containing properties specific to that block type. Most take `rich_text`, which is an array of Rich Text objects you can easily create with `builtRichTextObj()`. You can also pass a single string or an array of strings in `rich_text`, or just pass a string or array of strings as the sole argument. Notion-Helper will coerce strings to rich text objects where needed.

Examples:

```js
const headerText = "How to Play Guitar with Your Teeth";

const heading1 = NotionHelper.block.heading_1.createBlock({
  rich_text: buildRichTextObj(headerText),
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

Each property's `setProp()` takes an argument as specified by the [Page Properties](https://developers.notion.com/reference/page-property-values) specification of the Notion API. (E.g. Checkbox props take a `boolean`, Rich Text props take an array of Rich Text objects, Date props take an [ISO-8601](https://en.wikipedia.org/wiki/ISO_8601) date-time string, etc.)

```js

const page = {
    /* parent, icon, cover */
    properties: {
        Name: NotionHelper.page_props.title.setProp(buildRichTextObj("Flylighter - Notion Web Clipper")),
        Capture Date: NotionHelper.page_props.date.setProp(new Date().toISOString())
        URL: NotionHelper.page_props.url.setProp("https://flylighter.com/")
    }
}

```

## Learn More

If you'd like to learn the Notion API from scratch, start with my free [Notion API crash course](https://thomasjfrank.com/notion-api-crash-course/).

Questions? [Ask me on Twitter!](https://twitter.com/TomFrankly)
