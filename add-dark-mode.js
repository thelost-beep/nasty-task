// Quick script to add dark mode classes to common patterns
// Run this to batch update components with dark mode support

const fs = require('fs');
const path = require('path');

const replacements = [
    // White backgrounds
    { from: 'className="bg-white ', to: 'className="bg-white dark:bg-gray-800 ' },
    { from: 'className="bg-white"', to: 'className="bg-white dark:bg-gray-800"' },

    // Gray backgrounds
    { from: 'bg-gray-50 ', to: 'bg-gray-50 dark:bg-gray-700 ' },
    { from: 'bg-gray-100 ', to: 'bg-gray-100 dark:bg-gray-700 ' },

    // Text colors
    { from: 'text-gray-900 ', to: 'text-gray-900 dark:text-white ' },
    { from: 'text-gray-800 ', to: 'text-gray-800 dark:text-gray-200 ' },
    { from: 'text-gray-700 ', to: 'text-gray-700 dark:text-gray-300 ' },
    { from: 'text-gray-600 ', to: 'text-gray-600 dark:text-gray-400 ' },
    { from: 'text-gray-500 ', to: 'text-gray-500 dark:text-gray-400 ' },

    // Borders
    { from: 'border-gray-200 ', to: 'border-gray-200 dark:border-gray-700 ' },
    { from: 'border-gray-300 ', to: 'border-gray-300 dark:border-gray-600 ' },
];

const componentsDir = path.join(__dirname, 'src', 'components');

function addDarkMode(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    replacements.forEach(({ from, to }) => {
        if (content.includes(from) && !content.includes(to)) {
            content = content.replace(new RegExp(from, 'g'), to);
            modified = true;
        }
    });

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);

        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            addDarkMode(filePath);
        }
    });
}

console.log('Adding dark mode classes...');
walkDir(componentsDir);
console.log('Done!');
