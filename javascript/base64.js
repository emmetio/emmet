/**
 * @author Sergey Chikuyonok (serge.che@gmail.com)
 * @link http://chikuyonok.ru
 */var base64 = {
	chars: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
	
	mime_types: {
		'gif': 'image/gif',
		'png': 'image/png',
		'jpg': 'image/jpeg',
		'jpeg': 'image/jpeg',
		'svg': 'image/svg+xml',
		'html': 'text/html',
		'htm': 'text/html'
	},

	encode: function(input) {
		var output = [];
		var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
		var i = 0, il = input.length, b64_str = this.chars;

		while (i < il) {

			chr1 = input.charCodeAt(i++) & 0xff;
			chr2 = input.charCodeAt(i++) & 0xff;
			chr3 = input.charCodeAt(i++) & 0xff;

			enc1 = chr1 >> 2;
			enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
			enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
			enc4 = chr3 & 63;

			if (isNaN(chr2)) {
				enc3 = enc4 = 64;
			} else if (isNaN(chr3)) {
				enc4 = 64;
			}

			output.push(
				b64_str.charAt(enc1) + b64_str.charAt(enc2) +
				b64_str.charAt(enc3) + b64_str.charAt(enc4)
			);
		}

		return output.join('');
	},

	/**
	 * Decodes string using MIME base64 algorithm
	 * @author Tyler Akins (http://rumkin.com)
	 * @param {String} data
	 * @return {String}
	 */
	decode: function(data) {
		var o1, o2, o3, h1, h2, h3, h4, bits, i = 0, ac = 0, dec = "", tmp_arr = [];
		var b64 = this.chars, il = data.length;

		if (!data) {
			return data;
		}

		data += '';

		do {  // unpack four hexets into three octets using index points in b64
			h1 = b64.indexOf(data.charAt(i++));
			h2 = b64.indexOf(data.charAt(i++));
			h3 = b64.indexOf(data.charAt(i++));
			h4 = b64.indexOf(data.charAt(i++));

			bits = h1<<18 | h2<<12 | h3<<6 | h4;

			o1 = bits>>16 & 0xff;
			o2 = bits>>8 & 0xff;
			o3 = bits & 0xff;

			if (h3 == 64) {
				tmp_arr[ac++] = String.fromCharCode(o1);
			} else if (h4 == 64) {
				tmp_arr[ac++] = String.fromCharCode(o1, o2);
			} else {
				tmp_arr[ac++] = String.fromCharCode(o1, o2, o3);
			}
		} while (i < il);

		return tmp_arr.join('');
	}
};