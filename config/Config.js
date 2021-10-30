export default {
	IS_PROD: process.env.NODE_ENV === 'production',
	API_URL: (window.TEXT_EDITOR_CONFIG || {}).apiUrl || process.env.VUE_APP_API_URL,
	API_TIMEOUT: (window.TEXT_EDITOR_CONFIG || {}).apiTimeout || process.env.VUE_APP_API_TIMEOUT,

	MENTIONS_ENDPOINT: (window.TEXT_EDITOR_CONFIG || {}).mentionsEndpointUrl || process.env.VUE_APP_TEXT_EDITOR_MENTIONS_ENDPOINT
};
