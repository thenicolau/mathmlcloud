var waterfall = require('async-waterfall'), JSDOM = require("jsdom").JSDOM;
module.exports = {

    removeDelimiters: function(equation, mathType) {
        var compare = new String(equation);
        if (mathType === "AsciiMath" && compare.indexOf("`") == 0) {
            return compare.substring(1, compare.length - 1);
        } else if (mathType === "TeX" && compare.indexOf("$") == 0) {
            if (compare.indexOf("$$") == 0) {
                return compare.substring(2,compare.length - 2);
            } else {
                return compare.substring(1,compare.length - 1);
            }

        }
        return equation;
    },

    convertEquation: function(options, host, done) {
        ConversionService.convert(options, function(data) {
            if (typeof(data.errors) == 'undefined') {
                //clean up any old components.

                    //Save all components.

                    if (options.png === "true" || options.png === true) {
                      var pngSource =
                        '<img src="' +
                        data.png +
                        '" alt="' +
                        data.speakText +
                        '" />';

                    }
                    //Look up equation so that we have all created info.

                        return done(null, data);



            } else {
                console.log(data.errors);
                return done(data.errors);
            }
        });
    },

    convert: function(options, done) {
        var mathjaxNode = require("mathjax-node-sre"),
            extend = require("extend"),
            mathJaxNodeOptions = extend(options, {timeout: 100 * 1000});

        mathjaxNode.typeset(options, function (data) {
            if (options.png) {
                var mathjaxNode2 = require('mathjax-node-svg2png');
                mathjaxNode2.typeset(options, function(data2) {
                    data.png = data2.png;
                    done(data);
                });
            } else {
                done(data);
            }
        });
    },

    convertHTML5: function(options, done) {
        var conversionService = this;
        Html5.findOne({ id: options.html5Id }).exec(function(err, html5) {
            if (err) {
                done(err);
            } else {
                var mathjaxOptions = {};
                mathjaxOptions.html = html5.source;
                mathjaxOptions.speakText = true;
                mathjaxOptions.timeout = 100 * 1000;
                mathjaxOptions.renderer = conversionService.getRenderer(html5.outputFormat);
                mathjaxOptions.equations = true;
                ConversionService.typesetPage(mathjaxOptions, html5, done);
            }
        });
    },

    getRenderer: function(outputFormat) {
        switch (outputFormat) {
            case "svg":
                return "SVG";
            case "png":
                return "PNG";
            case "mml":
                return "NativeMML";
            default:
                "None";
        }
    },

    typesetPage: function(mathjaxOptions, html5, done) {
        var mathjaxNode = require("mathjax-node-sre");
		console.log("Starting MathJax file conversion to " + html5.outputFormat);
        try {
            mathjaxNode.typeset(mathjaxOptions, function (data) {
                if (typeof(data.errors) != "undefined") {
                    done(data.errors);
                } else {
                    var doc = new JSDOM(data.html);
                    var window = doc.parentWindow;
                    waterfall([
                        function (callback) {
                            //Save all jax.
                            if (typeof(data.equations) != "undefined") {
                                data.equations.forEach(function(equation, index) {
                                    if (equation.originalText != '') {
										console.log("Creating equation record with html5.id " + html5.id);
                                        Equation.create({
                                        math: equation.originalText,
                                        mathType: equation.inputJax,
                                        html5: html5.id}).exec(function(err, dbEquation) {
                                            if (err) done(err);
											console.log("Creating component record for " + html5.outputFormat + ", equation id " + dbEquation.id);
                                            //Create output component.
                                            EquationService.createComponent(html5.outputFormat, equation.outputJax, dbEquation.id);
                                            if (typeof(equation.speakText) != "undefined") {
												console.log("Creating description record with equation.id " + dbEquation.id);
                                                EquationService.createComponent("description", equation.speakText, dbEquation.id);
                                            }
                                            if (window.document.getElementById(equation.inputID) != null) {
                                                var domEquation = window.document.getElementById(equation.inputID);
                                                domEquation.setAttribute("id", dbEquation.id);
                                                var comment = window.document.createComment("https://mathmlcloud.org/equation/" + dbEquation.id);
                                                var parent = domEquation.parentElement;
                                                parent.insertBefore(comment, domEquation);
                                            }
                                        });
                                    }
                                });
                            }
                            callback();
                        },
                        function(callback){
							console.log("Updating html5 record for id " + html5.id);
                            //update html5.
                            Html5.update({id: html5.id}, {output: doc.serialize()}).exec(function(err, html5s) {
                                if (err) callback(err);
                            });
                            callback();
                        }
                    ],
                    function(err) {
                        if (err) done(err);
                        done();
                    });
                }
            });
        } catch (err) {
            done(err);
        }
    }
};
