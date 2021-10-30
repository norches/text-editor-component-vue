import Vue from 'vue';
import TextEditor from '@/text-editor/components/TextEditor';
import TextToSpeechEditor from '@/text-editor/components/TextToSpeechEditor';
import App from '@/text-editor/App';
import { Field, Icon, Input, Notification } from 'buefy';
import Tooltip from '@/shared/directives/Tooltip';

import '@/assets/sass/bulma.scss';
import '@/assets/sass/app.scss';
import 'buefy/dist/buefy.css';
import '@mdi/font/css/materialdesignicons.css';

Vue.use(Icon);
Vue.use(Input);
Vue.use(Field);
Vue.use(Tooltip);
Vue.use(Notification);

Vue.config.productionTip = false;
/* Provide easy access to some methods for a vm. Returns an object with the functions specific to this vm */
const makeFunctionsForVm = function (vm) {
	return {
		setContentHTML: vm.$children[0].setContentHTML,
		setContentJSON: vm.$children[0].setContentJSON,
		getContentHTML: vm.$children[0].getContentHTML,
		getContentText: vm.$children[0].getContentText,
		getContentJSON: vm.$children[0].getContentJSON,
		isValid: vm.$children[0].isValid,
		getContent: vm.$children[0].getContent,
		setContent: vm.$children[0].setContent
	};
};
/* This exports the renderTo function to be used from an HTML page */
if (!window.btComponents) {
	window.btComponents = {};
}
window.btComponents.textEditor = {
	renderTo: function (elementSelector, props, eventHandlers) {
		const vm = new Vue({
			render: (createElement) => {
				return createElement(TextEditor, {
					props: props,
					on: eventHandlers
				});
			}
		}).$mount(elementSelector || '#app');

		return { ...vm, ...makeFunctionsForVm(vm) };
	}
};

window.btComponents.textToSpeechEditor = {
	renderTo: function (elementSelector, props, eventHandlers) {
		const vm = new Vue({
			render: (createElement) => {
				return createElement(TextToSpeechEditor, {
					props: props,
					on: eventHandlers
				});
			}
		}).$mount(elementSelector || '#app');

		return { ...vm, ...makeFunctionsForVm(vm) };
	}
};

/* This loads the config set in the public/index.html template, to be used with the page load in vue.config.js */
if (window.VUE_PAGE_LOAD) {
	let vm;
	if (window.TEXT_EDITOR_CONFIG) {
		vm = new Vue({
			render: h => h(App)
		}).$mount(window.TEXT_EDITOR_CONFIG.renderTo || '#app');
	} else {
		vm = new Vue({
			render: h => h(App)
		}).$mount('#app');
	}
	window.TEXT_EDITOR_CONFIG = makeFunctionsForVm(vm);
}
