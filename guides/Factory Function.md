# Quick Guide: Using the createNotionBuilder Factory Function

The `createNotionBuilder` factory function provides a powerful interface for quickly creating Notion pages, block arrays, or property objects. Here's how to use it:

## Basic Usage

Import and create a builder instance:

```javascript
import NotionHelper from "notion-helper";
const { createNotionBuilder } = NotionHelper;
const notion = createNotionBuilder();
```

Chain methods to build your page or block structure:

```js
notion
    .parentDataSource("your-data-source-id")
    .title("Page Title", "My New Page")
    .paragraph("This is a paragraph.")
    .build();
```

The build() method returns an object with `content` and `additionalBlocks` properties.

## Configuration Options

The builder accepts several configuration options:

```javascript
const notion = createNotionBuilder({
    strict: false,                    // Throw errors for invalid data vs graceful handling
    limitNesting: true,              // Limit nested children to 2 levels (Notion API limit)
    limitChildren: true,             // Limit children arrays to 100 blocks, putting excess in additionalBlocks
    allowBlankParagraphs: false,     // Allow empty paragraph blocks
    handleTemplatePageChildren: false // Move all children to additionalBlocks when templates are used
});
```

## Examples

### Simple Example: Creating a basic page

```js
const notion = createNotionBuilder();

const result = notion
  .parentDataSource('your-data-source-id')
  .title('Page Title', 'My First Notion Page')
  .richText('Description', 'This is a page created with the Notion builder.')
  .date('Due Date', '2024-12-31')
  .heading1('Welcome to My Page')
  .paragraph('This is the first paragraph of my page.')
  .bulletedListItem('First item in a list')
  .bulletedListItem('Second item in a list')
  .build();

console.log(result.content);
```

### Template Usage Example

```js
const notion = createNotionBuilder();

const result = notion
  .parentDataSource('your-data-source-id')
  .template('default') // or specific template ID
  .title('Name', 'Task from Template')
  .paragraph('This content will be appended after template processing')
  .toDo('Complete task', false)
  .build();

console.log(result.content);
console.log(result.additionalBlocks); // May contain blocks if handleTemplatePageChildren is true
```

### Block Nesting Example

```js
const notion = createNotionBuilder();

const result = notion
  .parentDataSource('your-data-source-id')
  .title('Page Title', 'Nested Blocks Example')
  .heading1('Top Level Heading')
  .paragraph('This is a top-level paragraph.')
  .startParent('toggle', 'Click to expand')
    .paragraph('This paragraph is inside the toggle.')
    .startParent('bulleted_list_item', 'Nested list')
      .paragraph('This paragraph is inside a bullet point.')
    .endParent()
    .paragraph('Back to toggle level.')
  .endParent()
  .paragraph('Back to top level.')
  .build();

console.log(result.content);
```

### Chaining with Input Data

```js
const notion = createNotionBuilder();

const todoItems = [
  { task: 'Buy groceries', due: '2024-06-01', status: 'Not started' },
  { task: 'Finish project', due: '2024-06-15', status: 'In progress' },
  { task: 'Call mom', due: '2024-06-02', status: 'Not started' },
];

const result = notion
  .parentDataSource('your-data-source-id')
  .title('Page Title', 'My Todo List')
  .heading1('Tasks')
  .paragraph('Here are my upcoming tasks:');

todoItems.forEach(item => {
  notion
    .toDo(item.task)
    .date('Due Date', item.due)
    .select('Status', item.status);
});

const finalResult = notion.build();

console.log(finalResult.content);
```

### Using with Templates and Manual Control

```js
const notion = createNotionBuilder({ 
    handleTemplatePageChildren: true 
});

const result = notion
  .parentDataSource('your-data-source-id')
  .template('default')
  .title('Name', 'Task from Template')
  .paragraph('This content will be moved to additionalBlocks')
  .toDo('Complete task', false)
  .build();

// Create page first (no children in request)
const notionClient = new Client({ auth: process.env.NOTION_TOKEN });
const newPage = await notionClient.pages.create(result.content);

// Manually append blocks at your own pace
if (result.additionalBlocks && result.additionalBlocks.length > 0) {
  for (const blockChunk of result.additionalBlocks) {
    await notionClient.blocks.children.append({
      block_id: newPage.id,
      children: blockChunk
    });
  }
}
```

## Key Methods

### Page Setup
- `parentDataSource(data_source_id)` - Sets parent data source (recommended)
- `parentDs(data_source_id)` - Alias for parentDataSource()
- `parentPage(page_id)` - Sets parent page
- `parentDatabase(database_id)` - Sets parent database (deprecated)
- `template(templateChoice)` - Sets template ('default', 'none', or template ID)

### Properties
- `title(propertyName, value)` - Set title property
- `richText(propertyName, value)` - Set rich text property
- `date(propertyName, value)` - Set date property
- `select(propertyName, value)` - Set select property
- `multiSelect(propertyName, values)` - Set multi-select property
- `number(propertyName, value)` - Set number property
- `checkbox(propertyName, value)` - Set checkbox property
- `url(propertyName, value)` - Set URL property
- `email(propertyName, value)` - Set email property
- `phoneNumber(propertyName, value)` - Set phone number property

### Page Metadata
- `icon(iconValue)` - Set page icon (emoji or URL)
- `cover(coverUrl)` - Set page cover image

### Blocks
- `paragraph(text)` - Add paragraph block
- `heading1(text)` - Add heading 1 block
- `heading2(text)` - Add heading 2 block
- `heading3(text)` - Add heading 3 block
- `bulletedListItem(text)` - Add bulleted list item
- `numberedListItem(text)` - Add numbered list item
- `toDo(text, checked)` - Add to-do block
- `toggle(text, children)` - Add toggle block
- `callout(text, icon)` - Add callout block
- `quote(text)` - Add quote block
- `code(text, language)` - Add code block
- `divider()` - Add divider block
- `table(children)` - Add table block

### Nesting
- `startParent(block)` - Begin nested block structure
- `endParent()` - End current nesting level

## Important Notes

- **Use `parentDataSource()` instead of `parentDatabase()`** - Database IDs are deprecated and won't work in databases with multiple data sources
- **Templates require special handling** - See the [Template Usage Guide](./Template%20Usage%20Guide.md) for detailed information
- **Check `result.additionalBlocks`** - Contains blocks that exceed Notion's limits for subsequent requests
- **The `build()` method resets the builder** - Call it once per page/block structure
- **Use `startParent()` and `endParent()`** for nested blocks
- **`createNotion()` is deprecated** - Use `createNotionBuilder()` instead

## Integration with Request API

The builder works seamlessly with the request API for creating pages:

```js
import { request } from "notion-helper";

const notion = createNotionBuilder();
const page = notion
  .parentDataSource('your-data-source-id')
  .template('default')
  .title('Name', 'Task from Template')
  .paragraph('Description')
  .build();

const result = await request.pages.create({
  data: page.content,
  client: notionClient,
  templateWaitMs: 3000
});
```

For more advanced template handling, see the [Template Usage Guide](./Template%20Usage%20Guide.md).