import assert from 'node:assert/strict';

import { extractComponentInner } from '../generate-data.mjs';
import { checkFile } from './check-icon-template.mjs';

const name = 'example_E800.svg';
const header = '<?xml version="1.0" encoding="UTF-8"?>';
const doctype = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';
const svgOpen =
    '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="24" height="24" viewBox="0 0 24 24">';
const path = '<path d="M4 4H20V20H4Z"/>';
const valid = `${header}\n${doctype}\n${svgOpen}${path}</svg>\n`;

const problems = (source) => checkFile(name, source);

assert.deepEqual(problems(valid), []);

const beforeDoctype = `${header}oops\n${doctype}\n${svgOpen}${path}</svg>\n`;
assert.ok(problems(beforeDoctype).includes('unexpected text outside the svg'));

const protoRoot = valid.replace('<svg ', '<svg __proto__="extra" ');
assert.ok(problems(protoRoot).includes('unexpected svg attributes: __proto__'));

const protoPath = valid.replace('<path ', '<path __proto__="extra" ');
assert.ok(problems(protoPath).includes('path has extra attributes: __proto__'));

const nbsp = valid.replace(' width="24"', '\u00A0width="24"');
assert.ok(problems(nbsp).includes('attributes must be separated by whitespace'));

const nbspPath = valid.replace('M4 4', 'M4\u00A04');
assert.ok(problems(nbspPath).includes('path data contains non-SVG whitespace'));

for (const separator of [' ', '\t', '\r', '\n']) {
    assert.deepEqual(problems(valid.replace('M4 4', `M4${separator}4`)), []);
}

const closingAttribute = valid.replace('</svg>', '</svg extra="x">');
assert.ok(problems(closingAttribute).includes('closing svg tag must be </svg>'));

const spacedClose = valid.replace('</svg>', '</svg >');
assert.ok(problems(spacedClose).includes('closing svg tag must be </svg>'));
assert.equal(extractComponentInner(valid), path);
assert.equal(extractComponentInner(spacedClose), null);
assert.equal(extractComponentInner(closingAttribute), null);

const commentInName = valid.replace('<path ', '<pa<!--x-->th ');
assert.ok(problems(commentInName).includes('comment inside a tag'));
assert.notEqual(extractComponentInner(commentInName), path);

const commentInValue = valid.replace('M4 4', 'M4 <!--x--> 4');
assert.ok(problems(commentInValue).includes('comment inside a tag'));

const commentBetween = valid.replace(svgOpen, `${svgOpen}<!-- note -->`);
assert.deepEqual(problems(commentBetween), []);

console.log('Icon template regression checks passed.');
