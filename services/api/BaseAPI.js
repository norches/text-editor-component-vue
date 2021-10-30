import axios from 'axios';
import CONFIG from '@/text-editor/config/Config';
const urljoin = require('url-join');

export default {
	/**
	* Perform a GET request against a backend endpoint
	*/
	getData: function (query) {
		return axios.get(urljoin(CONFIG.MENTIONS_ENDPOINT, `?q=${query}`));
	},
	/**
	 * Normalises and extracts an error object from the exception and fills in a default message if none present.
	 * @param  {Exception} e The Exception instance to get error data from
	 * @return {Object}   An error object in the form { error: Boolean, message: {string}, errors: {Object[]} }
	 */
	extractError: function (e) {
		e = e || {};
		let errors = [];

		if (e.response && e.response.data) {
			const data = e.response.data;

			if (data.errors && data.errors.length > 0) {
				errors = data.errors.map(err => ({ message: `${err.property} ${err.message}` }));
			} else if (data.message) {
				errors.push({
					message: data.message
				});
			}
		}

		if (errors.length === 0 && e.message) {
			errors.push({
				message: e.message
			});
		}

		if (errors.length === 0) {
			errors.push({
				message: 'An error occurred while sending your data to the server.'
			});
		}

		return { errors };
	}
};
