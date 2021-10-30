import CONFIG from '@/text-editor/config/Config';

export default {
	install: (Vue) => {
		Vue.prototype.$appConfig = CONFIG; // eslint-disable-line no-param-reassign
	}
};
