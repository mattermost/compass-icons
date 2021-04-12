import { getFileData, generateGlyphs, writeJSONToDisk, writeToDisk } from './utils';

// generate config data used to generate the font icon

const files = getFileData('./svgs');

const glyphs = generateGlyphs(files);

const configData = {
    name: 'compass-icons',
    css_prefix_text: 'icon-',
    css_use_suffix: false,
    hinting: false,
    units_per_em: 1000,
    ascent: 850,
    glyphs,
};

// write to root for fontelle-cli to retrieve
writeJSONToDisk('config.json', configData);

// write to build folder
writeJSONToDisk('./build/config.json', configData);

// generate icon glyph data

const iconGlyphs = configData.glyphs.map(({ css }) => `\t'${css}',`);

const iconGlyphsData = `
export type IconGlyphTypes = ${iconGlyphs.map(glyph => glyph.trim().slice(0, -1)).join(' | ')};
export const IconGlyphs: IconGlyphTypes[] = [
${iconGlyphs.join('\n')}
];
`;

writeToDisk('./build/IconGlyphs.ts', iconGlyphsData);
