'use babel';

import { CompositeDisposable } from 'atom';

var fs = require('fs');

// Config to use the type from htmlcs.
var configHtmlcsTypes = {
    INFO: {
        linterType: 'Info',
        level: 3
    },
    WARN: {
        linterType: 'Warning',
        level: 2
    },
    ERROR: {
        linterType: 'Error',
        level: 1
    },
};

const configFileName = '.htmlcsrc';
// Need a constant for no restart atom when change the config.
// With const, change this value, update the object returner by provideLinter().
// Solution found on https://github.com/AtomLinter/linter-htmlhint.
const grammarScopes = [];

// Get htmlcs services.
var htmlcs = require('htmlcs');
var htmlcsConfigLoader = require('../node_modules/htmlcs/lib/config.js');

var defaultConfigFile;
var warningSeverity;

/**
 * Return the config from project.
 *
 * @param {String} filePath
 *
 * @return {Object|null|false} Return an object if config found, null if config doesn't found or false if error.
 */
function getConfig(filePath) {
    // We try to find a config file in project.
    var {find} = require('atom-linter');
    var projectConfig = find(filePath, configFileName);
    if (projectConfig) {
        return htmlcsConfigLoader.load(projectConfig);
    }

    if (defaultConfigFile) {
        if (!fs.existsSync(defaultConfigFile)) {
            console.error('The default config file "'+defaultConfigFile+'" not found.');

            return false;
        }

        // If we don't have a config file for the project we use the default config file.
        return htmlcsConfigLoader.load(defaultConfigFile);
    }

    // No default config and no project config.
    return null;
}

var subscriptions;

export default {
    activate() {
        // Install dependencies.
        require('atom-package-deps').install('linter-htmlcs');

        subscriptions = new CompositeDisposable();

        subscriptions.add(atom.config.observe('linter-htmlcs.enabledScopes', (scopes) => {
            // Change all old scopes by new scopes.
            grammarScopes.splice(0, grammarScopes.length);
            Array.prototype.push.apply(grammarScopes, scopes);
        }));

        subscriptions.add(atom.config.observe('linter-htmlcs.defaultConfigFile', (newDefaultConfigFile) => {
            defaultConfigFile = newDefaultConfigFile;
        }));

        subscriptions.add(atom.config.observe('linter-htmlcs.warningSeverity', (newWarningSeverity) => {
            warningSeverity = newWarningSeverity;
        }));
    },

    deactivate() {
        subscriptions.dispose();
    },

    provideLinter() {
        return {
            name: 'htmlcs',
            grammarScopes: grammarScopes,
            scope: 'file',
            lintOnFly: true,
            lint(textEditor) {
                const editorPath = textEditor.getPath();

                // Get the config for htmlcs.
                var htmlcsConfig = getConfig(editorPath);
                if (htmlcsConfig === false) {
                    // Fail to load the config.
                    atom.notifications.addError('Fail to load config for HTMLCS');
                }

                // Run HTMLCS on the code.
                var result;
                if (htmlcsConfig) {
                    // If we have config, we use the text version to specify the config.
                    result = htmlcs.hint(textEditor.getText(), htmlcsConfig);
                } else {
                    // If we don't have config, we use htmlcs on the file to use default config.
                    result = htmlcs.hintFile(editorPath);
                }
                var msgs = [];

                // Generate messages for the linter from result of htmlcs.
                result.forEach(function (item) {
                    if (configHtmlcsTypes[item.type].level > warningSeverity) {
                        // Ignore the message if the level is too low.
                        return;
                    }
                    // HTMLCS doesn't offer the end for the error. We just
                    // display 3 characters to display the error start.
                    msgs.push({
                        type: configHtmlcsTypes[item.type].linterType,
                        text: item.message + ' (rule tag: '+item.rule+')',
                        range: [[item.line-1, item.column-1], [item.line-1, item.column+2]],
                        filePath: editorPath
                    });
                });

                return msgs;
            }
        };
    }
};
