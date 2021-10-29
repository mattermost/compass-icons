'use strict';

const path = require('path');

const fse = require('fs-extra');

import { getFileData, generateGlyphs, writeJSONToDisk, writeToDisk } from './utils';

// generate config data used to generate the font icon

const files = getFileData('./svgs');
const glyphs = generateGlyphs(files);

const packagePath = process.cwd();
const buildPath = path.join(packagePath, './build');

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

const iconGlyphsData = `const IconGlyphs: IconGlyphTypes[] = [
${iconGlyphs.join('\n')}
];
export type IconGlyphTypes = ${iconGlyphs
    .map((glyph) => glyph.trim().slice(0, -1))
    .join(' | ')};

export default IconGlyphs;
`;

writeToDisk('./IconGlyphs.ts', iconGlyphsData);

async function createPackageFile() {
    const packageData = await fse.readFile(path.resolve(packagePath, './package.json'), 'utf8');
    const {
        nyc,
        scripts,
        devDependencies,
        husky,
        workspaces,
        'lint-staged': lintStaged,
        files,
        main,
        ...packageDataOther
    } = JSON.parse(packageData);

    const newPackageData = {
        ...packageDataOther,
        main: 'css/compass-icons.css',
        private: false,
    };

    const targetPath = path.resolve(buildPath, './package.json');

    await fse.writeFile(targetPath, JSON.stringify(newPackageData, null, 2), 'utf8');
    console.log(`Created package.json in ${targetPath}`);
}

createPackageFile().then(() => console.log('### Finished creating the project files'));
