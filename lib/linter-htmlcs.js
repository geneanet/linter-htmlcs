'use babel';

import { CompositeDisposable } from 'atom';

// To convert message type from htmlcs to message linter type.
var mappingHtmlcsTypesToLinterTypes = {
    'INFO': 'Info',
    'WARN': 'Warning',
    'ERROR': 'Error'
};

const configFileName = '.htmlcsrc';

// Get htmlcs services.
var htmlcs = require('htmlcs');
var htmlcsConfigLoader = require('../node_modules/htmlcs/lib/config.js');

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

    // No default config and no project config.
    return null;
}

export default {
    // For now, we just accept text.html.basic. Soon, we add more default scopes and accept a config to improve this.
    grammarScopes: ['text.html.basic'],

    activate() {
        // Install dependencies.
        require('atom-package-deps').install('linter-htmlcs');
    },

    deactivate() {
    },

    provideLinter() {
        return {
            name: 'htmlcs',
            grammarScopes: this.grammarScopes,
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
                result.forEach(function(item){
                    // HTMLCS doesn't offer the end for the error. We just
                    // display 3 characters to display the error start.
                    msgs.push({
                        type: mappingHtmlcsTypesToLinterTypes[item.type],
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
