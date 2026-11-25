import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

const requireFinite = (values) => {
    if (values.some((value) => !Number.isFinite(value))) {
        throw new Error('path bounds are not finite');
    }
};

const trimXml = (value) => value.replace(/^[ \t\r\n]+/, '').replace(/[ \t\r\n]+$/, '');

const parseAttrs = (source) => {
    const attrs = Object.create(null);
    let rest = trimXml(source);

    while (rest.length) {
        const match = rest.match(/^([\w:-]+)[ \t\r\n]*=[ \t\r\n]*"([^"]*)"/);

        if (!match) {
            throw new Error('attributes must use double quotes');
        }

        if (Object.hasOwn(attrs, match[1])) {
            throw new Error(`duplicate attribute ${match[1]}`);
        }

        attrs[match[1]] = match[2];
        rest = rest.slice(match[0].length);

        if (rest.length && !/^[ \t\r\n]/.test(rest)) {
            throw new Error('attributes must be separated by whitespace');
        }

        rest = trimXml(rest);
    }

    return attrs;
};

const TAG_AT_START = /^<(\/?)([A-Za-z][\w:-]*)\b([^>]*?)(\/?)>/;

const hasTextOutsideTags = (source) => {
    if (!source.startsWith(XML_HEADER)) {
        return false;
    }

    let rest = source.slice(XML_HEADER.length).replace(/^[ \t\r\n]*/, '');

    if (!rest.startsWith(DOCTYPE)) {
        return rest.length > 0;
    }

    rest = rest.slice(DOCTYPE.length).replace(/^[ \t\r\n]*/, '');

    for (let index = 0; index < 3; index += 1) {
        const match = rest.match(TAG_AT_START);

        if (!match) {
            return rest.length > 0;
        }

        rest = rest.slice(match[0].length).replace(/^[ \t\r\n]*/, '');
    }

    return rest.length > 0;
};

const readElements = (source) => {
    const elements = [];

    for (const match of source.matchAll(/<(\/?)([A-Za-z][\w:-]*)\b([^>]*?)(\/?)>/g)) {
        elements.push({
            closing: match[1] === '/',
            name: match[2],
            attrs: match[3],
            selfClosing: match[4] === '/',
        });
    }

    return elements;
};

const cubicExtrema = (p0, p1, p2, p3) => {
    const a = -p0 + 3 * p1 - 3 * p2 + p3;
    const b = 2 * p0 - 4 * p1 + 2 * p2;
    const c = -p0 + p1;
    const roots = [];

    requireFinite([a, b, c]);

    if (Math.abs(a) < 1e-12) {
        if (Math.abs(b) > 1e-12) {
            const t = -c / b;
            requireFinite([t]);
            roots.push(t);
        }
    } else {
        const disc = b * b - 4 * a * c;
        requireFinite([disc]);

        if (disc >= 0) {
            const root = Math.sqrt(disc);
            const plus = (-b + root) / (2 * a);
            const minus = (-b - root) / (2 * a);
            requireFinite([plus, minus]);
            roots.push(plus, minus);
        }
    }

    return roots.filter((t) => t > 0 && t < 1);
};

const addCubic = (add, x0, y0, x1, y1, x2, y2, x3, y3) => {
    add(x0, y0);
    add(x3, y3);

    const point = (t) => {
        const u = 1 - t;

        return [
            u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
            u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ];
    };

    for (const t of [...cubicExtrema(x0, x1, x2, x3), ...cubicExtrema(y0, y1, y2, y3)]) {
        const [px, py] = point(t);
        requireFinite([px, py]);
        add(px, py);
    }
};

const addQuadratic = (add, x0, y0, x1, y1, x2, y2) => {
    add(x0, y0);
    add(x2, y2);

    const addAxis = (p0, p1, p2, read) => {
        const denom = p0 - 2 * p1 + p2;

        if (Math.abs(denom) < 1e-12) {
            return;
        }

        const t = (p0 - p1) / denom;
        requireFinite([t]);

        if (t <= 0 || t >= 1) {
            return;
        }

        const u = 1 - t;
        const value = u * u * p0 + 2 * u * t * p1 + t * t * p2;
        requireFinite([value]);
        read(value, t);
    };

    addAxis(x0, x1, x2, (x, t) => {
        const u = 1 - t;
        add(x, u * u * y0 + 2 * u * t * y1 + t * t * y2);
    });
    addAxis(y0, y1, y2, (y, t) => {
        const u = 1 - t;
        add(u * u * x0 + 2 * u * t * x1 + t * t * x2, y);
    });
};

const pathBounds = (d) => {
    const parsed = new SVGPath(d);

    if (parsed.err) {
        throw new Error(parsed.err);
    }

    const segments = parsed.abs().unshort().unarc().segments;

    if (!segments.length) {
        throw new Error('path has no segments');
    }

    let x = 0;
    let y = 0;
    let subpathX = 0;
    let subpathY = 0;
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

        if (command === 'M') {
            x = segment[1];
            y = segment[2];
            subpathX = x;
            subpathY = y;
            add(x, y);
        } else if (command === 'L') {
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
            const x0 = x;
            const y0 = y;
            x = segment[5];
            y = segment[6];
            addCubic(add, x0, y0, segment[1], segment[2], segment[3], segment[4], x, y);
        } else if (command === 'Q') {
            const x0 = x;
            const y0 = y;
            x = segment[3];
            y = segment[4];
            addQuadratic(add, x0, y0, segment[1], segment[2], x, y);
        } else if (command === 'Z') {
            x = subpathX;
            y = subpathY;
        } else {
            throw new Error(`unsupported path command ${command}`);
        }
    }

    if (![minX, minY, maxX, maxY].every(Number.isFinite)) {
        throw new Error('path bounds are not finite');
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
    const elements = readElements(withoutComments);
    const pathElement = elements.find((element) => element.name === 'path' && !element.closing);
    const shape = elements.filter((element) => !element.closing).map((element) => element.name);
    const directChild =
        elements.length === 3 &&
        elements[0].name === 'svg' &&
        !elements[0].closing &&
        !elements[0].selfClosing &&
        elements[1].name === 'path' &&
        !elements[1].closing &&
        elements[1].selfClosing &&
        elements[2].name === 'svg' &&
        elements[2].closing &&
        !elements[2].selfClosing;

    if (hasTextOutsideTags(withoutComments)) {
        problems.push('unexpected text outside the svg');
    }

    if (!directChild) {
        problems.push(`svg must contain one direct path, found ${shape.join(', ') || 'nothing'}`);
    }

    const svg = elements.find((element) => element.name === 'svg' && !element.closing);

    if (svg) {
        try {
            const attrs = parseAttrs(svg.attrs);
            const extra = Object.keys(attrs).filter((name) => !Object.hasOwn(REQUIRED_ATTRS, name));

            for (const [name, value] of Object.entries(REQUIRED_ATTRS)) {
                if (attrs[name] !== value) {
                    problems.push(`${name} must be "${value}"`);
                }
            }

            if (extra.length) {
                problems.push(`unexpected svg attributes: ${extra.join(', ')}`);
            }
        } catch (error) {
            problems.push(error.message);
        }
    }

    if (pathElement) {
        try {
            const attrs = parseAttrs(pathElement.attrs);
            const extra = Object.keys(attrs).filter((name) => name !== 'd');

            if (!attrs.d) {
                problems.push('path is missing d');
            }

            if (extra.length) {
                problems.push(`path has extra attributes: ${extra.join(', ')}`);
            }

            if (attrs.d) {
                const { minX, minY, maxX, maxY } = pathBounds(attrs.d);

                if (minX < -0.05 || minY < -0.05 || maxX > 24.05 || maxY > 24.05) {
                    problems.push(
                        `path extends outside the 24 box (${minX.toFixed(2)}, ${minY.toFixed(2)} to ${maxX.toFixed(
                            2
                        )}, ${maxY.toFixed(2)})`
                    );
                }
            }
        } catch (error) {
            problems.push(error.message);
        }
    }

    return problems;
};

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
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
            const code = parseInt(codeMatch[1], 16);
            const scalar =
                Number.isSafeInteger(code) && code >= 0 && code <= 0x10ffff && (code < 0xd800 || code > 0xdfff);

            if (!scalar) {
                failures.push(`${fileName}: code ${codeMatch[1]} is not a Unicode scalar`);
            } else if (seenCodes.has(code)) {
                failures.push(
                    `${fileName}: code ${code.toString(16).toUpperCase()} is already used by ${seenCodes.get(code)}`
                );
            }

            if (scalar) {
                seenCodes.set(code, fileName);
            }
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
}

export { checkFile };
