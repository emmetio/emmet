/**
 * Allow shoulda inspired syntax for JsUnitTest unit tests. Usage:
 *
 * <script src="jsunittest.js" type="text/javascript"></script>
 * <script src="jscontext.js" type="text/javascript"></script>
 *
 * Now you can use test names beginning with both "test" and "should". You can
 * also create contexts:
 *
 * new Test.Unit.Runner({
 *     "default value": JsContext({
 *         "should be label text when label exists": function() { with(this) {
 *             // Normal JsUnitText test
 *         }},
 *
 *         "should do something else": function() { with(this) {
 *             // Normal JsUnitText test
 *         }}
 *     }),
 *
 *     "should do something not in a context": function() { with(this) {
 *         // Normal test
 *     }},
 *
 *     testNormalTestCasesAreAllowed: function() { with(this) {
 *         // Normal test
 *     }},
 *
 *     "test with spaces": function() { with(this) {
 *         // Normal test
 *     }}
 * });
 *
 * You can also nest contexts.
 */
(function(global) {
    /**
     * JsContext is a small simple object that wraps an object literal. All
     * properties from the object literal passed to the constructor are simply
     * copied to the JsContext object.
     *
     * JsContext works both as a constructor and a function - in any case the
     * result is a JsContext object.
     */
    global.JsContext = function(testcases) {
        // If invoked as a function
        if (!(this instanceof JsContext)) {
            return new JsContext(testcases);
        }

        // Copy all testcases from the object literal
        for (var testcase in testcases) {
            if (testcases.hasOwnProperty(testcase)) {
                this[testcase] = testcases[testcase];
            }
        }
    };

    // Get all test cases from an object. Recursively gets cases from contexts
    function getTests(testcases, prefix) {
        var tests = [];
        prefix = prefix || "";

        for (var testname in testcases) {
            if (testcases.hasOwnProperty(testname)) {

                if (/^test/.test(testname) || /^should/.test(testname)) {
                    tests.push(prefix + testname);
                } else if (testcases[testname] && testcases[testname] instanceof JsContext) {
                    // Handle contexts, concatenate names with "::"
                    tests = tests.concat(getTests(testcases[testname], testname + "::"));
                }
            }
        }

        return tests;
    }

    // Looks up a test function possibly nested in context(s)
    // "some context::nested context::should do something" =>
    //             testcases["some context"]["nested context"]["should do something"]
    function getTestFromContext(testcases, testname) {
        var obj = testcases, namespace = testname.split("::");

        for (var i = 0; i < namespace.length && obj !== null; i++) {
            obj = obj[namespace[i]];
        }

        return obj;
    }

    /**
     * Override JsUnitTest method for getting tests from a Runner object.
     * Most of this is taken from the default implementation, but test names
     * are discovered through getTests (which knows about contexts and should)
     * instead.
     */
    JsUnitTest.Unit.Runner.prototype.getTests = function(testcases) {
        // Regular JsUnitTest stuff
        var tests = [], options = this.options;

        if (this.queryParams.tests) {
            tests = this.queryParams.tests.split(',');
        } else if (options.tests) {
            tests = options.tests;
        } else if (options.test) {
            tests = [option.test];
        }

        if (tests.length === 0) {
            // JsContext finds contexts and tests starting with either "test"
            // or "should"
            tests = getTests(testcases, tests);
        }

        var results = [], testcase;

        for (var i = 0, testname = null; (testname = tests[i]); i++) {
            testcase = getTestFromContext(testcases, testname);

            if (testcase) {
                results.push(new JsUnitTest.Unit.Testcase(testname.replace("::", " "), testcase, testcases.setup, testcases.teardown));
            }
        };

        return results;
    };
})(this);
