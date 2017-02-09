'use babel';

import { CompositeDisposable } from 'atom';

// To convert message type from htmlcs to message linter type.
var mappingHtmlcsTypesToLinterTypes = {
    'INFO': 'Info',
    'WARN': 'Warning',
    'ERROR': 'Error'
};

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
                // Get htmlcs service.
                var htmlcs = require('htmlcs');
                const editorPath = textEditor.getPath();

                // Run HTMLCS on the file.
                // @NOTE: We tried the method 'htmlcs.hint' on the textEditor.getText() but it doesn't throw errors.
                var result = htmlcs.hintFile(editorPath);
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
