module('HTML Matcher');
test('XHTML', function() {
	var xhtml1 = '<p><strong>Hello</strong> world <br /> to all <img src="/path/to/image.png" alt="" /> my <!-- enemies --> friends</p>';
	var xhtml2 = '<span><span><br /><img src="" alt="" /><span></span></span></span><strong><em>hello</em></strong> world';
	var xhtml3 = '<p>Lorem ipsum dolor sit <!-- Don\'t use <b> tag here --> <span>amet</span>, consectetur adipiscing elit. </p>';
	
	var xsl1 = '<xsl:if test="@output"><xsl:value-of select="one" /></xsl:if> <xsl:value-of select="two" /> <xsl:call-template name="tmpl1"/> <div><xsl:call-template name="tmpl2"/></div>';
	var xsl2 = '<input type="text"><xsl:apply-templates select="." mode="form_input_value"/></input>';
	
	var matcher = emmet.require('html_matcher');
	deepEqual(matcher(xhtml1, 8), [3, 25]);
	deepEqual(matcher(xhtml1, 36), [32, 38]);
	deepEqual(matcher(xhtml1, 70), [46, 85]);
	deepEqual(matcher(xhtml1, 43), [3, 113]);
	deepEqual(matcher(xhtml1, 99), [89, 105]);
	
	deepEqual(matcher(xhtml2, 39), [12, 52]);
	deepEqual(matcher(xhtml2, 52), [6, 59]);
	deepEqual(matcher(xhtml2, 57), [6, 59]);
	deepEqual(matcher(xhtml2, 3), [0, 66]);
	deepEqual(matcher(xhtml2, 45), [39, 52]);
	deepEqual(matcher(xhtml2, 95), [66, 97]);

	deepEqual(matcher(xsl1, 32), [23, 52]);
	deepEqual(matcher(xsl1, 76), [62, 91]);
	
	deepEqual(matcher(xhtml3, 77), [3, 105]);
	deepEqual(matcher(xhtml3, 49), [25, 56]);
	
	deepEqual(matcher(xsl2, 12), [0, 84]);
});

test('HTML', function() {
	var html_string = '<p><b>Hello</b> world <br> to all <img src="/path/to/image.png" alt=""> my friends<p>Another paragraph';
	var matcher = emmet.require('html_matcher');
	
	deepEqual(matcher(html_string, 25), [22, 26], 'Matched BR tag');
	deepEqual(matcher(html_string, 27), [0, 82], 'Matched P tag');
});