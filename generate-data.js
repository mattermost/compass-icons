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

writeJSONToDisk('config.json', configData);

// generate icon glyph data

const iconGlyphs = configData.glyphs.map(({css}) => `    ${css.toUpperCase().split('-').join('_')}: '${css}',`);

const iconGlyphsData = `
export const IconGlyphs = {
${iconGlyphs.join("\n")}
};

export type IconGlyph = keyof typeof IconGlyphs;
`;

writeToDisk('iconGlyphs.ts', iconGlyphsData);
