function onOpen() {
  DocumentApp.getUi()
    .createMenu('AI Tools')
    .addItem('Copy Selection as Markdown', 'copySelectionAsMarkdown')
    .addToUi();
}

function copySelectionAsMarkdown() {
  const doc = DocumentApp.getActiveDocument();
  const selection = doc.getSelection();
  
  if (!selection) {
    DocumentApp.getUi().alert('Please select some text first.');
    return;
  }

  const elements = selection.getRangeElements();
  let markdownOutput = [];

  elements.forEach(rangeElement => {
    const element = rangeElement.getElement();
    const type = element.getType();

    // Handle Paragraphs and Headings
    if (type === DocumentApp.ElementType.PARAGRAPH) {
      markdownOutput.push(parseParagraph(element.asParagraph(), rangeElement));
    } 
    // Handle List Items (Bullets and Numbered Lists)
    else if (type === DocumentApp.ElementType.LIST_ITEM) {
      markdownOutput.push(parseListItem(element.asListItem(), rangeElement));
    }
    // Handle Partial Text Selections inside a paragraph/list
    else if (type === DocumentApp.ElementType.TEXT) {
      const parent = element.getParent();
      const parentType = parent.getType();
      if (parentType === DocumentApp.ElementType.PARAGRAPH) {
        markdownOutput.push(parseParagraph(parent.asParagraph(), rangeElement));
      } else if (parentType === DocumentApp.ElementType.LIST_ITEM) {
        markdownOutput.push(parseListItem(parent.asListItem(), rangeElement));
      }
    }
    // Handle Tables
    else if (type === DocumentApp.ElementType.TABLE) {
      markdownOutput.push(parseTable(element.asTable()));
    }
  });

  // Join blocks with double newlines for clean Markdown spacing
  const finalMarkdown = markdownOutput.filter(Boolean).join('\n\n');
  showClipboardDialog(finalMarkdown);
}

function parseParagraph(paragraph, rangeElement) {
  const heading = paragraph.getHeading();
  let prefix = '';

  switch (heading) {
    case DocumentApp.ParagraphHeading.HEADING1: prefix = '# '; break;
    case DocumentApp.ParagraphHeading.HEADING2: prefix = '## '; break;
    case DocumentApp.ParagraphHeading.HEADING3: prefix = '### '; break;
    case DocumentApp.ParagraphHeading.HEADING4: prefix = '#### '; break;
    case DocumentApp.ParagraphHeading.HEADING5: prefix = '##### '; break;
    case DocumentApp.ParagraphHeading.HEADING6: prefix = '###### '; break;
  }

  const text = extractFormattedText(paragraph.editAsText(), rangeElement);
  return text ? prefix + text : '';
}

function parseListItem(listItem, rangeElement) {
  const nesting = listItem.getNestingLevel();
  const indent = '  '.repeat(nesting);
  const glyph = listItem.getGlyphType();
  
  // Determine if bullet or numbered list
  const isNumbered = [
    DocumentApp.GlyphType.NUMBER,
    DocumentApp.GlyphType.LATIN_UPPER,
    DocumentApp.GlyphType.LATIN_LOWER,
    DocumentApp.GlyphType.ROMAN_UPPER,
    DocumentApp.GlyphType.ROMAN_LOWER
  ].includes(glyph);

  const prefix = isNumbered ? '1. ' : '- ';
  const text = extractFormattedText(listItem.editAsText(), rangeElement);
  return text ? indent + prefix + text : '';
}

function parseTable(table) {
  let rows = [];
  for (let r = 0; r < table.getNumRows(); r++) {
    let row = table.getRow(r);
    let cells = [];
    for (let c = 0; c < row.getNumCells(); c++) {
      let cellText = extractFormattedText(row.getCell(c).editAsText(), null);
      // Replace newlines inside cells with spaces so table doesn't break
      cells.push(cellText.replace(/\n/g, ' '));
    }
    rows.push('| ' + cells.join(' | ') + ' |');
    
    // Add Markdown header separator after the first row
    if (r === 0) {
      rows.push('| ' + cells.map(() => '---').join(' | ') + ' |');
    }
  }
  return rows.join('\n');
}

function extractFormattedText(textObj, rangeElement) {
  const fullText = textObj.getText();
  if (!fullText) return '';

  // Determine start and end indices if user only highlighted part of a line
  let start = 0;
  let end = fullText.length - 1;
  if (rangeElement && rangeElement.isPartial()) {
    start = rangeElement.getStartOffset();
    end = rangeElement.getEndOffsetInclusive();
  }

  let result = '';
  let inBold = false;
  let inItalic = false;
  let inStrike = false;

  for (let i = start; i <= end; i++) {
    const char = fullText[i];
    const isBold = textObj.isBold(i);
    const isItalic = textObj.isItalic(i);
    const isStrike = textObj.isStrikethrough(i);
    const link = textObj.getLinkUrl(i);

    // Handle closing tags (reverse order of opening)
    if (inStrike && !isStrike) { result += '~~'; inStrike = false; }
    if (inItalic && !isItalic) { result += '*'; inItalic = false; }
    if (inBold && !isBold) { result += '**'; inBold = false; }

    // Handle opening tags
    if (!inBold && isBold) { result += '**'; inBold = true; }
    if (!inItalic && isItalic) { result += '*'; inItalic = true; }
    if (!inStrike && isStrike) { result += '~~'; inStrike = true; }

    // Handle inline links
    if (link) {
      let linkEnd = i;
      while (linkEnd + 1 <= end && textObj.getLinkUrl(linkEnd + 1) === link) {
        linkEnd++;
      }
      const linkText = fullText.substring(i, linkEnd + 1);
      result += `[${linkText}](${link})`;
      i = linkEnd;
    } else {
      result += char;
    }
  }

  // Close any tags left open at the end of the line
  if (inStrike) result += '~~';
  if (inItalic) result += '*';
  if (inBold) result += '**';

  return result;
}

function showClipboardDialog(markdownText) {
  // Escape backticks and backslashes for safe injection into HTML template
  const escapedText = markdownText
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$');

  const html = HtmlService.createHtmlOutput(`
    <style>
      body { font-family: sans-serif; padding: 10px; text-align: center; }
      textarea { width: 100%; height: 140px; margin-bottom: 10px; font-family: monospace; font-size: 12px; }
      button { background: #1a73e8; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-weight: bold; }
      button:hover { background: #1557b0; }
      #status { color: #188038; font-size: 13px; margin-top: 8px; font-weight: bold; }
    </style>
    <textarea id="md">${markdownText}</textarea>
    <button onclick="copyText()">Copy Again</button>
    <div id="status">Copying to clipboard...</div>
    <script>
      function copyText() {
        const copyArea = document.getElementById("md");
        copyArea.select();
        document.execCommand("copy");
        document.getElementById("status").innerText = "✓ Copied to clipboard!";
      }
      // Attempt automatic copy on load
      window.onload = function() {
        copyText();
        setTimeout(() => google.script.host.close(), 1200);
      };
    </script>
  `)
  .setWidth(400)
  .setHeight(240);

  DocumentApp.getUi().showModalDialog(html, 'Markdown Output');
}
