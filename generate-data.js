'use strict';

const path = require('path');

const fse = require('fs-extra');

const fs = require('fs');

const _ = require('lodash');

import { getFileData, generateGlyphs, writeJSONToDisk, writeToDisk } from './utils';

// generate config data used to generate the font icon

const files = getFileData('./svgs');
const glyphs = generateGlyphs(files);

const packagePath = process.cwd();
const buildPath = path.join(packagePath, './build');
const svgPath = path.join(packagePath, './svgs');
const componentPath = path.join(packagePath, './components');

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
export type IconGlyphTypes = ${iconGlyphs.map((glyph) => glyph.trim().slice(0, -1)).join(' | ')};

export default IconGlyphs;
`;

writeToDisk('./IconGlyphs.ts', iconGlyphsData);

const componentTemplate = ({ name, content }) => `import React from 'react';

export type P${name} = {
    size: number;
    color: string;
};

const ${name}Icon = (props: P${name}): JSX.Element => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        version="1.1"
        width={props.size || 24}
        height={props.size || 24}
        fill={props.color || '#000000'}
        viewBox="0 0 24 24"
    >
        ${content}
    </svg>
);

export default ${name}Icon;
`;

const generateComponents = async () => {
    const svgFileNames = fs.readdirSync('./svgs');
    const filtered = svgFileNames
        .filter((name) => !name.startsWith('BRKN-'))
        .map((nonBroken) => {
            const sanitized = nonBroken.split('_')[0];
            return {
                fileName: nonBroken,
                original: sanitized,
                pascalName: _.camelCase(sanitized).replace(/^(.)/, _.toUpper),
            };
        });

    fs.mkdir(componentPath, () => console.log('##### created components folder'));

    const promises = [];
    for (let i = 0; i < filtered.length; i++) {
        promises.push(readAndWriteFiles(filtered[i]));
    }

    promises.push(createComponentIndex(filtered));

    return Promise.all(promises);
};

const readAndWriteFiles = (item) =>
    new Promise((resolve, reject) => {
        const regex = /(?<group>(?<starttag><(?<tagname>svg)[^>]*>)(?<data>.*|\n*)(?<endtag><\/\3>))/gmsu;

        const fileData = fs.readFileSync(path.join(svgPath, item.fileName), { encoding: 'utf-8' });
        const result = regex.exec(fileData);

        if (result === null) {
            reject(item.fileName);
        }

        if (result) {
            const classRegex = /class=".*?"/gmu;
            const sanitizedResult = result.groups.data.replace(classRegex, '').replace('\n', '').replace('\t', '');
            fs.writeFile(
                path.join(componentPath, `${item.original}.tsx`),
                componentTemplate({ name: item.pascalName, content: sanitizedResult }),
                () => {}
            );
            resolve(item.fileName);
        }
    });

const createComponentIndex = (files) =>
    new Promise((resolve, reject) => {
        const indexFileData = `${files
            .map((item) => `import ${item.pascalName}Icon from './${item.original}';`)
            .join('\n')}\n\nexport {\n${files.map((item) => `${item.pascalName}Icon,`).join('\n\t')}\n};`;

        fs.writeFile(path.join(componentPath, 'index.tsx'), indexFileData, () => {});
        resolve();
    });

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

createPackageFile()
    .then(() => generateComponents())
    .then(() => console.log('### Finished creating the project files'));
