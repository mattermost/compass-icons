import assert from 'node:assert/strict';

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

console.log('Icon template regression checks passed.');
