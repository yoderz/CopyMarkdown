# Copy Markdown

A [Google Apps Script](https://developers.google.com/apps-script) for Google Docs that copies the current selection as Markdown.

Open a document, select the text you want, then choose **Export Tools → Copy Selection as Markdown**. A dialog shows the Markdown and a button to copy it to the clipboard.

## What it converts

| Google Docs | Markdown |
| --- | --- |
| Headings 1–6 | `#` through `######` |
| Bold | `**bold**` |
| Italic | `*italic*` |
| Strikethrough | `~~strikethrough~~` |
| Links | `[text](url)` |
| Bulleted lists | `- item`, indented by nesting level |
| Numbered lists | `1. item`, indented by nesting level |
| Tables | A Markdown table, with the first row as the header |

Partial selections are supported. If you highlight only part of a paragraph or list item, only that range is included.

## Install

1. Open a Google Doc.
2. Go to **Extensions → Apps Script**.
3. Delete any sample code in the editor.
4. Copy the contents of [`copyMarkdown.gs`](copyMarkdown.gs) into the editor.
5. Click **Save** (name the project if prompted).
6. Reload the Google Doc.
7. The first time you run the menu item, Google will ask you to authorize the script.

The **Export Tools** menu appears the next time the document loads.

## Use

1. Select the text, lists, or tables you want to export.
2. Choose **Export Tools → Copy Selection as Markdown**.
3. In the dialog, click **Copy Again** to put the Markdown on the clipboard.

If nothing is selected, the script asks you to select some text first.

## Notes

- You have to press a key (space or enter) or click the button after the dialogue box opens due to browser requirements for user interaction in order to access the clipboard.
- Numbered lists are exported as `1.` items. Markdown renderers continue the numbering, so the original glyph (letters, Roman numerals, and so on) is not preserved.
- The first row of a table is treated as the header. Line breaks inside a cell become spaces so the table stays valid Markdown.
- Images, footnotes, comments, and other content that is not a paragraph, list item, or table are skipped.
