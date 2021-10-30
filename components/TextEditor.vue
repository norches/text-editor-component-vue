<template>
	<div :class="wrapperClass">
		<b-field
			class="editor"
			:type="(errorRequired || errorMinLength || '') && 'is-danger'"
			:message="
				(errorRequired && mergedErrorMessages.requiredFieldError) ||
					(errorMinLength && mergedErrorMessages.minLengthError) ||
					null
			"
		>
			<template slot="label">
				{{ label }}
				<b-icon
					v-if="showLabelTooltip && (labelTooltip || tooltip)"
					size="is-small"
					:icon="tooltipIcon"
					v-tooltip="labelTooltip || tooltip"
				/>
			</template>
			<div>
				<editor-menu-bubble
					class="menububble"
					:editor="editor"
					@hide="hideLinkMenu"
					v-slot="{ menu }"
				>
					<div
						class="menububble"
						:class="{ 'is-active': linkMenuIsActive }"
						:style="`left: ${menu.left}px; bottom: ${menu.bottom}px;`"
					>
						<form
							class="menububble__form"
							@submit.prevent="setLinkUrl(editor.commands.link, linkUrl)"
						>
							<b-input
								class="menububble__input"
								type="text"
								v-model="linkUrl"
								placeholder="https://"
								ref="linkInput"
								@keydown.esc="hideLinkMenu"
							/>
							<button
								class="menububble__button"
								@click="setLinkUrl(editor.commands.link, null)"
								type="button"
							>
								<b-icon icon="link-off" />
							</button>
						</form>
					</div>
				</editor-menu-bubble>
				<editor-menu-bar v-if="showMenu && !readOnly" :editor="editor">
					<div class="menubar">
						<button
							class="menubar__button is-outlined"
							v-for="button in enabledButtons.filter(x => x !== undefined)"
							:key="button.name"
							:class="{
								'is-active':
									button.isActive && button.isActive(button.commandArgs),
								'is-disabled': showCode
							}"
							:disabled="showCode"
							@click="button.command(button.commandArgs)"
							v-tooltip-delay="button.tooltipDelay || [800, 0]"
							v-tooltip="button.tooltip"
						>
							<b-icon class="menubar__icon" :icon="button.icon" />
						</button>
						<div v-if="codeView && textView" class="menubar__toggle-buttons">
							<button
								class="menubar__button"
								:class="{ 'is-active': !showCode }"
								@click="showCode = false"
								v-tooltip-delay="[800, 0]"
								v-tooltip="mergedButtonTooltips.textView"
							>
								<b-icon class="menubar__icon" icon="format-text" />
							</button>

							<button
								class="menubar__button"
								:class="{ 'is-active': showCode }"
								@click="showCode = true"
								v-tooltip-delay="[800, 0]"
								v-tooltip="mergedButtonTooltips.codeView"
							>
								<b-icon class="menubar__icon" icon="code-tags" />
							</button>
						</div>
					</div>
				</editor-menu-bar>
				<div class="control is-clearfix has-icons-right">
					<b-input
						v-if="showCode"
						type="textarea"
						v-model="contentValue"
						:maxlength="maxLength"
						:has-counter="false"
					/>
					<editor-content
						v-else
						class="content editor__content"
						:class="{ 'is-danger': errorRequired || errorMinLength }"
						:editor="editor"
					/>
					<div
						v-if="(errorRequired || errorMinLength) && !showCode"
						class="error-circle"
					>
						<span class="error-cirlce icon is-right has-text-danger"
							><i class="mdi mdi-alert-circle mdi-24px"
						/></span>
					</div>
					<small v-if="maxLength || minLength" class="help counter ">
						{{ charCount }}{{ maxLength && `/ ${maxLength}` }}
					</small>
				</div>
				<div class="suggestion-list" v-show="showSuggestions" ref="suggestions">
					<template v-if="hasResults">
						<div
							v-for="(user, index) in users"
							:key="user.id"
							class="suggestion-list__item"
							:class="{ 'is-selected': navigatedUserIndex === index }"
							@click="selectUser(user)"
						>
							{{ user.name }}
						</div>
					</template>
					<div v-else class="suggestion-list__item is-empty">
						{{ mergedErrorMessages.mentionsError }}
					</div>
				</div>
			</div>
		</b-field>
	</div>
</template>

<script>
import { Editor, EditorContent, EditorMenuBar, EditorMenuBubble } from 'tiptap';
import { DOMSerializer } from 'prosemirror-model';
import _isFunction from 'lodash/isFunction';
import {
	Blockquote,
	Bold,
	BulletList,
	Code,
	CodeBlock,
	HardBreak,
	Heading,
	History,
	HorizontalRule,
	Italic,
	ListItem,
	OrderedList,
	Strike,
	TodoItem,
	TodoList,
	Underline,
	Mention
} from 'tiptap-extensions';
import tippy, { sticky } from 'tippy.js';
import CONFIG from '@/text-editor/config/Config';
import axios from 'axios';
import BaseAPI from '@/text-editor/services/api/BaseAPI';
import { schema } from '@/text-editor/schemas/schema-basic';
import componentConfig from '@/shared/config/component-config';

import Link from '@/text-editor/extensions/Link';

/**
	* returns HTML String of Fragment
	* @param Fragment ProseMirror Fragment instance
	* @return {string}
	* @private
	*/
const _serializeToHTML = Fragment => {
	const div = document.createElement('div');
	const fragment = DOMSerializer.fromSchema(schema).serializeFragment(Fragment);
	div.appendChild(fragment);
	return div.innerHTML;
};

export default {
	components: {
		EditorContent,
		EditorMenuBar,
		EditorMenuBubble
	},
	data () {
		return {
			wrapperClass: componentConfig.wrapperClass,
			editor: null,
			contentValue: this.content,
			charCount: this.content?.length,
			showCode: this.codeView && !this.textView,
			mergedButtonTooltips: {
				bold: 'Bold',
				italic: 'Italic',
				strikethrough: 'Strikethrough',
				underline: 'Underline',
				codeString: 'Code string',
				paragraph: 'Paragraph',
				h1: 'Heading 1',
				h2: 'Heading 2',
				h3: 'Heading 3',
				ul: 'Unordered List',
				ol: 'Numbered list',
				addLink: 'Add Link',
				editLink: 'Edit Link',
				blockquote: 'Blockquote',
				codeBlock: 'Code block',
				horizontalRule: 'Horizontal Rule',
				undo: 'Undo',
				redo: 'Redo',
				textView: 'Text view',
				codeView: 'Code view'
			},
			mergedErrorMessages: {
				requiredFieldError: 'This field is required',
				minLengthError: 'Text is too short',
				mentionsError: 'No users found'
			},
			enabledButtons: [],
			allButtons: {},
			linkUrl: null,
			linkMenuIsActive: false,
			errorRequired: false,
			errorMinLength: false,
			query: null,
			suggestionRange: null,
			users: [],
			navigatedUserIndex: 0,
			insertMention: () => {}
		};
	},
	props: {
		label: {
			type: String,
			default: () => 'Content'
		},
		labelTooltip: {
			type: String,
			default: () => 'You can write rich text below'
		},
		tooltip: {
			type: String
		},
		tooltipIcon: {
			type: String,
			default: 'help-circle'
		},
		showLabelTooltip: {
			type: Boolean,
			default: () => true
		},
		/**
			* Initial content or content model HTML string
			* if you are planning to retrieve content in b-input>v-model like fashion rather than getting content on click/callback,
			* then listen to 'content-change' event and mutate passed model at parent level
			* see App.vue code for comprehensive example
			* @param {{String|Object}} Initial content or model HTML String or JSON - ProseMirror doc JSON representation
			*/
		content: {
			type: String,
			default: () => ''
		},
		required: {
			type: Boolean,
			default: () => false
		},
		minLength: {
			type: Number,
			default: () => null
		},
		maxLength: {
			type: Number,
			default: () => null
		},
		/**
			* @param {Object} Containing custom tooltip / button names
			* @param {String} buttonTooltips.bold bold
			* @param {String} buttonTooltips.italic italic
			* @param {String} buttonTooltips.strikethrough strikethrough
			* @param {String} buttonTooltips.underline underline
			* @param {String} buttonTooltips.codeString codeString
			* @param {String} buttonTooltips.paragraph paragraph
			* @param {String} buttonTooltips.h1 h1
			* @param {String} buttonTooltips.h2 h2
			* @param {String} buttonTooltips.h3 h3
			* @param {String} buttonTooltips.ul ul
			* @param {String} buttonTooltips.ol ol
			* @param {String} buttonTooltips.addLink addLink
			* @param {String} buttonTooltips.editLink editLink
			* @param {String} buttonTooltips.blockquote blockquote
			* @param {String} buttonTooltips.codeBlock codeBlock
			* @param {String} buttonTooltips.horizontalRule horizontalRule
			* @param {String} buttonTooltips.undo undo
			* @param {String} buttonTooltips.redo redo
			* @param {String} buttonTooltips.textView textView
			* @param {String} buttonTooltips.codeView codeView
			*/
		buttonTooltips: {
			type: Object,
			default: () => ({})
		},
		/**
			* @param {Object} Containing custom tooltip / button names
			* @param {String} errorMessages.requiredFieldError Message if input required and emtpy
			* @param {String} errorMessages.minLengthError Message if minLength is specified and length is less than minLength.mentionsError
			* @param {String} errorMessages.mentionsError Message if @user not found in mentions
			*/
		errorMessages: {
			type: Object,
			default: () => ({})
		},
		/**
			* @param {String[]} Array of string with enabled menu buttons
			* codeView and textView buttons are controlled by corresponding props
			*/
		menuButtons: {
			type: Array,
			default: () => ['bold', 'italic', 'ul', 'ol', 'link']
		},
		readOnly: {
			type: Boolean,
			default: () => false
		},
		textView: {
			type: Boolean,
			default: () => true
		},
		codeView: {
			type: Boolean,
			default: () => false
		},
		showMenu: {
			type: Boolean,
			default: () => true
		},
		convertLinks: {
			type: Boolean,
			default: () => true
		},
		onConvertLink: {
			type: Function,
			default: link => new URL(link).href
		},
		/**
			* @param {Function} Function will be executed before setContent(both HTML or JSON) method is executed, if returns false content is not set
			*/
		onSetContent: {
			type: Function,
			default: content => true
		},
		enableMentions: {
			type: Boolean,
			default: () => false
		},
		apiUrl: {
			type: String
		},
		mentionsEndpointUrl: {
			type: String
		}
	},
	created () {
		this.mergedButtonTooltips = {
			...this.mergedButtonTooltips,
			...this.buttonTooltips
		};
		this.mergedErrorMessages = {
			...this.mergedErrorMessages,
			...this.errorMessages
		};
		// merge config overrides
		CONFIG.API_URL = this.apiUrl || CONFIG.API_URL;
		CONFIG.MENTIONS_ENDPOINT =
			this.networksEndpoint || CONFIG.MENTIONS_ENDPOINT;
		axios.defaults.baseURL = CONFIG.API_URL;
	},
	mounted () {
		this.editor = new Editor({
			onUpdate: ({ getHTML, getJSON }) => {
				this.contentValue = getHTML();
			},
			editable: !this.readOnly,
			content: this.contentValue,
			editorProps: {
				handleTextInput: view => {
					//if length of content is longer than maxLength then prevent text from insertion
					if (this.maxLength && this.contentValue?.length >= this.maxLength) {
						return true;
					}
				},
				//Trimming pasted content not working properly.
				handlePaste: (view, event, slice) => {
					//if current_length + length_of_content to be pasted then prevent pasting
					if (
						this.maxLength &&
						this.contentValue.length + _serializeToHTML(slice.content).length >=
						this.maxLength
					) {
						return true;
					}
				},
				transformPasted: slice => {
					//Transform / cut off excessive part of pastable content if exceeds limit
					return slice;
				}
			},
			extensions: [
				new Blockquote(),
				new BulletList(),
				new CodeBlock(),
				new HardBreak(),
				new Heading({ levels: [1, 2, 3] }),
				new HorizontalRule(),
				new ListItem(),
				new OrderedList(),
				new TodoItem(),
				new TodoList(),
				new Link({
					enableConvert: this.convertLinks,
					onConvertLink: this.onConvertLink
				}),
				new Bold(),
				new Code(),
				new Italic(),
				new Strike(),
				new Underline(),
				new History(),
				// TODO: fix multiple mentions on single line BUG
				new Mention(
					this.enableMentions && {
						// is called when a suggestion starts
						onEnter: ({ items, query, range, command, virtualNode }) => {
							this.query = query;
							this.users = items;
							this.suggestionRange = range;
							this.renderPopup(virtualNode);
							// we save the command for inserting a selected mention
							// this allows us to call it inside of our custom popup
							// via keyboard navigation and on click
							this.insertMention = command;
						},
						// is called when a suggestion has changed
						onChange: ({ items, query, range, virtualNode }) => {
							this.query = query;
							this.users = items;
							this.suggestionRange = range;
							this.navigatedUserIndex = 0;
							this.renderPopup(virtualNode);
						},
						// is called when a suggestion is cancelled
						onExit: () => {
							// reset all saved values
							this.query = null;
							this.users = [];
							this.suggestionRange = null;
							this.navigatedUserIndex = 0;
							this.destroyPopup();
						},
						// is called on every keyDown event while a suggestion is active
						onKeyDown: ({ event }) => {
							if (event.key === 'ArrowUp') {
								this.upHandler();
								return true;
							}
							if (event.key === 'ArrowDown') {
								this.downHandler();
								return true;
							}
							if (event.key === 'Enter') {
								this.enterHandler();
								return true;
							}
							return false;
						},
						onFilter: async (items, query) => {
							let result;
							if (query) {
								result = await this.fetchItems(query);
								return result;
							}
							return [];
						}
					}
				)
			]
		});
		this.allButtons = {
			bold: {
				name: 'bold',
				icon: 'format-bold',
				command: this.editor?.commands.bold,
				isActive: this.editor?.isActive.bold,
				tooltip: this.mergedButtonTooltips.bold
			},
			italic: {
				name: 'italic',
				icon: 'format-italic',
				command: this.editor?.commands.italic,
				isActive: this.editor?.isActive.italic,
				tooltip: this.mergedButtonTooltips.italic
			},
			strikethrough: {
				name: 'strikethrough',
				icon: 'format-strikethrough',
				command: this.editor?.commands.strike,
				isActive: this.editor?.isActive.strike,
				tooltip: this.mergedButtonTooltips.strikethrough
			},
			underline: {
				name: 'underline',
				icon: 'format-underline',
				command: this.editor?.commands.underline,
				isActive: this.editor?.isActive.underline,
				tooltip: this.mergedButtonTooltips.underline
			},
			'code-string': {
				name: 'code-string',
				icon: 'code-string',
				command: this.editor?.commands.code,
				isActive: this.editor?.isActive.code,
				tooltip: this.mergedButtonTooltips.codeString
			},
			paragraph: {
				name: 'paragraph',
				icon: 'format-paragraph',
				command: this.editor?.commands.paragraph,
				isActive: this.editor?.isActive.paragraph,
				tooltip: this.mergedButtonTooltips.paragraph
			},
			heading1: {
				name: 'heading1',
				icon: 'format-header-1',
				command: this.editor?.commands.heading,
				commandArgs: { level: 1 },
				isActive: this.editor?.isActive.heading,
				tooltip: this.mergedButtonTooltips.h1
			},
			heading2: {
				name: 'heading2',
				icon: 'format-header-2',
				command: this.editor?.commands.heading,
				commandArgs: { level: 2 },
				isActive: this.editor?.isActive.heading,
				tooltip: this.mergedButtonTooltips.h2
			},
			heading3: {
				name: 'heading3',
				icon: 'format-header-3',
				command: this.editor?.commands.heading,
				commandArgs: { level: 3 },
				isActive: this.editor?.isActive.heading,
				tooltip: this.mergedButtonTooltips.h3
			},
			ul: {
				name: 'ul',
				icon: 'format-list-bulleted',
				command: this.editor?.commands['bullet_list'],
				isActive: this.editor?.isActive['bullet_list'],
				tooltip: this.mergedButtonTooltips.ul
			},
			ol: {
				name: 'ol',
				icon: 'format-list-numbered',
				command: this.editor?.commands['ordered_list'],
				isActive: this.editor?.isActive['ordered_list'],
				tooltip: this.mergedButtonTooltips.ol
			},
			link: {
				name: 'link',
				icon: 'link',
				isActive: this.editor?.isActive.link,
				command: this.showLinkMenu,
				tooltip: this.linkTooltip
			},
			blockquote: {
				name: 'blockquote',
				icon: 'format-quote-close',
				command: this.editor?.commands.blockquote,
				isActive: this.editor?.isActive.blockquote,
				tooltip: this.mergedButtonTooltips.blockquote
			},
			'code-block': {
				name: 'code-block',
				icon: 'code-braces-box',
				command: this.editor?.commands['code_block'],
				isActive: this.editor?.isActive['code_block'],
				tooltip: this.mergedButtonTooltips.codeBlock
			},
			'horizontal-rule': {
				name: 'horizontal-rule',
				icon: 'window-minimize',
				command: this.editor?.commands['horizontal_rule'],
				isActive: this.editor?.isActive['horizontal_rule'],
				tooltip: this.mergedButtonTooltips.horizontalRule
			},
			undo: {
				name: 'undo',
				icon: 'undo',
				command: this.editor?.commands.undo,
				tooltip: this.mergedButtonTooltips.undo
			},
			redo: {
				name: 'redo',
				icon: 'redo',
				command: this.editor?.commands.redo,
				tooltip: this.mergedButtonTooltips.redo
			}
		};
		for (let button of this.menuButtons) {
			this.enabledButtons.push(this.allButtons[button]);
		}
	},
	computed: {
		linkTooltip () {
			return () =>
				this.editor.isActive.link()
					? this.mergedButtonTooltips.editLink
					: this.mergedButtonTooltips.addLink;
		},
		hasResults () {
			return this.users.length;
		},
		showSuggestions () {
			return this.query !== null || this.hasResults;
		}
	},
	methods: {
		showErrorNotification: function (result) {
			if (!result) {
				result = {};
			}
			let message = '';
			for (let error of result.errors) {
				message += error.message + '. ';
			}
			message = message.substring(0, message.length - 2);
			this.notification = this.$buefy.notification.open({
				duration: 5000,
				message: message,
				position: 'is-bottom-right',
				type: 'is-danger'
			});
		},
		async fetchItems (query) {
			if (query?.length < 1) {
				return [];
			}
			try {
				let result = await BaseAPI.getData(query);
				if (result && result.data && result.status === 200) {
					return result.data;
				} else {
					result = BaseAPI.extractError(result);
					this.showErrorNotification(result);
					return [];
				}
			} catch (e) {
				this.showErrorNotification(BaseAPI.extractError(e));
				return [];
			}
		},
		// navigate to the previous item
		// if it's the first item, navigate to the last one
		upHandler () {
			this.navigatedUserIndex =
				(this.navigatedUserIndex + this.users.length - 1) % this.users.length;
		},
		// navigate to the next item
		// if it's the last item, navigate to the first one
		downHandler () {
			this.navigatedUserIndex =
				(this.navigatedUserIndex + 1) % this.users.length;
		},
		enterHandler () {
			const user = this.users[this.navigatedUserIndex];
			if (user) {
				this.selectUser(user);
			}
		},
		// we have to replace our suggestion text with a mention
		// so it's important to pass also the position of your suggestion text
		selectUser (user) {
			this.insertMention({
				range: this.suggestionRange,
				attrs: {
					id: user.id,
					label: user.name
				}
			});
			this.editor.focus();
		},
		// renders a popup with suggestions
		// tiptap provides a virtualNode object for using popper.js (or tippy.js) for popups
		renderPopup (node) {
			if (this.popup) {
				return;
			}
			this.popup = tippy(document.createElement('div'), {
				getReferenceClientRect: node.getBoundingClientRect,
				appendTo: () => document.body,
				interactive: true,
				sticky: true, // make sure position of tippy is updated when content changes
				plugins: [sticky],
				content: this.$refs.suggestions,
				showOnCreate: true,
				arrow: false,
				placement: 'top-start',
				inertia: true,
				duration: [400, 200]
			});
		},
		destroyPopup () {
			if (this.popup) {
				this.popup.destroy();
				this.popup = null;
			}
		},
		showLinkMenu () {
			this.linkUrl = this.editor?.getMarkAttrs('link')?.href || '';
			this.linkMenuIsActive = true;
			this.$nextTick(() => {
				this.$refs.linkInput.focus();
			});
		},
		hideLinkMenu () {
			this.linkUrl = null;
			this.linkMenuIsActive = false;
		},
		setLinkUrl (command, url) {
			command({ href: url });
			this.hideLinkMenu();
		},
		setContentHTML (content) {
			if (_isFunction(this.onSetContent)) {
				if (this.onSetContent(content)) {
					this.editor.setContent(content, false);
					this.contentValue = this.editor?.getHTML();
				}
			} else {
				this.editor.setContent(content, false);
				this.contentValue = this.editor?.getHTML();
			}
		},
		setContentJSON (JSON) {
			if (_isFunction(this.onSetContent)) {
				if (this.onSetContent(JSON)) {
					this.editor.setContent(JSON, false);
					this.contentValue = this.editor?.getHTML();
				}
			} else {
				this.editor.setContent(JSON, false);
				this.contentValue = this.editor?.getHTML();
			}
		},
		getContentHTML () {
			return this.contentValue;
		},
		getContentText () {
			let div = document.createElement('div');
			div.innerHTML = this.editor?.getHTML();
			let children = div.querySelectorAll('*');
			for (let i = 0; i < children.length; i++) {
				if (children[i].textContent) {
					children[i].textContent += ' ';
				} else {
					children[i].innerText += ' ';
				}
			}
			return [div.textContent || div.innerText].toString().replace(/ +/g, ' ');
		},
		getContentJSON () {
			return this.editor?.getJSON();
		},
		isValid () {
			this.errorMinLength = this.contentValue.length < this.minLength;
			this.errorRequired = this.required && !this.contentValue;
			return !this.errorMinLength && !this.errorRequired;
		}
	},
	watch: {
		content () {
			if (this.contentValue !== this.content) {
				this.contentValue = this.content;
			}
		},
		contentValue () {
			if (this.contentValue !== this.editor.getHTML()) {
				this.editor.setContent(this.contentValue, false);
			}
			this.charCount = this.contentValue?.length;
			this.$emit('content-change', this.contentValue);
		}
	},
	beforeDestroy () {
		if (this.editor) this.editor.destroy();
	}
};
</script>
<style lang="scss">
@import "@/assets/sass/bulma.scss";
@import "./../../shared/scss/variables";
@import "~tippy.js/dist/tippy.css";

$main-color: $backtracks-green;
$main-transparent-color: $backtracks-green-25pct;
.menububble {
	position: absolute;
	display: flex;
	z-index: 20;

	border-radius: 5px;
	padding: 0;
	margin-bottom: -25px;
	background-color: $backtracks-green;
	transform: translateX(-50%);
	visibility: hidden;
	opacity: 0;
	transition: opacity 0.2s, visibility 0.2s;
	&.is-active {
		opacity: 1;
		visibility: visible;
	}
	&__form {
		display: -webkit-box;
		display: flex;
		-webkit-box-align: center;
		align-items: center;
	}
	&__button {
		display: inline-flex;
		background: $backtracks-green;
		color: $white;
		border: 0;
		padding: 2px 5px;
		margin-right: 2px;
		border-radius: 3px;
		cursor: pointer;
		&:focus {
			outline: none;
		}
	}
}
.menubar {
	margin-bottom: 10px;
	transition: visibility 0.2s 0.4s, opacity 0.2s 0.4s;
	&__toggle-buttons {
		display: inline-flex;
		background-color: $backtracks-green-25pct;
		border-radius: 3px;
	}
	&__button.is-active {
		background-color: $backtracks-green-75pct;
		color: $white;
	}
	&__button {
		font-weight: 700;
		display: inline-flex;
		background: transparent;
		border: 0;
		color: $black;
		padding: 1px 5px;
		margin-right: 4px;
		border-radius: 3px;
		cursor: pointer;
		&:hover {
			background-color: $backtracks-green;
			color: $white;
		}
		&:focus {
			outline: none;
		}
		&:last-child {
			margin-right: 0;
		}
	}
	&__button.is-disabled {
		color: $gray;
		background-color: transparent;
		cursor: default;
		&:hover {
			background-color: transparent;
		}
	}
}
.mention,
.mention-suggestion {
	color: $black;
}
.mention {
	background: $light-gray;
	font-size: 0.8rem;
	font-weight: 700;
	border-radius: 5px;
	padding: 2px 5px;
	white-space: nowrap;
}
.suggestion-list {
	padding-top: 2px;
	padding-bottom: 3px;
	&__item.is-selected {
		background-color: $backtracks-green;
	}
	&__item:not(.is-empty) {
		cursor: pointer;
		padding: 2px 5px;
		border-radius: 5px;
		&:hover {
			background-color: $backtracks-green;
		}
	}
}

.editor {
	text-align: left;

	&__content {
		margin-bottom: 0 !important;
	}
	p {
		margin: 0;
	}
	a {
		cursor: pointer;
	}

	.textarea {
		padding: 6.25px;
	}

	.ProseMirror,
	.ProseMirror-focused {
		@extend .textarea;
		padding: 6.25px;
		height: 100%;
		overflow-y: auto;
		max-height: 600px !important;
		min-height: 120px !important;
	}

	.is-danger .ProseMirror {
		border-color: #ff3860;
	}

	.input:focus,
	.is-focused.input,
	.input:active,
	.is-active.input,
	.textarea:focus,
	.is-focused.textarea,
	.textarea:active,
	.is-active.textarea {
		border-color: $main-color;
		box-shadow: 0 0 0 0.125em $main-transparent-color !important;
	}
}
</style>
