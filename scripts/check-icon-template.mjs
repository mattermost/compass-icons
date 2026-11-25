import fs from 'node:fs';
import path from 'node:path';

import SVGPath from 'svgpath';

const SVG_DIR = path.join(process.cwd(), 'svgs');

const XML_HEADER = '<?xml version="1.0" encoding="UTF-8"?>';
const DOCTYPE = '<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">';

const REQUIRED_ATTRS = {
    xmlns: 'http://www.w3.org/2000/svg',
    'xmlns:xlink': 'http://www.w3.org/1999/xlink',
    version: '1.1',
    width: '24',
    height: '24',
    viewBox: '0 0 24 24',
};

const parseAttrs = (source) => {
    const attrs = {};

    for (const match of source.matchAll(/([\w:-]+)="([^"]*)"/g)) {
        attrs[match[1]] = match[2];
    }

    return attrs;
};

const pathBounds = (d) => {
    const segments = new SVGPath(d).abs().unshort().unarc().segments;
    let x = 0;
    let y = 0;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    const add = (px, py) => {
        minX = Math.min(minX, px);
        minY = Math.min(minY, py);
        maxX = Math.max(maxX, px);
        maxY = Math.max(maxY, py);
    };

    for (const segment of segments) {
        const command = segment[0];

        if (command === 'M' || command === 'L') {
            x = segment[1];
            y = segment[2];
            add(x, y);
        } else if (command === 'H') {
            x = segment[1];
            add(x, y);
        } else if (command === 'V') {
            y = segment[1];
            add(x, y);
        } else if (command === 'C') {
            add(segment[1], segment[2]);
            add(segment[3], segment[4]);
            x = segment[5];
            y = segment[6];
            add(x, y);
        } else if (command === 'Q') {
            add(segment[1], segment[2]);
            x = segment[3];
            y = segment[4];
            add(x, y);
        } else if (command === 'Z') {
            continue;
        } else {
            throw new Error(`unsupported path command ${command}`);
        }
    }

    return { minX, minY, maxX, maxY };
};

const checkFile = (fileName, source) => {
    const problems = [];

    if (!/^(_)?[A-Za-z0-9-]+_[0-9A-Fa-f]+\.svg$/.test(fileName)) {
        problems.push('filename must be name_HEX.svg');
    }

    if (!source.startsWith(XML_HEADER) || !source.includes(DOCTYPE)) {
        problems.push('missing the standard XML header or doctype');
    }

    const withoutComments = source.replace(/<!--[\s\S]*?-->/g, '');
    const tags = [...withoutComments.matchAll(/<\/?([A-Za-z][\w:-]*)\b[^>]*>/g)].map((match) => match[1]);
    const unexpected = [...new Set(tags.filter((tag) => tag !== 'svg' && tag !== 'path'))];

    if (unexpected.length) {
        problems.push(`unexpected elements: ${unexpected.join(', ')}`);
    }

    if (tags.filter((tag) => tag === 'path').length !== 1) {
        problems.push('must contain exactly one path');
    }

    const svg = withoutComments.match(/<svg\b([^>]*)>/);

    if (!svg) {
        problems.push('missing an svg element');
    } else {
        const attrs = parseAttrs(svg[1]);
        const extra = Object.keys(attrs).filter((name) => !(name in REQUIRED_ATTRS));

        for (const [name, value] of Object.entries(REQUIRED_ATTRS)) {
            if (attrs[name] !== value) {
                problems.push(`${name} must be "${value}"`);
            }
        }

        if (extra.length) {
            problems.push(`unexpected svg attributes: ${extra.join(', ')}`);
        }
    }

    const pathTag = withoutComments.match(/<path\b([^>]*)\/?>/);

    if (pathTag) {
        const attrs = parseAttrs(pathTag[1]);
        const extra = Object.keys(attrs).filter((name) => name !== 'd');

        if (!attrs.d) {
            problems.push('path is missing d');
        }

        if (extra.length) {
            problems.push(`path has extra attributes: ${extra.join(', ')}`);
        }

        if (attrs.d) {
            try {
                const { minX, minY, maxX, maxY } = pathBounds(attrs.d);

                if (minX < -0.05 || minY < -0.05 || maxX > 24.05 || maxY > 24.05) {
                    problems.push(
                        `path extends outside the 24 box (${minX.toFixed(2)}, ${minY.toFixed(2)} to ${maxX.toFixed(
                            2
                        )}, ${maxY.toFixed(2)})`
                    );
                }
            } catch (error) {
                problems.push(error.message);
            }
        }
    }

    return problems;
};

const fileNames = fs
    .readdirSync(SVG_DIR)
    .filter((name) => name.endsWith('.svg'))
    .sort();
const seenNames = new Map();
const seenCodes = new Map();
const failures = [];

for (const fileName of fileNames) {
    const codeMatch = fileName.match(/_([0-9A-Fa-f]+)\.svg$/);
    const iconName = fileName.replace(/\.svg$/, '').replace(/_([0-9A-Fa-f]+)$/, '');

    if (codeMatch) {
        const code = codeMatch[1].toUpperCase();

        if (seenCodes.has(code)) {
            failures.push(`${fileName}: code ${code} is already used by ${seenCodes.get(code)}`);
        }

        seenCodes.set(code, fileName);
    }

    if (seenNames.has(iconName)) {
        failures.push(`${fileName}: name ${iconName} is already used by ${seenNames.get(iconName)}`);
    }

    seenNames.set(iconName, fileName);

    const source = fs.readFileSync(path.join(SVG_DIR, fileName), 'utf8');

    for (const problem of checkFile(fileName, source)) {
        failures.push(`${fileName}: ${problem}`);
    }
}

if (failures.length) {
    console.error(`Icon template check failed (${failures.length}):`);

    for (const failure of failures) {
        console.error(`- ${failure}`);
    }

    process.exit(1);
}

console.log(`Icon template check passed (${fileNames.length} icons).`);
