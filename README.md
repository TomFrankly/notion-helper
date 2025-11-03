# Notion Helper

Power tools for the [Notion API](https://developers.notion.com/).

Notion Helper is a JavaScript library that makes working with the Notion API much easier.

## Key Features

Compared to working with the Notion API directly, Notion Helper gives you several advantages:

* Automatically **splits large payloads** into multiple API requests to respect Notion API limits
* Lets you quickly build page objects with a **fluent interface** with methods for every block and property-type
* Applies **templates** to new pages via the API
* Gracefully splits long text into multiple rich text objects

In short, Notion Helper helps you easily write more **robust, fault-tolerant** Notion API intergrations, more quickly.

Notion Helper is designed to be used alongside the official [Notion TypeScript SDK](https://github.com/makenotion/notion-sdk-js), and contains multiple layers of functionality.

You can pass a `client` object from the SDK into its high-level `request` functions to let it orchestrate API requests, or just use it at a lower level to more easily build up JSON objects.

**Notion Helper has been fully updated to support databases with multiple data sources. See the [2025-09-03 API version update details](https://developers.notion.com/docs/upgrade-guide-2025-09-03) to learn more about this change.**

All functions and methods have [JSDoc](https://jsdoc.app/) markup to support IntelliSense.

Check out the [library's website](https://notion-helper.framer.website/) for additional examples.

[Full documentation on all functions can methods can be found here.](https://tomfrankly.github.io/notion-helper/)

## Installation

This package is [ESM-only](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c).

### Node.js

Install via [npm](https://docs.npmjs.com/cli/v10/commands/npm-install):

```bash
npm install notion-helper
```

### Browser

You can use notion-helper directly in the browser via CDN:

```html
<script type="module">
  import NotionHelper from 'https://unpkg.com/notion-helper@latest';
  
  // Use NotionHelper functions
  const page = NotionHelper.createNotionBuilder()
    .parentDataSource('data-source-id')
    .title('Name', 'My Page')
    .build();
</script>
```

**Note**: Browsers can't directly call the Notion API due to CORS restrictions. You'll need a backend proxy or serverless function to handle the actual API calls. See the [Browser Usage Guide](./BROWSER_USAGE.md) for more details.

## TypeScript Support

The notion-helper package has TypeScript support via declarations generated from the JSDocs comments in the source files. If you're using TypeScript, you'll get full type-checking and auto-completion in your editor when using notion-helper.

## Importing Functions

You can import the entire package, which will give you access to everything:

```js
import NotionHelper from "notion-helper"

// Usage example with direct block API method

const paragraph = NotionHelper.block.paragraph.createBlock("My mistake. Table's cold, anyway.")

// Usage example with shorthand function
const paragraph = NotionHelper.paragraph("I'd try the lounge at the Caesar's. It gets busy after three o'clock.")
```

Alternatively, you can import individual functions:

```js
import { paragraph } from "notion-helper"

// Usage example
const paragraph = paragraph("I'd try the lounge at the Caesar's. It gets busy after three o'clock.")
```

In all of these cases, the function will return a valid object representing a paragraph block:

```js
{
  "type": "paragraph",
  "paragraph": {
    "rich_text": [ 
      { 
        "type": "text", 
        "text": { 
          "content": "I'd try the lounge at the Caesar's. It gets busy after three o'clock." 
        }
      }
    ],
    "color": "default",
    "children": []
  }
}
```

## Handling Large API Requests

Notion Helper's most useful tools are those that help you make [Create Page](https://developers.notion.com/reference/post-page) and [Append Block Children](https://developers.notion.com/reference/patch-block-children) requests that contain large payloads.

The Notion API has many [request limits](https://developers.notion.com/reference/request-limits) that make it difficult to create robust integrations that can handle large or complex content.

For example, my [Notion Voice Notes](https://thomasjfrank.com/how-to-transcribe-audio-to-text-with-chatgpt-and-notion/) workflow needs to be able to sync transcripts from extremely long audio files to Notion.

And [Flylighter](https://flylighter.com/), our Notion web clipper, needs to be able to handle capturing complex HTML content that gets translated to deeply-nested block structures.

These needs often butt up against the API's limits. For example:

* Requests can contain no more than 1,000 blocks
* Any array of can contain no more than 100 blocks (or 100 rich text elements)
* Rich text elements can contain no more than 2,000 characters
* Blocks can have a max of two levels of nested `children` per request

Accounting for all of these limitations in production code is hard. Doing it in a way that *minimizes API requests* (and thus maximizes performance) is hard enough that you basically need to build an entire library for it... hence Notion Helper.

Notion Helper contains a `request` API with methods for creating pages and appending block children. These contain all the logic needed to account for API request limits, split large payloads into the **minimum number** of API requests needed, and make these API requests in sequence.

This API contains two primary methods:

1. `request.pages.create()` (alias function: `createPage()`)
2. `request.blocks.children.append()` (alias function: `appendBlocks()`)

In this section, I'll use the **alias functions** for examples, as they're easier to type out.

Here's a simple example of how we can use `createPage()` to create a page that contains 1,000 paragraph blocks via the Notion API. We're using the official Notion SDK to create a `client` object for making the actual, authenticated HTTPS requsts, and we're using `createNotionBuilder` (Notion Helper's fluent interface) for building up the actual page body. See the next section for a more detailed guide on using the fluent interface.

```js
import { Client } from "@notionhq/client";
import { createPage, createNotionBuilder } from "notion-helper";

const secret = "YOUR_NOTION_KEY";
const notion = new Client({ auth: secret });

const data_source_id = "YOUR_DATA_SOURCE_ID";

let page = createNotionBuilder({
    limitChildren: false,
})
    .parentDataSource(data_source_id)
    .title("Name", "Page with a big list!")
    .heading1("Down the Rabbit Hole...")

for (let i = 0; i < 1000; i++) {
    page = page.paragraph(`This is paragraph #${i + 1}.`);
}

page = page.build();

const response = await createPage({
    data: page.content,
    client: notion
});

console.log(response);
```

Let's highlight the actual `createPage()` call:

```js
const response = await createPage({
    data: page.content,
    client: notion
});
```

This is **all you need** to create this page. `createPage()` takes a single argument that only requires two properties by default:

1. `data` - a valid Notion page object with any needed properties (`parent`, `properties`, `icon`, etc.)
2. `client` - An instance of `Client` from the Notion SDK

With this, `createPage()` will intelligently split the page body into chunks, each containing the maximum number of blocks allowed by the Notion API request limits.

It will use the first chunk to create the page, then send the remaining chunks to the `appendBlocks()` function so they can be appended to the page.

The `client` variable you set is used to make the actual, authenticated HTTP requests to the Notion API, and you can optionally swap it out for a custom `apiCall` property with a callback if you don't want to use the Notion SDK (see the section below for more on this). This design means Notion Helper can work **alongside** your chosen HTTP tool, acting at a higher level to split up and coordinate requests. It also means the library remains dependency-free.

If you want to append block children directly to an existing page (or another block that supports children), you can use `appendBlocks()` in your code.

```js
import { Client } from "@notionhq/client";
import { appendBlocks, createNotionBuilder } from "notion-helper";

const secret = "YOUR_NOTION_KEY";
const notion = new Client({ auth: secret });

let blocks = createNotionBuilder({
    limitNesting: false,
    limitChildren: false,
});

for (let i = 0; i < 10; i++) {
    blocks = blocks.startParent(
        "bulleted_list_item", 
        `Level ${i + 1}`
    );
}

blocks = blocks.build();

const page_id = "YOUR_PAGE_ID";

const response = await appendBlocks({
    block_id: page_id,
    children: blocks.content,
    client: notion,
});
```

If you'd like to append blocks after a *specific* block on a page (or in another block's `children` array), you can also include an `after` property with the block ID. Notion Helper still handles chunking here; in the case of multiple API calls, it intelligently changes the block ID in `after` between requests so their sequence is not broken.

### Alternative HTTP Clients

You may want to use an alternative HTTP tool, such as [axios](https://github.com/axios/axios) or [ky](https://github.com/sindresorhus/ky), instead of the official Notion TypeScript SDK, for making requests.

Or perhaps you still want to use the SDK, but you'd like to wrap it in your own custom callback that handles automatic retries and exponential backoff in case of rate-limiting (e.g. using [async-retry](https://github.com/vercel/async-retry)).

In both of these cases, you can provide an `apiCall` property (instead of a `client` property) to both `createPage()` and `appendBlocks()`.

The `apiCall` function receives an options object with a `type` property and a `data` property:
- `type: 'create_page'` with `data` containing the page object (parent, properties, etc.)
- `type: 'append_blocks'` with `data` containing `{ block_id, children, after }`

This unified approach allows you to use a single callback function for both operations.

Along with `apiCall`, you should also include one or both of these callback functions:

* `getPage` - returns the page object created in a Create Page request (needed for `createPage()` calls)
* `getResults` - returns the array of block objects created in an Append Block Children request (needed for `appendBlocks()` calls, and for any `createPage()` calls with body content that will be split up)

**Note**: When using `createPage()`, you'll probably want to include *both* of these functions. When you provide body content that needs to be split into multiple chunks, `createPage()` will handle the first one and then kick all the others over to `appendBlocks()` automatically.

Custom API call example using both `createPage()` and `appendBlocks()` with ky:

```js
import ky from 'ky';
import { createPage, appendBlocks, createNotionBuilder } from "notion-helper";

const secret = "YOUR_NOTION_KEY";

// Unified callback for both operations
const apiCall = async ({ type, data }) => {
    if (type === 'create_page') {
        return await ky.post('https://api.notion.com/v1/pages', {
            json: data,
            headers: {
                'Authorization': `Bearer ${secret}`,
                'Notion-Version': "2025-09-03",
                'Content-Type': 'application/json',
            },
        }).json();
    } else if (type === 'append_blocks') {
        const { block_id, children, after } = data;
        return await ky.patch(
            `https://api.notion.com/v1/blocks/${block_id}/children`,
            {
                json: { children, ...(after && { after }) },
                headers: {
                    'Authorization': `Bearer ${secret}`,
                    'Notion-Version': "2025-09-03",
                    'Content-Type': 'application/json',
                },
            }
        ).json();
    }
};

// Use the same callback for both operations
let page = createNotionBuilder()
    .parentDataSource('your-data-source-id')
    .title('Name', 'My Page')
    .paragraph('Content')
    .build();

const pageResult = await createPage({
    data: page.content,
    apiCall,
    getPage: (response) => response,
    getResults: (response) => response.results
});

// Append more blocks using the same callback
let blocks = createNotionBuilder({ 
    limitNesting: false,
    limitChildren: false 
});

for (let i = 0; i < 10; i++) {
    blocks = blocks.startParent("bulleted_list_item", `Level ${i+1}`);
}

blocks = blocks.build();

const blockResult = await appendBlocks({
    block_id: pageResult.apiResponse.id,
    children: blocks.content,
    apiCall,
    getResults: (response) => response.results
});
```

## Building Up Pages

Notion-Helper can also help you to build up large page and block objects in your applications using far less verbose code than what you have to write when working the API directly.

It provides the `createNotionBuilder()` function, which gives you a **fluent interface** that allows you to chain methods in order to build up page objects.

For example, here's how we could build the `data` object in order to create a simple page in a task manager data source:

```js
import { createNotionBuilder } from "notion-helper"

const builder = createNotionBuilder()
    .parentDataSource('your-data-source-id')
    .icon('🐕')
    .title('Name', 'Walk the dog')
    .date('Due', '2025-10-29')
    .paragraph('I need to walk Mrs. Nesbit\'s dog today. The leash is hanging near the door.')
    .build()

const page = builder.content
```

By default, `createNotionBuilder()` expects that you'll be handling the actual API requests on your own instead of using `createPage()` or `appendBlocks()` to help you.

This means that `createNotionBuilder()` will respect Notion API request limits:

1. A top-level `children` array will contain no more than 100 blocks. Additional blocks are moved to an `additionalBlocks` property in the return object, which you can handle with Append Block Children requests
2. Only two levels of nested `children` arrays will be allowed

Lower levels of the library handle other limits for you; for example, if more than 2,000 characters are provided to any text-based block method, the library has logic for splitting the text into multiple rich text objects.

```js
import { createNotionBuilder } from "notion-helper"

const builder = createNotionBuilder()
    .parentDataSource('your-data-source-id')
    .icon('🐕')
    .title('Name', 'Walk the dog')
    .date('Due', '2025-10-29')
    .loop(
        (page, sentence, index) => {
            page.numberedListItem(`This is numbered sentence #${index + 1}`);
        },
        Array.from({ length: 200 }, (_, index) => index)
    )
    .build()

const page = builder.content // Will append the first 100 list items

const additionalBlocks = builder.additionalBlocks // Array with the final 100 list items
```

If you're working with `createPage` to create pages, or with `appendBlocks()` to append child blocks, you don't need to worry about these API limits! Those functions intelligently split up the page body into multiple requests and automatically make them in sequence.

To set up `createNotionBuilder()` for use with these functions, pass an `options` object with the following flags:

```js
const builder = createNotionBuilder({
    limitChildren: false,
    limitNesting: false,
})
```

This sets the builder up to allow any number of blocks in *any* `children` array (even nested ones), and allows for an infinite number of nested `children` levels.

By the way, you can use `createNotionBuilder()` to create block arrays, too – without embedding them in a page data object. To do this, simply omit any page meta or page property methods while chaining methods:

```js
const blockArray = createNotionBuilder()
    .heading1('This is a heading')
    .paragraph('This is a paragraph')
    .build()
```

By default, `createNotionBuilder()` will try to smoothly handle null/undefined values passed to its methods, returning `this` and effectively ignoring the method call. This can be helpful when you're looping over an array of objects with inconsistent keys, or handling user input where even specific properties may or may not be defined by the user.

However, you can call `createNotionBuilder({ strict: true })` if you'd like to enable strict mode. When enabled, null/undefined block types, property names, property types, and property/block values passed will cause the function to throw an error.

`createNotionBuilder()` includes methods for:

* Parents  
    - `parentDataSource(id)`
    - `parentDs(id)` (alias)
    - `parentPage(id)`
    - `parentDatabase(id)` (deprecated)
    - `parentDb(id)` (deprecated, alias)
* IDs 
    - `pageId(pageId)` (for updating pages)
    - `blockId(blockId)` (for block operations)
    - `propertyId(propertyId)` (for property operations)
* Icon  
    - `icon(emojiOrUrlOrFile)`
* Cover  
    - `cover(urlOrFile)`
* Templates
    - `template(templateIdOrDefault)`
* Properties  
    - `property(name, type, value)` (add custom property by type)
    - `title(name, value)`
    - `richText(name, value)`
    - `checkbox(name, value)`
    - `date(name, value)`
    - `email(name, value)`
    - `files(name, value)`
    - `multiSelect(name, value)`
    - `number(name, value)`
    - `people(name, value)`
    - `phoneNumber(name, value)`
    - `relation(name, value)`
    - `select(name, value)`
    - `status(name, value)`
    - `url(name, value)`
* Block types  
    - `addBlock(type, value, options)` (generic, works for all block types)
    - `paragraph(options)`
    - `heading1(options)`
    - `heading2(options)`
    - `heading3(options)`
    - `bulletedListItem(options)`
    - `numberedListItem(options)`
    - `toDo(options)`
    - `callout(options)`
    - `quote(options)`
    - `code(options)`
    - `divider()`
    - `image(options)`
    - `video(options)`
    - `audio(options)`
    - `file(options)`
    - `pdf(options)`
    - `bookmark(options)`
    - `embed(options)`
    - `table(options)`
    - `tableRow(options)`
    - `columnList(options)` (and `endColumnList()`)
    - `column(options)` (and `endColumn()`)
    - `toggle(options)` 

All of the methods for blocks, properties, and parent/id/cover/template take the same arguments as the lower-level versions in the `blocks`, `page_meta`, and `page_props` APIs. In fact, they simply pass their arguments to those functions. Therefore, you can refer to the sections below on Block, Page Meta, and Page Property methods.

`createNotionBuilder()` also has some utility methods that make buiding up page objects even easier:

* `loop(callback, array)`
* `addExistingBlock(block)`
* `startParent(parentBlock)`
* `endParent()`

You can use `loop()` to create blocks from every element of an array, either by specifying a block type or using a callback. For example, let's say you want to create a Notion page with a numbered list representing the tracks in an album.

You can automatically call one of the block methods for each element in the `tracks` array by passing a block type for the first argument in `loop()`:

```js
const album = {
    name: "A Pretty Face to Ruin Everything",
    artist: "Airplane Mode",
    release_date: "03/14/2020",
    cover: "https://i.imgur.com/d3BBFhF.jpeg",
    tracks: [
        "When the Lights Go Out",
        "West Coast",
        "Candy Store",
        "Pedestal",
        "She's Asleep",
        "The Ledge, Pt. 1",
        "Anastasia",
        "For the Moment",
        "I Know",
        "While My Guitar Gently Weeps",
        "The Ledge, Pt. 2",
        "Both Can Be True",
        "Forever, Again",
        "Everlong",
    ],
};

const page = createNotionBuilder()
    .parentDataSource('your-data-source-id')
    .title("Name", album.name) // prop name, value
    .richText("Artist", album.artist)
    .date("Released", album.release_date)
    .heading1("Tracklist")
    .loop("numbered_list_item", album.tracks)
    .heading1("Album Art")
    .image(album.cover)
    .build();
```

Result:

![Album page](https://thomasjfrank.com/wp-content/uploads/2025/11/album-page.jpeg)

But what if you need to do something fancier for each array element? For that, provide a callback for the first argument in `loop()` instead of a block-type string. The callback's own arguments should be:

1. `builder` - The builder object
2. `element` - Represents the current element of the array
3. `index` - Optional, for tracking the current index

```js
const album = {
    name: "Mandatory Fun",
    artist: `"Weird Al" Yankovic`,
    release_date: "07/15/2014",
    tracks: [
        {
            "No.": 1,
            Title: "Handy",
            "Writer(s)":
                "Amethyst Kelly\nCharlotte Aitchison...",
            Length: "2:56",
        },
        /* ...more tracks... */
    ],
};

const page = createNotionBuilder()
    .parentDataSource(data_source_id)
    .title("Name", album.name)
    .heading1("Tracklist")
    .startParent("table", {
        has_column_header: true,
        rows: [["No", "Title", "Writer(s)", "Length"]],
    })
    .loop((page, track) => {
        page.tableRow([
            track["No."], 
            track.Title, 
            track["Writer(s)"], 
            track.Length
        ])
    }, album.tracks)
    .endParent()
    .build();
```

Result: 

![Mandatory Fun Tracklist](https://thomasjfrank.com/wp-content/uploads/2025/11/Mandatory-Fun-Table.jpg)

The `addExistingBlock()` method lets you add an existing, properly-formatted blocks to the builder. It's useful if you have code, or another library (e.g. [Martian](https://github.com/tryfabric/martian), the markdown-to-Notion converter), that already creates Notion blocks.

```js
const paragraphBlock = {
  object: "block",
  type: "paragraph",
  paragraph: {
    text: [
      {
        type: "text",
        text: {
          content: "This is a custom paragraph block, added via addExistingBlock()."
        }
      }
    ]
  }
};

const pageWithParagraph = createNotionBuilder()
  .title("Paragraph Example")
  .addExistingBlock(paragraphBlock)
  .build();
```

If you want to created nested block structures (i.e. add children to a block), you can use the `startParent()` and `endParent()` methods. Each instance of `startParent()` should have a matching instance of `endParent()` to close the parent block, after you've added all child blocks.

```js
const nestedPage = createNotionBuilder()
  .title("Nested Blocks Example")
  .startParent("toggle", "Click to expand")
    .paragraph("This is a nested paragraph block.")
  .endParent()
  .build();
```

Remember: If you set the `limitNesting` option to `false` and use `createPages()` to make your API requests, you can nest as deeply as you want:

```js
const nestedPage = createNotionBuilder({ limitNesting: false })
  .title("Nested Blocks Example")
  .startParent("bulleted_list_item", "It's")
    .startParent("bulleted_list_item", "Turtles"
      .startParent("bulleted_list_item", "All")
        .startParent("bulleted_list_item", "The")
          .startParent("bulleted_list_item", "Way")
            .bulletedListItem("Down")
          .endParent()
        .endParent()  
      .endParent()
    .endParent()
  .endParent()
  .build();
```

## Applying Database Templates

The Notion API allows you to apply data source templates to new pages as you're creating them. 

This is super useful, but it introduces some complexity into the process of creating new pages. When you create a page from a template, you cannot include a `children` property in the Create Page request. 

Additionally, the Notion API will reject Append Block Children requests if the template hasn't finished applying. The API also doesn't provide a way to directly check if the template has finished applying.

Notion Helper is set up to help you deal with this complexity. As I briefly showed in the Building Up Pages section above, you can use the `template()` method while creating page objects to set a template, either passing a specific template ID or `"default"` to use a data source's default template.

*Note: Using `"default"` when a data source has no default template will cause a Create Page request to fail. The "Empty" option is not considered a default with respect to the API, even though it does show the "Default" badge in the Notion app.*

When you use the `createPage()` function to create a page with a template, the library will automatically remove any `children` property present in the page body and save it for a subsequent Append Block Children request.

By default, it'll wait 3000ms (3 seconds) after getting a successful response from the Create Page call before starting to append any `children` blocks. This default setting should work for 95% of cases, since most data source templates don't create a large amount of page content. It also means that applications that were using Notion Helper prior to template support being added to the Notion API don't need to update their code.

However, Notion Helper provides you with a few ways to customize how `createPage()` waits for templates to finish applying. There are three optional properties you can set within the `options` argument:

1. `templateWaitMs` - sets a custom number of milliseconds (ms) to wait before attempting to append children. Defaults to 3000ms.
2. `onTemplatePageCreated` - a custom callback function you can provide in order to handle verification of the created page however you like (for exmample: fetching the page's top-level blocks and comparing them to the top-level blocks within the actual template).
3. `skipAutoAppendOnTemplate` - a Boolean which, when set to `false`, will cause `createPage()` to skip appending children and include them in a  `pendingChildren` property within the return object. This allows you to handle appending block children manually.

Out of these options, setting an `onTemplatePageCreated` callback provides the best balance between reliability and batteries-included functionality. The example below shows how you can build a callback that compares the number of top-level blocks in the created page against the number in the template page. It also includes basic retry logic.

See the [Template Usage Guide](./guides/Template%20Usage%20Guide.md) for more examples and options.

```javascript
import { createPage } from "notion-helper"
import { collectDataSourceTemplates } from "@notionhq/client"

// Sample verification helper function
async function verifyTemplateReady({ 
  template,
  dataSourceId,
  createdPageId, 
  client, 
  options = {} 
}) {
  const { 
    maxRetries = 3, 
    waitMs = 2000 
  } = options;
  
  console.log('⏳ Verifying template content is ready...');
  
  // Validate template object
  if (!template || typeof template !== 'object' || !template.hasOwnProperty('type')) {
    throw new Error('Template verification failed: template object is invalid or missing required "type" property');
  }
  
  // Determine template ID based on template type
  let templateId;
  
  if (template.type === 'template_id') {
    templateId = template.template_id;
    if (!templateId) {
      throw new Error('Template verification failed: Missing template_id for template.type "template_id"');
    }
    console.log(`   Using template_id: ${templateId}`);
  } else if (template.type === 'default') {
    console.log('   Fetching default template from data source...');
    try {
      const templates = await collectDataSourceTemplates(client, {
        data_source_id: dataSourceId
      });
      const defaultTemplate = templates.find(t => t.is_default);
      if (defaultTemplate) {
        templateId = defaultTemplate.id;
        if (!templateId) {
          throw new Error('Template verification failed: Default template found but it has no id');
        }
        console.log(`   Found default template: ${defaultTemplate.name} (${templateId})`);
      } else {
        throw new Error('Template verification failed: No default template found in the provided data source');
      }
    } catch (error) {
      throw new Error(`Template verification failed: Could not fetch templates (${error.message})`);
    }
  } else if (template.type === 'none') {
    throw new Error('Template verification failed: Template type is "none", nothing to verify.');
  } else {
    throw new Error(`Template verification failed: Unknown template type "${template.type}"`);
  }
  
  // Get template block count
  let templateBlockCount;
  try {
    const templateBlocks = await client.blocks.children.list({
      block_id: templateId,
      page_size: 100 // Note: If your template has >100 top-level blocks, you'll need pagination here
    });
    templateBlockCount = templateBlocks.results.length;
    console.log(`   Template has ${templateBlockCount} top-level blocks`);
  } catch (error) {
    throw new Error(`Template verification failed: Could not fetch template blocks (${error.message})`);
  }
  
  // Verify created page has same structure (with retries)
  let retries = 0;
  let verified = false;
  let currentBlockCount = 0;
  
  while (retries <= maxRetries && !verified) {
    await new Promise(resolve => setTimeout(resolve, waitMs));
    let pageBlocks;
    try {
      pageBlocks = await client.blocks.children.list({
        block_id: createdPageId,
        page_size: 100
      });
      currentBlockCount = pageBlocks.results.length;
    } catch (error) {
      throw new Error(`Template verification failed: Could not fetch page blocks for verification attempt ${retries + 1} (${error.message})`);
    }
    
    console.log(`   Attempt ${retries + 1}/${maxRetries + 1}: Page has ${currentBlockCount} blocks`);
    
    if (currentBlockCount >= templateBlockCount) {
      verified = true;
      console.log('✓ Template content verified!');
    } else {
      retries++;
    }
  }
  
  if (!verified) {
    throw new Error(
      `Template verification failed after ${maxRetries + 1} attempts. ` +
      `Expected at least ${templateBlockCount} blocks but found ${currentBlockCount}.`
    );
  }
}

// Use the verification callback
const result = await createPage({
    data: templatePage.content,
    client: notion,
    templateWaitMs: 0, // Set to 0 since verification callback handles waiting
    onTemplatePageCreated: async ({ page, template, fallbackWaitMs }) => {
        console.log(`✓ Template page created: ${page.id}`);
        console.log(`✓ Page URL: https://www.notion.so/${page.id.replace(/-/g, '')}`);
        
        // Verify template is ready before appending children
        await verifyTemplateReady({
            template: template,
            dataSourceId: data_source_id,
            createdPageId: page.id,
            client: notion,
            options: {
                maxRetries: 3,
                waitMs: 2000
            }
        });
    }
});

console.log('✓ Page creation complete!');
console.log('✓ Template verification passed!');
```

## Block Methods

Notion Helper lets you easily create any block supported by the Notion API. Instead of typing out verbose JSON, you can use Notion Helper's `block` API methods to create blocks in a single line.

You have two ways of using these functions. First, you can import the entire `block` API and use the methods directly. When you do, the block names are exactly as they are in the official Notion API (note how blocks with multi-word names use underscores: e.g. `numbered_list_item`):

```js
import { block } from "notion-helper"

const paragraph = block.paragraph.createBlock("It's called a grind, bro.")

const item = block.numbered_list_item.createBlock("Pickles")

const table = block.table.createBlock({
  has_column_header: true,
  rows: [
    [ "Name", "Type" ],
    [ "Charmander", "Fire" ],
    [ "Squirtle", "Water" ]
  ]
})
```

Alternatively, you can use the shorthand alias methods for each block. You can import these directly as needed, and they're identical to the block methods available in the `createNotionBuilder()` fluent interface. These methods use camelCase for multi-word block names (e.g. `numberedListItem`):

```js
import { paragraph, numberedListItem, table } from "notion-helper"

const paragraph = paragraph("It's called a grind, bro.")

const item = numberedListItem("Pickles")

const table = table({
  has_column_header: true,
  rows: [
    [ "Name", "Type" ],
    [ "Charmander", "Fire" ],
    [ "Squirtle", "Water" ]
  ]
})
```

Here's a table listing all avaible block methods, along with their shorthand alias functions. I've also linked the actual Notion API reference for each block type.

| Block Method | Shorthand Alias | API Reference |
|--------------|----------------|----------------|
| `block.audio.createBlock()` | `audio()` | [Audio](https://developers.notion.com/reference/block#audio) |
| `block.bookmark.createBlock()` | `bookmark()` | [Bookmark](https://developers.notion.com/reference/block#bookmark) |
| `block.breadcrumb.createBlock()` | *(no shorthand)* | [Breadcrumb](https://developers.notion.com/reference/block#breadcrumb) |
| `block.bulleted_list_item.createBlock()` | `bulletedListItem()` or `bullet()` | [Bulleted list item](https://developers.notion.com/reference/block#bulleted-list-item) |
| `block.callout.createBlock()` | `callout()` | [Callout](https://developers.notion.com/reference/block#callout) |
| `block.code.createBlock()` | `code()` | [Code](https://developers.notion.com/reference/block#code) |
| `block.column_list.createBlock()` | `columnList()` | [Column list and column](https://developers.notion.com/reference/block#column-list-and-column) |
| `block.column.createBlock()` | `column()` | [Column list and column](https://developers.notion.com/reference/block#column-list-and-column) |
| `block.divider.createBlock()` | `divider()` | [Divider](https://developers.notion.com/reference/block#divider) |
| `block.embed.createBlock()` | `embed()` | [Embed](https://developers.notion.com/reference/block#embed) |
| `block.file.createBlock()` | `file()` | [File](https://developers.notion.com/reference/block#file) |
| `block.heading_1.createBlock()` | `heading1()` | [Heading 1](https://developers.notion.com/reference/block#heading-1) |
| `block.heading_2.createBlock()` | `heading2()` | [Heading 2](https://developers.notion.com/reference/block#heading-2) |
| `block.heading_3.createBlock()` | `heading3()` | [Heading 3](https://developers.notion.com/reference/block#heading-3) |
| `block.image.createBlock()` | `image()` | [Image](https://developers.notion.com/reference/block#image) |
| `block.numbered_list_item.createBlock()` | `numberedListItem()` or `num()` | [Numbered list item](https://developers.notion.com/reference/block#numbered-list-item) |
| `block.paragraph.createBlock()` | `paragraph()` | [Paragraph](https://developers.notion.com/reference/block#paragraph) |
| `block.pdf.createBlock()` | `pdf()` | [PDF](https://developers.notion.com/reference/block#pdf) |
| `block.quote.createBlock()` | `quote()` | [Quote](https://developers.notion.com/reference/block#quote) |
| `block.table.createBlock()` | `table()` | [Table](https://developers.notion.com/reference/block#table) |
| `block.table_row.createBlock()` | `tableRow()` | [Table](https://developers.notion.com/reference/block#table) |
| `block.table_of_contents.createBlock()` | `tableOfContents()` | [Table of contents](https://developers.notion.com/reference/block#table-of-contents) |
| `block.to_do.createBlock()` | `toDo()` | [To do](https://developers.notion.com/reference/block#to-do) |
| `block.toggle.createBlock()` | `toggle()` | [Toggle blocks](https://developers.notion.com/reference/block#toggle-blocks) |
| `block.video.createBlock()` | `video()` | [Video](https://developers.notion.com/reference/block#video) |

Below, you'll find a brief explanation of each block method and its alias function, along with a few snippets of example code you can use.

### Audio

You can create audio blocks using either `block.audio.createBlock()` or the shorthand alias `audio()`.

```js
import { audio } from "notion-helper"

// External URL (string)
const block1 = audio("https://thomasjfrank.com/wp-content/uploads/2025/11/Voice-Sample3.mp3")

// Options object with URL
const block2 = audio({ 
  url: "https://thomasjfrank.com/wp-content/uploads/2025/11/Voice-Sample3.mp3" 
})

// With caption (string)
const block3 = audio({
  url: "https://thomasjfrank.com/wp-content/uploads/2025/11/Voice-Sample3.mp3",
  caption: "Check out my mixtape, man."
})

// With caption (array of strings)
const block4 = audio({
  url: "https://thomasjfrank.com/wp-content/uploads/2025/11/Voice-Sample3.mp3",
  caption: ["Podcast episode", "Episode description"]
})

// File upload ID (from local upload or external import)
const block5 = audio("123e4567-e89b-12d3-a456-426614174000")
```

### Bookmark

You can create bookmark blocks using either `block.bookmark.createBlock()` or the shorthand alias `bookmark()`.

```js
import { bookmark, buildRichTextObj } from "notion-helper"

// URL (string)
const block1 = bookmark("https://www.flylighter.com")

// Options object with URL
const block2 = bookmark({ url: "https://www.flylighter.com" })

// With caption (string)
const block3 = bookmark({
  url: "https://www.flylighter.com",
  caption: "Flylighter is a super-rad web clipper for Notion."
})

// With caption (rich text)
const block4 = bookmark({
  url: "https://www.flylighter.com",
  caption: buildRichTextObj("Rich text caption with ", { bold: true })
})
```

### Breadcrumb

You can create breadcrumb blocks using `block.breadcrumb.createBlock()`. There is no shorthand alias for breadcrumb blocks.

```js
import { breadcrumb } from "notion-helper"

// No parameters required
const block1 = breadcrumb()
```

### Bulleted List Item

You can create bulleted list item blocks using either `block.bulleted_list_item.createBlock()` or the shorthand aliases `bulletedListItem()` or `bullet()`.

```js
import { bulletedListItem, bullet, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = bulletedListItem("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings
const block2 = bulletedListItem(["My mistake. ", "Table's cold, anyway."])

// Options object with color
const block3 = bulletedListItem({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  color: "red" 
})

// With rich text formatting
const block4 = bulletedListItem({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes. ", { italic: true }),
    buildRichTextObj("Evel Knievel.", { bold: true })
  ].flat(),
  color: "blue_background"
})

// With child blocks
const block5 = bulletedListItem({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  children: [
    paragraph("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock."),
    bulletedListItem("Haha, he's a balloon boy!")
  ]
})

// Using bullet() alias
const block6 = bullet("What, did you guys get a group rate or something?")
```

### Callout

You can create callout blocks using either `block.callout.createBlock()` or the shorthand alias `callout()`.

```js
import { callout, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = callout("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Options object with icon (emoji)
const block2 = callout({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  icon: "💡" 
})

// With icon (external image URL) and color
const block3 = callout({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  icon: "https://thomasjfrank.com/wp-content/uploads/2021/09/Thomas-Frank-Headshot-2021.jpg",
  color: "blue_background"
})

// With rich text formatting
const block4 = callout({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj("Evel Knievel.", { bold: true })
  ].flat(),
  icon: "🚀",
  color: "yellow_background"
})

// With child blocks
const block5 = callout({
  rich_text: "You could try the lounge at the Caesar's. I hear it gets busy after three o'clock.",
  icon: "📌",
  children: [
    paragraph("Haha, he's a balloon boy!"),
    callout("What, did you guys get a group rate or something?")
  ]
})
```

### Code

You can create code blocks using either `block.code.createBlock()` or the shorthand alias `code()`.

```js
import { code, buildRichTextObj } from "notion-helper"

// Single line string
const block1 = code("console.log('My mistake. Table's cold, anyway.');")

// Multi-line string (template literal)
const block2 = code({
  rich_text: `const greet = (name) => {
    console.log(\`Hello, \${name}!\`);
};

greet("Notion");`,
  language: "javascript"
})

// Array of strings (joined with newlines)
const block3 = code([
  "def fib(n):",
  "    if n <= 1:",
  "        return n",
  "    return fib(n-1) + fib(n-2)"
])

// With language and caption
const block4 = code({
  rich_text: `SELECT id, title
FROM pages
WHERE created_time >= CURRENT_DATE - INTERVAL '7 days';`,
  language: "sql",
  caption: "You're both of you nuts. I know more about casino security than any man alive. I invented it!"
})

// With rich text formatting
const block5 = code({
  rich_text: [
    "// ",
    buildRichTextObj("Bold comment", { italic: true }),
    buildRichTextObj(" with formatting", { bold: true }),
    "\nconst value = 1;"
  ].flat(),
  language: "javascript"
})
```

### Column

You can create column blocks using either `block.column.createBlock()` or the shorthand alias `column()`. Columns must be children of column lists, and each column must have at least 1 child block.

```js
import { column, paragraph, heading3 } from "notion-helper"

// Single string (creates column with one paragraph)
const block1 = column("Somebody made a duplicate of my vault.")

// Array of strings (creates column with multiple paragraphs)
const block2 = column([
  "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  "You could try the lounge at the Caesar's. I hear it gets busy after three o'clock."
])

// Array with mixed content (strings and block objects)
const block3 = column([
  "Haha, he's a balloon boy!",
  heading3("What, did you guys get a group rate or something?"),
  "All right chaps. Hang on to your knickers."
])
```

### Column List

You can create column list blocks using either `block.column_list.createBlock()` or the shorthand alias `columnList()`. Column lists must have at least 2 columns, and each column must have at least 1 child block.

```js
import { columnList, column, paragraph } from "notion-helper"

// Number parameter (creates N columns with empty paragraphs)
const block1 = columnList(2)

// Array of strings (each string becomes a column)
const block2 = columnList([
  "My mistake. Table's cold, anyway.",
  "You're both of you nuts. I know more about casino security than any man alive. I invented it!"
])

// Array of arrays (each inner array becomes a column with multiple children)
const block3 = columnList([
  ["Somebody made a duplicate of my vault.", "I still owe you for the thing with the guy in the place, and I'll never forget it."],
  ["Haha, he's a balloon boy!"]
])

// With pre-built column objects
const block4 = columnList([
  column(["Are you a man? Yes.", "Are you alive? Yes. Evel Knievel."]),
  column(["What, did you guys get a group rate or something?"])
])
```

### Divider

You can create divider blocks using either `block.divider.createBlock()` or the shorthand alias `divider()`.

```js
import { divider } from "notion-helper"

// No parameters required
const block1 = divider()
```

### Embed

You can create embed blocks using either `block.embed.createBlock()` or the shorthand alias `embed()`.

```js
import { embed } from "notion-helper"

// URL (string)
const block1 = embed("https://www.youtube.com/watch?v=ec5m6t77eYM")

// Options object with URL
const block2 = embed({ url: "https://www.youtube.com/watch?v=ec5m6t77eYM" })

// Twitter/X embed
const block3 = embed("https://x.com/TomFrankly/status/1985017900433051866")

// CodePen embed
const block4 = embed("https://en.wikipedia.org/wiki/Byte")
```

### File

You can create file blocks using either `block.file.createBlock()` or the shorthand alias `file()`.

```js
import { file, buildRichTextObj } from "notion-helper"

// External URL (string)
const block1 = file("https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf")

// Options object with URL
const block2 = file({ 
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf" 
})

// With custom name
const block3 = file({
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
  name: "10 Steps to Earning Awesome Grades (preview)"
})

// With caption (string)
const block4 = file({
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
  caption: "The Reddit preview of the 10 Steps to Earning Awesome Grades book."
})

// With name and caption
const block5 = file({
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
  name: "10 Steps to Earning Awesome Grades (preview)",
  caption: "The Reddit preview of the 10 Steps to Earning Awesome Grades book."
})

// File upload ID (from local upload or external import)
const block6 = file("123e4567-e89b-12d3-a456-426614174000")
```

### Heading 1

You can create heading 1 blocks using either `block.heading_1.createBlock()` or the shorthand alias `heading1()`.

```js
import { heading1, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = heading1("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings
const block2 = heading1(["My mistake. ", "Table's cold, anyway."])

// Options object with color
const block3 = heading1({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  color: "red" 
})

// With rich text formatting
const block4 = heading1({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  color: "blue_background"
})

// Toggle heading with children
const block5 = heading1({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  is_toggleable: true,
  children: [
    paragraph("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock.")
  ]
})
```

### Heading 2

You can create heading 2 blocks using either `block.heading_2.createBlock()` or the shorthand alias `heading2()`.

```js
import { heading2, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = heading2("Haha, he's a balloon boy!")

// Array of strings
const block2 = heading2(["What, did you guys get a group rate or something? ", "All right chaps. Hang on to your knickers."])

// Options object with color
const block3 = heading2({ 
  rich_text: "You're both of you nuts. I know more about casino security than any man alive. I invented it!", 
  color: "yellow" 
})

// With rich text formatting
const block4 = heading2({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  color: "green_background"
})

// Toggle heading with children (implicit toggle)
const block5 = heading2({
  rich_text: "My mistake. Table's cold, anyway.",
  children: [
    paragraph("Somebody made a duplicate of my vault.")
  ]
})
```

### Heading 3

You can create heading 3 blocks using either `block.heading_3.createBlock()` or the shorthand alias `heading3()`.

```js
import { heading3, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = heading3("I still owe you for the thing with the guy in the place, and I'll never forget it.")

// Array of strings
const block2 = heading3(["You could try the lounge at the Caesar's. ", "I hear it gets busy after three o'clock."])

// Options object with color
const block3 = heading3({ 
  rich_text: "Haha, he's a balloon boy!", 
  color: "purple" 
})

// With rich text formatting
const block4 = heading3({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  color: "orange_background"
})

// Toggle heading with children
const block5 = heading3({
  rich_text: "What, did you guys get a group rate or something?",
  is_toggleable: true,
  children: [
    paragraph("All right chaps. Hang on to your knickers.")
  ]
})
```

### Image

You can create image blocks using either `block.image.createBlock()` or the shorthand alias `image()`.

```js
import { image, buildRichTextObj } from "notion-helper"

// External URL (string)
const block1 = image("https://i.imgur.com/5vSShIw.jpeg")

// Options object with URL
const block2 = image({ 
  url: "https://i.imgur.com/5vSShIw.jpeg" 
})

// With caption (string)
const block3 = image({
  url: "https://i.imgur.com/5vSShIw.jpeg",
  caption: "A beautiful landscape image"
})

// With caption (array of strings)
const block4 = image({
  url: "https://i.imgur.com/5vSShIw.jpeg",
  caption: ["First line of caption", "Second line of caption"]
})

// With caption (rich text)
const block5 = image({
  url: "https://i.imgur.com/5vSShIw.jpeg",
  caption: buildRichTextObj("Rich text caption with ", { bold: true })
})

// File upload ID (from local upload or external import)
const block6 = image("123e4567-e89b-12d3-a456-426614174000")
```

### Numbered List Item

You can create numbered list item blocks using either `block.numbered_list_item.createBlock()` or the shorthand aliases `numberedListItem()` or `num()`.

```js
import { numberedListItem, num, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = numberedListItem("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings
const block2 = numberedListItem(["My mistake. ", "Table's cold, anyway."])

// Options object with color
const block3 = numberedListItem({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  color: "red" 
})

// With rich text formatting
const block4 = numberedListItem({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  color: "blue_background"
})

// With child blocks
const block5 = numberedListItem({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  children: [
    paragraph("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock."),
    numberedListItem("Haha, he's a balloon boy!")
  ]
})

// Using num() alias
const block6 = num("What, did you guys get a group rate or something?")
```

### Paragraph

You can create paragraph blocks using either `block.paragraph.createBlock()` or the shorthand alias `paragraph()`.

```js
import { paragraph, buildRichTextObj } from "notion-helper"

// Single string
const block1 = paragraph("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings (combined into a single paragraph)
const block2 = paragraph(["My mistake. ", "Table's cold, anyway."])

// Options object with color
const block3 = paragraph({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  color: "red" 
})

// Rich text with formatting
const block4 = paragraph({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { bold: true, color: "blue" })
  ].flat(),
  color: "yellow"
})

// With child blocks (nested paragraphs)
const block5 = paragraph({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  children: [
    paragraph("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock."),
    paragraph("Haha, he's a balloon boy!")
  ]
})

// Mixed strings and rich text objects
const block6 = paragraph([
  "What, did you guys get a group rate or something? ",
  buildRichTextObj("All right chaps. Hang on to your knickers.", { italic: true })
].flat())
```

### PDF

You can create PDF blocks using either `block.pdf.createBlock()` or the shorthand alias `pdf()`.

```js
import { pdf, buildRichTextObj } from "notion-helper"

// External URL (string)
const block1 = pdf("https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf")

// Options object with URL
const block2 = pdf({ 
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf" 
})

// With caption (string)
const block3 = pdf({
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
  caption: "The Reddit preview of the 10 Steps to Earning Awesome Grades book."
})

// With caption (array of strings)
const block4 = pdf({
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
  caption: ["PDF document", "Document description"]
})

// With caption (rich text)
const block5 = pdf({
  url: "https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf",
  caption: buildRichTextObj("Rich text caption with ", { bold: true })
})

// File upload ID (from local upload or external import)
const block6 = pdf("123e4567-e89b-12d3-a456-426614174000")
```

### Quote

You can create quote blocks using either `block.quote.createBlock()` or the shorthand alias `quote()`.

```js
import { quote, buildRichTextObj, paragraph } from "notion-helper"

// Single string
const block1 = quote("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings
const block2 = quote(["My mistake. ", "Table's cold, anyway."])

// Options object with color
const block3 = quote({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  color: "gray" 
})

// With rich text formatting
const block4 = quote({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  color: "blue_background"
})

// With child blocks
const block5 = quote({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  children: [
    paragraph("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock."),
    quote("Haha, he's a balloon boy!")
  ]
})
```

### Table

You can create table blocks using either `block.table.createBlock()` or the shorthand alias `table()`.

```js
import { table, tableRow, buildRichTextObj, createNotionBuilder } from "notion-helper"

// Options object with rows array
const block1 = table({
  has_column_header: true,
  has_row_header: false,
  rows: [
    ["Name", "Role", "Experience"],
    ["Thomas", "Creator", 10],
    ["Alex", "Designer", 5]
  ]
})

// Number parameter (creates table with N columns, then add rows incrementally)
const block2 = table(3)
// Then use .tableRow() to add rows and .endTable() to finish

// With pre-built table row objects
const block3 = table({
  rows: [
    tableRow(["Header 1", "Header 2"]),
    tableRow(["Row 1, Cell 1", "Row 1, Cell 2"]),
    tableRow(["Row 2, Cell 1", "Row 2, Cell 2"])
  ],
  has_column_header: true,
  has_row_header: false
})

// With rich text objects in rows
const block4 = table({
  rows: [
    [
      buildRichTextObj("Name", { bold: true }),
      buildRichTextObj("Role", { bold: true })
    ],
    ["Thomas", "Creator"]
  ],
  has_column_header: true
})

// Using table() builder method with incremental rows (table_width inferred from first row)
// Note: table() is an alias for startParent("table", { ... }). endTable() is an alias for endParent().
const page1 = createNotionBuilder()
  .table({
    has_column_header: true,
    has_row_header: false
  })
  .tableRow(["Header 1", "Header 2", "Header 3"])
  .tableRow(["Row 1, Cell 1", "Row 1, Cell 2", "Row 1, Cell 3"])
  .tableRow(["Row 2, Cell 1", "Row 2, Cell 2", "Row 2, Cell 3"])
  .endTable()
  .build()

// Using table() builder method with explicit table_width
const page2 = createNotionBuilder()
  .table({
    has_column_header: true,
    has_row_header: false,
    table_width: 4
  })
  .tableRow(["Col 1", "Col 2", "Col 3", "Col 4"])
  .tableRow(["A", "B", "C", "D"])
  .endTable()
  .build()
```

### Table Row

You can create table row blocks using either `block.table_row.createBlock()` or the shorthand alias `tableRow()`.

```js
import { tableRow, buildRichTextObj } from "notion-helper"

// Array of strings and numbers
const block1 = tableRow(["Product", "Price", 50])

// Array with rich text objects
const block2 = tableRow([
  buildRichTextObj("Cell 1"),
  buildRichTextObj("Cell 2", { bold: true }),
  buildRichTextObj("Cell 3", { italic: true })
])

// Mixed content
const block3 = tableRow([
  "Plain text",
  buildRichTextObj("Formatted text", { color: "green" }),
  42
])
```

### Table of Contents

You can create table of contents blocks using either `block.table_of_contents.createBlock()` or the shorthand alias `tableOfContents()`.

```js
import { tableOfContents } from "notion-helper"

// No parameters (default color)
const block1 = tableOfContents()

// String color parameter
const block2 = tableOfContents("red")

// Options object with color
const block3 = tableOfContents({ color: "blue" })
```

### To Do

You can create to-do blocks using either `block.to_do.createBlock()` or the shorthand alias `toDo()`.

```js
import { toDo, buildRichTextObj, paragraph } from "notion-helper"

// Single string (unchecked by default)
const block1 = toDo("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings
const block2 = toDo(["My mistake. ", "Table's cold, anyway."])

// Options object with checked state
const block3 = toDo({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  checked: true 
})

// Options object with color
const block4 = toDo({ 
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.", 
  checked: false,
  color: "yellow_background" 
})

// With rich text formatting
const block5 = toDo({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  checked: false
})

// With child blocks
const block6 = toDo({
  rich_text: "You could try the lounge at the Caesar's. I hear it gets busy after three o'clock.",
  checked: false,
  children: [
    paragraph("Haha, he's a balloon boy!"),
    toDo({ rich_text: "What, did you guys get a group rate or something?", checked: true })
  ]
})
```

### Toggle

You can create toggle blocks using either `block.toggle.createBlock()` or the shorthand alias `toggle()`.

```js
import { toggle, buildRichTextObj, paragraph, heading2 } from "notion-helper"

// Single string
const block1 = toggle("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// Array of strings
const block2 = toggle(["My mistake. ", "Table's cold, anyway."])

// Options object with color
const block3 = toggle({ 
  rich_text: "Somebody made a duplicate of my vault.", 
  color: "red" 
})

// With rich text formatting
const block4 = toggle({
  rich_text: [
    "Are you a man? Yes. ",
    buildRichTextObj("Are you alive? Yes.", { italic: true }),
    buildRichTextObj(" Evel Knievel.", { bold: true })
  ].flat(),
  color: "blue_background"
})

// With child blocks
const block5 = toggle({
  rich_text: "I still owe you for the thing with the guy in the place, and I'll never forget it.",
  children: [
    paragraph("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock."),
    heading2("Haha, he's a balloon boy!"),
    toggle("What, did you guys get a group rate or something?")
  ]
})
```

### Video

You can create video blocks using either `block.video.createBlock()` or the shorthand alias `video()`.

```js
import { video, buildRichTextObj } from "notion-helper"

// External URL (string)
const block1 = video("https://www.youtube.com/watch?v=ec5m6t77eYM")

// Options object with URL
const block2 = video({ 
  url: "https://www.youtube.com/watch?v=ec5m6t77eYM" 
})

// With caption (string)
const block3 = video({
  url: "https://www.youtube.com/watch?v=ec5m6t77eYM",
  caption: "Never gonna give you up"
})

// With caption (array of strings)
const block4 = video({
  url: "https://www.youtube.com/watch?v=ec5m6t77eYM",
  caption: ["Video title", "Video description"]
})

// With caption (rich text)
const block5 = video({
  url: "https://www.youtube.com/watch?v=ec5m6t77eYM",
  caption: buildRichTextObj("Rich text caption with ", { bold: true })
})

// File upload ID (from local upload or external import)
const block6 = video("123e4567-e89b-12d3-a456-426614174000")
```

## Page Meta Methods

Notion Helper provides a `page_meta` API for creating page meta properties, such as:

* `parent`
* `page_id`
* `block_id`
* `property_id`
* `cover`
* `icon`
* `template`

*To set data source property values, see the Page Property Methods below to explore Notion Helper's `page_props` API.*

You have two ways of using these functions. First, you can import the entire `page_meta` API and use the methods directly. When you do, the page meta property names are exactly as they are in the official Notion API:

```js
import { page_meta } from "notion-helper"

const parent = page_meta.parent.createMeta({
  id: "your-data-source-id",
  type: "data_source_id"
})

const icon = page_meta.icon.createMeta("🐕")

const cover = page_meta.cover.createMeta("https://example.com/cover.jpg")
```

Alternatively, you can use the shorthand alias methods for each page meta type. You can import these directly as needed, and they're identical to the page meta methods available in the `createNotionBuilder()` fluent interface:

```js
import { parentDataSource, icon, cover, pageId, blockId, propertyId } from "notion-helper"

const parent = parentDataSource("your-data-source-id")

const icon = icon("🐕")

const cover = cover("https://example.com/cover.jpg")

const pageIdObj = pageId("your-page-id")

const blockIdObj = blockId("your-block-id")
```

Here's a table listing all available page meta methods, along with their shorthand alias functions:

| Page Meta Method | Shorthand Alias | Notes |
|------------------|-----------------|-------|
| `page_meta.parent.createMeta()` | `parentDataSource()` or `parentDs()` | Creates a parent data source object |
| `page_meta.parent.createMeta()` | `parentPage()` | Creates a parent page object |
| `page_meta.parent.createMeta()` | `parentDatabase()` or `parentDb()` | Creates a parent database object (deprecated) |
| `page_meta.page.createMeta()` | `pageId()` | Creates a page_id object |
| `page_meta.block.createMeta()` | `blockId()` | Creates a block_id object |
| `page_meta.property.createMeta()` | `propertyId()` | Creates a property_id object |
| `page_meta.icon.createMeta()` | `icon()` | Creates an icon object |
| `page_meta.cover.createMeta()` | `cover()` | Creates a cover object |
| `page_meta.template.createMeta()` | *(used via `template()` in builder)* | Creates a template object |

Below, you'll find some code examples you can use to set each of the page meta properties.

### Parent - Data Source

```js
import { page_meta, parentDataSource, parentDs } from "notion-helper"

// Using page_meta API
const parent1 = page_meta.parent.createMeta({
  id: "your-data-source-id",
  type: "data_source_id"
})

// Using shorthand alias
const parent2 = parentDataSource("your-data-source-id")

// Even shorter-hand alias
const parent3 = parentDs("your-data-source-id")
```

### Parent - Page

```js
import { page_meta, parentPage } from "notion-helper"

// Using page_meta API
const parent1 = page_meta.parent.createMeta({
  id: "your-page-id",
  type: "page_id"
})

// Using shorthand alias
const parent2 = parentPage("your-page-id")
```

### Parent - Database (Deprecated)

```js
import { page_meta, parentDatabase, parentDb } from "notion-helper"

// Using page_meta API (deprecated)
const parent1 = page_meta.parent.createMeta({
  id: "your-database-id",
  type: "database_id"
})

// Using shorthand alias (deprecated)
const parent2 = parentDatabase("your-database-id")

// Even shorter-hand alias
const parent3 = parentDb("your-database-id")
```

**Note:** Creating pages with a parent `database_id` is deprecated and will not work in databases with more than one data source. Use `parentDataSource()` with a `data_source_id` instead.

### Page ID

```js
import { page_meta, pageId } from "notion-helper"

// Using page_meta API
const pageIdObj1 = page_meta.page.createMeta("your-page-id")

// Using shorthand alias
const pageIdObj2 = pageId("your-page-id")
```

### Block ID

```js
import { page_meta, blockId } from "notion-helper"

// Using page_meta API
const blockIdObj1 = page_meta.block.createMeta("your-block-id")

// Using shorthand alias
const blockIdObj2 = blockId("your-block-id")
```

### Property ID

```js
import { page_meta, propertyId } from "notion-helper"

// Using page_meta API
const propertyIdObj1 = page_meta.property.createMeta("your-property-id")

// Using shorthand alias
const propertyIdObj2 = propertyId("your-property-id")
```

### Icon

```js
import { page_meta, icon } from "notion-helper"

// Emoji icon
const icon1 = page_meta.icon.createMeta("🎃")
const icon2 = icon("🚀")

// External image URL
const icon3 = page_meta.icon.createMeta("https://example.com/icon.png")
const icon4 = icon("https://example.com/icon.png")
```

### Cover

```js
import { page_meta, cover } from "notion-helper"

// Using page_meta API
const cover1 = page_meta.cover.createMeta("https://i.imgur.com/5vSShIw.jpeg")

// Using shorthand alias
const cover2 = cover("https://i.imgur.com/5vSShIw.jpeg")
```

### Template

```js
import { createNotionBuilder } from "notion-helper"

// Default template
const builder1 = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .template("default")

// Specific template by ID
const builder2 = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .template("a5da15f6-b853-455b-81db-d1ef79372b75")

// Template object
const builder3 = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .template({
    type: "template_id",
    template_id: "a5da15f6-b853-455b-81db-d1ef79372b75"
  })

// No template
const builder4 = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .template("none")
```

See the [Template Usage Guide](./guides/Template%20Usage%20Guide.md) for detailed information on working with templates.

## Page Property Methods

Notion Helper provides a `page_props` API for creating data source property values – e.g. setting a `title` or `number` value.

You have two ways of using these functions. First, you can import the entire `page_props` API and use the methods directly. When you do, the property names are exactly as they are in the official Notion API:

```js
import { page_props } from "notion-helper"

const titleProp = page_props.title.setProp("My Page Title")

const numberProp = page_props.number.setProp(42)

const checkboxProp = page_props.checkbox.setProp(true)

const dateProp = page_props.date.setProp("2025-01-15", "2025-01-20")
```

Alternatively, you can use the shorthand alias methods for each property type. You can import these directly as needed, and they're identical to the property methods available in the `createNotionBuilder()` fluent interface:

```js
import { title, number, checkbox, date, richText, select, status } from "notion-helper"

const titleProp = title("My Page Title")

const numberProp = number(42)

const checkboxProp = checkbox(true)

const dateProp = date("2025-01-15", "2025-01-20")

const richTextProp = richText("Some rich text content")

const selectProp = select("Option 1")

const statusProp = status("In progress")
```

Here's a table listing all available page property methods, along with their shorthand alias functions. I've also linked the actual Notion API reference for each property type:

| Property Method | Shorthand Alias | API Reference |
|-----------------|-----------------|---------------|
| `page_props.title.setProp()` | `title()` | [Title](https://developers.notion.com/reference/page-property-values#title) |
| `page_props.rich_text.setProp()` | `richText()` | [Rich text](https://developers.notion.com/reference/page-property-values#rich-text) |
| `page_props.checkbox.setProp()` | `checkbox()` | [Checkbox](https://developers.notion.com/reference/page-property-values#checkbox) |
| `page_props.date.setProp()` | `date()` | [Date](https://developers.notion.com/reference/page-property-values#date) |
| `page_props.email.setProp()` | `email()` | [Email](https://developers.notion.com/reference/page-property-values#email) |
| `page_props.files.setProp()` | `files()` | [Files](https://developers.notion.com/reference/page-property-values#files) |
| `page_props.multi_select.setProp()` | `multiSelect()` | [Multi-select](https://developers.notion.com/reference/page-property-values#multi-select) |
| `page_props.number.setProp()` | `number()` | [Number](https://developers.notion.com/reference/page-property-values#number) |
| `page_props.people.setProp()` | `people()` | [People](https://developers.notion.com/reference/page-property-values#people) |
| `page_props.phone_number.setProp()` | `phoneNumber()` | [Phone number](https://developers.notion.com/reference/page-property-values#phone-number) |
| `page_props.relation.setProp()` | `relation()` | [Relation](https://developers.notion.com/reference/page-property-values#relation) |
| `page_props.select.setProp()` | `select()` | [Select](https://developers.notion.com/reference/page-property-values#select) |
| `page_props.status.setProp()` | `status()` | [Status](https://developers.notion.com/reference/page-property-values#status) |
| `page_props.url.setProp()` | `url()` | [URL](https://developers.notion.com/reference/page-property-values#url) |

Below, you'll find some code examples you can use to set each of the page property properties.

### Title

```js
import { page_props, title } from "notion-helper"

const titleProp = page_props.title.setProp("My Page Title")

const titleProp2 = title("My Page Title")
```


### Rich Text

```js
import { page_props, richText, buildRichTextObj } from "notion-helper"

// Single string
const richTextProp = page_props.rich_text.setProp("Some rich text content")
const richTextProp2 = richText("Some rich text content")

// Array with markdown formatting
const richTextProp3 = richText(['This is rich text content with ', '**formatting**', ' and emojis 🤔'])

// Using buildRichTextObj() with annotations
const richTextProp4 = richText(
  buildRichTextObj("Bold text", { bold: true })
)

// Multiple formatted rich text objects
const richTextProp5 = richText([
  buildRichTextObj("Bold and ", { bold: true }),
  buildRichTextObj("italic text", { italic: true }),
  buildRichTextObj(" with color", { color: "blue" })
].flat())

// Mixed plain strings and formatted objects
const richTextProp6 = richText([
  "Plain text. ",
  buildRichTextObj("Bold text. ", { bold: true }),
  buildRichTextObj("Italic text. ", { italic: true }),
  buildRichTextObj("Colored text", { color: "red_background" })
].flat())

// With URL link
const richTextProp7 = richText(
  buildRichTextObj("Flylighter - Notion Web Clipper", { 
    bold: true, 
    url: "https://www.flylighter.com" 
  })
)
```

### Checkbox

```js
import { page_props, checkbox } from "notion-helper"

const checkboxProp = page_props.checkbox.setProp(true)

const checkboxProp2 = checkbox(true)
```

### Date

```js
import { page_props, date } from "notion-helper"

const dateProp = page_props.date.setProp("2025-01-15", "2025-01-20")

const dateProp2 = date("2025-01-15", "2025-01-20")
```

### Email

```js
import { page_props, email } from "notion-helper"

const emailProp = page_props.email.setProp("test@example.com")

const emailProp2 = email("test@example.com")
```

### Files

```js
import { page_props, files } from "notion-helper"

// Single URL string
const filesProp = page_props.files.setProp("https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf")
const filesProp2 = files("https://collegeinfogeek.com/wp-content/uploads/2015/01/10steps-reddit.pdf")

// Array of URLs
const filesProp3 = files(["https://example.com/file1.pdf", "https://example.com/file2.pdf"])
```

### Multi-Select

```js
import { page_props, multiSelect } from "notion-helper"

const multiSelectProp = page_props.multi_select.setProp(["Option 1", "Option 2"])

const multiSelectProp2 = multiSelect(["Option 1", "Option 2"])
```

### Number

```js
import { page_props, number } from "notion-helper"

const numberProp = page_props.number.setProp(42)

const numberProp2 = number(42)
```

### People

```js
import { page_props, people } from "notion-helper"

// Use person IDs (see testAllProperties.js for the value format)
const peopleProp = page_props.people.setProp(["01b92c2b5a38495da82b922f47b3a308"])

const peopleProp2 = people(["01b92c2b5a38495da82b922f47b3a308"])
```

### Phone Number

```js
import { page_props, phoneNumber } from "notion-helper"

const phoneNumberProp = page_props.phone_number.setProp("+1-555-123-4567")

const phoneNumberProp2 = phoneNumber("+1-555-123-4567")
```

### Relation

```js
import { page_props, relation } from "notion-helper"

const relationProp = page_props.relation.setProp(["01b92c2b5a38495da82b922f47b3a308"])

const relationProp2 = relation(["01b92c2b5a38495da82b922f47b3a308"])
```

### Select

```js
import { page_props, select } from "notion-helper"

const selectProp = page_props.select.setProp("Option 1")

const selectProp2 = select("Option 1")
```

### Status

```js
import { page_props, status } from "notion-helper"

const statusProp = page_props.status.setProp("In progress")

const statusProp2 = status("In progress")
```

### URL

```js
import { page_props, url } from "notion-helper"

const urlProp = page_props.url.setProp("https://www.flylighter.com")

const urlProp2 = url("https://www.flylighter.com")
```

## Building Rich Text Objects

Notion Helper gives you a `buildRichTextObj()` function that lets you build rich text objects from a variety of different inputs:

* Simple strings
* Strings with annotations (bold, italic, underline, strikethrough, code, color)
* Strings with hyperlinks
* Equations
* Mentions (users, pages, databases, dates)

```js
import { buildRichTextObj } from "notion-helper"

// Simple string
const richText1 = buildRichTextObj("You're both of you nuts. I know more about casino security than any man alive. I invented it!")

// With annotations
const richText2 = buildRichTextObj("My mistake. Table's cold, anyway.", {
  annotations: {
    bold: true,
    italic: true,
    color: "purple"
  }
})

// With background color
const richText3 = buildRichTextObj("Somebody made a duplicate of my vault.", {
  annotations: {
    color: "yellow_background"
  }
})

// With hyperlink
const richText4 = buildRichTextObj("I still owe you for the thing with the guy in the place, and I'll never forget it.", {
  url: "https://example.com"
})

// With annotations and hyperlink
const richText5 = buildRichTextObj("You could try the lounge at the Caesar's. I hear it gets busy after three o'clock.", {
  annotations: {
    bold: true,
    color: "blue"
  },
  url: "https://example.com"
})

// Multiple annotations
const richText6 = buildRichTextObj("Haha, he's a balloon boy!", {
  annotations: {
    bold: true,
    italic: true,
    underline: true,
    strikethrough: true,
    code: true,
    color: "red"
  }
})

// Equation
const richText7 = buildRichTextObj("E = mc^2", {
  type: "equation"
})

// User mention
const richText8 = buildRichTextObj({
  type: "user",
  user: { id: "01b92c2b5a38495da82b922f47b3a308" }
}, { type: "mention" })

// Date mention
const richText9 = buildRichTextObj({
  type: "date",
  date: { start: "2025-01-01" }
}, { type: "mention" })

// Date range mention
const richText10 = buildRichTextObj({
  type: "date",
  date: { start: "2025-01-01", end: "2025-01-07" }
}, { type: "mention" })

// Page mention
const richText11 = buildRichTextObj({
  type: "page",
  page: { id: "2992de3c299681f8b399f37507705c99" }
}, { type: "mention" })

// Database mention
const richText12 = buildRichTextObj({
  type: "database",
  database: { id: "2992de3c29968196a328d4e3369de628" }
}, { type: "mention" })
```

There are also shorthand functions for creating mentions:

```js
import { mentionUser, mentionDate, mentionDatabase, mentionPage } from "notion-helper"

// User mention
const richText1 = mentionUser("01b92c2b5a38495da82b922f47b3a308")

// Date mention
const richText2 = mentionDate("2025-01-01")

// Date range mention
const richText3 = mentionDate({ start: "2025-01-01", end: "2025-01-07" })

// Page mention
const richText4 = mentionPage("2992de3c299681f8b399f37507705c99")

// Database mention
const richText5 = mentionDatabase("2992de3c29968196a328d4e3369de628")
```

## Utility Functions

Notion Helper gives you several utility functions:

* `getDepth()` - Gets the maximum nesting depth of blocks
* `getLongestArray()` - Gets the length of the longest array within nested blocks
* `getTotalCount()` - Gets total number of blocks including nested children
* `getPayloadSize()` - Gets the size in bytes of a block array when converted to JSON
* `validateAndSplitBlock()` - Validates and splits blocks if they exceed Notion's limits
* `extractNotionPageId()` - Extracts page ID from a Notion URL
* `isValidUUID()` - Validates if a string is a valid UUID

These functions are mostly used internally by the library, but you can use them in your own code if you need.

### getDepth()

Gets the maximum nesting depth of blocks in an array. Useful for ensuring you don't exceed Notion's nesting limit (2 levels).

```js
import { getDepth, createNotionBuilder } from "notion-helper"

const builder = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .heading1("Parent")
  .startParent(toggle("Child 1", []))
    .paragraph("Nested content")
  .endParent()
  .build()

const depth = getDepth(builder.content.children)
console.log(depth) // 1 (heading1 has no children, toggle has 1 level of children)
```

### getLongestArray()

Gets the length of the longest array within nested blocks. Useful for ensuring child arrays don't exceed Notion's limit of 100 blocks per parent.

```js
import { getLongestArray, createNotionBuilder } from "notion-helper"

const builder = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .heading1("Parent")
  .startParent(toggle("Toggle", []))
    .paragraph("Item 1")
    .paragraph("Item 2")
    .paragraph("Item 3")
  .endParent()
  .build()

const longest = getLongestArray(builder.content.children)
console.log(longest) // 3 (the toggle has 3 child blocks)
```

### getTotalCount()

Gets the total number of blocks including all nested children. Useful for ensuring you don't exceed Notion's limit of 1,000 total blocks per request.

```js
import { getTotalCount, createNotionBuilder } from "notion-helper"

const builder = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .heading1("Parent")
  .startParent(toggle("Toggle", []))
    .paragraph("Item 1")
    .paragraph("Item 2")
  .endParent()
  .paragraph("Another paragraph")
  .build()

const total = getTotalCount(builder.content.children)
console.log(total) // 4 (heading1 + toggle + 2 paragraphs inside toggle + 1 paragraph outside)
```

### getPayloadSize()

Gets the size in bytes of a block array when converted to JSON. Useful for ensuring API requests don't exceed Notion's payload size limits.

```js
import { getPayloadSize, createNotionBuilder } from "notion-helper"

const builder = createNotionBuilder()
  .parentDataSource("your-data-source-id")
  .paragraph("Some content")
  .paragraph("More content")
  .build()

const size = getPayloadSize(builder.content.children)
console.log(size) // Size in bytes (e.g., 523)
```

### validateAndSplitBlock()

Validates a Notion block and splits it into multiple blocks if it exceeds Notion's limits. Handles both rich text arrays and caption arrays.

```js
import { validateAndSplitBlock, paragraph } from "notion-helper"

// Block with long text - automatically splits into multiple rich text objects
const longBlock = paragraph("This is a very long paragraph that exceeds the character limit...")

const validated = validateAndSplitBlock(longBlock)
// Returns array with block(s) that conform to Notion's limits
```

### extractNotionPageId()

Extracts the Notion page ID (UUID) from a Notion URL, handling both dashed and non-dashed formats.

```js
import { extractNotionPageId } from "notion-helper"

const url1 = "https://www.notion.so/My-Page-1234567890abcdef1234567890abcdef"
const url2 = "https://www.notion.so/My-Page-12345678-90ab-cdef-1234-567890abcdef"

const id1 = extractNotionPageId(url1)
const id2 = extractNotionPageId(url2)

console.log(id1) // "1234567890abcdef1234567890abcdef"
console.log(id2) // "1234567890abcdef1234567890abcdef" (same, dashes removed)
```

### isValidUUID()

Validates if a string is a valid UUID (UUIDv4 format), with or without dashes.

```js
import { isValidUUID } from "notion-helper"

const valid1 = isValidUUID("12345678-90ab-cdef-1234-567890abcdef")
const valid2 = isValidUUID("1234567890abcdef1234567890abcdef")
const invalid = isValidUUID("not-a-uuid")

console.log(valid1) // true
console.log(valid2) // true
console.log(invalid) // false
```

## Other Recommended Tools

Notion Helper works well with other tools and libraries:

* [Notion SDK](https://github.com/makenotion/notion-sdk-js) - Official Notion SDK for JavaScript.
* [Martian](https://tryfabric.com/martian) - Converts Markdown to Notion blocks. Work well with Notion Helper's `createPage()` and `appendBlocks()` functions, which fully handle API limits for you.

## Learn More

If you'd like to learn the Notion API from scratch, start with my free [Notion API crash course](https://thomasjfrank.com/notion-api-crash-course/).

Questions? [Ask me on Twitter!](https://twitter.com/TomFrankly)