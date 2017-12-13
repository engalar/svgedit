class SvgEditor {
    tool_scale = 1; // Dependent on icon size, so any use to making configurable instead? Used by JQuerySpinBtn.js
    exportWindowCt = 0;
    langChanged = false;
    showSaveWarning = false;
    storagePromptClosed = false; // For use with ext-storage.js

    constructor(){
        var svgCanvas, urldata,
            Utils = svgedit.utilities,
            isReady = false,
            customExportImage = false,
            customExportPDF = false,
            callbacks = [],
            /**
             * PREFS AND CONFIG
             */
                // The iteration algorithm for defaultPrefs does not currently support array/objects
            defaultPrefs = {
                // EDITOR OPTIONS (DIALOG)
                lang: '', // Default to "en" if locale.js detection does not detect another language
                iconsize: '', // Will default to 's' if the window height is smaller than the minimum height and 'm' otherwise
                bkgd_color: '#FFF',
                bkgd_url: '',
                // DOCUMENT PROPERTIES (DIALOG)
                img_save: 'embed',
                // ALERT NOTICES
                // Only shows in UI as far as alert notices, but useful to remember, so keeping as pref
                save_notice_done: false,
                export_notice_done: false
            },
            curPrefs = {},
            // Note: The difference between Prefs and Config is that Prefs
            //   can be changed in the UI and are stored in the browser,
            //   while config cannot
            curConfig = {
                // We do not put on defaultConfig to simplify object copying
                //   procedures (we obtain instead from defaultExtensions)
                extensions: [],
                /**
                 * Can use window.location.origin to indicate the current
                 * origin. Can contain a '*' to allow all domains or 'null' (as
                 * a string) to support all file:// URLs. Cannot be set by
                 * URL for security reasons (not safe, at least for
                 * privacy or data integrity of SVG content).
                 * Might have been fairly safe to allow
                 *   `new URL(window.location.href).origin` by default but
                 *   avoiding it ensures some more security that even third
                 *   party apps on the same domain also cannot communicate
                 *   with this app by default.
                 * For use with ext-xdomain-messaging.js
                 * @todo We might instead make as a user-facing preference.
                 */
                allowedOrigins: []
            },
            defaultExtensions = [
                // 'ext-overview_window.js',
                // 'ext-markers.js',
                // 'ext-connector.js',
                // 'ext-eyedropper.js',
                // 'ext-shapes.js',
                // 'ext-imagelib.js',
                // 'ext-grid.js',
                // 'ext-polygon.js',
                // 'ext-star.js',
                // 'ext-panning.js',
                'ext-storage.js',
                // 'ext-helloworld.js'
            ],
            defaultConfig = {
                // Todo: svgcanvas.js also sets and checks: show_outside_canvas, selectNew; add here?
                // Change the following to preferences and add pref controls to the UI (e.g., initTool, wireframe, showlayers)?
                canvasName: 'default',
                canvas_expansion: 3,
                initFill: {
                    color: 'FF0000', // solid red
                    opacity: 1
                },
                initStroke: {
                    width: 5,
                    color: '000000', // solid black
                    opacity: 1
                },
                text: {
                    stroke_width: 0,
                    font_size: 24,
                    font_family: 'serif'
                },
                initOpacity: 1,
                colorPickerCSS: null, // Defaults to 'left' with a position equal to that of the fill_color or stroke_color element minus 140, and a 'bottom' equal to 40
                initTool: 'select',
                exportWindowType: 'new', // 'same' (todo: also support 'download')
                wireframe: false,
                showlayers: false,
                no_save_warning: false,
                // PATH CONFIGURATION
                // The following path configuration items are disallowed in the URL (as should any future path configurations)
                imgPath: 'images/',
                langPath: 'locale/',
                extPath: 'extensions/',
                jGraduatePath: 'jgraduate/images/',
                // DOCUMENT PROPERTIES
                // Change the following to a preference (already in the Document Properties dialog)?
                dimensions: [640, 480],
                // EDITOR OPTIONS
                // Change the following to preferences (already in the Editor Options dialog)?
                gridSnapping: false,
                gridColor: '#000',
                baseUnit: 'px',
                snappingStep: 10,
                showRulers: false,
                // URL BEHAVIOR CONFIGURATION
                preventAllURLConfig: false,
                preventURLContentLoading: false,
                // EXTENSION CONFIGURATION (see also preventAllURLConfig)
                lockExtensions: false, // Disallowed in URL setting
                noDefaultExtensions: false, // noDefaultExtensions can only be meaningfully used in config.js or in the URL
                // EXTENSION-RELATED (GRID)
                showGrid: false, // Set by ext-grid.js
                // EXTENSION-RELATED (STORAGE)
                noStorageOnLoad: false, // Some interaction with ext-storage.js; prevent even the loading of previously saved local storage
                forceStorage: false, // Some interaction with ext-storage.js; strongly discouraged from modification as it bypasses user privacy by preventing them from choosing whether to keep local storage or not
                emptyStorageOnDecline: false // Used by ext-storage.js; empty any prior storage if the user declines to store
            },
            /**
             * LOCALE
             * @todo Can we remove now that we are always loading even English? (unless locale is set to null)
             */
            uiStrings = editor.uiStrings = {
                common: {
                    ok: 'OK',
                    cancel: 'Cancel',
                    key_up: 'Up',
                    key_down: 'Down',
                    key_backspace: 'Backspace',
                    key_del: 'Del'
                },
                // This is needed if the locale is English, since the locale strings are not read in that instance.
                layers: {
                    layer: 'Layer'
                },
                notification: {
                    invalidAttrValGiven: 'Invalid value given',
                    noContentToFitTo: 'No content to fit to',
                    dupeLayerName: 'There is already a layer named that!',
                    enterUniqueLayerName: 'Please enter a unique layer name',
                    enterNewLayerName: 'Please enter the new layer name',
                    layerHasThatName: 'Layer already has that name',
                    QmoveElemsToLayer: 'Move selected elements to layer \'%s\'?',
                    QwantToClear: 'Do you want to clear the drawing?\nThis will also erase your undo history!',
                    QwantToOpen: 'Do you want to open a new file?\nThis will also erase your undo history!',
                    QerrorsRevertToSource: 'There were parsing errors in your SVG source.\nRevert back to original SVG source?',
                    QignoreSourceChanges: 'Ignore changes made to SVG source?',
                    featNotSupported: 'Feature not supported',
                    enterNewImgURL: 'Enter the new image URL',
                    defsFailOnSave: 'NOTE: Due to a bug in your browser, this image may appear wrong (missing gradients or elements). It will however appear correct once actually saved.',
                    loadingImage: 'Loading image, please wait...',
                    saveFromBrowser: 'Select \'Save As...\' in your browser to save this image as a %s file.',
                    noteTheseIssues: 'Also note the following issues: ',
                    unsavedChanges: 'There are unsaved changes.',
                    enterNewLinkURL: 'Enter the new hyperlink URL',
                    errorLoadingSVG: 'Error: Unable to load SVG data',
                    URLloadFail: 'Unable to load from URL',
                    retrieving: 'Retrieving \'%s\' ...'
                }
            };






        // var host = location.hostname,
        //	onWeb = host && host.indexOf('.') >= 0;
        // Some FF versions throw security errors here when directly accessing
        try {
            if ('localStorage' in window) { // && onWeb removed so Webkit works locally
                editor.storage = localStorage;
            }
        } catch(err) {}

        // Todo: Avoid var-defined functions and group functions together, etc. where possible
        var good_langs = [];
        $('#lang_select option').each(function() {
            good_langs.push(this.value);
        });

        function setupCurPrefs () {
            curPrefs = $.extend(true, {}, defaultPrefs, curPrefs); // Now safe to merge with priority for curPrefs in the event any are already set
            // Export updated prefs
            editor.curPrefs = curPrefs;
        }
        function setupCurConfig () {
            curConfig = $.extend(true, {}, defaultConfig, curConfig); // Now safe to merge with priority for curConfig in the event any are already set

            // Now deal with extensions and other array config
            if (!curConfig.noDefaultExtensions) {
                curConfig.extensions = curConfig.extensions.concat(defaultExtensions);
            }
            // ...and remove any dupes
            $.each(['extensions', 'allowedOrigins'], function (i, cfg) {
                curConfig[cfg] = $.grep(curConfig[cfg], function (n, i) {
                    return i === curConfig[cfg].indexOf(n);
                });
            });
            // Export updated config
            editor.curConfig = curConfig;
        }
        (function() {
            // Load config/data from URL if given
            var src, qstr;
            urldata = $.deparam.querystring(true);
            if (!$.isEmptyObject(urldata)) {
                if (urldata.dimensions) {
                    urldata.dimensions = urldata.dimensions.split(',');
                }

                if (urldata.bkgd_color) {
                    urldata.bkgd_color = '#' + urldata.bkgd_color;
                }

                if (urldata.extensions) {
                    // For security reasons, disallow cross-domain or cross-folder extensions via URL
                    urldata.extensions = urldata.extensions.match(/[:\/\\]/) ? '' : urldata.extensions.split(',');
                }

                // Disallowing extension paths via URL for
                // security reasons, even for same-domain
                // ones given potential to interact in undesirable
                // ways with other script resources
                $.each(
                    [
                        'extPath', 'imgPath',
                        'langPath', 'jGraduatePath'
                    ],
                    function (pathConfig) {
                        if (urldata[pathConfig]) {
                            delete urldata[pathConfig];
                        }
                    }
                );

                editor.setConfig(urldata, {overwrite: false}); // Note: source and url (as with storagePrompt later) are not set on config but are used below

                setupCurConfig();

                if (!curConfig.preventURLContentLoading) {
                    src = urldata.source;
                    qstr = $.param.querystring();
                    if (!src) { // urldata.source may have been null if it ended with '='
                        if (qstr.indexOf('source=data:') >= 0) {
                            src = qstr.match(/source=(data:[^&]*)/)[1];
                        }
                    }
                    if (src) {
                        if (src.indexOf('data:') === 0) {
                            editor.loadFromDataURI(src);
                        } else {
                            editor.loadFromString(src);
                        }
                        return;
                    }
                    if (urldata.url) {
                        editor.loadFromURL(urldata.url);
                        return;
                    }
                }
                if (!urldata.noStorageOnLoad || curConfig.forceStorage) {
                    editor.loadContentAndPrefs();
                }
                setupCurPrefs();
            }
            else {
                setupCurConfig();
                editor.loadContentAndPrefs();
                setupCurPrefs();
            }
        }());

        var setIcon = editor.setIcon = function(elem, icon_id, forcedSize) {
            var icon = (typeof icon_id === 'string') ? $.getSvgIcon(icon_id, true) : icon_id.clone();
            if (!icon) {
                console.log('NOTE: Icon image missing: ' + icon_id);
                return;
            }
            $(elem).empty().append(icon);
        };

        var extFunc = function() {
            $.each(curConfig.extensions, function() {
                var extname = this;
                if (!extname.match(/^ext-.*\.js/)) { // Ensure URL cannot specify some other unintended file in the extPath
                    return;
                }
                $.getScript(curConfig.extPath + extname, function(d) {
                    // Fails locally in Chrome 5
                    if (!d) {
                        var s = document.createElement('script');
                        s.src = curConfig.extPath + extname;
                        document.querySelector('head').appendChild(s);
                    }
                }).fail(function(jqxhr, settings, exception){
                    console.log(exception);
                });
            });

            // var lang = ('lang' in curPrefs) ? curPrefs.lang : null;
            editor.putLocale(null, good_langs);
        };

        // Load extensions
        // Bit of a hack to run extensions in local Opera/IE9
        if (document.location.protocol === 'file:') {
            setTimeout(extFunc, 100);
        } else {
            extFunc();
        }
        $.svgIcons(curConfig.imgPath + 'svg_edit_icons.svg', {
            w:24, h:24,
            id_match: false,
            no_img: !svgedit.browser.isWebkit(), // Opera & Firefox 4 gives odd behavior w/images
            fallback_path: curConfig.imgPath,
            fallback: {
                'new_image': 'clear.png',
                'save': 'save.png',
                'open': 'open.png',
                'source': 'source.png',
                'docprops': 'document-properties.png',
                'wireframe': 'wireframe.png',

                'undo': 'undo.png',
                'redo': 'redo.png',

                'select': 'select.png',
                'select_node': 'select_node.png',
                'pencil': 'fhpath.png',
                'pen': 'line.png',
                'square': 'square.png',
                'rect': 'rect.png',
                'fh_rect': 'freehand-square.png',
                'circle': 'circle.png',
                'ellipse': 'ellipse.png',
                'fh_ellipse': 'freehand-circle.png',
                'path': 'path.png',
                'text': 'text.png',
                'image': 'image.png',
                'zoom': 'zoom.png',

                'clone': 'clone.png',
                'node_clone': 'node_clone.png',
                'delete': 'delete.png',
                'node_delete': 'node_delete.png',
                'group': 'shape_group_elements.png',
                'ungroup': 'shape_ungroup.png',
                'move_top': 'move_top.png',
                'move_bottom': 'move_bottom.png',
                'to_path': 'to_path.png',
                'link_controls': 'link_controls.png',
                'reorient': 'reorient.png',

                'align_left': 'align-left.png',
                'align_center': 'align-center.png',
                'align_right': 'align-right.png',
                'align_top': 'align-top.png',
                'align_middle': 'align-middle.png',
                'align_bottom': 'align-bottom.png',

                'go_up': 'go-up.png',
                'go_down': 'go-down.png',

                'ok': 'save.png',
                'cancel': 'cancel.png',

                'arrow_right': 'flyouth.png',
                'arrow_down': 'dropdown.gif'
            },
            placement: {
                '#logo': 'logo',

                '#tool_clear div,#layer_new': 'new_image',
                '#tool_save div': 'save',
                '#tool_export div': 'export',
                '#tool_open div div': 'open',
                '#tool_import div div': 'import',
                '#tool_source': 'source',
                '#tool_docprops > div': 'docprops',
                '#tool_wireframe': 'wireframe',

                '#tool_undo': 'undo',
                '#tool_redo': 'redo',

                '#tool_select': 'select',
                '#tool_fhpath': 'pencil',
                '#tool_line': 'pen',
                '#tool_rect,#tools_rect_show': 'rect',
                '#tool_square': 'square',
                '#tool_fhrect': 'fh_rect',
                '#tool_ellipse,#tools_ellipse_show': 'ellipse',
                '#tool_circle': 'circle',
                '#tool_fhellipse': 'fh_ellipse',
                '#tool_path': 'path',
                '#tool_text,#layer_rename': 'text',
                '#tool_image': 'image',
                '#tool_zoom': 'zoom',

                '#tool_clone,#tool_clone_multi': 'clone',
                '#tool_node_clone': 'node_clone',
                '#layer_delete,#tool_delete,#tool_delete_multi': 'delete',
                '#tool_node_delete': 'node_delete',
                '#tool_add_subpath': 'add_subpath',
                '#tool_openclose_path': 'open_path',
                '#tool_move_top': 'move_top',
                '#tool_move_bottom': 'move_bottom',
                '#tool_topath': 'to_path',
                '#tool_node_link': 'link_controls',
                '#tool_reorient': 'reorient',
                '#tool_group_elements': 'group_elements',
                '#tool_ungroup': 'ungroup',
                '#tool_unlink_use': 'unlink_use',

                '#tool_alignleft, #tool_posleft': 'align_left',
                '#tool_aligncenter, #tool_poscenter': 'align_center',
                '#tool_alignright, #tool_posright': 'align_right',
                '#tool_aligntop, #tool_postop': 'align_top',
                '#tool_alignmiddle, #tool_posmiddle': 'align_middle',
                '#tool_alignbottom, #tool_posbottom': 'align_bottom',
                '#cur_position': 'align',

                '#linecap_butt,#cur_linecap': 'linecap_butt',
                '#linecap_round': 'linecap_round',
                '#linecap_square': 'linecap_square',

                '#linejoin_miter,#cur_linejoin': 'linejoin_miter',
                '#linejoin_round': 'linejoin_round',
                '#linejoin_bevel': 'linejoin_bevel',

                '#url_notice': 'warning',

                '#layer_up': 'go_up',
                '#layer_down': 'go_down',
                '#layer_moreopts': 'context_menu',
                '#layerlist td.layervis': 'eye',

                '#tool_source_save,#tool_docprops_save,#tool_prefs_save': 'ok',
                '#tool_source_cancel,#tool_docprops_cancel,#tool_prefs_cancel': 'cancel',

                '#rwidthLabel, #iwidthLabel': 'width',
                '#rheightLabel, #iheightLabel': 'height',
                '#cornerRadiusLabel span': 'c_radius',
                '#angleLabel': 'angle',
                '#linkLabel,#tool_make_link,#tool_make_link_multi': 'globe_link',
                '#zoomLabel': 'zoom',
                '#tool_fill label': 'fill',
                '#tool_stroke .icon_label': 'stroke',
                '#group_opacityLabel': 'opacity',
                '#blurLabel': 'blur',
                '#font_sizeLabel': 'fontsize',

                '.flyout_arrow_horiz': 'arrow_right',
                '.dropdown button, #main_button .dropdown': 'arrow_down',
                '#palette .palette_item:first, #fill_bg, #stroke_bg': 'no_color'
            },
            resize: {
                '#logo .svg_icon': 28,
                '.flyout_arrow_horiz .svg_icon': 5,
                '.layer_button .svg_icon, #layerlist td.layervis .svg_icon': 14,
                '.dropdown button .svg_icon': 7,
                '#main_button .dropdown .svg_icon': 9,
                '.palette_item:first .svg_icon' : 15,
                '#fill_bg .svg_icon, #stroke_bg .svg_icon': 16,
                '.toolbar_button button .svg_icon': 16,
                '.stroke_tool div div .svg_icon': 20,
                '#tools_bottom label .svg_icon': 18
            },
            callback: function(icons) {
                $('.toolbar_button button > svg, .toolbar_button button > img').each(function() {
                    $(this).parent().prepend(this);
                });

                var min_height,
                    tleft = $('#tools_left');
                if (tleft.length !== 0) {
                    min_height = tleft.offset().top + tleft.outerHeight();
                }

                var size = $.pref('iconsize');
                editor.setIconSize(size || ($(window).height() < min_height ? 's': 'm'));

                // Look for any missing flyout icons from plugins
                $('.tools_flyout').each(function() {
                    var shower = $('#' + this.id + '_show');
                    var sel = shower.attr('data-curopt');
                    // Check if there's an icon here
                    if (!shower.children('svg, img').length) {
                        var clone = $(sel).children().clone();
                        if (clone.length) {
                            clone[0].removeAttribute('style'); //Needed for Opera
                            shower.append(clone);
                        }
                    }
                });

                editor.runCallbacks();

                setTimeout(function() {
                    $('.flyout_arrow_horiz:empty').each(function() {
                        $(this).append($.getSvgIcon('arrow_right').width(5).height(5));
                    });
                }, 1);
            }
    }

    loadSvgString (str, callback) {
        var success = svgCanvas.setSvgString(str) !== false;
        callback = callback || $.noop;
        if (success) {
            callback(true);
        } else {
            $.alert(uiStrings.notification.errorLoadingSVG, function() {
                callback(false);
            });
        }
    }

    /**
     * Store and retrieve preferences
     * @param {string} key The preference name to be retrieved or set
     * @param {string} [val] The value. If the value supplied is missing or falsey, no change to the preference will be made.
     * @returns {string} If val is missing or falsey, the value of the previously stored preference will be returned.
     * @todo Can we change setting on the jQuery namespace (onto editor) to avoid conflicts?
     * @todo Review whether any remaining existing direct references to
     *	getting curPrefs can be changed to use $.pref() getting to ensure
     *	defaultPrefs fallback (also for sake of allowInitialUserOverride); specifically, bkgd_color could be changed so that
     *	the pref dialog has a button to auto-calculate background, but otherwise uses $.pref() to be able to get default prefs
     *	or overridable settings
     */
    pref   (key, val) {
        if (val) {
            curPrefs[key] = val;
            editor.curPrefs = curPrefs; // Update exported value
            return;
        }
        return (key in curPrefs) ? curPrefs[key] : defaultPrefs[key];
    };

    loadContentAndPrefs () {
        if (!curConfig.forceStorage && (curConfig.noStorageOnLoad || !document.cookie.match(/(?:^|;\s*)store=(?:prefsAndContent|prefsOnly)/))) {
            return;
        }

        // LOAD CONTENT
        if (editor.storage && // Cookies do not have enough available memory to hold large documents
            (curConfig.forceStorage || (!curConfig.noStorageOnLoad && document.cookie.match(/(?:^|;\s*)store=prefsAndContent/)))
        ) {
            var name = 'svgedit-' + curConfig.canvasName;
            var cached = editor.storage.getItem(name);
            if (cached) {
                editor.loadFromString(cached);
            }
        }

        // LOAD PREFS
        var key;
        for (key in defaultPrefs) {
            if (defaultPrefs.hasOwnProperty(key)) { // It's our own config, so we don't need to iterate up the prototype chain
                var storeKey = 'svg-edit-' + key;
                if (editor.storage) {
                    var val = editor.storage.getItem(storeKey);
                    if (val) {
                        defaultPrefs[key] = String(val); // Convert to string for FF (.value fails in Webkit)
                    }
                }
                else if (window.widget) {
                    defaultPrefs[key] = widget.preferenceForKey(storeKey);
                }
                else {
                    var result = document.cookie.match(new RegExp('(?:^|;\\s*)' + Utils.preg_quote(encodeURIComponent(storeKey)) + '=([^;]+)'));
                    defaultPrefs[key] = result ? decodeURIComponent(result[1]) : '';
                }
            }
        }
    };

    setConfig (opts, cfgCfg) {
        cfgCfg = cfgCfg || {};
        function extendOrAdd (cfgObj, key, val) {
            if (cfgObj[key] && typeof cfgObj[key] === 'object') {
                $.extend(true, cfgObj[key], val);
            }
            else {
                cfgObj[key] = val;
            }
            return;
        }
        $.each(opts, function(key, val) {
            if (opts.hasOwnProperty(key)) {
                // Only allow prefs defined in defaultPrefs
                if (defaultPrefs.hasOwnProperty(key)) {
                    if (cfgCfg.overwrite === false && (
                            curConfig.preventAllURLConfig ||
                            curPrefs.hasOwnProperty(key)
                        )) {
                        return;
                    }
                    if (cfgCfg.allowInitialUserOverride === true) {
                        defaultPrefs[key] = val;
                    }
                    else {
                        $.pref(key, val);
                    }
                }
                else if (['extensions', 'allowedOrigins'].indexOf(key) > -1) {
                    if (cfgCfg.overwrite === false &&
                        (
                            curConfig.preventAllURLConfig ||
                            key === 'allowedOrigins' ||
                            (key === 'extensions' && curConfig.lockExtensions)
                        )
                    ) {
                        return;
                    }
                    curConfig[key] = curConfig[key].concat(val); // We will handle any dupes later
                }
                // Only allow other curConfig if defined in defaultConfig
                else if (defaultConfig.hasOwnProperty(key)) {
                    if (cfgCfg.overwrite === false && (
                            curConfig.preventAllURLConfig ||
                            curConfig.hasOwnProperty(key)
                        )) {
                        return;
                    }
                    // Potentially overwriting of previously set config
                    if (curConfig.hasOwnProperty(key)) {
                        if (cfgCfg.overwrite === false) {
                            return;
                        }
                        extendOrAdd(curConfig, key, val);
                    }
                    else {
                        if (cfgCfg.allowInitialUserOverride === true) {
                            extendOrAdd(defaultConfig, key, val);
                        }
                        else {
                            if (defaultConfig[key] && typeof defaultConfig[key] === 'object') {
                                curConfig[key] = {};
                                $.extend(true, curConfig[key], val); // Merge properties recursively, e.g., on initFill, initStroke objects
                            }
                            else {
                                curConfig[key] = val;
                            }
                        }
                    }
                }
            }
        });
        editor.curConfig = curConfig; // Update exported value
    };

    setCustomHandlers (opts) {
        editor.ready(function() {
            if (opts.open) {
                $('#tool_open > input[type="file"]').remove();
                $('#tool_open').show();
                svgCanvas.open = opts.open;
            }
            if (opts.save) {
                editor.showSaveWarning = false;
                svgCanvas.bind('saved', opts.save);
            }
            if (opts.exportImage) {
                customExportImage = opts.exportImage;
                svgCanvas.bind('exported', customExportImage); // canvg and our RGBColor will be available to the method
            }
            if (opts.exportPDF) {
                customExportPDF = opts.exportPDF;
                svgCanvas.bind('exportedPDF', customExportPDF); // jsPDF and our RGBColor will be available to the method
            }
        });
    };

    randomizeIds = function () {
        svgCanvas.randomizeIds(arguments);
    };
}