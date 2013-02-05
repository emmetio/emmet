module('HTML Matcher');
(function() {
	var utils = emmet.require('utils');
	
	function createMatchString(text, caret, range) {
		var result = utils.replaceSubstring(text, '[' + range.substring(text) + ']', range);
		var delta = 0;
		if (range.start < caret) {
			delta++;
		}
		if (range.end < caret) {
			delta++;
		}
		
		return utils.replaceSubstring(result, '|', caret + delta);
	}
	
	function match(text, pos, resultStart, resultEnd, label) {
		var m = emmet.require('htmlMatcher').find(text, pos);
		var expectedRange = emmet.require('range').create2(resultStart, resultEnd);
		
		testAssets.textRanges(text, m.range, expectedRange, pos, label);
	}
	
	test('XHTML', function() {
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
	
	test('HTML', function() {
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
})();
