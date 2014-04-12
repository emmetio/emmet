var assert = require('assert');
var htmlMatcher = require('../lib/assets/htmlMatcher');
var range = require('../lib/assets/range');
var utils = require('../lib/utils/common');

describe('HTML matcher', function() {
	var fs = require('fs');
		var path = require('path');
		var htmlFile = fs.readFileSync(path.join(__dirname, 'stubs/webkit.html'), {encoding: 'utf8'});

	function createMatchString(text, rng, caret) {
		var result = utils.replaceSubstring(text, '[' + rng.substring(text) + ']', rng);
		var delta = 0;
		if (rng.start < caret) {
			delta++;
		}

		if (rng.end < caret) {
			delta++;
		}
		
		return utils.replaceSubstring(result, '|', caret + delta);
	}

	/**
	 * A helper assert method to visually compare text ranges
	 */
	function assertTextRanges(text, actualRange, expectedRange, caretPos) {
		var actual = createMatchString(text, actualRange, caretPos);
		var expected = createMatchString(text, expectedRange, caretPos);
		
		assert.equal(actual, expected);
	}
	
	function match(text, pos, resultStart, resultEnd, label) {
		var m = htmlMatcher.find(text, pos);
		var expectedRange = range.create2(resultStart, resultEnd);
		assertTextRanges(text, m.range, expectedRange, pos);
	}
	
	it('should work for XHTML', function() {
		var xhtml1 = '<p><strong>Hello</strong> world <br /> to all <img src="/path/to/image.png" alt="" /> my <!-- enemies --> friends</p>';
		var xhtml2 = '<span><span><br /><img src="" alt="" /><span></span></span></span><strong><em>hello</em></strong> world';
		var xhtml3 = '<p>Lorem ipsum dolor sit <!-- Don\'t use <b> tag here --> <span>amet</span>, consectetur adipiscing elit. </p>';
		var xhtml4 = '<a><a/><a/></a>';
		
		var xsl1 = '<xsl:if test="@output"><xsl:value-of select="one" /></xsl:if> <xsl:value-of select="two" /> <xsl:call-template name="tmpl1"/> <div><xsl:call-template name="tmpl2"/></div>';
		var xsl2 = '<input type="text"><xsl:apply-templates select="." mode="form_input_value"/></input>';
		
		match(xhtml1, 8, 3, 25);
		match(xhtml1, 36, 32, 38);
		match(xhtml1, 70, 46, 85);
		match(xhtml1, 43, 3, 113);
		match(xhtml1, 99, 94, 101);
		
		match(xhtml2, 39, 12, 52);
		match(xhtml2, 52, 12, 52);
		match(xhtml2, 57, 6, 59);
		match(xhtml2, 3, 0, 66);
		match(xhtml2, 45, 39, 52);
		match(xhtml2, 95, 66, 97);

		match(xsl1, 32, 23, 52);
		match(xsl1, 76, 62, 91);
		
		match(xhtml3, 77, 3, 105);
		match(xhtml3, 49, 30, 52);
		
		match(xhtml4, 11, 3, 11);
		
		match(xsl2, 12, 0, 84);
	});
	
	it('should work for HTML', function() {
		var htmlString  = '<p><b>Hello</b> world <br> to all <img src="/path/to/image.png" alt=""> my friends</p><p>Another paragraph';
		var htmlString2 = '<div><b><br></b></div>';
		var htmlString3 = '<b><b><br></b></b>';
		
		match(htmlString, 25, 22, 26, 'Matched BR tag');
		match(htmlString, 27, 3, 82, 'Matched P tag');
		match(htmlString, 64, 34, 71, 'Matched IMG tag');
		match(htmlString, 75, 3, 82, 'Matched P tag');
		
		match(htmlString2, 16, 5, 16);
		
		match(htmlString3, 2, 0, 18);
	});

	it('must work fast', function() {
		var m = htmlMatcher.find(htmlFile, 20697);
	});
});
